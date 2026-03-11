import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { status: "won", estimated_total: 15000, deal_stage: "won" },
          { status: "new", estimated_total: 8000, deal_stage: "new" },
          { status: "lost", estimated_total: 5000, deal_stage: "lost" },
        ],
        error: null,
      }),
    }),
  })),
}))

describe("GET /api/admin/analytics", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it("returns dashboard metrics", async () => {
    const { GET } = await import("@/app/api/admin/analytics/route")
    const req = new NextRequest("http://localhost/api/admin/analytics")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("totalLeads")
    expect(body).toHaveProperty("conversionRate")
    expect(body).toHaveProperty("avgDealSize")
    expect(body).toHaveProperty("wonDeals")
    expect(body).toHaveProperty("lostDeals")
    expect(body.totalLeads).toBe(3)
    expect(body.wonDeals).toBe(1)
    expect(body.lostDeals).toBe(1)
  })
})
