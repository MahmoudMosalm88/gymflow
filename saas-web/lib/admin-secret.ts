import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function hasValidAdminKey(request: NextRequest) {
  const configured = env.ADMIN_NOTIFICATIONS_KEY;
  const provided = request.headers.get("x-admin-key") || "";
  if (!configured || !provided) return false;
  return safeCompare(provided, configured);
}
