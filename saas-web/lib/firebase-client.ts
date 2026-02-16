"use client";

import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

export type FirebaseClientConfig = Pick<FirebaseOptions, "apiKey" | "authDomain" | "projectId"> &
  Partial<Pick<FirebaseOptions, "appId" | "messagingSenderId">>;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuthPromise: Promise<Auth> | null = null;

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isFirebaseClientConfig(value: unknown): value is FirebaseClientConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmpty(candidate.apiKey) &&
    isNonEmpty(candidate.authDomain) &&
    isNonEmpty(candidate.projectId)
  );
}

function getOrInitApp(config: FirebaseClientConfig): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  return firebaseApp;
}

export async function getFirebaseClientAuth(config: FirebaseClientConfig) {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = (async () => {
      const app = getOrInitApp(config);
      const auth = getAuth(app);
      await setPersistence(auth, browserLocalPersistence);
      return auth;
    })();
  }
  return firebaseAuthPromise;
}
