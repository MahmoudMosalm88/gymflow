import fs from "node:fs";

import {
  evaluateDeployExpectation,
  findCloudBuildCheckRun,
  getCheckRunsForCommit,
  resolveRepository,
} from "./lib/release-monitor.mjs";

const commitSha = String(process.env.GITHUB_SHA || "").trim();
const outputFile = process.env.GITHUB_OUTPUT || "";
const timeoutMs = Number(process.env.RELEASE_TARGET_TIMEOUT_MS || 60_000);
const intervalMs = Number(process.env.RELEASE_TARGET_INTERVAL_MS || 5_000);

if (!commitSha) {
  console.error("Missing GITHUB_SHA. Cannot resolve expected production release.");
  process.exit(1);
}

function writeOutput(name, value) {
  const serialized = String(value ?? "");
  if (!outputFile) {
    console.log(`${name}=${serialized}`);
    return;
  }

  fs.appendFileSync(outputFile, `${name}<<__GYMFLOW__\n${serialized}\n__GYMFLOW__\n`);
}

function emitResult(result) {
  writeOutput("expected_release_id", result.expectedReleaseId || "");
  writeOutput("deploy_expected", result.deployExpected ? "true" : "false");
  writeOutput("deploy_mode", result.mode || "");
  writeOutput("deploy_reason", result.reason || "");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const repository = resolveRepository();
const deadline = Date.now() + timeoutMs;

while (Date.now() < deadline) {
  const response = await getCheckRunsForCommit(commitSha, repository);
  const cloudBuildRun = findCloudBuildCheckRun(response?.check_runs);
  const deploy = evaluateDeployExpectation(cloudBuildRun);

  if (!cloudBuildRun) {
    console.log("No Google Cloud Build check run found yet. Waiting...");
    await sleep(intervalMs);
    continue;
  }

  if (deploy.failed) {
    console.error(`Deploy failed before production smoke: ${deploy.reason}`);
    process.exit(1);
  }

  const result = {
    expectedReleaseId: deploy.deployExpected ? commitSha : "",
    deployExpected: deploy.deployExpected,
    mode: deploy.mode,
    reason: deploy.reason,
  };

  emitResult(result);
  console.log(
    deploy.deployExpected
      ? `Post-deploy smoke expects release ${commitSha}. ${deploy.reason}`
      : `No production deploy expected for ${commitSha}. ${deploy.reason}`
  );
  process.exit(0);
}

const fallback = {
  expectedReleaseId: commitSha,
  deployExpected: true,
  mode: "assume_deploy",
  reason: "No Google Cloud Build check run was found before timeout. Assuming deploy is expected.",
};

emitResult(fallback);
console.log(`Falling back to release ${commitSha}. ${fallback.reason}`);
