import type { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const updateSessionMock = vi.fn()

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}))

describe("proxy", () => {
  beforeEach(() => {
    updateSessionMock.mockReset()
  })

  it("delegates requests to updateSession", async () => {
    const mockResponse = { ok: true }
    const request = {} as NextRequest
    updateSessionMock.mockResolvedValueOnce(mockResponse)

    const { proxy } = await import("@/proxy")
    const response = await proxy(request)

    expect(updateSessionMock).toHaveBeenCalledWith(request)
    expect(response).toBe(mockResponse)
  })
})
