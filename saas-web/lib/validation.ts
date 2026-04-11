import { z } from "zod";

const e164Regex = /^\+[1-9]\d{7,14}$/;
export const paymentMethodSchema = z.enum(["cash", "digital"]);

const e164PhoneSchema = z
  .string()
  .trim()
  .regex(e164Regex, "Phone number must be in E.164 format like +15551234567");

const registerBaseSchema = z.object({
  ownerName: z.string().trim().min(2),
  organizationName: z.string().trim().min(2),
  branchName: z.string().trim().min(2)
});

const emailRegisterSchema = registerBaseSchema.extend({
  authMethod: z.literal("email"),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phone: e164PhoneSchema.optional(),
  idToken: z.undefined().optional()
});

const googleRegisterSchema = registerBaseSchema.extend({
  authMethod: z.literal("google"),
  idToken: z.string().min(20),
  email: z.string().trim().email().optional(),
  phone: e164PhoneSchema.optional(),
  password: z.undefined().optional()
});

const phoneRegisterSchema = registerBaseSchema
  .extend({
    authMethod: z.literal("phone"),
    idToken: z.string().min(20),
    phone: e164PhoneSchema,
    email: z.string().trim().email().optional(),
    password: z.undefined().optional()
  })
  .refine((value) => Boolean(value.phone), {
    message: "Phone number is required for phone sign-up",
    path: ["phone"]
  });

export const registerSchema = z.union([emailRegisterSchema, googleRegisterSchema, phoneRegisterSchema]);

const passwordLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  idToken: z.undefined().optional()
});

const tokenLoginSchema = z.object({
  idToken: z.string().min(20),
  email: z.string().trim().email().optional(),
  password: z.undefined().optional()
});

export const loginSchema = z.union([passwordLoginSchema, tokenLoginSchema]);

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  phone: z.string().min(5),
  gender: z.enum(["male", "female"]).default("male"),
  photo_path: z.string().optional().nullable(),
  access_tier: z.string().default("full"),
  card_code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  from_guest_pass_id: z.string().uuid().optional().nullable()
});

export const subscriptionSchema = z.object({
  member_id: z.string().uuid(),
  start_date: z.number().int().positive(),
  end_date: z.number().int().positive().optional(),
  plan_months: z.number().int().positive(),
  price_paid: z.number().optional().nullable(),
  sessions_per_month: z.number().int().positive().optional().nullable(),
  payment_method: paymentMethodSchema.optional().nullable()
});

export const subscriptionPatchSchema = z.object({
  id: z.coerce.number().int().positive(),
  is_active: z.boolean().optional(),
  price_paid: z.number().optional().nullable(),
  payment_method: paymentMethodSchema.optional().nullable(),
  start_date: z.number().int().positive().optional(),
  end_date: z.number().int().positive().optional(),
  plan_months: z.number().int().positive().optional(),
  sessions_per_month: z.number().int().positive().optional().nullable()
});

export const subscriptionRenewSchema = z.object({
  member_id: z.string().uuid(),
  previous_subscription_id: z.coerce.number().int().positive(),
  plan_months: z.number().int().positive(),
  price_paid: z.number().min(0).optional().nullable(),
  sessions_per_month: z.number().int().positive().optional().nullable(),
  payment_method: paymentMethodSchema.optional().nullable()
});

export const attendanceSchema = z.object({
  scannedValue: z.string().min(1),
  method: z.enum(["scan", "manual", "camera"]).default("scan"),
  operationId: z.string().uuid().optional(),
  source: z.enum(["online", "offline_sync"]).default("online"),
  offlineTimestamp: z.number().int().positive().optional(),
  deviceId: z.string().optional()
});

export const settingsPutSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
}).superRefine((payload, ctx) => {
  const reminderValue = payload.values.whatsapp_reminder_days;
  if (reminderValue === undefined) return;
  if (typeof reminderValue !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["values", "whatsapp_reminder_days"],
      message: "WhatsApp reminder days must be a comma-separated string"
    });
    return;
  }

  const parsed = reminderValue
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 60);

  if (parsed.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["values", "whatsapp_reminder_days"],
      message: "Select at least one WhatsApp reminder day"
    });
  }
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2),
  title: z.string().trim().max(100).optional().or(z.literal("")),
  phone: e164PhoneSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
  role: z.enum(["manager", "staff", "trainer"])
});

export const staffPatchSchema = z.object({
  is_active: z.boolean().optional(),
  resend_invite: z.boolean().optional(),
  replacement_trainer_staff_user_id: z.string().uuid().nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  certifications: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  beginner_friendly: z.boolean().optional()
});

export const staffAcceptInviteSchema = z.object({
  token: z.string().trim().min(10),
  idToken: z.string().min(20)
});

export const trainerAssignmentSchema = z.object({
  trainer_staff_user_id: z.string().uuid().nullable()
});

export const ptPackageCreateSchema = z.object({
  member_id: z.string().uuid(),
  assigned_trainer_staff_user_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  total_sessions: z.number().int().positive().max(500),
  price_paid: z.number().min(0),
  payment_method: paymentMethodSchema.optional().nullable(),
  valid_from: z.string().trim().min(1),
  valid_until: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const ptPackagePatchSchema = z.object({
  assigned_trainer_staff_user_id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  total_sessions: z.number().int().positive().max(500).optional(),
  price_paid: z.number().min(0).optional(),
  payment_method: paymentMethodSchema.optional().nullable(),
  valid_from: z.string().trim().min(1).optional(),
  valid_until: z.string().trim().min(1).optional(),
  status: z.enum(["active", "exhausted", "expired", "cancelled"]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  cancelled_reason: z.string().trim().max(500).optional().nullable()
});

export const ptSessionCreateSchema = z.object({
  package_id: z.string().uuid(),
  member_id: z.string().uuid(),
  trainer_staff_user_id: z.string().uuid(),
  scheduled_start: z.string().trim().min(1),
  scheduled_end: z.string().trim().min(1).optional(),
  duration_minutes: z.number().int().positive().max(24 * 60).optional(),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const ptSessionPatchSchema = z.object({
  trainer_staff_user_id: z.string().uuid().optional(),
  scheduled_start: z.string().trim().min(1).optional(),
  scheduled_end: z.string().trim().min(1).optional(),
  duration_minutes: z.number().int().positive().max(24 * 60).optional(),
  status: z.enum(["scheduled", "completed", "no_show", "late_cancel", "cancelled"]).optional(),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const trainerAvailabilityPutSchema = z.object({
  slots: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      start_minute: z.number().int().min(0).max(1439),
      end_minute: z.number().int().min(1).max(1440),
      is_active: z.boolean().optional()
    })
  ).max(70),
  time_off: z.array(
    z.object({
      starts_at: z.string().trim().min(1),
      ends_at: z.string().trim().min(1),
      reason: z.string().trim().max(500).optional().nullable()
    })
  ).max(100).optional()
});

export const whatsappQueueRetrySchema = z.object({
  ids: z.array(z.string().uuid()).max(500).optional()
});

export const whatsappBroadcastFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "active", "expired", "no_sub"]).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  planMonthsMin: z.number().int().min(1).max(60).nullable().optional(),
  planMonthsMax: z.number().int().min(1).max(60).nullable().optional(),
  daysLeftMin: z.number().int().min(-365).max(365).nullable().optional(),
  daysLeftMax: z.number().int().min(-365).max(365).nullable().optional(),
  createdFrom: z.string().trim().optional().nullable(),
  createdTo: z.string().trim().optional().nullable(),
  sessionsRemainingMax: z.number().int().min(0).max(10000).nullable().optional()
});

export const whatsappBroadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
  filters: whatsappBroadcastFiltersSchema.default({})
});

const branchArchiveSchema = z.object({
  version: z.string().optional(),
  generated_at: z.string().optional(),
  organization_id: z.string().optional(),
  branch_id: z.string().optional(),
  tables: z.object({
    members: z.array(z.record(z.string(), z.unknown())).optional(),
    subscriptions: z.array(z.record(z.string(), z.unknown())).optional(),
    subscription_freezes: z.array(z.record(z.string(), z.unknown())).optional(),
    quotas: z.array(z.record(z.string(), z.unknown())).optional(),
    logs: z.array(z.record(z.string(), z.unknown())).optional(),
    guest_passes: z.array(z.record(z.string(), z.unknown())).optional(),
    settings: z.union([
      z.array(z.record(z.string(), z.unknown())),
      z.record(z.string(), z.unknown())
    ]).optional(),
    message_queue: z.array(z.record(z.string(), z.unknown())).optional()
  }).optional(),
  members: z.array(z.record(z.string(), z.unknown())).optional(),
  subscriptions: z.array(z.record(z.string(), z.unknown())).optional(),
  subscription_freezes: z.array(z.record(z.string(), z.unknown())).optional(),
  quotas: z.array(z.record(z.string(), z.unknown())).optional(),
  logs: z.array(z.record(z.string(), z.unknown())).optional(),
  guest_passes: z.array(z.record(z.string(), z.unknown())).optional(),
  settings: z.union([
    z.array(z.record(z.string(), z.unknown())),
    z.record(z.string(), z.unknown())
  ]).optional(),
  message_queue: z.array(z.record(z.string(), z.unknown())).optional()
});

export const migrationUploadSchema = z.object({
  fileName: z.string().min(1),
  payload: branchArchiveSchema
});
