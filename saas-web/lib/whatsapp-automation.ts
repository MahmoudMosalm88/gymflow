export type SystemLanguage = "en" | "ar";

export const DEFAULT_REMINDER_DAYS = "7,3,1";

export const DEFAULT_WELCOME_TEMPLATE_EN =
  "Hi {name}, welcome to GymFlow. Your account is ready.";
export const DEFAULT_WELCOME_TEMPLATE_AR =
  "مرحباً {name}، تم تفعيل حسابك في GymFlow بنجاح.";

export const DEFAULT_RENEWAL_TEMPLATE_EN =
  "Hi {name}, your subscription will expire on {expiryDate} ({daysLeft} days left). Please renew to keep access active.";
export const DEFAULT_RENEWAL_TEMPLATE_AR =
  "مرحباً {name}، ينتهي اشتراكك بتاريخ {expiryDate} (متبقي {daysLeft} أيام). يرجى التجديد للحفاظ على العضوية.";

export function normalizeSystemLanguage(value: unknown, fallback: SystemLanguage = "en"): SystemLanguage {
  if (value === "ar" || value === "en") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "ar") return "ar";
    if (normalized === "en") return "en";
  }
  return fallback;
}

export function getDefaultWelcomeTemplate(lang: SystemLanguage): string {
  return lang === "ar" ? DEFAULT_WELCOME_TEMPLATE_AR : DEFAULT_WELCOME_TEMPLATE_EN;
}

export function getDefaultRenewalTemplate(lang: SystemLanguage): string {
  return lang === "ar" ? DEFAULT_RENEWAL_TEMPLATE_AR : DEFAULT_RENEWAL_TEMPLATE_EN;
}

export function getTemplateKey(type: "welcome" | "renewal", lang: SystemLanguage): string {
  return `whatsapp_template_${type}_${lang}`;
}

export function renderWhatsappTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function parseReminderDays(value: unknown): number[] {
  const raw =
    typeof value === "string" && value.trim().length > 0 ? value : DEFAULT_REMINDER_DAYS;

  const parsed = raw
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 60);

  const unique = Array.from(new Set(parsed)).sort((a, b) => b - a);
  return unique.length > 0 ? unique : [7, 3, 1];
}

export function parseBooleanSetting(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}
