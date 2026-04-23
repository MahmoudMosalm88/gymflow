import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { query } from "../lib/db";

async function main() {
  const outputPath = resolve(process.cwd(), `backup-${Date.now()}.json`);
  const rows = await query(
    `SELECT organization_id, branch_id, source, status, storage_path, metadata, created_at
       FROM backups
      ORDER BY created_at DESC
      LIMIT 100`
  );
  writeFileSync(outputPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Backup metadata exported to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
