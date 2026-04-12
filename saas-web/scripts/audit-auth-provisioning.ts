import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

type FirebaseUserSummary = {
  uid: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  providers: string[];
};

function parseDaysArg() {
  const raw = process.argv[2];
  const parsed = raw ? Number(raw) : 14;
  if (!Number.isFinite(parsed) || parsed <= 0) return 14;
  return Math.floor(parsed);
}

async function run() {
  const days = parseDaysArg();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { getFirebaseAdminAuth } = await import("../lib/firebase-admin");
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new Error("Firebase Admin is not configured.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const firebaseUsers: FirebaseUserSummary[] = [];

  try {
    let nextPageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, nextPageToken);
      for (const user of page.users) {
        const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
        if (!createdAt || createdAt < cutoff) continue;
        firebaseUsers.push({
          uid: user.uid,
          email: user.email || null,
          createdAt: user.metadata.creationTime || null,
          lastSignInAt: user.metadata.lastSignInTime || null,
          providers: (user.providerData || []).map((provider) => provider.providerId)
        });
      }
      nextPageToken = page.pageToken;
    } while (nextPageToken);

    const linkedOwners = await pool.query<{
      firebase_uid: string;
      email: string | null;
    }>(
      `SELECT firebase_uid, email
         FROM owners
        WHERE firebase_uid IS NOT NULL
           OR email IS NOT NULL`
    );

    const linkedOwnerByUid = new Set(linkedOwners.rows.map((row) => row.firebase_uid).filter(Boolean));
    const linkedOwnerByEmail = new Set(
      linkedOwners.rows
        .map((row) => row.email?.toLowerCase().trim() || null)
        .filter((value): value is string => Boolean(value))
    );

    const unlinked = firebaseUsers.filter((user) => {
      const email = user.email?.toLowerCase().trim() || null;
      return !linkedOwnerByUid.has(user.uid) && !(email && linkedOwnerByEmail.has(email));
    });

    console.log(
      JSON.stringify(
        {
          days,
          cutoff: cutoff.toISOString(),
          recentFirebaseUsersCount: firebaseUsers.length,
          unlinkedCount: unlinked.length,
          unlinked
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
