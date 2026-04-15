import { toBoolean } from "@/lib/coerce";

export type SystemLanguage = "en" | "ar";
export type WhatsAppAutomationGroupId =
  | "operational"
  | "recovery"
  | "onboarding"
  | "behavior"
  | "owner_ops";
export type WhatsAppAutomationId =
  | "welcome"
  | "renewal"
  | "qr_code"
  | "broadcast"
  | "post_expiry"
  | "onboarding"
  | "habit_break"
  | "streaks"
  | "freeze_ending"
  | "weekly_digest";
export type WhatsAppAutomationState = "live" | "blocked" | "planned";

export type WhatsAppAutomationGroup = {
  id: WhatsAppAutomationGroupId;
  title: Record<SystemLanguage, string>;
  description: Record<SystemLanguage, string>;
};

export type WhatsAppAutomationDefinition = {
  id: WhatsAppAutomationId;
  group: WhatsAppAutomationGroupId;
  title: Record<SystemLanguage, string>;
  description: Record<SystemLanguage, string>;
  status: WhatsAppAutomationState;
  ownerControlled: boolean;
  editableTemplates: boolean;
  warningEligible: boolean;
  warningLabel: Record<SystemLanguage, string>;
  settingKey?: string;
};

export const DEFAULT_REMINDER_DAYS = "14,7,3";
export const LOCKED_RENEWAL_REMINDER_DAYS = [14, 7, 3] as const;
export const WARNING_WINDOW_HOURS = 72;
export const WARNING_WINDOW_DAYS = 7;
export const WARNING_MEMBER_MESSAGE_THRESHOLD_SHORT = 3;
export const WARNING_MEMBER_MESSAGE_THRESHOLD_LONG = 5;
export const WARNING_AFFECTED_MEMBER_THRESHOLD = 3;

export const DEFAULT_WELCOME_TEMPLATE_EN =
  "Hi {name}, welcome to GymFlow. Your account is ready.";
export const DEFAULT_WELCOME_TEMPLATE_AR =
  "مرحباً {name}، تم تفعيل حسابك في GymFlow بنجاح.";

export const DEFAULT_RENEWAL_TEMPLATE_EN =
  "Hi {name}, your subscription will expire on {expiryDate} ({daysLeft} days left). Please renew to keep access active.";
export const DEFAULT_RENEWAL_TEMPLATE_AR =
  "مرحباً {name}، ينتهي اشتراكك بتاريخ {expiryDate} (متبقي {daysLeft} أيام). يرجى التجديد للحفاظ على العضوية.";

export const DEFAULT_POST_EXPIRY_TEMPLATES = {
  en: {
    day0: "Hi {name}, your membership expired on {expiryDate}. Reply or renew today to reactivate access.",
    day3: "Hi {name}, this is a reminder that your membership expired on {expiryDate}. We can reactivate it anytime.",
    day7: "Hi {name}, we miss seeing you at the gym. Your membership expired on {expiryDate}. Reply here if you want us to help you renew.",
    day14: "Final reminder, {name}: your membership is still inactive since {expiryDate}. Renew now if you want to keep your progress going.",
  },
  ar: {
    day0: "مرحباً {name}، انتهى اشتراكك بتاريخ {expiryDate}. يمكنك التجديد اليوم لإعادة التفعيل فوراً.",
    day3: "مرحباً {name}، تذكير بأن اشتراكك انتهى بتاريخ {expiryDate}. يمكننا إعادة التفعيل في أي وقت.",
    day7: "مرحباً {name}، نفتقد حضورك في الصالة. انتهى اشتراكك بتاريخ {expiryDate}. راسلنا إذا أردت المساعدة في التجديد.",
    day14: "آخر تذكير يا {name}: ما زالت عضويتك غير مفعلة منذ {expiryDate}. جدّد الآن إذا أردت الاستمرار.",
  },
} as const;

export const DEFAULT_ONBOARDING_TEMPLATES = {
  en: {
    firstVisit: "Great first visit, {name}. Keep the momentum going and book your next workout this week.",
    noReturnDay7: "Hi {name}, we noticed you have not been back yet. Your best results come from the first few visits. Want us to help you plan your next session?",
    lowEngagementDay14: "Hi {name}, your first two weeks matter most. We can help you build a routine that fits your schedule. Reply if you want support.",
  },
  ar: {
    firstVisit: "بداية ممتازة يا {name}. حافظ على الحماس وحدد تمرينك القادم هذا الأسبوع.",
    noReturnDay7: "مرحباً {name}، لاحظنا أنك لم تعد بعد. أفضل النتائج تأتي من أول الزيارات. هل تريد مساعدتنا في ترتيب حصتك القادمة؟",
    lowEngagementDay14: "مرحباً {name}، أول أسبوعين هم الأهم. نستطيع مساعدتك في بناء روتين مناسب لوقتك. راسلنا إذا أردت دعماً.",
  },
} as const;

export const DEFAULT_HABIT_BREAK_TEMPLATE_EN =
  "Hi {name}, we noticed you have not checked in for {daysAbsent} days after a strong start. Keep your momentum going and plan your next workout this week.";
export const DEFAULT_HABIT_BREAK_TEMPLATE_AR =
  "مرحباً {name}، لاحظنا أنك لم تسجل حضوراً منذ {daysAbsent} أيام بعد بداية جيدة. حافظ على الزخم وحدد تمرينك القادم هذا الأسبوع.";

export const DEFAULT_STREAK_TEMPLATE_EN =
  "Great work, {name}. You just hit a {streakDays}-day streak at the gym. Keep showing up and protect your progress.";
export const DEFAULT_STREAK_TEMPLATE_AR =
  "عمل رائع يا {name}. وصلت الآن إلى سلسلة حضور لمدة {streakDays} أيام في الجيم. استمر واحمِ تقدمك.";

export const DEFAULT_FREEZE_ENDING_TEMPLATE_EN =
  "Hi {name}, your freeze ends on {resumeDate}. We are ready to welcome you back. Reply if you want help planning your return.";
export const DEFAULT_FREEZE_ENDING_TEMPLATE_AR =
  "مرحباً {name}، ينتهي التجميد بتاريخ {resumeDate}. نحن جاهزون لاستقبالك من جديد. راسلنا إذا أردت المساعدة في ترتيب عودتك.";

export const DEFAULT_BEHAVIOR_TEMPLATES = {
  en: {
    habitBreak: DEFAULT_HABIT_BREAK_TEMPLATE_EN,
    streaks: DEFAULT_STREAK_TEMPLATE_EN,
    freezeEnding: DEFAULT_FREEZE_ENDING_TEMPLATE_EN,
  },
  ar: {
    habitBreak: DEFAULT_HABIT_BREAK_TEMPLATE_AR,
    streaks: DEFAULT_STREAK_TEMPLATE_AR,
    freezeEnding: DEFAULT_FREEZE_ENDING_TEMPLATE_AR,
  },
} as const;

export const WHATSAPP_AUTOMATION_GROUPS: WhatsAppAutomationGroup[] = [
  {
    id: "operational",
    title: { en: "Operational", ar: "تشغيلي" },
    description: {
      en: "Live baseline messages that keep the gym running smoothly.",
      ar: "رسائل أساسية تعمل الآن وتحافظ على التشغيل اليومي.",
    },
  },
  {
    id: "recovery",
    title: { en: "Recovery", ar: "استرجاع" },
    description: {
      en: "Revenue recovery sequences for memberships that expire without renewal.",
      ar: "تسلسلات استرجاع للإيراد عند انتهاء الاشتراكات دون تجديد.",
    },
  },
  {
    id: "onboarding",
    title: { en: "Onboarding", ar: "تهيئة" },
    description: {
      en: "Early retention messages that help new members build a habit.",
      ar: "رسائل احتفاظ مبكرة تساعد العضو الجديد على بناء عادة.",
    },
  },
  {
    id: "behavior",
    title: { en: "Behavior", ar: "سلوك" },
    description: {
      en: "Future behavior-based nudges and consistency reinforcement.",
      ar: "تنبيهات سلوكية مستقبلية ورسائل لتعزيز الانتظام.",
    },
  },
  {
    id: "owner_ops",
    title: { en: "Owner Ops", ar: "تشغيل المالك" },
    description: {
      en: "Owner-facing operational summaries and controls.",
      ar: "ملخصات وتشغيل موجّهة لمالك الجيم.",
    },
  },
];

export const WHATSAPP_AUTOMATIONS: WhatsAppAutomationDefinition[] = [
  {
    id: "welcome",
    group: "operational",
    title: { en: "Welcome message", ar: "رسالة الترحيب" },
    description: {
      en: "Sent when a new member is added. This is onboarding step 1 and stays live.",
      ar: "ترسل عند إضافة عضو جديد. هذه هي الخطوة الأولى من التهيئة وتبقى مفعلة.",
    },
    status: "live",
    ownerControlled: true,
    editableTemplates: true,
    warningEligible: true,
    warningLabel: { en: "Welcome", ar: "ترحيب" },
  },
  {
    id: "renewal",
    group: "operational",
    title: { en: "Renewal reminders", ar: "تذكيرات التجديد" },
    description: {
      en: "Locked GymFlow timing: 14, 7, and 3 days before expiry.",
      ar: "توقيت ثابت من GymFlow: قبل الانتهاء بـ 14 و7 و3 أيام.",
    },
    status: "live",
    ownerControlled: true,
    editableTemplates: true,
    warningEligible: true,
    warningLabel: { en: "Renewal", ar: "تجديد" },
  },
  {
    id: "qr_code",
    group: "operational",
    title: { en: "QR send", ar: "إرسال QR" },
    description: {
      en: "Owner or staff triggered QR delivery for smoother check-in.",
      ar: "إرسال QR يدوياً من المالك أو الموظف لتسهيل الدخول.",
    },
    status: "live",
    ownerControlled: false,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "QR", ar: "QR" },
  },
  {
    id: "broadcast",
    group: "operational",
    title: { en: "Broadcast campaigns", ar: "البث الجماعي" },
    description: {
      en: "Manual campaigns stay available and count toward warnings.",
      ar: "الحملات اليدوية تظل متاحة وتُحتسب ضمن التحذيرات.",
    },
    status: "live",
    ownerControlled: false,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Broadcast", ar: "بث جماعي" },
  },
  {
    id: "post_expiry",
    group: "recovery",
    title: { en: "Post-expiry recovery", ar: "استرجاع ما بعد الانتهاء" },
    description: {
      en: "Day 0, 3, 7, and 14 recovery sequence. Implemented in the worker, but blocked by default until rollout.",
      ar: "تسلسل استرجاع في يوم 0 و3 و7 و14. منفذ داخل العامل لكنه محجوب افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: true,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Post-expiry", ar: "ما بعد الانتهاء" },
    settingKey: "whatsapp_post_expiry_enabled",
  },
  {
    id: "onboarding",
    group: "onboarding",
    title: { en: "Early onboarding", ar: "تهيئة مبكرة" },
    description: {
      en: "Welcome is live; later onboarding steps are implemented in the worker but blocked by default until rollout.",
      ar: "رسالة الترحيب مفعلة؛ بقية خطوات التهيئة منفذة داخل العامل لكنها محجوبة افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: true,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Onboarding", ar: "تهيئة" },
    settingKey: "whatsapp_onboarding_enabled",
  },
  {
    id: "habit_break",
    group: "behavior",
    title: { en: "Habit-break nudge", ar: "تنبيه انقطاع العادة" },
    description: {
      en: "Behavior-based retention nudge. Implemented in the worker, but blocked by default until rollout.",
      ar: "تنبيه احتفاظ سلوكي. منفذ داخل العامل لكنه محجوب افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: true,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Habit-break", ar: "انقطاع العادة" },
    settingKey: "whatsapp_habit_break_enabled",
  },
  {
    id: "streaks",
    group: "behavior",
    title: { en: "Streak encouragement", ar: "تشجيع الاستمرارية" },
    description: {
      en: "Milestone encouragement sequence. Implemented in the worker, but blocked by default until rollout.",
      ar: "تسلسل تشجيع للإنجازات. منفذ داخل العامل لكنه محجوب افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: true,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Streaks", ar: "الاستمرارية" },
    settingKey: "whatsapp_streaks_enabled",
  },
  {
    id: "freeze_ending",
    group: "behavior",
    title: { en: "Freeze-ending reminder", ar: "تذكير انتهاء التجميد" },
    description: {
      en: "Freeze return reminder. Implemented in the worker, but blocked by default until rollout.",
      ar: "تذكير بعودة العضو بعد التجميد. منفذ داخل العامل لكنه محجوب افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: true,
    editableTemplates: false,
    warningEligible: true,
    warningLabel: { en: "Freeze ending", ar: "انتهاء التجميد" },
    settingKey: "whatsapp_freeze_ending_enabled",
  },
  {
    id: "weekly_digest",
    group: "owner_ops",
    title: { en: "Weekly digest", ar: "الملخص الأسبوعي" },
    description: {
      en: "Owner-facing summary. Implemented in the worker, but blocked by default until rollout.",
      ar: "ملخص موجّه للمالك. منفذ داخل العامل لكنه محجوب افتراضياً حتى الإطلاق.",
    },
    status: "blocked",
    ownerControlled: false,
    editableTemplates: false,
    warningEligible: false,
    warningLabel: { en: "Weekly digest", ar: "الملخص الأسبوعي" },
    settingKey: "whatsapp_weekly_digest_enabled",
  },
];

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

export function getAutomationDefinition(id: WhatsAppAutomationId) {
  return WHATSAPP_AUTOMATIONS.find((item) => item.id === id) || null;
}

export function getAutomationGroup(groupId: WhatsAppAutomationGroupId) {
  return WHATSAPP_AUTOMATION_GROUPS.find((group) => group.id === groupId) || null;
}

export function getAutomationStatusLabel(status: WhatsAppAutomationState, lang: SystemLanguage) {
  if (status === "live") return lang === "ar" ? "مباشر" : "Live";
  if (status === "blocked") return lang === "ar" ? "محجوب" : "Blocked";
  return lang === "ar" ? "مخطط" : "Planned";
}

export function getAutomationSettingKey(id: WhatsAppAutomationId) {
  return getAutomationDefinition(id)?.settingKey ?? null;
}

export function isAutomationLocked(id: WhatsAppAutomationId) {
  const definition = getAutomationDefinition(id);
  return definition?.status !== "live";
}

export function getLockedReminderDays() {
  return [...LOCKED_RENEWAL_REMINDER_DAYS];
}

export function getReminderDaysLabel(lang: SystemLanguage) {
  const days = LOCKED_RENEWAL_REMINDER_DAYS.join(", ");
  return lang === "ar" ? `ثابتة من GymFlow: ${days}` : `Locked by GymFlow: ${days}`;
}

export function classifyAutomationSource(type: string, sequenceKind?: string | null): WhatsAppAutomationId | "manual" {
  if (sequenceKind === "post_expiry") return "post_expiry";
  if (sequenceKind?.startsWith("onboarding_")) return "onboarding";
  if (sequenceKind === "habit_break") return "habit_break";
  if (sequenceKind === "streak") return "streaks";
  if (sequenceKind === "freeze_ending") return "freeze_ending";
  if (sequenceKind === "weekly_digest") return "weekly_digest";
  if (type === "welcome") return "welcome";
  if (type === "renewal") return "renewal";
  if (type === "qr_code") return "qr_code";
  if (type === "broadcast") return "broadcast";
  return "manual";
}

export function getAutomationWarningLabel(key: string, lang: SystemLanguage) {
  const definition = WHATSAPP_AUTOMATIONS.find((item) => item.id === key);
  if (definition) return definition.warningLabel[lang];
  return lang === "ar" ? "يدوي" : "Manual";
}

export function getBehaviorTemplateKey(
  type: "habit_break" | "streak" | "freeze_ending",
  lang: SystemLanguage
) {
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
  const raw = typeof value === "string" && value.trim().length > 0 ? value : DEFAULT_REMINDER_DAYS;

  const parsed = raw
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 60);

  const unique = Array.from(new Set(parsed)).sort((a, b) => b - a);
  return unique.length > 0 ? unique : [...LOCKED_RENEWAL_REMINDER_DAYS];
}

export function parseBooleanSetting(value: unknown, fallback = true): boolean {
  return toBoolean(value, fallback);
}

export function parseTextSetting(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.raw === "string") return rec.raw.trim();
    if (typeof rec.value === "string") return rec.value.trim();
  }
  return "";
}
