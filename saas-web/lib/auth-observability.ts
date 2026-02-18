import crypto from "crypto";
import { NextRequest } from "next/server";

type AuthAuditLevel = "info" | "warn" | "error";
type AuthAuditOutcome = "success" | "failure";

export type AuthAuditContext = {
  requestId: string;
  route: string;
  method: string;
  path: string;
  startedAt: number;
  ipHash: string | null;
  userAgent: string | null;
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function fingerprint(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return hashValue(normalized);
}

export function getOrCreateRequestId(request: NextRequest) {
  const existing =
    request.headers.get("x-auth-request-id") ||
    request.headers.get("x-request-id");
  return existing && existing.trim() ? existing.trim() : crypto.randomUUID();
}

export function beginAuthAudit(request: NextRequest, route: string): AuthAuditContext {
  const ip = getClientIp(request);
  return {
    requestId: getOrCreateRequestId(request),
    route,
    method: request.method,
    path: request.nextUrl.pathname,
    startedAt: Date.now(),
    ipHash: ip ? hashValue(ip) : null,
    userAgent: request.headers.get("user-agent")
  };
}

export function logAuthAudit(
  level: AuthAuditLevel,
  event: string,
  details: Record<string, unknown> = {}
) {
  const payload = {
    source: "auth_audit",
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  const line = `[AUTH_AUDIT] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logAuthWithContext(
  context: AuthAuditContext,
  params: {
    level?: AuthAuditLevel;
    event: string;
    outcome: AuthAuditOutcome;
    status?: number;
    reason?: string;
    authMethod?: string;
    firebaseCode?: string;
    emailHash?: string | null;
    uidHash?: string | null;
    details?: Record<string, unknown>;
  }
) {
  const {
    level = params.outcome === "failure" ? "warn" : "info",
    event,
    outcome,
    status,
    reason,
    authMethod,
    firebaseCode,
    emailHash,
    uidHash,
    details
  } = params;

  logAuthAudit(level, event, {
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    path: context.path,
    outcome,
    status: status ?? null,
    reason: reason || null,
    authMethod: authMethod || null,
    firebaseCode: firebaseCode || null,
    emailHash: emailHash || null,
    uidHash: uidHash || null,
    durationMs: Date.now() - context.startedAt,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    ...(details || {})
  });
}

export function withAuthRequestId(response: Response, contextOrRequestId: AuthAuditContext | string) {
  const requestId =
    typeof contextOrRequestId === "string"
      ? contextOrRequestId
      : contextOrRequestId.requestId;
  response.headers.set("x-auth-request-id", requestId);
  return response;
}

