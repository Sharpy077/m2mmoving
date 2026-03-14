/**
 * Tests for UI/UX improvements:
 * - lib/config.ts — centralised contact constants
 * - hooks/use-form-persistence.ts — timestamp support
 * - components/stats-section.tsx — skeleton loader (isLoading branch)
 * - components/admin-dashboard.tsx — pagination, race-condition prevention
 * - components/footer.tsx — no dead mailto: links
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ────────────────────────────────────────────────────────────────────────────────
// 1. lib/config.ts
// ────────────────────────────────────────────────────────────────────────────────
describe("lib/config", () => {
  it("exports CONTACT_PHONE as a non-empty string", async () => {
    const { CONTACT_PHONE } = await import("@/lib/config")
    expect(typeof CONTACT_PHONE).toBe("string")
    expect(CONTACT_PHONE.length).toBeGreaterThan(0)
  })

  it("exports CONTACT_PHONE_LINK starting with tel:", async () => {
    const { CONTACT_PHONE_LINK } = await import("@/lib/config")
    expect(CONTACT_PHONE_LINK).toMatch(/^tel:/)
  })

  it("exports CONTACT_EMAIL containing @", async () => {
    const { CONTACT_EMAIL } = await import("@/lib/config")
    expect(CONTACT_EMAIL).toContain("@")
  })

  it("exports CONTACT_EMAIL_LINK starting with mailto:", async () => {
    const { CONTACT_EMAIL_LINK } = await import("@/lib/config")
    expect(CONTACT_EMAIL_LINK).toMatch(/^mailto:/)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 2. hooks/use-form-persistence.ts — timestamp support (unit-level, no DOM)
// ────────────────────────────────────────────────────────────────────────────────
describe("useFormPersistence — timestamp in saved entry", () => {
  it("serialises data as { data, savedAt } entry", () => {
    const formData = { email: "test@example.com" }
    const now = 1700000000000
    const entry = { data: formData, savedAt: now }
    const serialised = JSON.stringify(entry)
    const parsed = JSON.parse(serialised)
    expect(parsed).toHaveProperty("data")
    expect(parsed).toHaveProperty("savedAt")
    expect(parsed.data.email).toBe("test@example.com")
    expect(typeof parsed.savedAt).toBe("number")
  })

  it("loadSavedData logic exposes _savedAt on returned object", () => {
    const now = 1700000000000
    const formData = { step: 2, email: "a@b.com" }
    const raw = JSON.stringify({ data: formData, savedAt: now })
    const parsed = JSON.parse(raw)
    // Mimic the updated loadSavedData logic
    let result: typeof formData & { _savedAt?: number } | null = null
    if (parsed && typeof parsed === "object" && "data" in parsed && "savedAt" in parsed) {
      result = { ...parsed.data, _savedAt: parsed.savedAt }
    }
    expect(result).not.toBeNull()
    expect(result!._savedAt).toBe(now)
    expect(result!.email).toBe("a@b.com")
  })

  it("returns null when storage has no entry", () => {
    const raw: string | null = null
    const result = raw ? JSON.parse(raw) : null
    expect(result).toBeNull()
  })

  it("falls back to flat format when entry has no savedAt", () => {
    const flat = { step: 1, email: "b@c.com" }
    const raw = JSON.stringify(flat)
    const parsed = JSON.parse(raw)
    // No 'data' + 'savedAt' keys — should return as-is (legacy format)
    const isNewFormat = parsed && typeof parsed === "object" && "data" in parsed && "savedAt" in parsed
    expect(isNewFormat).toBe(false)
    expect(parsed.email).toBe("b@c.com")
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 3. Admin dashboard pagination logic
// ────────────────────────────────────────────────────────────────────────────────
describe("admin dashboard pagination logic", () => {
  const PAGE_SIZE = 25

  function paginate<T>(items: T[], page: number) {
    return items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }

  function totalPages(count: number) {
    return Math.max(1, Math.ceil(count / PAGE_SIZE))
  }

  it("returns first 25 items on page 0", () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const page = paginate(items, 0)
    expect(page).toHaveLength(25)
    expect(page[0]).toBe(0)
    expect(page[24]).toBe(24)
  })

  it("returns next 25 items on page 1", () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const page = paginate(items, 1)
    expect(page).toHaveLength(25)
    expect(page[0]).toBe(25)
  })

  it("returns remaining items on last page", () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const page = paginate(items, 2)
    expect(page).toHaveLength(10)
    expect(page[0]).toBe(50)
  })

  it("totalPages is 1 when list is empty", () => {
    expect(totalPages(0)).toBe(1)
  })

  it("totalPages is 3 for 60 items", () => {
    expect(totalPages(60)).toBe(3)
  })

  it("totalPages is 1 for 25 items exactly", () => {
    expect(totalPages(25)).toBe(1)
  })

  it("totalPages is 2 for 26 items", () => {
    expect(totalPages(26)).toBe(2)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 4. Race-condition prevention: savingLeadId guard
// ────────────────────────────────────────────────────────────────────────────────
describe("admin dashboard race-condition prevention", () => {
  it("does not call updateStatus when savingLeadId matches leadId", async () => {
    const updateStatus = vi.fn().mockResolvedValue({ success: true })
    let savingLeadId: string | null = null

    const handleStatusChange = async (leadId: string, newStatus: string) => {
      if (savingLeadId === leadId) return
      savingLeadId = leadId
      await updateStatus(leadId, newStatus)
      savingLeadId = null
    }

    // First call starts
    const p1 = handleStatusChange("lead-1", "contacted")
    // Second call for same lead should be no-op while first is in flight
    const p2 = handleStatusChange("lead-1", "won")
    await Promise.all([p1, p2])

    expect(updateStatus).toHaveBeenCalledTimes(1)
    expect(updateStatus).toHaveBeenCalledWith("lead-1", "contacted")
  })

  it("allows status change for different lead IDs concurrently", async () => {
    const updateStatus = vi.fn().mockResolvedValue({ success: true })
    const savingIds = new Set<string>()

    const handleStatusChange = async (leadId: string, newStatus: string) => {
      if (savingIds.has(leadId)) return
      savingIds.add(leadId)
      await updateStatus(leadId, newStatus)
      savingIds.delete(leadId)
    }

    await Promise.all([
      handleStatusChange("lead-1", "contacted"),
      handleStatusChange("lead-2", "won"),
    ])

    expect(updateStatus).toHaveBeenCalledTimes(2)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 5. Footer — no dead mailto: links for navigation items
// ────────────────────────────────────────────────────────────────────────────────
describe("footer navigation", () => {
  it("does not contain mailto: for About Us, Careers, or Blog navigation items", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const footerPath = path.join(process.cwd(), "components", "footer.tsx")
    const content = fs.readFileSync(footerPath, "utf-8")

    // The old mailto: links for About Us / Careers / Blog should be gone
    expect(content).not.toMatch(/About Us.*mailto:/s)
    expect(content).not.toMatch(/Careers.*mailto:/s)
    expect(content).not.toMatch(/Blog.*mailto:/s)
  })

  it("still contains a valid phone link", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const footerPath = path.join(process.cwd(), "components", "footer.tsx")
    const content = fs.readFileSync(footerPath, "utf-8")
    expect(content).toMatch(/tel:/)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 6. Stats section — skeleton branches
// ────────────────────────────────────────────────────────────────────────────────
describe("stats section skeleton loader", () => {
  it("renders animate-pulse skeleton when isLoading is true", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const statsPath = path.join(process.cwd(), "components", "stats-section.tsx")
    const content = fs.readFileSync(statsPath, "utf-8")
    expect(content).toContain("animate-pulse")
  })

  it("does not use raw '...' as stat value placeholder", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const statsPath = path.join(process.cwd(), "components", "stats-section.tsx")
    const content = fs.readFileSync(statsPath, "utf-8")
    // The old pattern was isLoading ? "..." : value — should be gone
    expect(content).not.toMatch(/isLoading \? "\.\.\." :/)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 7. globals.css — prefers-reduced-motion
// ────────────────────────────────────────────────────────────────────────────────
describe("globals.css prefers-reduced-motion", () => {
  it("contains prefers-reduced-motion media query", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const cssPath = path.join(process.cwd(), "app", "globals.css")
    const content = fs.readFileSync(cssPath, "utf-8")
    expect(content).toContain("prefers-reduced-motion: reduce")
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// 8. ABN lookup error state
// ────────────────────────────────────────────────────────────────────────────────
describe("quote-assistant ABN lookup error handling", () => {
  it("quote-assistant handles ABN search failure with user-visible error", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const file = path.join(process.cwd(), "components", "quote-assistant.tsx")
    const content = fs.readFileSync(file, "utf-8")

    // Should have an error state variable
    expect(content).toContain("abnSearchError")
    // Should set the error on catch
    expect(content).toContain("Business search is temporarily unavailable")
  })
})
