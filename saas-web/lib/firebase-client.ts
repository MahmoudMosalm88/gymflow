"use client";

import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, browserLocalPersistence, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { FirebaseStorage, getStorage } from "firebase/storage";

export type FirebaseClientConfig = Pick<FirebaseOptions, "apiKey" | "authDomain" | "projectId"> &
  Partial<Pick<FirebaseOptions, "appId" | "messagingSenderId" | "storageBucket">>;

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
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      try {
        if (host === "localhost" || host === "127.0.0.1") {
          // IndexedDB can be unstable in dev hot-reload/privacy contexts.
          await setPersistence(auth, inMemoryPersistence);
        } else {
          await setPersistence(auth, browserLocalPersistence);
        }
      } catch {
        // Some environments block local persistence (strict privacy modes, embedded browsers).
        await setPersistence(auth, inMemoryPersistence);
      }
      return auth;
    })();
  }
  try {
    return await firebaseAuthPromise;
  } catch (error) {
    firebaseAuthPromise = null;
    throw error;
  }
}

let firebaseStorage: FirebaseStorage | null = null;

export function getFirebaseClientStorage(config: FirebaseClientConfig): FirebaseStorage {
  if (firebaseStorage) return firebaseStorage;
  const app = getOrInitApp(config);
  firebaseStorage = getStorage(app);
  return firebaseStorage;
}
