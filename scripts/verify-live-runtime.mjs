#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const requireFromRoot = createRequire(path.join(repoRoot, "package.json"));
const dotenv = requireFromRoot("dotenv");
const admin = requireFromRoot("firebase-admin");

dotenv.config({ path: path.join(repoRoot, ".env.local") });

const TARGET_UID = process.env.VERIFY_LIVE_UID || "LvWA1osltZfXMu0PD9KKFlqfexr2";
const TARGET_BRANCH_ID =
  process.env.VERIFY_LIVE_BRANCH_ID || "614cff5a-78cd-4a95-8f18-3191f61922cf";
const TARGET_DOMAIN = process.env.VERIFY_LIVE_DOMAIN || "https://gymflowsystem.com";
const TARGET_PROJECT = process.env.VERIFY_LIVE_PROJECT || "gymflow-saas-260215-251";
const TARGET_SERVICE = process.env.VERIFY_LIVE_SERVICE || "gymflow-web-app";
const TARGET_REGION = process.env.VERIFY_LIVE_REGION || "europe-west1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

async function mintFreshIdToken() {
  initFirebaseAdmin();
  const apiKey = requireEnv("FIREBASE_WEB_API_KEY");
  const customToken = await admin.auth().createCustomToken(TARGET_UID);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.idToken) {
    throw new Error(`Failed to mint fresh ID token: ${JSON.stringify(json)}`);
  }
  return json.idToken;
}

function getCloudRunOrigin() {
  return execFileSync(
    "gcloud",
    [
      "run",
      "services",
      "describe",
      TARGET_SERVICE,
      `--project=${TARGET_PROJECT}`,
      `--region=${TARGET_REGION}`,
      "--format=value(status.url)",
    ],
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
}

function getCloudRunRevision() {
  return execFileSync(
    "gcloud",
    [
      "run",
      "services",
      "describe",
      TARGET_SERVICE,
      `--project=${TARGET_PROJECT}`,
      `--region=${TARGET_REGION}`,
      "--format=value(status.latestReadyRevisionName)",
    ],
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
}

async function call(baseUrl, route, token, branchId) {
  const res = await fetch(`${baseUrl}${route}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "x-branch-id": branchId,
    },
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text.slice(0, 250),
  };
}

async function main() {
  const token = await mintFreshIdToken();
  const origin = getCloudRunOrigin();
  const revision = getCloudRunRevision();

  const routes = [
    "/api/income/monthly",
    "/api/income/summary",
    "/api/notifications/unread-count",
    "/api/notifications?limit=5&status=all",
    "/api/settings",
    "/api/members/offline-bundle",
  ];

  const badBranchRoutes = [
    "/api/notifications/unread-count",
    "/api/notifications?limit=5&status=all",
    "/api/settings",
    "/api/members/offline-bundle",
  ];

  const report = {
    checkedAt: new Date().toISOString(),
    domain: TARGET_DOMAIN,
    origin,
    revision,
    validBranch: {},
    malformedBranch: {},
  };

  for (const route of routes) {
    report.validBranch[route] = {
      domain: await call(TARGET_DOMAIN, route, token, TARGET_BRANCH_ID),
      origin: await call(origin, route, token, TARGET_BRANCH_ID),
    };
  }

  for (const route of badBranchRoutes) {
    report.malformedBranch[route] = {
      domain: await call(TARGET_DOMAIN, route, token, "not-a-uuid"),
      origin: await call(origin, route, token, "not-a-uuid"),
    };
  }

  fs.writeFileSync(
    path.join(repoRoot, "scripts/.last-live-runtime-check.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
