import { expect, test } from "@playwright/test";
import { buyFirstProduct, login, orderRow, submitPayment } from "../support/helpers";

// The deterministic failure flow: Cash on Delivery is declined by the
// gateway every time (402), the order survives as pending, and the Pay
// link is the road back — retrying the same order with card settles it.
// Uses `bob` so these specs never share a user with the happy specs.
test.describe("failed payment — COD is declined", () => {
  test("COD submit fails, order stays pending with a Pay link", async ({
    page,
  }) => {
    await login(page, "bob");
    const { orderId } = await buyFirstProduct(page);

    // The form warns about COD before any submit happens.
    await page.locator('input[name="method"][value="cod"]').check();
    await expect(
      page.getByText(/The gateway declines Cash on Delivery/)
    ).toBeVisible();

    await submitPayment(page, "cod");

    // Rose result box, the server's error banner, and failed in the JSON.
    await expect(page.getByText("✗ Payment failed")).toBeVisible();
    await expect(page.locator("pre")).toContainText('"status": "failed"');
    await expect(page.getByText(/^payment failed$/i)).toBeVisible();

    // The order is untouched: pending pill, Pay link still offered.
    await page.goto("/orders");
    const row = orderRow(page, orderId);
    await expect(row.locator(".pill")).toHaveText("pending");
    await expect(row.getByRole("link", { name: "Pay" })).toBeVisible();
  });

  test("retry the failed order with card — flips to paid", async ({
    page,
  }) => {
    await login(page, "bob");
    const { orderId } = await buyFirstProduct(page);

    // First attempt fails via COD.
    await submitPayment(page, "cod");
    await expect(page.getByText("✗ Payment failed")).toBeVisible();

    // Come back through the orders table's own Pay link (no amount/product
    // in the URL this time — the server still knows the order).
    await page.goto("/orders");
    const row = orderRow(page, orderId);
    await expect(row.locator(".pill")).toHaveText("pending");
    await row.getByRole("link", { name: "Pay" }).click();
    await expect(page).toHaveURL(new RegExp(`/pay\\?order_id=${orderId}`));

    // Same order, card this time — it settles.
    await submitPayment(page, "card");
    await expect(page.getByText("✓ Payment result")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("pre")).toContainText('"status": "paid"');

    await page.goto("/orders");
    await expect(orderRow(page, orderId).locator(".pill")).toHaveText("paid");
  });
});
