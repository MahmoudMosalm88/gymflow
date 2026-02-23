import { NextRequest } from "next/server";
import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { withTransaction } from "@/lib/db";
import { getFirebaseAdminAuth, getFirebaseAdminDiagnostics } from "@/lib/firebase-admin";
import { fail, ok, routeError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { sendNewSignupNotification } from "@/lib/signup-notifications";

export const runtime = "nodejs";

type ExistingOwnerRow = {
  id: string;
  firebase_uid: string;
};

let ownersSchemaReady = false;

async function ensureIndexWithFallback(
  client: PoolClient,
  savepointName: string,
  uniqueIndexSql: string,
  fallbackIndexSql: string
) {
  await client.query(`SAVEPOINT ${savepointName}`);
  try {
    await client.query(uniqueIndexSql);
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    const message = error instanceof Error ? error.message : "";
    const isDuplicateData = code === "23505" || message.includes("could not create unique index");
    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    if (!isDuplicateData) throw error;
    await client.query(fallbackIndexSql);
  }
}

function mapFirebaseCreateError(code: string) {
  switch (code) {
    case "auth/email-already-exists":
      return { status: 409, message: "This email is already in use. Try signing in instead." };
    case "auth/phone-number-already-exists":
      return { status: 409, message: "This phone number is already in use. Try signing in instead." };
    case "auth/invalid-phone-number":
      return { status: 400, message: "Phone number is invalid. Use international format like +15551234567." };
    case "auth/invalid-password":
      return { status: 400, message: "Password must be at least 8 characters." };
    default:
      return { status: 500, message: "We're having trouble creating your account. Please try again in a moment." };
  }
}

async function ensureOwnersSchema(client: PoolClient) {
  if (ownersSchemaReady) return;

  try {
    await client.query(`ALTER TABLE IF EXISTS owners ADD COLUMN IF NOT EXISTS phone text`);
    await client.query(`ALTER TABLE IF EXISTS owners ALTER COLUMN email DROP NOT NULL`);

    await ensureIndexWithFallback(
      client,
      "owners_email_idx_sp",
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_email_unique_not_null
         ON owners (LOWER(email))
       WHERE email IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_owners_email_not_null
         ON owners (LOWER(email))
       WHERE email IS NOT NULL`
    );

    await ensureIndexWithFallback(
      client,
      "owners_phone_idx_sp",
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_phone_unique_not_null
         ON owners (phone)
       WHERE phone IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_owners_phone_not_null
         ON owners (phone)
       WHERE phone IS NOT NULL`
    );
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    const message = error instanceof Error ? error.message : "";
    const isPermissionIssue = code === "42501" || message.toLowerCase().includes("permission denied");
    if (!isPermissionIssue) throw error;
    // Runtime DDL is best-effort only. In restricted environments, schema should already be managed by migrations.
    console.warn("[auth/register] skipped owners schema auto-fix due DB permissions");
  }

  ownersSchemaReady = true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0].trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("cf-connecting-ip")?.trim() ||
      `ua:${request.headers.get("user-agent") || "unknown"}`;
    const registerLimit = process.env.NODE_ENV === "development" ? 120 : 5;
    const rateLimit = checkRateLimit(ip, registerLimit, 60000);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many registration attempts. Please try again later."
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds)
          }
        }
      );
    }

    const payload = registerSchema.parse(await request.json());
    const auth = getFirebaseAdminAuth();
    if (!auth) {
      const diagnostics = getFirebaseAdminDiagnostics();
      return fail("Firebase admin is not configured correctly.", 500, {
        source: diagnostics.source,
        usingApplicationDefault: diagnostics.usingApplicationDefault,
        error: diagnostics.error
      });
    }

    let firebaseUid = "";
    let ownerEmail: string | null = null;
    let ownerPhone: string | null = null;

    if (payload.authMethod === "email") {
      try {
        const user = await auth.createUser({
          email: payload.email,
          password: payload.password,
          displayName: payload.ownerName,
          phoneNumber: payload.phone
        });
        firebaseUid = user.uid;
        ownerEmail = payload.email;
        ownerPhone = payload.phone || user.phoneNumber || null;
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code || "") : "";
        const mapped = mapFirebaseCreateError(code);
        return fail(mapped.message, mapped.status);
      }
    } else {
      const decoded = await auth.verifyIdToken(payload.idToken);
      const firebaseUser = await auth.getUser(decoded.uid);
      firebaseUid = firebaseUser.uid;
      ownerEmail = payload.email || firebaseUser.email || null;
      ownerPhone = payload.phone || firebaseUser.phoneNumber || null;
    }

    if (payload.authMethod === "phone" && !ownerPhone) {
      return fail("Phone sign-up requires a verified phone number in E.164 format.", 400);
    }

    if (payload.authMethod === "email" && !ownerEmail) {
      return fail("Email sign-up requires a valid email address.", 400);
    }

    if (payload.authMethod === "google" && !ownerEmail) {
      return fail("Google sign-up requires an email address from the Google account.", 400);
    }

    const organizationId = uuidv4();
    const branchId = uuidv4();
    const ownerId = uuidv4();

    await withTransaction(async (client) => {
      await ensureOwnersSchema(client);

      const existingRows = await client.query<ExistingOwnerRow>(
        `SELECT id, firebase_uid
           FROM owners
          WHERE firebase_uid = $1
             OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2::text))
             OR ($3::text IS NOT NULL AND phone = $3::text)
          LIMIT 1`,
        [firebaseUid, ownerEmail, ownerPhone]
      );

      if (existingRows.rows[0]) {
        throw new Error("ACCOUNT_ALREADY_EXISTS");
      }

      await client.query(
        `INSERT INTO organizations (id, name)
         VALUES ($1, $2)`,
        [organizationId, payload.organizationName]
      );

      await client.query(
        `INSERT INTO branches (id, organization_id, name)
         VALUES ($1, $2, $3)`,
        [branchId, organizationId, payload.branchName]
      );

      await client.query(
        `INSERT INTO owners (id, firebase_uid, email, name, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [ownerId, firebaseUid, ownerEmail, payload.ownerName, ownerPhone]
      );

      await client.query(
        `INSERT INTO owner_branch_access (owner_id, branch_id, role)
         VALUES ($1, $2, 'owner')`,
        [ownerId, branchId]
      );
    });

    // Best-effort notification: do not block account creation if provider is down.
    sendNewSignupNotification({
      authMethod: payload.authMethod,
      ownerName: payload.ownerName,
      ownerEmail,
      ownerPhone,
      organizationName: payload.organizationName,
      branchName: payload.branchName,
      organizationId,
      branchId,
      ownerId
    }).catch((error) => {
      console.error("[auth/register] signup notification failed:", error);
    });

    return ok(
      {
        organizationId,
        branchId,
        ownerId,
        firebaseUid,
        authMethod: payload.authMethod
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_ALREADY_EXISTS") {
      return fail("An account already exists for this email or phone. Please sign in instead.", 409);
    }
    return routeError(error);
  }
}
