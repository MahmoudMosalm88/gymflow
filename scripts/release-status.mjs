import {
  evaluateDeployExpectation,
  extractHealthData,
  fetchHealth,
  findCloudBuildCheckRun,
  findWorkflowRun,
  getCheckRunsForCommit,
  getMainBranchCommit,
  getWorkflowRuns,
  resolveBaseUrl,
  resolveRepository,
} from "./lib/release-monitor.mjs";

function formatRun(run) {
  if (!run) {
    return "missing";
  }

  const conclusion = run.conclusion ? ` ${run.conclusion}` : "";
  return `${run.status}${conclusion}`.trim();
}

function printRun(label, run) {
  if (!run) {
    console.log(`${label}: missing`);
    return;
  }

  console.log(`${label}: ${formatRun(run)} (${run.url})`);
}

function printLine(label, value) {
  console.log(`${label}: ${value}`);
}

const strictMode = !process.argv.includes("--no-fail");
const jsonMode = process.argv.includes("--json");

const repository = resolveRepository();
const baseUrl = resolveBaseUrl();

const mainBranch = await getMainBranchCommit(repository);
const mainSha = mainBranch?.commit?.sha;

if (!mainSha) {
  console.error("Could not resolve the latest main branch SHA.");
  process.exit(1);
}

const [checkRunsResponse, workflowRunsResponse, healthResult] = await Promise.all([
  getCheckRunsForCommit(mainSha, repository),
  getWorkflowRuns(repository, "main", 10),
  fetchHealth(baseUrl),
]);

const cloudBuildRun = findCloudBuildCheckRun(checkRunsResponse?.check_runs);
const deploy = evaluateDeployExpectation(cloudBuildRun);
const ciRun = findWorkflowRun(workflowRunsResponse?.workflow_runs, "CI", mainSha);
const prodSmokeRun = findWorkflowRun(
  workflowRunsResponse?.workflow_runs,
  "Post Deploy Smoke",
  mainSha
);
const healthData = extractHealthData(healthResult);

const ciPassed = ciRun?.status === "completed" && ciRun?.conclusion === "success";
const prodSmokePassed =
  prodSmokeRun?.status === "completed" && prodSmokeRun?.conclusion === "success";
const healthOk = healthResult.ok && healthData.status === "ok";
const releaseMatches = healthData.releaseId === mainSha;

let loopClosed = false;
let summary = "";

if (!ciPassed) {
  summary = "Main CI has not passed for the latest merge.";
} else if (deploy.failed) {
  summary = `Cloud Build failed: ${deploy.reason}`;
} else if (!prodSmokeRun) {
  summary = "Post Deploy Smoke has not been created for the latest main commit.";
} else if (!prodSmokePassed) {
  summary = "Post Deploy Smoke has not passed for the latest main commit.";
} else if (!healthOk) {
  summary = `Production health is not ready (${healthResult.statusCode}).`;
} else if (deploy.deployExpected && !releaseMatches) {
  summary = `Production is healthy but still serving ${healthData.releaseId || "unknown"}, not ${mainSha}.`;
} else {
  loopClosed = true;
  summary = deploy.deployExpected
    ? "Deploy expected and production is serving the latest main release."
    : `No deploy was expected for this merge. Production stayed healthy on ${healthData.releaseId || "unknown"}.`;
}

const report = {
  repository,
  baseUrl,
  mainSha,
  cloudBuild: {
    name: cloudBuildRun?.name || null,
    status: cloudBuildRun?.status || null,
    conclusion: cloudBuildRun?.conclusion || null,
    detailsUrl: cloudBuildRun?.details_url || null,
    mode: deploy.mode,
    deployExpected: deploy.deployExpected,
    reason: deploy.reason,
  },
  ci: ciRun
    ? {
        status: ciRun.status,
        conclusion: ciRun.conclusion,
        url: ciRun.url,
      }
    : null,
  postDeploySmoke: prodSmokeRun
    ? {
        status: prodSmokeRun.status,
        conclusion: prodSmokeRun.conclusion,
        url: prodSmokeRun.url,
      }
    : null,
  production: {
    healthUrl: healthResult.healthUrl,
    statusCode: healthResult.statusCode,
    status: healthData.status,
    releaseId: healthData.releaseId,
  },
  loopClosed,
  summary,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Release status for ${repository}`);
  printLine("Main SHA", mainSha);
  printLine(
    "Cloud Build",
    `${deploy.mode}${deploy.reason ? ` — ${deploy.reason}` : ""}${
      cloudBuildRun?.details_url ? ` (${cloudBuildRun.details_url})` : ""
    }`
  );
  printRun("CI", ciRun);
  printRun("Post Deploy Smoke", prodSmokeRun);
  printLine(
    "Production health",
    `${healthData.status || "unknown"} (releaseId=${healthData.releaseId || "unknown"})`
  );
  printLine("Loop closed", loopClosed ? "yes" : "no");
  printLine("Summary", summary);
}

if (!loopClosed && strictMode) {
  process.exit(1);
}
