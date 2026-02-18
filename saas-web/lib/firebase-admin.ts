import {
  App,
  ServiceAccount,
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp
} from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { env } from "./env";

type FirebaseAdminCredentialSource =
  | "service_account_json"
  | "service_account_fields"
  | "application_default";

export type FirebaseAdminDiagnostics = {
  configured: boolean;
  source: FirebaseAdminCredentialSource | null;
  projectId: string | null;
  hasServiceAccountJson: boolean;
  hasServiceAccountFields: boolean;
  usingApplicationDefault: boolean;
  error: string | null;
};

let app: App | null = null;
let adminAuth: Auth | null = null;
let initializationError: string | null = null;
let initializedSource: FirebaseAdminCredentialSource | null = null;
let hasLoggedInitializationError = false;

function logInitializationError(message: string) {
  if (hasLoggedInitializationError) return;
  hasLoggedInitializationError = true;
  console.error(`[firebase-admin] ${message}`);
}

function normalizePrivateKey(raw: string): string {
  let normalized = raw.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
}

function buildServiceAccountFromFields(): ServiceAccount | null {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY)
  };
}

function buildServiceAccountFromJson(): ServiceAccount | null {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as Partial<ServiceAccount>;
    const projectId = parsed.projectId?.trim();
    const clientEmail = parsed.clientEmail?.trim();
    const privateKeyRaw = parsed.privateKey?.toString() || "";
    if (!projectId || !clientEmail || !privateKeyRaw.trim()) {
      initializationError = "FIREBASE_SERVICE_ACCOUNT_JSON is present but missing required keys (projectId/clientEmail/privateKey).";
      return null;
    }
    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKeyRaw)
    };
  } catch (error) {
    initializationError = `FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON: ${error instanceof Error ? error.message : String(error)}`;
    return null;
  }
}

function getOrInitApp() {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  try {
    const fromJson = buildServiceAccountFromJson();
    if (fromJson) {
      initializedSource = "service_account_json";
      app = initializeApp({ credential: cert(fromJson), projectId: fromJson.projectId });
      initializationError = null;
      return app;
    }

    const fromFields = buildServiceAccountFromFields();
    if (fromFields) {
      initializedSource = "service_account_fields";
      app = initializeApp({ credential: cert(fromFields), projectId: fromFields.projectId });
      initializationError = null;
      return app;
    }

    initializedSource = "application_default";
    app = initializeApp({
      credential: applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID || undefined
    });
    initializationError = null;
    return app;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    initializationError = `Firebase Admin initialization failed: ${message}`;
    logInitializationError(initializationError);
    app = null;
    adminAuth = null;
    return null;
  }
}

export function getFirebaseAdminAuth() {
  if (adminAuth) return adminAuth;
  const firebaseApp = getOrInitApp();
  if (!firebaseApp) return null;
  adminAuth = getAuth(firebaseApp);
  return adminAuth;
}

export function getFirebaseAdminDiagnostics(): FirebaseAdminDiagnostics {
  const hasServiceAccountJson = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const hasServiceAccountFields = Boolean(
    env.FIREBASE_PROJECT_ID?.trim() &&
      env.FIREBASE_CLIENT_EMAIL?.trim() &&
      env.FIREBASE_PRIVATE_KEY?.trim()
  );
  const configured = Boolean(getOrInitApp());

  return {
    configured,
    source: initializedSource,
    projectId: env.FIREBASE_PROJECT_ID || null,
    hasServiceAccountJson,
    hasServiceAccountFields,
    usingApplicationDefault: initializedSource === "application_default",
    error: initializationError
  };
}

