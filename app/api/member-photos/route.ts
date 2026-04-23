import { NextRequest } from "next/server";
import { Storage } from "@google-cloud/storage";
import { env } from "@/lib/env";
import { fail, routeError } from "@/lib/http";
import { getFirebaseAdminDiagnostics } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPhotoBucketName() {
  if (env.GCS_PHOTOS_BUCKET && env.GCS_PHOTOS_BUCKET !== "gymflow-photos") {
    return env.GCS_PHOTOS_BUCKET;
  }
  return `${env.FIREBASE_PROJECT_ID}-gymflow-photos`;
}

function isSafeObjectPath(value: string) {
  return /^members\/[0-9a-f-]+\/photos\/[0-9]{13}-[0-9a-f-]+\.(jpg|png|webp)$/i.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const diagnostics = getFirebaseAdminDiagnostics();
    if (!diagnostics.configured || !env.FIREBASE_PROJECT_ID) {
      return fail("Firebase admin credentials are not configured", 500);
    }

    const objectPath = new URL(request.url).searchParams.get("path") || "";
    if (!isSafeObjectPath(objectPath)) {
      return fail("Invalid photo path", 400);
    }

    const bucket = new Storage({ projectId: env.FIREBASE_PROJECT_ID }).bucket(getPhotoBucketName());
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return fail("Photo not found", 404);
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": metadata.contentType || "image/jpeg",
        "Cache-Control": metadata.cacheControl || "public, max-age=3600"
      }
    });
  } catch (error) {
    return routeError(error);
  }
}
