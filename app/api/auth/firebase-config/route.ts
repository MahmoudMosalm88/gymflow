import { getFirebaseWebConfig, getFirebaseWebConfigDiagnostics } from "@/lib/env";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getFirebaseWebConfig();
  if (!config) {
    const diagnostics = getFirebaseWebConfigDiagnostics();
    return fail(
      `Firebase web client is not configured. Missing: ${diagnostics.missingRequired.join(", ")}`,
      500,
      {
        missingRequired: diagnostics.missingRequired,
        missingRecommended: diagnostics.missingRecommended
      }
    );
  }

  const diagnostics = getFirebaseWebConfigDiagnostics();
  return ok({
    ...config,
    missingRecommended: diagnostics.missingRecommended
  });
}
