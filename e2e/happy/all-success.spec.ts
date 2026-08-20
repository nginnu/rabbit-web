import { expect, test } from "@playwright/test";
import { buyFirstProduct, login, orderRow, submitPayment } from "../support/helpers";

// The everything-succeeds flow: login → catalog → order → pay with card →
// order flips to paid. Uses `alice` so the happy specs never share a user
// (or an order table) with the failed specs on `bob`.
test.describe("happy path — all success", () => {
  test("login succeeds and lands on the shop", async ({ page }) => {
    await login(page, "alice");

    await expect(
      page.getByRole("heading", { name: "Catalog" })
    ).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "My Orders" })
    ).toBeVisible();
  });

  test("buy a jersey and pay with card — order ends up paid", async ({
    page,
  }) => {
    await login(page, "alice");
    const { orderId, productName, amount } = await buyFirstProduct(page);

    // The checkout summary reflects what the server priced: order id,
    // product, and a baht total — never anything the browser made up.
    await expect(page.getByText(`Order #${orderId}`)).toBeVisible();
    await expect(page.getByText(productName, { exact: true })).toBeVisible();
    await expect(page.getByText("Total")).toBeVisible();

    // Choosing Card prices the submit button ("Pay ฿…") before submit.
    await page.locator('input[name="method"][value="card"]').check();
    const submit = page.locator('button[type="submit"]');
    if (amount !== null) {
      await expect(submit).toContainText(`Pay ฿`);
    }
    await submit.click();

    // Emerald result box with a paid status in the receipt JSON.
    await expect(page.getByText("✓ Payment result")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("pre")).toContainText('"status": "paid"');

    // Back on the shop: the order row wears the paid pill and its Pay
    // link is gone — there is nothing left to collect.
    await page.goto("/orders");
    const row = orderRow(page, orderId);
    await expect(row.locator(".pill")).toHaveText("paid");
    await expect(row.getByRole("link", { name: "Pay" })).toHaveCount(0);
  });
});
