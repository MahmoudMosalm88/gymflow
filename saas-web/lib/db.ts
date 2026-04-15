import { Pool, PoolClient } from "pg";
import { env, featureFlags } from "./env";

declare global {
  var __gymflowPool: Pool | undefined;
}

export type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

function buildPool() {
  // Cloud SQL Proxy (unix socket or localhost TCP): SSL handled by proxy tunnel.
  // Otherwise: use strict SSL in production, feature-flagged SSL in development.
  const isCloudSqlSocket =
    env.DATABASE_URL.includes("/cloudsql/") || env.DATABASE_URL.includes("%2Fcloudsql%2F");
  const isLocalTcpProxy = (() => {
    try {
      const parsed = new URL(env.DATABASE_URL);
      return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    } catch {
      return false;
    }
  })();

  const useSSL = (isCloudSqlSocket || isLocalTcpProxy)
    ? false
    : (env.NODE_ENV === "production" ? true : featureFlags.useDatabaseSsl);

  return new Pool({
    connectionString: env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: true } : undefined,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30000
  });
}

export const pool = global.__gymflowPool ?? buildPool();

if (env.NODE_ENV !== "production") {
  global.__gymflowPool = pool;
}

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  const result = await pool.query(text, values);
  return result.rows as T[];
}

export async function queryWith<T = Record<string, unknown>>(
  source: Queryable,
  text: string,
  values: unknown[] = []
) {
  const result = await source.query(text, values);
  return result.rows as T[];
}

export async function withTransaction<T>(executor: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const output = await executor(client);
    await client.query("COMMIT");
    return output;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withClient<T>(executor: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await executor(client);
  } finally {
    client.release();
  }
}
