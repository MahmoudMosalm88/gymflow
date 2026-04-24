import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_BASE_URL = "https://gymflowsystem.com";
export const DEFAULT_REPOSITORY = "MahmoudMosalm88/gymflow";

function sanitizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function resolveBaseUrl() {
  return (
    sanitizeBaseUrl(process.env.PLAYWRIGHT_BASE_URL) ||
    sanitizeBaseUrl(process.env.PRODUCTION_BASE_URL) ||
    sanitizeBaseUrl(process.env.APP_BASE_URL) ||
    DEFAULT_BASE_URL
  );
}

export function resolveRepository() {
  const repository = String(process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY).trim();

  if (!repository.includes("/")) {
    throw new Error(
      `Invalid repository "${repository}". Expected "owner/repo" in GITHUB_REPOSITORY.`
    );
  }

  return repository;
}

function buildGitHubApiUrl(path) {
  const apiBaseUrl = String(process.env.GITHUB_API_URL || "https://api.github.com").replace(
    /\/+$/,
    ""
  );
  return `${apiBaseUrl}${path}`;
}

async function requestGitHubWithToken(path) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return null;
  }

  const response = await fetch(buildGitHubApiUrl(path), {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "gymflow-release-monitor",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${path}: ${body}`);
  }

  return response.json();
}

async function requestGitHubWithCli(path) {
  const { stdout } = await execFileAsync("gh", ["api", path], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return JSON.parse(stdout);
}

export async function requestGitHubJson(path) {
  const tokenResult = await requestGitHubWithToken(path);
  if (tokenResult) {
    return tokenResult;
  }

  try {
    return await requestGitHubWithCli(path);
  } catch (error) {
    throw new Error(
      `Unable to query GitHub API for ${path}. Set GITHUB_TOKEN or make sure gh is authenticated. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function getMainBranchCommit(repository = resolveRepository()) {
  return requestGitHubJson(`/repos/${repository}/branches/main`);
}

export async function getCheckRunsForCommit(sha, repository = resolveRepository()) {
  return requestGitHubJson(`/repos/${repository}/commits/${sha}/check-runs?per_page=100`);
}

export async function getWorkflowRuns(repository = resolveRepository(), branch = "main", perPage = 10) {
  return requestGitHubJson(`/repos/${repository}/actions/runs?branch=${branch}&per_page=${perPage}`);
}

export function normalizeWorkflowRun(run) {
  if (!run) {
    return null;
  }

  return {
    workflowName: run.workflowName || run.name || null,
    headSha: run.headSha || run.head_sha || null,
    status: run.status || null,
    conclusion: run.conclusion || null,
    url: run.html_url || run.url || null,
    createdAt: run.createdAt || run.created_at || null,
    displayTitle: run.displayTitle || run.display_title || null,
    databaseId: run.databaseId || run.database_id || run.id || null,
  };
}

export function findCloudBuildCheckRun(checkRuns) {
  return [...(checkRuns || [])]
    .filter((run) => run?.app?.slug === "google-cloud-build")
    .sort((left, right) => {
      const leftDate = Date.parse(left?.started_at || left?.completed_at || 0);
      const rightDate = Date.parse(right?.started_at || right?.completed_at || 0);
      return rightDate - leftDate || (right?.id || 0) - (left?.id || 0);
    })[0] || null;
}

function getCheckRunSummary(checkRun) {
  return String(checkRun?.output?.summary || checkRun?.output?.title || "").trim();
}

export function evaluateDeployExpectation(checkRun) {
  if (!checkRun) {
    return {
      deployExpected: true,
      failed: false,
      mode: "unknown",
      reason: "No Google Cloud Build check run found for this commit yet.",
    };
  }

  const summary = getCheckRunSummary(checkRun);
  const normalizedSummary = summary.toLowerCase();

  if (checkRun.status !== "completed") {
    return {
      deployExpected: true,
      failed: false,
      mode: "in_progress",
      reason: "Google Cloud Build is still in progress.",
    };
  }

  if (
    checkRun.conclusion === "neutral" &&
    normalizedSummary.includes("changed files did not match file filter")
  ) {
    return {
      deployExpected: false,
      failed: false,
      mode: "filtered",
      reason: summary || "Changed files did not match file filter.",
    };
  }

  if (
    ["failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"].includes(
      checkRun.conclusion || ""
    )
  ) {
    return {
      deployExpected: true,
      failed: true,
      mode: "failed",
      reason: summary || `Google Cloud Build concluded ${checkRun.conclusion}.`,
    };
  }

  return {
    deployExpected: true,
    failed: false,
    mode: checkRun.conclusion === "success" ? "deploy_expected" : checkRun.conclusion || "completed",
    reason: summary || `Google Cloud Build concluded ${checkRun.conclusion || "unknown"}.`,
  };
}

export function findWorkflowRun(workflowRuns, workflowName, headSha) {
  const runs = [...(workflowRuns || [])]
    .map(normalizeWorkflowRun)
    .filter(Boolean)
    .filter((run) => run.workflowName === workflowName)
    .filter((run) => (headSha ? run.headSha === headSha : true))
    .sort((left, right) => {
      const leftDate = Date.parse(left.createdAt || 0);
      const rightDate = Date.parse(right.createdAt || 0);
      return rightDate - leftDate || (right.databaseId || 0) - (left.databaseId || 0);
    });

  return runs[0] || null;
}

export async function fetchHealth(baseUrl = resolveBaseUrl()) {
  const healthUrl = new URL("/api/health", baseUrl).toString();
  const response = await fetch(healthUrl, { cache: "no-store" });
  const rawBody = await response.text();

  let payload = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    payload = null;
  }

  return {
    healthUrl,
    ok: response.ok,
    statusCode: response.status,
    payload,
    rawBody,
  };
}

export function extractHealthData(healthResult) {
  const data = healthResult?.payload?.data ?? healthResult?.payload ?? null;
  return {
    status: data?.status || null,
    releaseId: data?.releaseId || null,
  };
}
