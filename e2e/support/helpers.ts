import { expect, type Locator, type Page } from "@playwright/test";

// Every seeded demo account (alice, bob, hana, felix, sara, lily) shares
// this password — see rabbit-k8s-assignment/k8s-local/storage/mariadb-init.sql.
export const DEMO_PASSWORD = "password";

// The four methods the pay form offers. The specs only ever drive the two
// deterministic ones: "card" always succeeds, "cod" is always declined by
// the gateway (402) — that pair is what makes the happy/failed split stable.
export type Method = "card" | "truemoney" | "gwallet" | "cod";

// Sign in through the real /login form and land on /orders. The form is
// prefilled with bob/password, so fill() (which replaces) matters — without
// it every login would silently submit bob no matter the username passed.
export async function login(page: Page, username: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill(username);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/orders$/);
}

export interface Checkout {
  orderId: number;
  productName: string;
  amount: number | null;
}

// Buy the first catalog card and follow the redirect to /pay. The order id
// only ever exists server-side, so the redirect URL is where the test can
// first learn it — everything later (row assertions, retry) keys off it.
export async function buyFirstProduct(page: Page): Promise<Checkout> {
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();
  const productName = (await firstCard.locator("h4").innerText()).trim();

  await firstCard.getByRole("button", { name: "Buy" }).click();
  await page.waitForURL(/\/pay\?order_id=/);

  const params = new URL(page.url()).searchParams;
  return {
    orderId: Number(params.get("order_id")),
    productName,
    amount: params.has("amount") ? Number(params.get("amount")) : null,
  };
}

// Pick a payment method radio and submit. Returns once the result box has
// rendered — success or failure is the caller's assertion to make.
export async function submitPayment(page: Page, method: Method): Promise<void> {
  await page.locator(`input[name="method"][value="${method}"]`).check();
  await page.locator('button[type="submit"]').click();
  await expect
    .poll(async () =>
      (await page.getByText("✓ Payment result").count()) +
      (await page.getByText("✗ Payment failed").count())
    )
    .toBeGreaterThan(0);
}

// The row in "My Orders" for one order. Matching the id cell exactly
// (`#5`) rather than by substring keeps #5 from also matching #51 in a
// user's growing order history across repeated runs.
export function orderRow(page: Page, orderId: number): Locator {
  return page
    .locator("tbody tr")
    .filter({ has: page.locator("td", { hasText: new RegExp(`^#${orderId}$`) }) });
}
