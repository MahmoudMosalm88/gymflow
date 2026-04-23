import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db";
import type { ActorType } from "@/lib/session";

export type PtPackageStatus = "active" | "exhausted" | "expired" | "cancelled";
export type PtSessionStatus = "scheduled" | "completed" | "no_show" | "late_cancel" | "cancelled";

export type PtSettings = {
  sessionDefaultMinutes: number;
  noShowDeducts: boolean;
  lateCancelDeducts: boolean;
  lowBalanceThresholdSessions: number;
  expiryWarningDays: number;
  reminderHoursBefore: number;
};

export type PtPackageRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  member_id: string;
  assigned_trainer_staff_user_id: string;
  sold_by_actor_type: ActorType;
  sold_by_actor_id: string;
  title: string;
  total_sessions: number;
  sessions_used: number;
  price_paid: string | number;
  payment_method: "cash" | "digital" | null;
  valid_from: string;
  valid_until: string;
  status: PtPackageStatus;
  notes: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string;
  member_phone?: string | null;
  trainer_name?: string;
  trainer_phone?: string | null;
  sessions_remaining?: number;
  next_session_at?: string | null;
  last_session_at?: string | null;
};

export type PtPackageViewRow = PtPackageRow & {
  member_name?: string;
  member_phone?: string | null;
  trainer_name?: string;
  trainer_phone?: string | null;
  sessions_remaining: number;
  next_session_at?: string | null;
  last_session_at?: string | null;
};

export type PtSessionRow = {
  id: string;
  package_id: string;
  member_id: string;
  trainer_staff_user_id: string;
  scheduled_start: string;
  scheduled_end: string;
  completed_at: string | null;
  status: PtSessionStatus;
  deducts_session: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string;
  member_phone?: string | null;
  trainer_name?: string;
  package_title?: string;
};

export type PtSessionViewRow = PtSessionRow & {
  member_name?: string;
  member_phone?: string | null;
  trainer_name?: string;
  package_title?: string;
};

export type TrainerAvailabilitySlot = {
  id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
  is_active: boolean;
};

export type TrainerTimeOffRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

const PT_SETTING_DEFAULTS: PtSettings = {
  sessionDefaultMinutes: 60,
  noShowDeducts: true,
  lateCancelDeducts: true,
  lowBalanceThresholdSessions: 2,
  expiryWarningDays: 3,
  reminderHoursBefore: 24,
};

function toIsoOrThrow(value: string, fieldName: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid`);
  }
  return parsed.toISOString();
}

function derivePackageStatus(input: {
  status: PtPackageStatus;
  validUntil: string;
  totalSessions: number;
  sessionsUsed: number;
}) {
  if (input.status === "cancelled") return "cancelled" as const;
  if (input.sessionsUsed >= input.totalSessions) return "exhausted" as const;
  if (new Date(input.validUntil).getTime() < Date.now()) return "expired" as const;
  return "active" as const;
}

async function loadTrainerRow(
  client: PoolClient,
  organizationId: string,
  branchId: string,
  trainerStaffUserId: string
) {
  const rows = await client.query<{ id: string; role: string; is_active: boolean }>(
    `SELECT id, role, is_active
       FROM staff_users
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
      LIMIT 1`,
    [trainerStaffUserId, organizationId, branchId]
  );
  const trainer = rows.rows[0];
  if (!trainer || trainer.role !== "trainer" || !trainer.is_active) {
    throw new Error("Trainer not found");
  }
  return trainer;
}

async function enqueuePtLowBalanceIfNeeded(
  client: PoolClient,
  input: {
    organizationId: string;
    branchId: string;
    packageRow: PtPackageRow;
    threshold: number;
  }
) {
  const remaining = Math.max(0, input.packageRow.total_sessions - input.packageRow.sessions_used);
  if (input.packageRow.status !== "active" || remaining > input.threshold) return;

  const memberRows = await client.query<{ name: string; phone: string | null }>(
    `SELECT name, phone
       FROM members
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
      LIMIT 1`,
    [input.packageRow.member_id, input.organizationId, input.branchId]
  );
  const member = memberRows.rows[0];
  if (!member?.phone) return;

  const existingRows = await client.query<{ id: string }>(
    `SELECT id
       FROM message_queue
      WHERE organization_id = $1
        AND branch_id = $2
        AND member_id = $3
        AND type = 'pt_low_balance'
        AND status IN ('pending', 'processing', 'sent')
        AND payload->>'package_id' = $4
        AND payload->>'sessions_remaining' = $5
      LIMIT 1`,
    [input.organizationId, input.branchId, input.packageRow.member_id, input.packageRow.id, String(remaining)]
  );
  if (existingRows.rows[0]) return;

  await client.query(
    `INSERT INTO message_queue (
        id, organization_id, branch_id, member_id, type, target_phone, target_name, payload, status, attempts, scheduled_at
     ) VALUES (
        $1, $2, $3, $4, 'pt_low_balance', $5, $6, $7::jsonb, 'pending', 0, NOW()
     )`,
    [
      randomUUID(),
      input.organizationId,
      input.branchId,
      input.packageRow.member_id,
      member.phone,
      member.name,
      JSON.stringify({
        message: `Hi ${member.name}, you have ${remaining} PT sessions left in ${input.packageRow.title}. Reply to renew before it runs out.`,
        package_id: input.packageRow.id,
        package_title: input.packageRow.title,
        sessions_remaining: remaining,
        phone: member.phone,
        name: member.name,
        generated_at: new Date().toISOString(),
      }),
    ]
  );
}

async function loadMemberRow(
  client: PoolClient,
  organizationId: string,
  branchId: string,
  memberId: string
) {
  const rows = await client.query<{ id: string }>(
    `SELECT id
       FROM members
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
        AND deleted_at IS NULL
      LIMIT 1`,
    [memberId, organizationId, branchId]
  );
  if (!rows.rows[0]) {
    throw new Error("Member not found");
  }
}

async function loadPtSettingsWithClient(client: PoolClient, organizationId: string, branchId: string) {
  const rows = await client.query<{ key: string; value: unknown }>(
    `SELECT key, value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key = ANY($3::text[])`,
    [
      organizationId,
      branchId,
      [
        "pt_session_default_minutes",
        "pt_no_show_deducts",
        "pt_late_cancel_deducts",
        "pt_low_balance_threshold_sessions",
        "pt_expiry_warning_days",
        "pt_reminder_hours_before",
      ],
    ]
  );

  const map = new Map(rows.rows.map((row) => [row.key, row.value]));
  return {
    sessionDefaultMinutes: Number(map.get("pt_session_default_minutes") ?? PT_SETTING_DEFAULTS.sessionDefaultMinutes),
    noShowDeducts: Boolean(map.get("pt_no_show_deducts") ?? PT_SETTING_DEFAULTS.noShowDeducts),
    lateCancelDeducts: Boolean(map.get("pt_late_cancel_deducts") ?? PT_SETTING_DEFAULTS.lateCancelDeducts),
    lowBalanceThresholdSessions: Number(
      map.get("pt_low_balance_threshold_sessions") ?? PT_SETTING_DEFAULTS.lowBalanceThresholdSessions
    ),
    expiryWarningDays: Number(map.get("pt_expiry_warning_days") ?? PT_SETTING_DEFAULTS.expiryWarningDays),
    reminderHoursBefore: Number(map.get("pt_reminder_hours_before") ?? PT_SETTING_DEFAULTS.reminderHoursBefore),
  } satisfies PtSettings;
}

export async function getPtSettings(organizationId: string, branchId: string) {
  return withTransaction((client) => loadPtSettingsWithClient(client, organizationId, branchId));
}

async function ensureTrainerAvailability(
  client: PoolClient,
  input: {
    organizationId: string;
    branchId: string;
    trainerStaffUserId: string;
    scheduledStart: string;
    scheduledEnd: string;
    excludeSessionId?: string | null;
  }
) {
  const overlapRows = await client.query<{ id: string }>(
    `SELECT id
       FROM pt_sessions
      WHERE organization_id = $1
        AND branch_id = $2
        AND trainer_staff_user_id = $3
        AND status = 'scheduled'
        AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange($4::timestamptz, $5::timestamptz, '[)')
        AND ($6::uuid IS NULL OR id <> $6::uuid)
      LIMIT 1`,
    [
      input.organizationId,
      input.branchId,
      input.trainerStaffUserId,
      input.scheduledStart,
      input.scheduledEnd,
      input.excludeSessionId || null,
    ]
  );
  if (overlapRows.rows[0]) {
    throw new Error("Trainer already has a session in this slot");
  }

  const timeOffRows = await client.query<{ id: string }>(
    `SELECT id
       FROM trainer_time_off
      WHERE organization_id = $1
        AND branch_id = $2
        AND trainer_staff_user_id = $3
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange($4::timestamptz, $5::timestamptz, '[)')
      LIMIT 1`,
    [input.organizationId, input.branchId, input.trainerStaffUserId, input.scheduledStart, input.scheduledEnd]
  );
  if (timeOffRows.rows[0]) {
    throw new Error("Trainer is marked unavailable for this time");
  }

  const start = new Date(input.scheduledStart);
  const end = new Date(input.scheduledEnd);
  const weekday = start.getUTCDay();
  const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
  const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();

  const configuredAvailabilityRows = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM trainer_availability
      WHERE organization_id = $1
        AND branch_id = $2
        AND trainer_staff_user_id = $3
        AND is_active = true`,
    [input.organizationId, input.branchId, input.trainerStaffUserId]
  );
  if (Number(configuredAvailabilityRows.rows[0]?.count || 0) === 0) {
    return;
  }

  const availabilityRows = await client.query<{ id: string }>(
    `SELECT id
       FROM trainer_availability
      WHERE organization_id = $1
        AND branch_id = $2
        AND trainer_staff_user_id = $3
        AND weekday = $4
        AND is_active = true
        AND start_minute <= $5
        AND end_minute >= $6
      LIMIT 1`,
    [input.organizationId, input.branchId, input.trainerStaffUserId, weekday, startMinute, endMinute]
  );
  if (!availabilityRows.rows[0]) {
    throw new Error("Trainer is not available in this slot");
  }
}

async function ensureMemberAvailability(
  client: PoolClient,
  input: { organizationId: string; branchId: string; memberId: string; scheduledStart: string; scheduledEnd: string; excludeSessionId?: string | null }
) {
  const rows = await client.query<{ id: string }>(
    `SELECT id
       FROM pt_sessions
      WHERE organization_id = $1
        AND branch_id = $2
        AND member_id = $3
        AND status = 'scheduled'
        AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange($4::timestamptz, $5::timestamptz, '[)')
        AND ($6::uuid IS NULL OR id <> $6::uuid)
      LIMIT 1`,
    [input.organizationId, input.branchId, input.memberId, input.scheduledStart, input.scheduledEnd, input.excludeSessionId || null]
  );
  if (rows.rows[0]) {
    throw new Error("Client already has a PT session in this slot");
  }
}

export async function syncPtPackageState(client: PoolClient, packageId: string, organizationId: string, branchId: string) {
  const usageRows = await client.query<{
    total_sessions: number;
    current_status: PtPackageStatus;
    valid_until: string;
    sessions_used: string;
  }>(
    `SELECT p.total_sessions,
            p.status AS current_status,
            p.valid_until::text,
            COALESCE((
              SELECT COUNT(*)::int
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.organization_id = p.organization_id
                 AND s.branch_id = p.branch_id
                 AND s.deducts_session = true
                 AND s.status IN ('completed', 'no_show', 'late_cancel')
            ), 0)::text AS sessions_used
       FROM pt_packages p
      WHERE p.id = $1
        AND p.organization_id = $2
        AND p.branch_id = $3
      LIMIT 1
      FOR UPDATE`,
    [packageId, organizationId, branchId]
  );

  const pkg = usageRows.rows[0];
  if (!pkg) throw new Error("PT package not found");

  const sessionsUsed = Number(pkg.sessions_used || 0);
  const nextStatus = derivePackageStatus({
    status: pkg.current_status,
    validUntil: pkg.valid_until,
    totalSessions: pkg.total_sessions,
    sessionsUsed,
  });

  const rows = await client.query<PtPackageViewRow>(
    `UPDATE pt_packages
        SET sessions_used = $4,
            status = $5,
            updated_at = NOW()
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
    RETURNING *,
              GREATEST(total_sessions - sessions_used, 0) AS sessions_remaining`,
    [packageId, organizationId, branchId, sessionsUsed, nextStatus]
  );
  const updated = rows.rows[0];
  const settings = await loadPtSettingsWithClient(client, organizationId, branchId);
  await enqueuePtLowBalanceIfNeeded(client, {
    organizationId,
    branchId,
    packageRow: updated,
    threshold: settings.lowBalanceThresholdSessions,
  });
  return updated;
}

export async function listMemberPtPackages(organizationId: string, branchId: string, memberId: string) {
  return query<PtPackageViewRow>(
    `SELECT p.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            su.phone AS trainer_phone,
            GREATEST(p.total_sessions - p.sessions_used, 0) AS sessions_remaining,
            (
              SELECT MIN(scheduled_start)::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status = 'scheduled'
            ) AS next_session_at,
            (
              SELECT MAX(COALESCE(completed_at, scheduled_start))::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status IN ('completed', 'no_show', 'late_cancel')
            ) AS last_session_at
       FROM pt_packages p
       JOIN members m ON m.id = p.member_id
       JOIN staff_users su ON su.id = p.assigned_trainer_staff_user_id
      WHERE p.organization_id = $1
        AND p.branch_id = $2
        AND p.member_id = $3
      ORDER BY p.valid_until ASC, p.created_at DESC`,
    [organizationId, branchId, memberId]
  );
}

export async function listTrainerPtPackages(organizationId: string, branchId: string, trainerStaffUserId: string) {
  return query<PtPackageViewRow>(
    `SELECT p.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            su.phone AS trainer_phone,
            GREATEST(p.total_sessions - p.sessions_used, 0) AS sessions_remaining,
            (
              SELECT MIN(scheduled_start)::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status = 'scheduled'
            ) AS next_session_at,
            (
              SELECT MAX(COALESCE(completed_at, scheduled_start))::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status IN ('completed', 'no_show', 'late_cancel')
            ) AS last_session_at
       FROM pt_packages p
       JOIN members m ON m.id = p.member_id
       JOIN staff_users su ON su.id = p.assigned_trainer_staff_user_id
      WHERE p.organization_id = $1
        AND p.branch_id = $2
        AND p.assigned_trainer_staff_user_id = $3
      ORDER BY p.status = 'active' DESC, p.valid_until ASC, p.created_at DESC`,
    [organizationId, branchId, trainerStaffUserId]
  );
}

export async function listBranchPtPackages(organizationId: string, branchId: string) {
  return query<PtPackageViewRow>(
    `SELECT p.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            su.phone AS trainer_phone,
            GREATEST(p.total_sessions - p.sessions_used, 0) AS sessions_remaining,
            (
              SELECT MIN(scheduled_start)::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status = 'scheduled'
            ) AS next_session_at,
            (
              SELECT MAX(COALESCE(completed_at, scheduled_start))::text
                FROM pt_sessions s
               WHERE s.package_id = p.id
                 AND s.status IN ('completed', 'no_show', 'late_cancel')
            ) AS last_session_at
       FROM pt_packages p
       JOIN members m ON m.id = p.member_id
       JOIN staff_users su ON su.id = p.assigned_trainer_staff_user_id
      WHERE p.organization_id = $1
        AND p.branch_id = $2
      ORDER BY p.status = 'active' DESC, p.valid_until ASC, p.created_at DESC`,
    [organizationId, branchId]
  );
}

export async function listMemberPtSessions(organizationId: string, branchId: string, memberId: string) {
  return query<PtSessionViewRow>(
    `SELECT s.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            p.title AS package_title
       FROM pt_sessions s
       JOIN members m ON m.id = s.member_id
       JOIN staff_users su ON su.id = s.trainer_staff_user_id
       JOIN pt_packages p ON p.id = s.package_id
      WHERE s.organization_id = $1
        AND s.branch_id = $2
        AND s.member_id = $3
      ORDER BY s.scheduled_start DESC, s.created_at DESC`,
    [organizationId, branchId, memberId]
  );
}

export async function createPtPackage(input: {
  organizationId: string;
  branchId: string;
  memberId: string;
  assignedTrainerStaffUserId: string;
  soldByActorType: ActorType;
  soldByActorId: string;
  title: string;
  totalSessions: number;
  pricePaid: number;
  paymentMethod?: "cash" | "digital" | null;
  validFrom: string;
  validUntil: string;
  notes?: string | null;
}) {
  return withTransaction(async (client) => {
    await loadMemberRow(client, input.organizationId, input.branchId, input.memberId);
    await loadTrainerRow(client, input.organizationId, input.branchId, input.assignedTrainerStaffUserId);

    const validFrom = toIsoOrThrow(input.validFrom, "valid_from");
    const validUntil = toIsoOrThrow(input.validUntil, "valid_until");
    if (new Date(validUntil).getTime() <= new Date(validFrom).getTime()) {
      throw new Error("Package expiry must be after the start date");
    }

    const packageId = randomUUID();
    const rows = await client.query<PtPackageViewRow>(
      `INSERT INTO pt_packages (
          id,
          organization_id,
          branch_id,
          member_id,
          assigned_trainer_staff_user_id,
          sold_by_actor_type,
          sold_by_actor_id,
          title,
          total_sessions,
          sessions_used,
          price_paid,
          valid_from,
          valid_until,
          status,
          notes,
          created_at,
          updated_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11::timestamptz, $12::timestamptz, 'active', $13, NOW(), NOW()
       )
       RETURNING *,
                 total_sessions AS sessions_remaining`,
      [
        packageId,
        input.organizationId,
        input.branchId,
        input.memberId,
        input.assignedTrainerStaffUserId,
        input.soldByActorType,
        input.soldByActorId,
        input.title.trim(),
        input.totalSessions,
        input.pricePaid,
        validFrom,
        validUntil,
        input.notes || null,
      ]
    );

    await client.query(
      `INSERT INTO payments (
          organization_id,
          branch_id,
          member_id,
          amount,
          type,
          pt_package_id,
          payment_method,
          note,
          created_at
       ) VALUES ($1, $2, $3, $4, 'pt_package', $5, $6, $7, NOW())`,
      [
        input.organizationId,
        input.branchId,
        input.memberId,
        input.pricePaid,
        packageId,
        input.paymentMethod ?? null,
        input.notes || null,
      ]
    );

    return rows.rows[0];
  });
}

async function loadPackageForSession(
  client: PoolClient,
  input: { organizationId: string; branchId: string; packageId: string; memberId: string; trainerStaffUserId: string }
) {
  const rows = await client.query<PtPackageViewRow>(
    `SELECT *
       FROM pt_packages
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
        AND member_id = $4
        AND assigned_trainer_staff_user_id = $5
      LIMIT 1
      FOR UPDATE`,
    [input.packageId, input.organizationId, input.branchId, input.memberId, input.trainerStaffUserId]
  );
  const pkg = rows.rows[0];
  if (!pkg) throw new Error("PT package not found");
  const nextStatus = derivePackageStatus({
    status: pkg.status,
    validUntil: pkg.valid_until,
    totalSessions: pkg.total_sessions,
    sessionsUsed: pkg.sessions_used,
  });
  if (nextStatus !== "active") {
    throw new Error("PT package is not available for booking");
  }
  return pkg;
}

export async function createPtSession(input: {
  organizationId: string;
  branchId: string;
  packageId: string;
  memberId: string;
  trainerStaffUserId: string;
  createdByActorType: ActorType;
  createdByActorId: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
}) {
  return withTransaction(async (client) => {
    const settings = await loadPtSettingsWithClient(client, input.organizationId, input.branchId);
    const scheduledStart = toIsoOrThrow(input.scheduledStart, "scheduled_start");
    const scheduledEnd = input.scheduledEnd
      ? toIsoOrThrow(input.scheduledEnd, "scheduled_end")
      : new Date(new Date(scheduledStart).getTime() + (input.durationMinutes || settings.sessionDefaultMinutes) * 60_000)
          .toISOString();

    await loadMemberRow(client, input.organizationId, input.branchId, input.memberId);
    await loadTrainerRow(client, input.organizationId, input.branchId, input.trainerStaffUserId);
    await loadPackageForSession(client, {
      organizationId: input.organizationId,
      branchId: input.branchId,
      packageId: input.packageId,
      memberId: input.memberId,
      trainerStaffUserId: input.trainerStaffUserId,
    });

    await ensureTrainerAvailability(client, {
      organizationId: input.organizationId,
      branchId: input.branchId,
      trainerStaffUserId: input.trainerStaffUserId,
      scheduledStart,
      scheduledEnd,
    });
    await ensureMemberAvailability(client, {
      organizationId: input.organizationId,
      branchId: input.branchId,
      memberId: input.memberId,
      scheduledStart,
      scheduledEnd,
    });

    const rows = await client.query<PtSessionViewRow>(
      `INSERT INTO pt_sessions (
          id,
          organization_id,
          branch_id,
          package_id,
          member_id,
          trainer_staff_user_id,
          created_by_actor_type,
          created_by_actor_id,
          scheduled_start,
          scheduled_end,
          status,
          deducts_session,
          notes,
          created_at,
          updated_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, 'scheduled', false, $11, NOW(), NOW()
       )
       RETURNING *`,
      [
        randomUUID(),
        input.organizationId,
        input.branchId,
        input.packageId,
        input.memberId,
        input.trainerStaffUserId,
        input.createdByActorType,
        input.createdByActorId,
        scheduledStart,
        scheduledEnd,
        input.notes || null,
      ]
    );
    return rows.rows[0];
  });
}

export async function updatePtSession(input: {
  organizationId: string;
  branchId: string;
  sessionId: string;
  actorType: ActorType;
  actorId: string;
  role: "owner" | "manager" | "staff" | "trainer";
  trainerStaffUserId?: string | null;
  scheduledStart?: string;
  scheduledEnd?: string;
  durationMinutes?: number;
  status?: PtSessionStatus;
  notes?: string | null;
}) {
  return withTransaction(async (client) => {
    const settings = await loadPtSettingsWithClient(client, input.organizationId, input.branchId);
    const rows = await client.query<PtSessionRow & { package_status: PtPackageStatus; total_sessions: number; sessions_used: number }>(
      `SELECT s.*,
              p.status AS package_status,
              p.total_sessions,
              p.sessions_used
         FROM pt_sessions s
         JOIN pt_packages p ON p.id = s.package_id
        WHERE s.id = $1
          AND s.organization_id = $2
          AND s.branch_id = $3
        LIMIT 1
        FOR UPDATE`,
      [input.sessionId, input.organizationId, input.branchId]
    );
    const current = rows.rows[0];
    if (!current) throw new Error("PT session not found");
    if (input.role === "trainer" && input.trainerStaffUserId && current.trainer_staff_user_id !== input.trainerStaffUserId) {
      throw new Error("Forbidden");
    }

    const nextStart = input.scheduledStart ? toIsoOrThrow(input.scheduledStart, "scheduled_start") : current.scheduled_start;
    const nextEnd = input.scheduledEnd
      ? toIsoOrThrow(input.scheduledEnd, "scheduled_end")
      : input.durationMinutes
        ? new Date(new Date(nextStart).getTime() + input.durationMinutes * 60_000).toISOString()
        : current.scheduled_end;

    if (input.status === "scheduled" || input.scheduledStart || input.scheduledEnd || input.durationMinutes) {
      await ensureTrainerAvailability(client, {
        organizationId: input.organizationId,
        branchId: input.branchId,
        trainerStaffUserId: current.trainer_staff_user_id,
        scheduledStart: nextStart,
        scheduledEnd: nextEnd,
        excludeSessionId: current.id,
      });
      await ensureMemberAvailability(client, {
        organizationId: input.organizationId,
        branchId: input.branchId,
        memberId: current.member_id,
        scheduledStart: nextStart,
        scheduledEnd: nextEnd,
        excludeSessionId: current.id,
      });
    }

    let nextDeducts = current.deducts_session;
    let completedAt = current.completed_at;
    const nextStatus = input.status || current.status;
    if (nextStatus === "completed") {
      nextDeducts = true;
      completedAt = new Date().toISOString();
    } else if (nextStatus === "no_show") {
      nextDeducts = settings.noShowDeducts;
      completedAt = current.completed_at;
    } else if (nextStatus === "late_cancel") {
      nextDeducts = settings.lateCancelDeducts;
      completedAt = current.completed_at;
    } else if (nextStatus === "cancelled" || nextStatus === "scheduled") {
      nextDeducts = false;
      completedAt = nextStatus === "scheduled" ? null : current.completed_at;
    }

    const updatedRows = await client.query<PtSessionViewRow>(
      `UPDATE pt_sessions
          SET scheduled_start = $4::timestamptz,
              scheduled_end = $5::timestamptz,
              status = $6,
              deducts_session = $7,
              completed_at = $8::timestamptz,
              notes = COALESCE($9, notes),
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING *`,
      [
        input.sessionId,
        input.organizationId,
        input.branchId,
        nextStart,
        nextEnd,
        nextStatus,
        nextDeducts,
        completedAt,
        input.notes === undefined ? null : input.notes,
      ]
    );

    await syncPtPackageState(client, current.package_id, input.organizationId, input.branchId);
    return updatedRows.rows[0];
  });
}

export async function listTrainerPtSessions(input: {
  organizationId: string;
  branchId: string;
  trainerStaffUserId: string;
  from?: string | null;
  to?: string | null;
  statuses?: PtSessionStatus[];
}) {
  const values: unknown[] = [input.organizationId, input.branchId, input.trainerStaffUserId];
  const conditions = [
    `s.organization_id = $1`,
    `s.branch_id = $2`,
    `s.trainer_staff_user_id = $3`,
  ];

  if (input.from) {
    values.push(toIsoOrThrow(input.from, "from"));
    conditions.push(`s.scheduled_start >= $${values.length}::timestamptz`);
  }
  if (input.to) {
    values.push(toIsoOrThrow(input.to, "to"));
    conditions.push(`s.scheduled_start <= $${values.length}::timestamptz`);
  }
  if (input.statuses?.length) {
    values.push(input.statuses);
    conditions.push(`s.status = ANY($${values.length}::text[])`);
  }

  return query<PtSessionViewRow>(
    `SELECT s.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            p.title AS package_title
       FROM pt_sessions s
       JOIN members m ON m.id = s.member_id
       JOIN staff_users su ON su.id = s.trainer_staff_user_id
       JOIN pt_packages p ON p.id = s.package_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.scheduled_start ASC, s.created_at ASC`,
    values
  );
}

export async function listBranchPtSessions(input: {
  organizationId: string;
  branchId: string;
  from?: string | null;
  to?: string | null;
  statuses?: PtSessionStatus[];
}) {
  const values: unknown[] = [input.organizationId, input.branchId];
  const conditions = [`s.organization_id = $1`, `s.branch_id = $2`];

  if (input.from) {
    values.push(toIsoOrThrow(input.from, "from"));
    conditions.push(`s.scheduled_start >= $${values.length}::timestamptz`);
  }
  if (input.to) {
    values.push(toIsoOrThrow(input.to, "to"));
    conditions.push(`s.scheduled_start <= $${values.length}::timestamptz`);
  }
  if (input.statuses?.length) {
    values.push(input.statuses);
    conditions.push(`s.status = ANY($${values.length}::text[])`);
  }

  return query<PtSessionViewRow>(
    `SELECT s.*,
            m.name AS member_name,
            m.phone AS member_phone,
            su.name AS trainer_name,
            p.title AS package_title
       FROM pt_sessions s
       JOIN members m ON m.id = s.member_id
       JOIN staff_users su ON su.id = s.trainer_staff_user_id
       JOIN pt_packages p ON p.id = s.package_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.scheduled_start ASC, s.created_at ASC`,
    values
  );
}

export async function getTrainerAvailability(organizationId: string, branchId: string, trainerStaffUserId: string) {
  const [slots, timeOff] = await Promise.all([
    query<TrainerAvailabilitySlot>(
      `SELECT id, weekday, start_minute, end_minute, is_active
         FROM trainer_availability
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3
        ORDER BY weekday ASC, start_minute ASC`,
      [organizationId, branchId, trainerStaffUserId]
    ),
    query<TrainerTimeOffRow>(
      `SELECT id, starts_at::text, ends_at::text, reason
         FROM trainer_time_off
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3
        ORDER BY starts_at ASC`,
      [organizationId, branchId, trainerStaffUserId]
    ),
  ]);
  return { slots, timeOff };
}

export async function replaceTrainerAvailability(input: {
  organizationId: string;
  branchId: string;
  trainerStaffUserId: string;
  slots: Array<{ weekday: number; start_minute: number; end_minute: number; is_active?: boolean }>;
  timeOff?: Array<{ starts_at: string; ends_at: string; reason?: string | null }>;
}) {
  return withTransaction(async (client) => {
    await loadTrainerRow(client, input.organizationId, input.branchId, input.trainerStaffUserId);
    await client.query(
      `DELETE FROM trainer_availability
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3`,
      [input.organizationId, input.branchId, input.trainerStaffUserId]
    );
    await client.query(
      `DELETE FROM trainer_time_off
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3`,
      [input.organizationId, input.branchId, input.trainerStaffUserId]
    );

    for (const slot of input.slots) {
      await client.query(
        `INSERT INTO trainer_availability (
            id, organization_id, branch_id, trainer_staff_user_id, weekday, start_minute, end_minute, is_active, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          randomUUID(),
          input.organizationId,
          input.branchId,
          input.trainerStaffUserId,
          slot.weekday,
          slot.start_minute,
          slot.end_minute,
          slot.is_active ?? true,
        ]
      );
    }

    for (const entry of input.timeOff ?? []) {
      await client.query(
        `INSERT INTO trainer_time_off (
            id, organization_id, branch_id, trainer_staff_user_id, starts_at, ends_at, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, NOW())`,
        [
          randomUUID(),
          input.organizationId,
          input.branchId,
          input.trainerStaffUserId,
          toIsoOrThrow(entry.starts_at, "starts_at"),
          toIsoOrThrow(entry.ends_at, "ends_at"),
          entry.reason || null,
        ]
      );
    }

    return getTrainerAvailability(input.organizationId, input.branchId, input.trainerStaffUserId);
  });
}

export async function getTrainerDeactivationSummary(organizationId: string, branchId: string, trainerStaffUserId: string) {
  const rows = await query<{
    active_packages: string;
    future_sessions: string;
    assigned_members: string;
  }>(
    `SELECT
        (SELECT COUNT(*)::text
           FROM pt_packages
          WHERE organization_id = $1
            AND branch_id = $2
            AND assigned_trainer_staff_user_id = $3
            AND status = 'active') AS active_packages,
        (SELECT COUNT(*)::text
           FROM pt_sessions
          WHERE organization_id = $1
            AND branch_id = $2
            AND trainer_staff_user_id = $3
            AND status = 'scheduled'
            AND scheduled_start >= NOW()) AS future_sessions,
        (SELECT COUNT(*)::text
           FROM member_trainer_assignments
          WHERE organization_id = $1
            AND branch_id = $2
            AND trainer_staff_user_id = $3
            AND is_active = true) AS assigned_members`,
    [organizationId, branchId, trainerStaffUserId]
  );
  const row = rows[0];
  return {
    activePackages: Number(row?.active_packages || 0),
    futureSessions: Number(row?.future_sessions || 0),
    assignedMembers: Number(row?.assigned_members || 0),
  };
}

export async function reassignTrainerWorkload(input: {
  organizationId: string;
  branchId: string;
  fromTrainerStaffUserId: string;
  toTrainerStaffUserId: string;
}) {
  return withTransaction(async (client) => {
    await loadTrainerRow(client, input.organizationId, input.branchId, input.fromTrainerStaffUserId);
    await loadTrainerRow(client, input.organizationId, input.branchId, input.toTrainerStaffUserId);

    const memberRows = await client.query<{ member_id: string }>(
      `SELECT DISTINCT member_id
         FROM pt_packages
        WHERE organization_id = $1
          AND branch_id = $2
          AND assigned_trainer_staff_user_id = $3
          AND status = 'active'`,
      [input.organizationId, input.branchId, input.fromTrainerStaffUserId]
    );

    await client.query(
      `UPDATE pt_packages
          SET assigned_trainer_staff_user_id = $4,
              updated_at = NOW()
        WHERE organization_id = $1
          AND branch_id = $2
          AND assigned_trainer_staff_user_id = $3
          AND status = 'active'`,
      [input.organizationId, input.branchId, input.fromTrainerStaffUserId, input.toTrainerStaffUserId]
    );

    await client.query(
      `UPDATE pt_sessions
          SET trainer_staff_user_id = $4,
              updated_at = NOW()
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3
          AND status = 'scheduled'
          AND scheduled_start >= NOW()`,
      [input.organizationId, input.branchId, input.fromTrainerStaffUserId, input.toTrainerStaffUserId]
    );

    await client.query(
      `UPDATE member_trainer_assignments
          SET is_active = false,
              unassigned_at = NOW(),
              updated_at = NOW()
        WHERE organization_id = $1
          AND branch_id = $2
          AND trainer_staff_user_id = $3
          AND is_active = true`,
      [input.organizationId, input.branchId, input.fromTrainerStaffUserId]
    );

    for (const row of memberRows.rows) {
      await client.query(
        `UPDATE member_trainer_assignments
            SET is_active = false,
                unassigned_at = NOW(),
                updated_at = NOW()
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND is_active = true`,
        [input.organizationId, input.branchId, row.member_id]
      );
      await client.query(
        `INSERT INTO member_trainer_assignments (
            id,
            organization_id,
            branch_id,
            member_id,
            trainer_staff_user_id,
            assigned_by_actor_type,
            assigned_by_actor_id,
            assigned_at,
            is_active,
            created_at,
            updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'staff', $6, NOW(), true, NOW(), NOW())`,
        [randomUUID(), input.organizationId, input.branchId, row.member_id, input.toTrainerStaffUserId, input.toTrainerStaffUserId]
      );
    }
  });
}
