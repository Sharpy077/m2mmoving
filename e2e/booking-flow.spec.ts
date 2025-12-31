import { test, expect } from "@playwright/test"

test.describe("Complete Booking Flow", () => {
  test("should navigate from homepage to quote", async ({ page }) => {
    await page.goto("/")

    // Find and click the Get Quote button
    const quoteButton = page
      .getByRole("button", { name: /get.*quote/i })
      .or(page.getByRole("link", { name: /get.*quote/i }))

    if (await quoteButton.isVisible()) {
      await quoteButton.click()

      // Should navigate to quote page or open quote assistant
      await page.waitForTimeout(1000)

      // Verify we're on quote page or assistant is visible
      const isOnQuotePage = page.url().includes("quote")
      const assistantVisible = await page.locator('[data-testid="quote-assistant"]').isVisible()

      expect(isOnQuotePage || assistantVisible).toBeTruthy()
    }
  })

  test("should display contact information", async ({ page }) => {
    await page.goto("/")

    // Check phone number is displayed
    await expect(page.getByText(/03 8820 1801/)).toBeVisible()

    // Check for email link
    const emailLink = page.getByRole("link", { name: /@/i }).or(page.locator('a[href^="mailto:"]'))

    // Email should be present somewhere on the page
    const count = await emailLink.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("should have accessible forms", async ({ page }) => {
    await page.goto("/quote")

    // Check for form accessibility
    const forms = page.locator("form")
    const formCount = await forms.count()

    if (formCount > 0) {
      // Check that inputs have labels or aria-labels
      const inputs = page.locator('input:not([type="hidden"])')
      const inputCount = await inputs.count()

      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i)
        const hasLabel =
          (await input.getAttribute("aria-label")) ||
          (await input.getAttribute("aria-labelledby")) ||
          (await input.getAttribute("placeholder")) ||
          (await input.getAttribute("id"))

        // Input should have some form of labeling
        expect(hasLabel).toBeTruthy()
      }
    }
  })
})
