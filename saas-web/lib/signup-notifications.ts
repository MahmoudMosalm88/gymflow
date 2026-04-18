import { env } from "@/lib/env";

type SignupNotificationPayload = {
  authMethod: "email" | "google" | "phone";
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  organizationName: string;
  branchName: string;
  organizationId: string;
  branchId: string;
  ownerId: string;
};

async function sendTelegramAlert(payload: SignupNotificationPayload) {
  const TELEGRAM_BOT_TOKEN = "8629923602:AAHqi1wPhLk9ifOuDZrrCEfPpOmznf3uz3Y";
  const chatId = "-5163355177"; // Command Center Group
  
  if (!chatId) return;

  const text = `🚀 *New GymFlow Signup* 🚀\n\n` +
    `👤 *Owner:* ${payload.ownerName}\n` +
    `📧 *Email:* ${payload.ownerEmail || "-"}\n` +
    `🏢 *Gym:* ${payload.organizationName}\n` +
    `📍 *Branch:* ${payload.branchName}\n` +
    `🔑 *Method:* ${payload.authMethod}`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
      })
    });
  } catch (e) {
    console.error("Failed to send telegram alert:", e);
  }
}

function parseRecipients(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function renderSubject(payload: SignupNotificationPayload) {
  return `New GymFlow signup: ${payload.organizationName}`;
}

function renderText(payload: SignupNotificationPayload) {
  return [
    "New signup received",
    "",
    `Auth Method: ${payload.authMethod}`,
    `Owner Name: ${payload.ownerName}`,
    `Owner Email: ${payload.ownerEmail || "-"}`,
    `Owner Phone: ${payload.ownerPhone || "-"}`,
    `Organization: ${payload.organizationName}`,
    `Branch: ${payload.branchName}`,
    `Organization ID: ${payload.organizationId}`,
    `Branch ID: ${payload.branchId}`,
    `Owner ID: ${payload.ownerId}`
  ].join("\n");
}

export async function sendNewSignupNotification(payload: SignupNotificationPayload) {
  // Fire Telegram alert asynchronously
  sendTelegramAlert(payload).catch((e) => console.error("Telegram error:", e));

  const apiKey = env.RESEND_API_KEY;
  const to = parseRecipients(env.NOTIFY_SIGNUPS_TO);
  const from = env.NOTIFY_SIGNUPS_FROM || "GymFlow <onboarding@updates.gymflowsystem.com>";

  if (!apiKey || to.length === 0) return { sent: false, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
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
