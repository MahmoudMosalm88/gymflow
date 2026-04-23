import { env } from "@/lib/env";

export type ContactRequestPayload = {
  name: string;
  email: string;
  phone?: string;
  organizationName: string;
  market: string;
  branchCount?: number;
  requestType: "pricing" | "demo" | "onboarding" | "migration" | "legal" | "data" | "support" | "other";
  message: string;
  locale: "en" | "ar";
};

const CONTACT_DESTINATION = "mahmoudtalat@gymflowsystem.com";

function requestTypeLabel(type: ContactRequestPayload["requestType"]) {
  switch (type) {
    case "pricing":
      return "Pricing";
    case "demo":
      return "Demo";
    case "onboarding":
      return "Onboarding";
    case "migration":
      return "Migration";
    case "legal":
      return "Legal";
    case "data":
      return "Data Request";
    case "support":
      return "Support";
    default:
      return "Other";
  }
}

function renderSubject(payload: ContactRequestPayload) {
  return `GymFlow contact: ${requestTypeLabel(payload.requestType)} / ${payload.organizationName}`;
}

function renderText(payload: ContactRequestPayload) {
  return [
    "New public contact request",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "-"}`,
    `Organization: ${payload.organizationName}`,
    `Market: ${payload.market}`,
    `Branch Count: ${payload.branchCount ?? "-"}`,
    `Request Type: ${requestTypeLabel(payload.requestType)}`,
    `Locale: ${payload.locale}`,
    "",
    "Message:",
    payload.message
  ].join("\n");
}

export async function sendContactNotification(payload: ContactRequestPayload) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.NOTIFY_SIGNUPS_FROM || "GymFlow <onboarding@updates.gymflowsystem.com>";

  if (!apiKey) {
    return { sent: false, reason: "not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [CONTACT_DESTINATION],
      subject: renderSubject(payload),
      text: renderText(payload)
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API failed (${response.status}): ${body}`);
  }

  return { sent: true, reason: "sent" as const };
}
