import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/gymflow"),
  DATABASE_SSL: z.string().default("false"),
  DEFAULT_REGION: z.string().default("eu-west1"),
  DEFAULT_DOMAIN: z.string().default("app.example.com"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GCS_BACKUPS_BUCKET: z.string().default("gymflow-backups"),
  GCS_IMPORTS_BUCKET: z.string().default("gymflow-imports"),
  GCS_PHOTOS_BUCKET: z.string().default("gymflow-photos")
});

export const env = schema.parse(process.env);

export const featureFlags = {
  useDatabaseSsl: env.DATABASE_SSL === "true"
};

export function getFirebaseWebConfig() {
  if (!env.FIREBASE_WEB_API_KEY || !env.FIREBASE_PROJECT_ID) {
    return null;
  }

  const authDomain = env.FIREBASE_AUTH_DOMAIN || `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`;

  return {
    apiKey: env.FIREBASE_WEB_API_KEY,
    authDomain,
    projectId: env.FIREBASE_PROJECT_ID,
    appId: env.FIREBASE_APP_ID || undefined,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || undefined
  };
}
