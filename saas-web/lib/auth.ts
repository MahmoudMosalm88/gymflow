import { NextRequest } from "next/server";
import { query } from "./db";
import { getFirebaseAdminAuth } from "./firebase-admin";

export type AuthContext = {
  ownerId: string;
  organizationId: string;
  branchId: string;
  role: "owner";
  firebaseUid: string;
};

type OwnerAccessRow = {
  owner_id: string;
  firebase_uid: string;
  organization_id: string;
  branch_id: string;
};

function getBearerToken(request: NextRequest): string | null {
  const value = request.headers.get("authorization");
  if (!value?.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim();
}

async function getOwnerAccessByFirebaseUid(firebaseUid: string, branchHeader?: string | null) {
  const rows = await query<OwnerAccessRow>(
    `SELECT oba.owner_id, o.firebase_uid, b.organization_id, oba.branch_id
       FROM owner_branch_access oba
       JOIN owners o ON o.id = oba.owner_id
       JOIN branches b ON b.id = oba.branch_id
      WHERE o.firebase_uid = $1
        AND ($2::uuid IS NULL OR oba.branch_id = $2::uuid)
      ORDER BY oba.created_at ASC
      LIMIT 1`,
    [firebaseUid, branchHeader || null]
  );

  return rows[0] || null;
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const branchHeader = request.headers.get("x-branch-id");

  const token = getBearerToken(request);
  if (!token) throw new Error("Missing bearer token");

  const auth = getFirebaseAdminAuth();
  if (!auth) throw new Error("Firebase admin credentials are not configured");

  const decoded = await auth.verifyIdToken(token);
  const access = await getOwnerAccessByFirebaseUid(decoded.uid, branchHeader);

  if (!access) throw new Error("Owner account is not provisioned in SQL");

  return {
    ownerId: access.owner_id,
    firebaseUid: access.firebase_uid,
    organizationId: access.organization_id,
    branchId: access.branch_id,
    role: "owner"
  };
}
