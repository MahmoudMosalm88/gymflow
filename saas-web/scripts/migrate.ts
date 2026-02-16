import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const schemaPath = resolve(__dirname, "../db/schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Schema applied successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
