import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  organization_name: string | null;
  branch_name: string | null;
  role?: string | null;
  gender?: string | null;
  languages?: string[] | null;
  specialties?: string[] | null;
  certifications?: string[] | null;
  bio?: string | null;
  beginner_friendly?: boolean | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const ownerId = auth.ownerId;
    const staffUserId = auth.staffUserId;

    const rows = auth.actorType === "owner"
      ? await query<ProfileRow>(
          `SELECT o.name, o.email, o.phone,
                  org.name AS organization_name,
                  b.name AS branch_name
             FROM owners o
             JOIN owner_branch_access oba ON oba.owner_id = o.id
             JOIN branches b ON b.id = oba.branch_id
             JOIN organizations org ON org.id = b.organization_id
            WHERE o.id = $1 AND oba.branch_id = $2
            LIMIT 1`,
          [ownerId, auth.branchId]
        )
      : await query<ProfileRow>(
          `SELECT su.name, su.email, su.phone,
                  su.role,
                  org.name AS organization_name,
                  b.name AS branch_name,
                  sp.gender,
                  COALESCE(sp.languages, '{}'::text[]) AS languages,
                  COALESCE(sp.specialties, '{}'::text[]) AS specialties,
                  COALESCE(sp.certifications, '{}'::text[]) AS certifications,
                  sp.bio,
                  COALESCE(sp.beginner_friendly, false) AS beginner_friendly
             FROM staff_users su
             JOIN branches b ON b.id = su.branch_id
             JOIN organizations org ON org.id = su.organization_id
             LEFT JOIN staff_profiles sp ON sp.staff_user_id = su.id
            WHERE su.id = $1
              AND su.branch_id = $2
            LIMIT 1`,
          [staffUserId, auth.branchId]
        );

    if (!rows[0]) return fail("Profile not found", 404);

    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const ownerId = auth.ownerId;
    const staffUserId = auth.staffUserId;
    const body = await request.json();

    const { name, email, phone, organization_name, branch_name, gender, languages, specialties, certifications, bio, beginner_friendly } = body;

    if (auth.actorType === "owner") {
      await query(
        `UPDATE owners SET name = $1, email = $2, phone = $3 WHERE id = $4`,
        [name || null, email || null, phone || null, ownerId]
      );

      if (organization_name !== undefined) {
        await query(
          `UPDATE organizations SET name = $1 WHERE id = $2`,
          [organization_name, auth.organizationId]
        );
      }

      if (branch_name !== undefined) {
        await query(
          `UPDATE branches SET name = $1 WHERE id = $2`,
          [branch_name, auth.branchId]
        );
      }
    } else {
      await query(
        `UPDATE staff_users
            SET name = $1,
                email = $2,
                phone = $3,
                updated_at = NOW()
          WHERE id = $4`,
        [name || null, email || null, phone || null, staffUserId]
      );

      const staffRoleRows = await query<{ role: string }>(
        `SELECT role FROM staff_users WHERE id = $1 AND branch_id = $2 LIMIT 1`,
        [staffUserId, auth.branchId]
      );
      const staffRole = staffRoleRows[0]?.role || null;
      if (staffRole === "trainer") {
        await query(
          `INSERT INTO staff_profiles (
              staff_user_id,
              gender,
              languages,
              specialties,
              certifications,
              bio,
              beginner_friendly,
              updated_at
           ) VALUES (
              $1,
              $2,
              COALESCE($3::text[], '{}'::text[]),
              COALESCE($4::text[], '{}'::text[]),
              COALESCE($5::text[], '{}'::text[]),
              $6,
              COALESCE($7, false),
              NOW()
           )
           ON CONFLICT (staff_user_id) DO UPDATE
             SET gender = EXCLUDED.gender,
                 languages = EXCLUDED.languages,
                 specialties = EXCLUDED.specialties,
                 certifications = EXCLUDED.certifications,
                 bio = EXCLUDED.bio,
                 beginner_friendly = EXCLUDED.beginner_friendly,
                 updated_at = NOW()`,
          [
            staffUserId,
            gender || null,
            Array.isArray(languages) ? languages : [],
            Array.isArray(specialties) ? specialties : [],
            Array.isArray(certifications) ? certifications : [],
            bio || null,
            typeof beginner_friendly === "boolean" ? beginner_friendly : false,
          ]
        );
      }
    }

    return ok({ updated: true });
  } catch (error) {
    return routeError(error);
  }
}
