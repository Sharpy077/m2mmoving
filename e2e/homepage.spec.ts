import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("should display hero section with CTA buttons", async ({ page }) => {
    // Check hero title
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    // Check CTA buttons
    await expect(page.getByRole("button", { name: /get.*quote/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /call/i })).toBeVisible()
  })

  test("should display trust indicators", async ({ page }) => {
    // Check for trust bar elements
    await expect(page.getByText(/insured/i)).toBeVisible()
    await expect(page.getByText(/years/i)).toBeVisible()
  })

  test("should display services section", async ({ page }) => {
    // Check for service offerings
    await expect(page.getByText(/office/i).first()).toBeVisible()
    await expect(page.getByText(/warehouse/i).first()).toBeVisible()
  })

  test("should have working navigation", async ({ page }) => {
    // Check navbar links
    const nav = page.getByRole("navigation")
    await expect(nav).toBeVisible()

    // Check contact phone number
    await expect(page.getByText(/03 8820 1801/)).toBeVisible()
  })

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Hero should still be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    // Mobile menu button should be visible
    const mobileMenu = page.getByRole("button", { name: /menu/i })
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      // Menu should expand
      await expect(page.getByRole("navigation")).toBeVisible()
    }
  })
})
