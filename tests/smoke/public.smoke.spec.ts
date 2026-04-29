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

test("start trial router loads and routes demo intent @smoke", async ({ page }) => {
  await page.goto("/start-trial");

  await expect(
    page.getByRole("heading", { name: /Tell GymFlow a little about your gym/i })
  ).toBeVisible();

  await page.getByRole("button", { name: "2–4 branches" }).click();
  await page.getByRole("button", { name: "5,000+" }).click();
  await page.getByRole("button", { name: "Another gym system" }).click();
  await page.getByRole("button", { name: "I want help from your team" }).click();
  await page.getByRole("button", { name: "Book a Demo" }).click();

  await expect(page).toHaveURL(/\/contact\?/);
  await expect(page.getByRole("heading", { name: /Send a message/i })).toBeVisible();
  await expect(page.getByLabel("What do you need?")).toHaveValue("demo");
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

test("dashboard redirects unauthenticated users without protected API noise @smoke", async ({
  page,
}) => {
  const protectedApiResponses: string[] = [];

  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      /\/api\/(members|notifications|settings|whatsapp)\b/.test(response.url())
    ) {
      protectedApiResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  expect(protectedApiResponses).toEqual([]);
});
