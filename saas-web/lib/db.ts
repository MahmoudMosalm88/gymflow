import { Pool, PoolClient } from "pg";
import { env, featureFlags } from "./env";

declare global {
  var __gymflowPool: Pool | undefined;
}

function buildPool() {
  // Cloud SQL Proxy via unix socket: SSL handled by proxy, no SSL config needed
  // Otherwise: Use SSL with strict validation in production, dev uses feature flag
  const isCloudSqlProxy = env.DATABASE_URL.includes("/cloudsql/") || env.DATABASE_URL.includes("%2Fcloudsql%2F");
  const useSSL = isCloudSqlProxy ? false : (env.NODE_ENV === "production" ? true : featureFlags.useDatabaseSsl);

  return new Pool({
    connectionString: env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: true } : undefined,
    max: 12,
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
