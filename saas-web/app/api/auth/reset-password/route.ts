import { ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  return ok({
    message:
      "Password reset confirmation is handled by Firebase action links. This endpoint remains for API parity and audit hooks."
  });
}
