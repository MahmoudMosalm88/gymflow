import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { env } from "@/lib/env";
import { query, withTransaction } from "@/lib/db";
import { getActorAccessByFirebaseUid, toSessionProfile } from "@/lib/auth";
import type { AppRole } from "@/lib/session";

export type StaffRow = {
  id: string;
  name: string;
  title: string | null;
  phone: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  latest_invite_status: string | null;
  latest_invite_expires_at: string | null;
  latest_invite_opened_at: string | null;
  latest_invite_accepted_at: string | null;
  active_packages_count?: number;
  future_sessions_count?: number;
  assigned_members_count?: number;
};

type InviteLookupRow = {
  invite_id: string;
  token: string;
  phone: string;
  status: string;
  expires_at: string;
  opened_at: string | null;
  accepted_at: string | null;
  staff_user_id: string;
  staff_name: string;
  staff_email: string | null;
  role: AppRole;
  firebase_uid: string | null;
  is_active: boolean;
  organization_name: string;
  branch_name: string;
  organization_id: string;
  branch_id: string;
};

function getInviteUrl(token: string) {
  const base = env.APP_BASE_URL.replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

function buildInviteMessage(name: string, gymName: string, branchName: string, link: string) {
  return [
    `You were added to ${gymName} (${branchName}) on GymFlow.`,
    `Hi ${name}, tap this link to activate your team account: ${link}`,
    "",
    `تمت إضافتك إلى ${gymName} - ${branchName} على GymFlow.`,
    `يا ${name}، افتح هذا الرابط لتفعيل حساب فريق العمل: ${link}`,
  ].join("\n");
}

async function insertInviteQueueRow(
  client: PoolClient,
  input: { organizationId: string; branchId: string; phone: string; name: string; message: string }
) {
  await client.query(
    `INSERT INTO message_queue (
        id,
        organization_id,
        branch_id,
        member_id,
        target_phone,
        target_name,
        type,
        payload,
        status,
        attempts,
        scheduled_at
     ) VALUES (
        $1,
        $2,
        $3,
        NULL,
        $4,
        $5,
        'manual',
        $6::jsonb,
        'pending',
        0,
        NOW()
     )`,
    [
      randomUUID(),
      input.organizationId,
      input.branchId,
      input.phone,
      input.name,
      JSON.stringify({
        message: input.message,
        phone: input.phone,
        name: input.name,
        kind: "staff_invite",
      }),
    ]
  );
}

export async function listStaffUsers(organizationId: string, branchId: string) {
  return query<StaffRow>(
    `SELECT su.id,
            su.name,
            NULL::text AS title,
            su.phone,
            su.email,
            su.role,
            su.is_active,
            su.invited_at::text,
            su.accepted_at::text,
            su.created_at::text,
            si.status AS latest_invite_status,
            si.expires_at::text AS latest_invite_expires_at,
            si.opened_at::text AS latest_invite_opened_at,
            si.accepted_at::text AS latest_invite_accepted_at,
            CASE WHEN su.role = 'trainer' THEN (
              SELECT COUNT(*)
                FROM pt_packages p
               WHERE p.organization_id = su.organization_id
                 AND p.branch_id = su.branch_id
                 AND p.assigned_trainer_staff_user_id = su.id
                 AND p.status = 'active'
            ) ELSE 0 END AS active_packages_count,
            CASE WHEN su.role = 'trainer' THEN (
              SELECT COUNT(*)
                FROM pt_sessions s
               WHERE s.organization_id = su.organization_id
                 AND s.branch_id = su.branch_id
                 AND s.trainer_staff_user_id = su.id
                 AND s.status = 'scheduled'
                 AND s.scheduled_start >= NOW()
            ) ELSE 0 END AS future_sessions_count,
            CASE WHEN su.role = 'trainer' THEN (
              SELECT COUNT(*)
                FROM member_trainer_assignments mta
               WHERE mta.organization_id = su.organization_id
                 AND mta.branch_id = su.branch_id
                 AND mta.trainer_staff_user_id = su.id
                 AND mta.is_active = true
            ) ELSE 0 END AS assigned_members_count
       FROM staff_users su
       LEFT JOIN LATERAL (
         SELECT status, expires_at, opened_at, accepted_at
           FROM staff_invites
          WHERE staff_user_id = su.id
          ORDER BY created_at DESC
          LIMIT 1
       ) si ON true
      WHERE su.organization_id = $1
        AND su.branch_id = $2
      ORDER BY su.created_at DESC`,
    [organizationId, branchId]
  );
}

export async function createStaffUserAndInvite(input: {
  organizationId: string;
  branchId: string;
  name: string;
  title?: string | null;
  phone: string;
  email?: string | null;
  role: Extract<AppRole, "manager" | "staff" | "trainer">;
}) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `SELECT id
         FROM staff_users
        WHERE organization_id = $1
          AND branch_id = $2
          AND (phone = $3 OR ($4::text IS NOT NULL AND LOWER(email) = LOWER($4::text)))
        LIMIT 1`,
      [input.organizationId, input.branchId, input.phone, input.email || null]
    );

    if (existing.rows[0]) {
      throw new Error("STAFF_ALREADY_EXISTS");
    }

    const names = await client.query<{ organization_name: string; branch_name: string }>(
      `SELECT org.name AS organization_name, b.name AS branch_name
         FROM branches b
         JOIN organizations org ON org.id = b.organization_id
        WHERE b.id = $1
          AND org.id = $2
        LIMIT 1`,
      [input.branchId, input.organizationId]
    );

    const orgRow = names.rows[0];
    if (!orgRow) throw new Error("Branch not found");

    const staffUserId = randomUUID();
    const inviteId = randomUUID();
    const token = randomUUID();
    const inviteUrl = getInviteUrl(token);
    const message = buildInviteMessage(input.name, orgRow.organization_name, orgRow.branch_name, inviteUrl);

    await client.query(
      `INSERT INTO staff_users (
          id, organization_id, branch_id, name, email, phone, role,
          is_active, invited_at, created_at, updated_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          true, NOW(), NOW(), NOW()
       )`,
      [staffUserId, input.organizationId, input.branchId, input.name, input.email || null, input.phone, input.role]
    );

    await client.query(
      `INSERT INTO staff_invites (
          id, organization_id, branch_id, staff_user_id, token, phone,
          sent_via, status, expires_at, created_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'whatsapp', 'sent', NOW() + interval '7 days', NOW()
       )`,
      [inviteId, input.organizationId, input.branchId, staffUserId, token, input.phone]
    );

    await insertInviteQueueRow(client, {
      organizationId: input.organizationId,
      branchId: input.branchId,
      phone: input.phone,
      name: input.name,
      message,
    });

    return { staffUserId, inviteId, token, inviteUrl };
  });
}

export async function patchStaffUser(input: {
  organizationId: string;
  branchId: string;
  staffUserId: string;
  isActive?: boolean;
  resendInvite?: boolean;
  replacementTrainerStaffUserId?: string | null;
}) {
  return withTransaction(async (client) => {
    const rows = await client.query<{
      id: string;
      name: string;
      phone: string;
      accepted_at: string | null;
      role: AppRole;
      is_active: boolean;
    }>(
      `SELECT id, name, phone, accepted_at::text, role, is_active
         FROM staff_users
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [input.staffUserId, input.organizationId, input.branchId]
    );

    const staff = rows.rows[0];
    if (!staff) throw new Error("Staff member not found");

    if (typeof input.isActive === "boolean") {
      if (staff.role === "trainer" && input.isActive === false && staff.is_active) {
        const summaryRows = await client.query<{
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
          [input.organizationId, input.branchId, input.staffUserId]
        );
        const summary = summaryRows.rows[0];
        const hasWorkload =
          Number(summary?.active_packages || 0) > 0 ||
          Number(summary?.future_sessions || 0) > 0 ||
          Number(summary?.assigned_members || 0) > 0;
        if (hasWorkload) {
          if (!input.replacementTrainerStaffUserId) {
            throw new Error("Choose a replacement trainer before deactivating this trainer");
          }
          const replacementRows = await client.query<{ id: string }>(
            `SELECT id
               FROM staff_users
              WHERE id = $1
                AND organization_id = $2
                AND branch_id = $3
                AND role = 'trainer'
                AND is_active = true
              LIMIT 1`,
            [input.replacementTrainerStaffUserId, input.organizationId, input.branchId]
          );
          if (!replacementRows.rows[0]) {
            throw new Error("Replacement trainer not found");
          }

          const memberRows = await client.query<{ member_id: string }>(
            `SELECT DISTINCT member_id
               FROM pt_packages
              WHERE organization_id = $1
                AND branch_id = $2
                AND assigned_trainer_staff_user_id = $3
                AND status = 'active'`,
            [input.organizationId, input.branchId, input.staffUserId]
          );

          await client.query(
            `UPDATE pt_packages
                SET assigned_trainer_staff_user_id = $4,
                    updated_at = NOW()
              WHERE organization_id = $1
                AND branch_id = $2
                AND assigned_trainer_staff_user_id = $3
                AND status = 'active'`,
            [input.organizationId, input.branchId, input.staffUserId, input.replacementTrainerStaffUserId]
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
            [input.organizationId, input.branchId, input.staffUserId, input.replacementTrainerStaffUserId]
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
            [input.organizationId, input.branchId, input.staffUserId]
          );

          for (const row of memberRows.rows) {
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
              [
                randomUUID(),
                input.organizationId,
                input.branchId,
                row.member_id,
                input.replacementTrainerStaffUserId,
                input.replacementTrainerStaffUserId,
              ]
            );
          }
        }
      }
      await client.query(
        `UPDATE staff_users
            SET is_active = $4,
                updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [input.staffUserId, input.organizationId, input.branchId, input.isActive]
      );
    }

    let inviteUrl: string | null = null;

    if (input.resendInvite && !staff.accepted_at) {
      await client.query(
        `UPDATE staff_invites
            SET status = CASE
              WHEN status IN ('accepted', 'cancelled', 'expired') THEN status
              ELSE 'cancelled'
            END
          WHERE staff_user_id = $1
            AND status IN ('pending', 'sent', 'opened')`,
        [input.staffUserId]
      );

      const names = await client.query<{ organization_name: string; branch_name: string }>(
        `SELECT org.name AS organization_name, b.name AS branch_name
           FROM branches b
           JOIN organizations org ON org.id = b.organization_id
          WHERE b.id = $1
            AND org.id = $2
          LIMIT 1`,
        [input.branchId, input.organizationId]
      );
      const orgRow = names.rows[0];
      if (!orgRow) throw new Error("Branch not found");

      const token = randomUUID();
      inviteUrl = getInviteUrl(token);
      const message = buildInviteMessage(staff.name, orgRow.organization_name, orgRow.branch_name, inviteUrl);

      await client.query(
        `INSERT INTO staff_invites (
            id, organization_id, branch_id, staff_user_id, token, phone,
            sent_via, status, expires_at, created_at
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            'whatsapp', 'sent', NOW() + interval '7 days', NOW()
         )`,
        [randomUUID(), input.organizationId, input.branchId, input.staffUserId, token, staff.phone]
      );

      await insertInviteQueueRow(client, {
        organizationId: input.organizationId,
        branchId: input.branchId,
        phone: staff.phone,
        name: staff.name,
        message,
      });

      await client.query(
        `UPDATE staff_users
            SET invited_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [input.staffUserId]
      );
    }

    return { inviteUrl };
  });
}

export async function getStaffInviteByToken(token: string) {
  const rows = await query<InviteLookupRow>(
    `SELECT si.id AS invite_id,
            si.token,
            si.phone,
            si.status,
            si.expires_at::text,
            si.opened_at::text,
            si.accepted_at::text,
            su.id AS staff_user_id,
            su.name AS staff_name,
            su.email AS staff_email,
            su.role,
            su.firebase_uid,
            su.is_active,
            org.name AS organization_name,
            b.name AS branch_name,
            su.organization_id,
            su.branch_id
       FROM staff_invites si
       JOIN staff_users su ON su.id = si.staff_user_id
       JOIN organizations org ON org.id = su.organization_id
       JOIN branches b ON b.id = su.branch_id
      WHERE si.token = $1
      ORDER BY si.created_at DESC
      LIMIT 1`,
    [token]
  );

  const invite = rows[0] || null;
  if (!invite) return null;

  if (invite.status === "sent" && !invite.opened_at) {
    await query(
      `UPDATE staff_invites
          SET status = 'opened', opened_at = NOW()
        WHERE id = $1
          AND status = 'sent'`,
      [invite.invite_id]
    );
    invite.status = "opened";
  }

  return invite;
}

export async function acceptStaffInvite(input: { token: string; firebaseUid: string; phone: string }) {
  const accepted = await withTransaction(async (client) => {
    const rows = await client.query<InviteLookupRow>(
      `SELECT si.id AS invite_id,
              si.token,
              si.phone,
              si.status,
              si.expires_at::text,
              si.opened_at::text,
              si.accepted_at::text,
              su.id AS staff_user_id,
              su.name AS staff_name,
              su.email AS staff_email,
              su.role,
              su.firebase_uid,
              su.is_active,
              org.name AS organization_name,
              b.name AS branch_name,
              su.organization_id,
              su.branch_id
         FROM staff_invites si
         JOIN staff_users su ON su.id = si.staff_user_id
         JOIN organizations org ON org.id = su.organization_id
         JOIN branches b ON b.id = su.branch_id
        WHERE si.token = $1
        ORDER BY si.created_at DESC
        LIMIT 1
        FOR UPDATE`,
      [input.token]
    );

    const invite = rows.rows[0];
    if (!invite) throw new Error("Invite not found");
    if (!invite.is_active) throw new Error("This team member is inactive");
    if (invite.status === "cancelled" || invite.status === "expired") {
      throw new Error("Invite is no longer valid");
    }
    if (new Date(invite.expires_at).getTime() <= Date.now() && invite.status !== "accepted") {
      await client.query(`UPDATE staff_invites SET status = 'expired' WHERE id = $1`, [invite.invite_id]);
      throw new Error("Invite expired");
    }
    if (invite.status === "accepted" && invite.firebase_uid && invite.firebase_uid !== input.firebaseUid) {
      throw new Error("Invite was already accepted by another account");
    }
    if (invite.phone !== input.phone) {
      throw new Error("Invite phone does not match the verified number");
    }

    const ownerConflict = await client.query<{ id: string }>(
      `SELECT id FROM owners WHERE firebase_uid = $1 LIMIT 1`,
      [input.firebaseUid]
    );
    if (ownerConflict.rows[0]) {
      throw new Error("This phone is already linked to an owner account");
    }

    const staffConflict = await client.query<{ id: string }>(
      `SELECT id
         FROM staff_users
        WHERE firebase_uid = $1
          AND id <> $2
        LIMIT 1`,
      [input.firebaseUid, invite.staff_user_id]
    );
    if (staffConflict.rows[0]) {
      throw new Error("This phone is already linked to another team account");
    }

    await client.query(
      `UPDATE staff_users
          SET firebase_uid = $2,
              accepted_at = COALESCE(accepted_at, NOW()),
              updated_at = NOW()
        WHERE id = $1`,
      [invite.staff_user_id, input.firebaseUid]
    );

    await client.query(
      `UPDATE staff_invites
          SET status = 'accepted',
              opened_at = COALESCE(opened_at, NOW()),
              accepted_at = COALESCE(accepted_at, NOW())
        WHERE id = $1`,
      [invite.invite_id]
    );

    await client.query(
      `UPDATE staff_invites
          SET status = 'cancelled'
        WHERE staff_user_id = $1
          AND id <> $2
          AND status IN ('pending', 'sent', 'opened')`,
      [invite.staff_user_id, invite.invite_id]
    );

    return {
      branchId: invite.branch_id,
    };
  });

  const access = await getActorAccessByFirebaseUid(input.firebaseUid, accepted.branchId);
  if (!access) throw new Error("Team account could not be provisioned");

  return {
    access,
    profile: toSessionProfile(access),
  };
}
