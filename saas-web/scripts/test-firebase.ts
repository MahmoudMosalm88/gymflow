import { config } from "dotenv";
config({ path: ".env.local" });

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function run() {
  const admin = await import("../lib/firebase-admin");
  const auth = admin.getFirebaseAdminAuth();

  if (!auth) {
    console.error("Firebase Admin Auth API is NOT AVAILABLE. Check Firebase admin credentials in .env.local.");
    process.exitCode = 1;
    return;
  }

  try {
    const users = await auth.listUsers(1);
    console.log("Firebase Admin Auth API is WORKING. Found users:", users.users.length);
  } catch (error) {
    console.error("Firebase Admin Auth API FAILED:", getErrorMessage(error));
    process.exitCode = 1;
  }
}

run();
