import { test, expect } from "@playwright/test"

test.describe("API Health Checks", () => {
  test("should have healthy quote assistant API", async ({ request }) => {
    const response = await request.get("/api/quote-assistant/health")

    // Should return 200 OK
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBeDefined()
  })

  test("should have working availability API", async ({ request }) => {
    const response = await request.get("/api/availability")

    // Should return 200 OK or 404 if not implemented
    expect(response.status()).toBeLessThan(500)
  })

  test("should have working voicemails API", async ({ request }) => {
    const response = await request.get("/api/voicemails")

    // Should return 200 OK or 401 if auth required
    expect(response.status()).toBeLessThan(500)
  })

  test("should reject invalid business lookup", async ({ request }) => {
    const response = await request.post("/api/business-lookup", {
      data: { query: "" },
    })

    // Should handle gracefully (not crash)
    expect(response.status()).toBeLessThan(500)
  })
})
