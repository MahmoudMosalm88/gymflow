import { NextRequest } from "next/server";
import { query } from "./db";
import { getFirebaseAdminAuth } from "./firebase-admin";
import type { AppRole, SessionProfile } from "@/lib/session";

export type AuthContext = {
  actorType: "owner" | "staff";
  actorId: string;
  ownerId: string | null;
  staffUserId: string | null;
  organizationId: string;
  branchId: string;
  role: AppRole;
  firebaseUid: string;
};

type ActorAccessRow = {
  actor_type: "owner" | "staff";
  actor_id: string;
  owner_id: string | null;
  staff_user_id: string | null;
  firebase_uid: string;
  organization_id: string;
  organization_name: string | null;
  branch_id: string;
  branch_name: string | null;
  role: AppRole;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function accessLookupSql(matchColumn: "firebase_uid" | "phone") {
  return `SELECT *
       FROM (
         SELECT 'owner'::text AS actor_type,
                o.id AS actor_id,
                o.id AS owner_id,
                NULL::uuid AS staff_user_id,
                o.firebase_uid,
                b.organization_id,
                org.name AS organization_name,
                oba.branch_id,
                b.name AS branch_name,
                oba.role::text AS role,
                o.name,
                o.email,
                o.phone,
                0 AS priority,
                oba.created_at AS linked_at
           FROM owner_branch_access oba
           JOIN owners o ON o.id = oba.owner_id
           JOIN branches b ON b.id = oba.branch_id
           JOIN organizations org ON org.id = b.organization_id
          WHERE o.${matchColumn} = $1
            AND ($2::uuid IS NULL OR oba.branch_id = $2::uuid)
         UNION ALL
         SELECT 'staff'::text AS actor_type,
                su.id AS actor_id,
                NULL::uuid AS owner_id,
                su.id AS staff_user_id,
                su.firebase_uid,
                su.organization_id,
                org.name AS organization_name,
                su.branch_id,
                b.name AS branch_name,
                su.role::text AS role,
                su.name,
                su.email,
                su.phone,
                1 AS priority,
                su.created_at AS linked_at
           FROM staff_users su
           JOIN branches b ON b.id = su.branch_id
           JOIN organizations org ON org.id = su.organization_id
          WHERE su.${matchColumn} = $1
            AND su.is_active = true
            AND ($2::uuid IS NULL OR su.branch_id = $2::uuid)
       ) access_rows
      ORDER BY priority ASC, linked_at ASC
      LIMIT 1`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getBearerToken(request: NextRequest): string | null {
  const value = request.headers.get("authorization");
  if (!value?.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim();
}

export async function getActorAccessByFirebaseUid(firebaseUid: string, branchHeader?: string | null) {
  const rows = await query<ActorAccessRow>(accessLookupSql("firebase_uid"), [firebaseUid, branchHeader || null]);
  return rows[0] || null;
}

export async function getActorAccessByPhone(phone: string, branchHeader?: string | null) {
  const rows = await query<ActorAccessRow>(accessLookupSql("phone"), [phone, branchHeader || null]);
  return rows[0] || null;
}

export function toSessionProfile(access: ActorAccessRow): SessionProfile {
  return {
    id: access.actor_id,
    actorType: access.actor_type,
    role: access.role,
    name: access.name || (access.actor_type === "owner" ? "Owner" : "Team member"),
    email: access.email,
    phone: access.phone,
    organizationId: access.organization_id,
    organizationName: access.organization_name,
    branchId: access.branch_id,
    branchName: access.branch_name,
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const rawBranchHeader = request.headers.get("x-branch-id");
  const branchHeader = rawBranchHeader && isUuid(rawBranchHeader) ? rawBranchHeader : null;

  const token = getBearerToken(request);
  if (!token) throw new Error("Missing bearer token");

  const auth = getFirebaseAdminAuth();
  if (!auth) throw new Error("Firebase admin credentials are not configured");

  const decoded = await auth.verifyIdToken(token);
  const isLocalHost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
  let access = await getActorAccessByFirebaseUid(decoded.uid, branchHeader);

  if (!access && isLocalHost && typeof decoded.phone_number === "string" && decoded.phone_number) {
    access = await getActorAccessByPhone(decoded.phone_number, branchHeader);
  }

  if (!access) throw new Error("Account is not provisioned in SQL");

  return {
    actorType: access.actor_type,
    actorId: access.actor_id,
    ownerId: access.owner_id,
    staffUserId: access.staff_user_id,
    firebaseUid: access.firebase_uid,
    organizationId: access.organization_id,
    branchId: access.branch_id,
    role: access.role,
  };
}

export async function requireRoles(request: NextRequest, allowedRoles: AppRole[]) {
  const auth = await requireAuth(request);
  if (!allowedRoles.includes(auth.role)) {
    const error = new Error("Forbidden");
    (error as Error & { code?: string }).code = "FORBIDDEN";
    throw error;
  }
  return auth;
}
