import { describe, expect, it, beforeEach, vi } from "vitest"

import { updateLeadNotes, updateLeadStatus } from "@/app/actions/leads"
import { loginAction as authLoginAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

describe("admin and lead server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a validation error when login credentials are missing", async () => {
    const formData = new FormData()
    const result = await authLoginAction(formData)
    expect(result).toEqual({ error: "Email and password are required" })
  })

  it("signs in with Supabase and redirects on successful login", async () => {
    const signInMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createClient).mockResolvedValueOnce({ auth: { signInWithPassword: signInMock } } as any)

    const formData = new FormData()
    formData.set("email", "admin@example.com")
    formData.set("password", "secret")

    await authLoginAction(formData)

    expect(signInMock).toHaveBeenCalledWith({ email: "admin@example.com", password: "secret" })
    expect(redirect).toHaveBeenCalledWith("/admin")
  })

  it("updates lead status through Supabase", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ update: updateMock })
    vi.mocked(createClient).mockResolvedValueOnce({ from: fromMock } as any)

    const result = await updateLeadStatus("lead_123", "won")

    expect(result).toEqual({ success: true })
    expect(fromMock).toHaveBeenCalledWith("leads")
    expect(updateMock).toHaveBeenCalledWith({ status: "won" })
    expect(eqMock).toHaveBeenCalledWith("id", "lead_123")
  })

  it("propagates errors when a lead status update fails", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: "db offline" } })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ update: updateMock })
    vi.mocked(createClient).mockResolvedValueOnce({ from: fromMock } as any)

    const result = await updateLeadStatus("lead_404", "lost")

    expect(result).toEqual({ success: false, error: "db offline" })
  })

  it("persists internal notes for a lead record", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ update: updateMock })
    vi.mocked(createClient).mockResolvedValueOnce({ from: fromMock } as any)

    const result = await updateLeadNotes("lead_notes", "Needs onsite visit")

    expect(result).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith({ internal_notes: "Needs onsite visit" })
    expect(eqMock).toHaveBeenCalledWith("id", "lead_notes")
  })
})
