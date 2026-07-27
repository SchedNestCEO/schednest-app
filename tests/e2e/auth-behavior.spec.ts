import { expect, test } from "@playwright/test";

test("login form exposes required credential fields", async ({ page }) => {
  await page.goto("/login");

  const email = page.getByLabel(/email/i);
  const password = page.getByLabel(/password/i);
  const submit = page.getByRole("button", { name: /log in|sign in/i });

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();

  await submit.click();

  await expect(email).toHaveJSProperty("validity.valueMissing", true);
});

test("forgot-password rejects malformed email input", async ({ page }) => {
  await page.goto("/forgot-password");

  const email = page.getByLabel(/email/i);
  const submit = page.getByRole("button", { name: /send reset link/i });

  await email.fill("not-an-email");
  await submit.click();

  await expect(email).toHaveJSProperty("validity.typeMismatch", true);
});

test("reset-password enforces an eight-character minimum", async ({ page }) => {
  await page.goto("/reset-password");

  const newPassword = page.getByLabel(/^new password$/i);
  const confirmPassword = page.getByLabel(/^confirm password$/i);
  const submit = page.getByRole("button", { name: /update password/i });

  await expect(newPassword).toHaveAttribute("minlength", "8");
  await expect(confirmPassword).toHaveAttribute("minlength", "8");

  await newPassword.fill("short");
  await confirmPassword.fill("short");
  await submit.click();

  await expect(newPassword).toHaveJSProperty("validity.tooShort", true);
});

test("unauthenticated dashboard access does not expose dashboard content", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByText("Manage your bookings", { exact: false })
  ).toHaveCount(0);

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

  await expect(
    page.getByRole("heading", { name: /log in to your account/i })
  ).toBeVisible();
});

test("dashboard subscriptions redirects to admin subscriptions", async ({
  page,
}) => {
  await page.goto("/dashboard/subscriptions", {
    waitUntil: "domcontentloaded",
  });

  // An unauthenticated visitor may then be forwarded to login by the
  // protected admin route, but the original dashboard route must not render.
  await expect(page).not.toHaveURL(/\/dashboard\/subscriptions\/?$/);

  const currentUrl = new URL(page.url());

  expect(
    currentUrl.pathname === "/admin/subscriptions" ||
      currentUrl.pathname === "/login",
  ).toBe(true);
});
