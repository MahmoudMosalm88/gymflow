import { z } from "zod";

const e164Regex = /^\+[1-9]\d{7,14}$/;

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
  address: z.string().optional().nullable()
});

export const subscriptionSchema = z.object({
  member_id: z.string().uuid(),
  start_date: z.number().int().positive(),
  end_date: z.number().int().positive().optional(),
  plan_months: z.number().int().positive(),
  price_paid: z.number().optional().nullable(),
  sessions_per_month: z.number().int().positive().optional().nullable()
});

export const subscriptionPatchSchema = z.object({
  id: z.coerce.number().int().positive(),
  is_active: z.boolean().optional(),
  price_paid: z.number().optional().nullable(),
  start_date: z.number().int().positive().optional(),
  end_date: z.number().int().positive().optional(),
  plan_months: z.number().int().positive().optional(),
  sessions_per_month: z.number().int().positive().optional().nullable()
});

export const attendanceSchema = z.object({
  scannedValue: z.string().min(1),
  method: z.enum(["scan", "manual"]).default("scan"),
  operationId: z.string().uuid().optional(),
  source: z.enum(["online", "offline_sync"]).default("online"),
  offlineTimestamp: z.number().int().positive().optional(),
  deviceId: z.string().optional()
});

export const settingsPutSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
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
