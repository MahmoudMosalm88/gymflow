const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_BASE_URL ||
  process.env.APP_BASE_URL;
const expectedReleaseId =
  process.env.EXPECTED_RELEASE_ID || process.argv[2] || "";
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 10 * 60 * 1000);
const intervalMs = Number(process.env.WAIT_INTERVAL_MS || 10 * 1000);

if (!baseUrl) {
  console.error("Missing base URL. Set PLAYWRIGHT_BASE_URL, PRODUCTION_BASE_URL, or APP_BASE_URL.");
  process.exit(1);
}

const healthUrl = new URL("/api/health", baseUrl).toString();
const deadline = Date.now() + timeoutMs;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

while (Date.now() < deadline) {
  try {
    const response = await fetch(healthUrl, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      const releaseId = payload?.data?.releaseId;

      if (!expectedReleaseId || releaseId === expectedReleaseId) {
        console.log(
          `Release is ready at ${healthUrl}${releaseId ? ` (releaseId=${releaseId})` : ""}.`
        );
        process.exit(0);
      }

      console.log(
        `Health is up but release is still ${String(releaseId)}. Waiting for ${expectedReleaseId}...`
      );
    } else {
      console.log(`Health check returned ${response.status}. Waiting...`);
    }
  } catch (error) {
    console.log(
      `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  await sleep(intervalMs);
}

console.error(
  `Timed out waiting for release ${expectedReleaseId || "(any healthy release)"} at ${healthUrl}.`
);
process.exit(1);
