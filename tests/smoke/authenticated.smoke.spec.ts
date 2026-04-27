import { expect, test } from "@playwright/test";
import { hasSmokeCredentials, loginWithSmokeUser } from "@/tests/helpers/smoke";

test("authenticated dashboard shells load @smoke", async ({ page }) => {
  test.skip(!hasSmokeCredentials(), "Smoke credentials are not configured.");

  await loginWithSmokeUser(page);

  for (const path of [
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/members",
    "/dashboard/members/new",
    "/dashboard/subscriptions",
    "/dashboard/import",
    "/dashboard/whatsapp",
    "/dashboard/reports",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
    await expect(page.locator("main")).toBeVisible();
  }
});
