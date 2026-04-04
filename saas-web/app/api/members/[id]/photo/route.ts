import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { Storage } from "@google-cloud/storage";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/env";
import { fail, ok, routeError } from "@/lib/http";
import { getFirebaseAdminDiagnostics } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getPhotoBucketName() {
  if (env.GCS_PHOTOS_BUCKET && env.GCS_PHOTOS_BUCKET !== "gymflow-photos") {
    return env.GCS_PHOTOS_BUCKET;
  }
  return `${env.FIREBASE_PROJECT_ID}-gymflow-photos`;
}

function toUnixSeconds(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const diagnostics = getFirebaseAdminDiagnostics();
    if (!diagnostics.configured || !env.FIREBASE_PROJECT_ID) {
      return fail("Firebase admin credentials are not configured", 500);
    }

    const formData = await request.formData();
    const candidate = formData.get("photo");
    const baseUpdatedAt = toUnixSeconds(formData.get("base_updated_at"));
    if (!(candidate instanceof File)) {
      return fail("Missing photo file", 400);
    }

    if (!ALLOWED_TYPES.has(candidate.type)) {
      return fail("Unsupported image type", 400);
    }

    if (candidate.size > MAX_SIZE) {
      return fail("Image must be under 5MB", 400);
    }

    const rows = await query<{ id: string; updated_at_unix: number }>(
      `SELECT id,
              EXTRACT(EPOCH FROM updated_at)::bigint AS updated_at_unix
         FROM members
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
        LIMIT 1`,
      [params.id, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) {
      return fail("Member not found", 404);
    }
    if (baseUpdatedAt !== null && Number(rows[0].updated_at_unix) !== baseUpdatedAt) {
      return fail("This member was changed on another device. Review and try again.", 409, {
        code: "offline_conflict",
      });
    }

    const bucketName = getPhotoBucketName();
    const bucket = new Storage({ projectId: env.FIREBASE_PROJECT_ID }).bucket(bucketName);
    const extension = candidate.type === "image/png" ? "png" : candidate.type === "image/webp" ? "webp" : "jpg";
    const objectPath = `members/${params.id}/photos/${Date.now()}-${randomUUID()}.${extension}`;
    const file = bucket.file(objectPath);
    const buffer = Buffer.from(await candidate.arrayBuffer());

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: candidate.type,
        cacheControl: "public,max-age=3600"
      }
    });

    const photoUrl = `/api/member-photos?path=${encodeURIComponent(objectPath)}`;

    const updated = await query<{ photo_path: string | null }>(
      `UPDATE members
          SET photo_path = $4,
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        RETURNING photo_path`,
      [params.id, auth.organizationId, auth.branchId, photoUrl]
    );

    return ok({ photo_path: updated[0]?.photo_path || photoUrl });
  } catch (error) {
    return routeError(error);
  }
}
