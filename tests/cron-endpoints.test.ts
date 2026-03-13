import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/campaigns/engine", () => ({
  processScheduledCampaigns: vi.fn().mockResolvedValue({ processed: 5, errors: 0 }),
}))

vi.mock("@/lib/service/reminders", () => ({
  processReminders: vi.fn().mockResolvedValue({ processed: 3, errors: 0 }),
}))

vi.mock("@/lib/agents/db", () => ({
  createConversation: vi.fn(),
  addMessage: vi.fn(),
  createEscalation: vi.fn(),
  createHandoff: vi.fn(),
  recordQAAudit: vi.fn().mockResolvedValue("qa_1"),
}))

describe("POST /api/cron/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("processes scheduled campaigns and returns count", async () => {
    const { POST } = await import("@/app/api/cron/campaigns/route")
    const req = new NextRequest("http://localhost/api/cron/campaigns", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(5)
    expect(body.errors).toBe(0)
  })
})

describe("POST /api/cron/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("processes due reminders and returns count", async () => {
    const { POST } = await import("@/app/api/cron/reminders/route")
    const req = new NextRequest("http://localhost/api/cron/reminders", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(3)
  })
})
