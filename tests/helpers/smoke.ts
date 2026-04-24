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

  await page.goto("/login");

  const emailLabel = /Email|البريد الإلكتروني/i;
  const passwordLabel = /Password|كلمة المرور/i;
  const submitLabel = /Sign in|تسجيل الدخول/i;

  await page.getByLabel(emailLabel).fill(email);
  await page.getByLabel(passwordLabel).fill(password);

  const emailForm = page
    .locator("form")
    .filter({ has: page.getByLabel(emailLabel) })
    .first();

  await emailForm.getByRole("button", { name: submitLabel }).click();

  await page.waitForURL(/\/dashboard(?:$|[/?#])/, { timeout: 30_000 });
  await expect(page.locator("main")).toBeVisible();
}
