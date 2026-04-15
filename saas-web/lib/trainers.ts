import { randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db";

export type TrainerProfileRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  accepted_at: string | null;
  gender: "male" | "female" | null;
  languages: string[];
  specialties: string[];
  certifications: string[];
  bio: string | null;
  beginner_friendly: boolean;
  photo_path: string | null;
};

export type TrainerRosterStatRow = {
  trainer_id: string;
  active_clients: number;
  sessions_this_month: number;
};

export type TrainerDetailStatsRow = {
  sessions_completed: number;
  sessions_no_show: number;
  sessions_late_cancel: number;
  sessions_cancelled: number;
  sessions_scheduled: number;
  active_clients: number;
  active_packages: number;
  total_revenue: string;
};

export type TrainerClientRow = {
  id: string;
  name: string;
  phone: string | null;
  photo_path?: string | null;
  assigned_at: string;
  active_packages: number;
  sessions_remaining: number;
};

export type MemberTrainerAssignmentRow = {
  assignment_id: string;
  member_id: string;
  trainer_staff_user_id: string;
  trainer_name: string;
  trainer_phone: string;
  trainer_email: string | null;
  trainer_gender: "male" | "female" | null;
  trainer_languages: string[];
  trainer_specialties: string[];
  trainer_bio: string | null;
  trainer_beginner_friendly: boolean;
  trainer_photo_path: string | null;
  assigned_at: string;
};

export async function listTrainerProfiles(organizationId: string, branchId: string) {
  return query<TrainerProfileRow>(
    `SELECT su.id,
            su.name,
            su.phone,
            su.email,
            su.is_active,
            su.accepted_at::text,
            sp.gender,
            COALESCE(sp.languages, '{}'::text[]) AS languages,
            COALESCE(sp.specialties, '{}'::text[]) AS specialties,
            COALESCE(sp.certifications, '{}'::text[]) AS certifications,
            sp.bio,
            COALESCE(sp.beginner_friendly, false) AS beginner_friendly,
            sp.photo_path
       FROM staff_users su
       LEFT JOIN staff_profiles sp ON sp.staff_user_id = su.id
      WHERE su.organization_id = $1
        AND su.branch_id = $2
        AND su.role = 'trainer'
      ORDER BY su.is_active DESC, su.accepted_at DESC NULLS LAST, su.created_at DESC`,
    [organizationId, branchId]
  );
}

export async function getMemberTrainerAssignment(organizationId: string, branchId: string, memberId: string) {
  const rows = await query<MemberTrainerAssignmentRow>(
    `SELECT mta.id AS assignment_id,
            mta.member_id,
            su.id AS trainer_staff_user_id,
            su.name AS trainer_name,
            su.phone AS trainer_phone,
            su.email AS trainer_email,
            sp.gender AS trainer_gender,
            COALESCE(sp.languages, '{}'::text[]) AS trainer_languages,
            COALESCE(sp.specialties, '{}'::text[]) AS trainer_specialties,
            sp.bio AS trainer_bio,
            COALESCE(sp.beginner_friendly, false) AS trainer_beginner_friendly,
            sp.photo_path AS trainer_photo_path,
            mta.assigned_at::text
       FROM member_trainer_assignments mta
       JOIN staff_users su ON su.id = mta.trainer_staff_user_id
       LEFT JOIN staff_profiles sp ON sp.staff_user_id = su.id
      WHERE mta.organization_id = $1
        AND mta.branch_id = $2
        AND mta.member_id = $3
        AND mta.is_active = true
      ORDER BY mta.assigned_at DESC
      LIMIT 1`,
    [organizationId, branchId, memberId]
  );
  return rows[0] || null;
}

export async function trainerHasMemberAccess(input: {
  organizationId: string;
  branchId: string;
  trainerStaffUserId: string;
  memberId: string;
}) {
  const rows = await query<{ ok: number }>(
    `SELECT 1 AS ok
       FROM member_trainer_assignments
      WHERE organization_id = $1
        AND branch_id = $2
        AND trainer_staff_user_id = $3
        AND member_id = $4
        AND is_active = true
      LIMIT 1`,
    [input.organizationId, input.branchId, input.trainerStaffUserId, input.memberId]
  );
  return Boolean(rows[0]);
}

export async function assignTrainerToMember(input: {
  organizationId: string;
  branchId: string;
  memberId: string;
  trainerStaffUserId: string | null;
  assignedByActorType: "owner" | "staff";
  assignedByActorId: string;
}) {
  return withTransaction(async (client) => {
    const memberRows = await client.query<{ id: string }>(
      `SELECT id
         FROM members
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
        LIMIT 1`,
      [input.memberId, input.organizationId, input.branchId]
    );
    if (!memberRows.rows[0]) throw new Error("Member not found");

    const existingRows = await client.query<{ assignment_id: string; trainer_staff_user_id: string }>(
      `SELECT id AS assignment_id, trainer_staff_user_id
         FROM member_trainer_assignments
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND is_active = true
        ORDER BY assigned_at DESC
        LIMIT 1
        FOR UPDATE`,
      [input.organizationId, input.branchId, input.memberId]
    );
    const current = existingRows.rows[0] || null;

    if (!input.trainerStaffUserId) {
      if (current) {
        const workloadRows = await client.query<{ active_packages: string; future_sessions: string }>(
          `SELECT
              (SELECT COUNT(*)::text
                 FROM pt_packages
                WHERE organization_id = $1
                  AND branch_id = $2
                  AND member_id = $3
                  AND status = 'active') AS active_packages,
              (SELECT COUNT(*)::text
                 FROM pt_sessions
                WHERE organization_id = $1
                  AND branch_id = $2
                  AND member_id = $3
                  AND status = 'scheduled'
                  AND scheduled_start >= NOW()) AS future_sessions`,
          [input.organizationId, input.branchId, input.memberId]
        );
        const workload = workloadRows.rows[0];
        if (Number(workload?.active_packages || 0) > 0 || Number(workload?.future_sessions || 0) > 0) {
          throw new Error("Assign a replacement trainer before clearing this trainer");
        }
        await client.query(
          `UPDATE member_trainer_assignments
              SET is_active = false,
                unassigned_at = NOW(),
                updated_at = NOW()
            WHERE id = $1`,
          [current.assignment_id]
        );
      }
      return null;
    }

    const trainerRows = await client.query<{ id: string }>(
      `SELECT id
         FROM staff_users
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND role = 'trainer'
          AND is_active = true
        LIMIT 1`,
      [input.trainerStaffUserId, input.organizationId, input.branchId]
    );
    if (!trainerRows.rows[0]) throw new Error("Trainer not found");

    if (current?.trainer_staff_user_id === input.trainerStaffUserId) {
      return await getMemberTrainerAssignment(input.organizationId, input.branchId, input.memberId);
    }

    if (current) {
      await client.query(
        `UPDATE member_trainer_assignments
            SET is_active = false,
                unassigned_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [current.assignment_id]
      );
    }

    await client.query(
      `UPDATE pt_packages
          SET assigned_trainer_staff_user_id = $4,
              updated_at = NOW()
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND status = 'active'`,
      [input.organizationId, input.branchId, input.memberId, input.trainerStaffUserId]
    );

    await client.query(
      `UPDATE pt_sessions
          SET trainer_staff_user_id = $4,
              updated_at = NOW()
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND status = 'scheduled'
          AND scheduled_start >= NOW()`,
      [input.organizationId, input.branchId, input.memberId, input.trainerStaffUserId]
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
       ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          true,
          NOW(),
          NOW()
       )`,
      [
        randomUUID(),
        input.organizationId,
        input.branchId,
        input.memberId,
        input.trainerStaffUserId,
        input.assignedByActorType,
        input.assignedByActorId,
      ]
    );

    return await getMemberTrainerAssignment(input.organizationId, input.branchId, input.memberId);
  });
}
