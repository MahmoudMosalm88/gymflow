import { NextRequest } from "next/server";
import { env, getFirebaseWebConfigDiagnostics } from "@/lib/env";
import { fail, ok, routeError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 requests per minute per IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0].trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("cf-connecting-ip")?.trim() ||
      `ua:${request.headers.get("user-agent") || "unknown"}`;
    const forgotPasswordLimit = process.env.NODE_ENV === "development" ? 60 : 3;
    const rateLimit = checkRateLimit(ip, forgotPasswordLimit, 60000);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many password reset requests. Please try again later."
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

    const payload = forgotPasswordSchema.parse(await request.json());

    if (!env.FIREBASE_WEB_API_KEY) {
      const diagnostics = getFirebaseWebConfigDiagnostics();
      return fail("Firebase web auth is not configured", 500, {
        missingRequired: diagnostics.missingRequired
      });
    }

    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${env.FIREBASE_WEB_API_KEY}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email: payload.email,
        continueUrl: `${env.APP_BASE_URL}/login`
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const code = String(body?.error?.message || "");

      // Always return generic success for user-facing privacy.
      if (code && code !== "EMAIL_NOT_FOUND") {
        console.error("Password reset dispatch failed:", code);
      }
    }

    return ok({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    return routeError(error);
  }
}
