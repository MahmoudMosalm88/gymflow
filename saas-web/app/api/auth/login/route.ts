import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { env, getFirebaseWebConfigDiagnostics } from "@/lib/env";
import { getFirebaseAdminAuth, getFirebaseAdminDiagnostics } from "@/lib/firebase-admin";
import { fail, ok, routeError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

type LoginRow = {
  owner_id: string;
  branch_id: string;
  organization_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type FirebaseSignInResponse = {
  idToken: string;
  email: string;
};

function mapFirebaseAuthError(code: string) {
  switch (code) {
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
    case "EMAIL_NOT_FOUND":
      return "Incorrect email or password. Please check your credentials and try again.";
    case "USER_DISABLED":
      return "Your account has been disabled. Please contact support for assistance.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many login attempts. Please wait a few minutes and try again.";
    case "API_KEY_INVALID":
    case "INVALID_API_KEY":
      return "Firebase web API key is invalid. Please contact support.";
    case "PROJECT_NOT_FOUND":
      return "Firebase project configuration is invalid. Please contact support.";
    default:
      return "We couldn't sign you in. Please try again in a moment.";
  }
}

async function signInWithPassword(email: string, password: string) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_WEB_API_KEY}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.message as string | undefined;
    return { ok: false as const, message: mapFirebaseAuthError(code || "") };
  }

  const payload = (await response.json()) as FirebaseSignInResponse;
  return { ok: true as const, payload };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const rateLimit = checkRateLimit(ip, 10, 60000);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many login attempts. Please try again later."
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds)
          }
        }
      );
    }

    const payload = loginSchema.parse(await request.json());
    const auth = getFirebaseAdminAuth();
    if (!auth) {
      const diagnostics = getFirebaseAdminDiagnostics();
      return fail("Firebase admin is not configured correctly.", 500, {
        source: diagnostics.source,
        usingApplicationDefault: diagnostics.usingApplicationDefault,
        error: diagnostics.error
      });
    }

    let idToken = payload.idToken;

    if (!idToken) {
      if (!env.FIREBASE_WEB_API_KEY) {
        const diagnostics = getFirebaseWebConfigDiagnostics();
        return fail("Firebase web auth is not configured.", 500, {
          missingRequired: diagnostics.missingRequired
        });
      }
      if (!("email" in payload) || !payload.email || !("password" in payload) || !payload.password) {
        return fail("Please provide both your email and password.", 400);
      }

      const signIn = await signInWithPassword(payload.email, payload.password);
      if (!signIn.ok) return fail(signIn.message, 401);
      idToken = signIn.payload.idToken;
    }

    const decoded = await auth.verifyIdToken(idToken);
    const rows = await query<LoginRow>(
      `SELECT o.id AS owner_id,
              o.name,
              o.email,
              o.phone,
              oba.branch_id,
              b.organization_id
         FROM owners o
         JOIN owner_branch_access oba ON oba.owner_id = o.id
         JOIN branches b ON b.id = oba.branch_id
        WHERE o.firebase_uid = $1
        ORDER BY oba.created_at ASC
        LIMIT 1`,
      [decoded.uid]
    );

    if (!rows[0]) return fail("Your account exists but isn't fully set up yet. Please contact support to complete your setup.", 404);

    return ok({
      message: "Login successful",
      owner: rows[0],
      session: {
        idToken,
        branchId: rows[0].branch_id,
        organizationId: rows[0].organization_id,
        ownerId: rows[0].owner_id
      }
    });
  } catch (error) {
    return routeError(error);
  }
}
