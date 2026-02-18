import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function printResult(result: CheckResult) {
  const status = result.ok ? "PASS" : "FAIL";
  const suffix = result.detail ? ` - ${result.detail}` : "";
  console.log(`[${status}] ${result.name}${suffix}`);
}

async function run() {
  const { env, getFirebaseWebConfigDiagnostics } = await import("../lib/env");
  const { getFirebaseAdminAuth, getFirebaseAdminDiagnostics } = await import("../lib/firebase-admin");

  console.log("GymFlow Firebase audit");
  console.log(`Node env: ${env.NODE_ENV}`);
  console.log("");

  const checks: CheckResult[] = [];

  const web = getFirebaseWebConfigDiagnostics();
  checks.push({
    name: "Firebase Web required env",
    ok: web.ok,
    detail: web.ok ? "all required keys are present" : `missing: ${web.missingRequired.join(", ")}`
  });

  checks.push({
    name: "Firebase Web recommended env",
    ok: web.missingRecommended.length === 0,
    detail:
      web.missingRecommended.length === 0
        ? "all recommended keys are present"
        : `missing: ${web.missingRecommended.join(", ")}`
  });

  const adminDiag = getFirebaseAdminDiagnostics();
  checks.push({
    name: "Firebase Admin initialization",
    ok: adminDiag.configured,
    detail: adminDiag.configured
      ? `source=${adminDiag.source || "unknown"} project=${adminDiag.projectId || "n/a"}`
      : adminDiag.error || "initialization failed"
  });

  const auth = getFirebaseAdminAuth();
  if (!auth) {
    checks.push({
      name: "Firebase Admin API call",
      ok: false,
      detail: "admin auth unavailable"
    });
  } else {
    try {
      await auth.listUsers(1);
      checks.push({
        name: "Firebase Admin API call",
        ok: true,
        detail: "listUsers(1) succeeded"
      });
    } catch (error) {
      checks.push({
        name: "Firebase Admin API call",
        ok: false,
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  for (const result of checks) printResult(result);

  const failed = checks.filter((check) => !check.ok);
  console.log("");
  if (failed.length === 0) {
    console.log("Firebase audit passed.");
    process.exit(0);
  }

  console.error(`Firebase audit failed with ${failed.length} issue(s).`);
  process.exit(1);
}

run().catch((error) => {
  console.error("Firebase audit crashed:", error);
  process.exit(1);
});
