import { expect, test } from "@playwright/test";

test("homepage shell loads @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/GymFlow/i);
  await expect(page.getByText(/GymFlow/i).first()).toBeVisible();
});

test("login page loads @smoke", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /Sign in|تسجيل الدخول/i })
  ).toBeVisible();
  await expect(page.getByLabel(/Email|البريد الإلكتروني/i)).toBeVisible();
  await expect(page.getByLabel(/Password|كلمة المرور/i)).toBeVisible();
});

test("health endpoint responds with status and release id @smoke", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  const payload = await response.json();

  expect(response.ok()).toBeTruthy();
  expect(payload).toMatchObject({
    success: true,
    data: {
      status: "ok",
    },
  });
  expect(typeof payload.data.releaseId).toBe("string");
});
