import { expect, type Page } from "@playwright/test";

export function hasSmokeCredentials() {
  return Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
}

export async function loginWithSmokeUser(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing E2E_EMAIL or E2E_PASSWORD.");
  }

  const authBaseURL =
    process.env.PLAYWRIGHT_AUTH_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.PRODUCTION_BASE_URL ||
    "https://gymflowsystem.com";

  const response = await fetch(`${authBaseURL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(`Smoke login failed with status ${response.status}.`);
  }

  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const session = data?.session;
  const profile = data?.user || data?.owner;

  if (typeof session?.idToken !== "string" || typeof session?.branchId !== "string" || !profile) {
    throw new Error("Smoke login response was missing session data.");
  }

  await page.addInitScript(
    ({ token, branchId, profile }) => {
      localStorage.setItem("session_token", token);
      localStorage.setItem("branch_id", branchId);
      localStorage.setItem("owner_profile", JSON.stringify(profile));
    },
    {
      token: session.idToken,
      branchId: session.branchId,
      profile,
    }
  );

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard(?:$|[/?#])/, { timeout: 30_000 });
  await expect(page.locator("main")).toBeVisible();
}
