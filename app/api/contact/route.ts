import { NextRequest } from "next/server";

import { sendContactNotification } from "@/lib/contact-notifications";
import { fail, ok, routeError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { publicContactSchema } from "@/lib/validation";

export const runtime = "nodejs";

function getRequesterId(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    `ua:${request.headers.get("user-agent") || "unknown"}`
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getRequesterId(request), 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many contact attempts. Please wait a few minutes and try again."
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

    const payload = publicContactSchema.parse(await request.json());
    const isArabic = payload.locale === "ar";

    // Honeypot field: pretend success but do not send.
    if (payload.website) {
      return ok({
        message: isArabic ? "شكرًا. تم استلام رسالتك." : "Thanks. Your message has been received."
      });
    }

    const result = await sendContactNotification(payload);
    if (!result.sent) {
      return fail(
        isArabic
          ? "النموذج غير متاح مؤقتًا. من فضلك راسل sales@gymflowsystem.com مباشرة."
          : "The contact form is temporarily unavailable. Please email sales@gymflowsystem.com instead.",
        503
      );
    }

    return ok({
      message: isArabic
        ? "شكرًا. تم إرسال رسالتك إلى فريق GymFlow."
        : "Thanks. Your message has been sent to GymFlow."
    });
  } catch (error) {
    return routeError(error);
  }
}
