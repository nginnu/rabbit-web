import { expect, test } from "@playwright/test";
import { USERS } from "../data/users";
import { DEMO_PASSWORD } from "../support/helpers";

// One test per user, walking the exact shopper journey:
//
//   landing (/) → login → shop (/orders) → buy → /pay checkout → card →
//   result — the flow ENDS on the payment result page.
//
// Five screenshots per user land in e2e/report/artifacts/<user>/ and are
// attached to the test so the flow reporter can pick them up. The deploy
// marker is read off the landing page per user: it is what that request's
// server says is running, so when roles are ever served different versions
// the captured marker (and the page tint, visible in every screenshot)
// diverges on its own — nothing is declared here.
const ARTIFACTS = "e2e/report/artifacts";

for (const [index, { username, role }] of USERS.entries()) {
  test(`full flow — ${username} (${role})`, async ({ page }) => {
    const info = test.info();
    info.annotations.push(
      { type: "user", description: username },
      { type: "expectedRole", description: role },
      { type: "index", description: String(index) }
    );

    const snap = async (name: string) => {
      const path = `${ARTIFACTS}/${username}/${name}.png`;
      await page.screenshot({ path });
      await info.attach(name, { path, contentType: "image/png" });
    };

    await test.step("landing", async () => {
      await page.goto("/");
      await expect(
        page.getByRole("link", { name: "Enter Store →" })
      ).toBeVisible();
      const marker = (
        await page.getByTestId("deploy-marker").innerText()
      ).trim();
      info.annotations.push({ type: "deployMarker", description: marker });
      await snap("01-landing");
      await page.getByRole("link", { name: "Enter Store →" }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step("login", async () => {
      await page.locator('input[autocomplete="username"]').fill(username);
      await page
        .locator('input[autocomplete="current-password"]')
        .fill(DEMO_PASSWORD);
      await snap("02-login");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/orders$/);

      // The role on the report is what the system said, not what the matrix
      // hoped for. Both go into the report so a divergence is visible.
      const me = await (await page.request.get("/api/auth/me")).json();
      expect(me.role, `/api/auth/me role for ${username}`).toBe(role);
      info.annotations.push({
        type: "role",
        description: String(me.role ?? "unknown"),
      });
    });

    await test.step("shop", async () => {
      await expect(
        page.getByRole("heading", { name: "Catalog" })
      ).toBeVisible();
      await expect(page.locator("article").first()).toBeVisible();
      await snap("03-shop");
    });

    await test.step("buy", async () => {
      await page.locator("article").first().getByRole("button", { name: "Buy" }).click();
      await page.waitForURL(/\/pay\?order_id=/);
      const orderId = Number(new URL(page.url()).searchParams.get("order_id"));
      info.annotations.push({ type: "orderId", description: String(orderId) });
      await expect(page.getByText(`Order #${orderId}`)).toBeVisible();
      await snap("04-checkout");
    });

    await test.step("pay", async () => {
      await page.locator('input[name="method"][value="card"]').check();
      await page.locator('button[type="submit"]').click();
    });

    await test.step("result", async () => {
      const box = page.getByText("✓ Payment result");
      await expect(box).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("pre")).toContainText('"status": "paid"');
      await box.scrollIntoViewIfNeeded();
      await snap("05-result");
    });
  });
}
