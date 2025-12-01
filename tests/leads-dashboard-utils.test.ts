import { describe, expect, it } from "vitest"

import { computeLeadStats, filterLeads } from "@/lib/leads/dashboard-utils"
import type { Lead } from "@/lib/types"

let leadCounter = 0

function buildLead(overrides: Partial<Lead>): Lead {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `lead_${leadCounter++}`,
    lead_type: overrides.lead_type ?? "instant_quote",
    status: overrides.status ?? "new",
    contact_name: overrides.contact_name ?? "",
    company_name: overrides.company_name ?? "",
    email: overrides.email ?? "test@example.com",
    phone: overrides.phone ?? null,
    move_type: overrides.move_type ?? null,
    origin_suburb: overrides.origin_suburb ?? null,
    destination_suburb: overrides.destination_suburb ?? null,
    distance_km: overrides.distance_km ?? null,
    square_meters: overrides.square_meters ?? null,
    estimated_total: overrides.estimated_total ?? 0,
    deposit_amount: overrides.deposit_amount ?? null,
    deposit_paid: overrides.deposit_paid ?? null,
    payment_status: overrides.payment_status ?? null,
    scheduled_date: overrides.scheduled_date ?? null,
    additional_services: overrides.additional_services ?? null,
    industry_type: overrides.industry_type ?? null,
    employee_count: overrides.employee_count ?? null,
    current_location: overrides.current_location ?? null,
    new_location: overrides.new_location ?? null,
    target_move_date: overrides.target_move_date ?? null,
    special_requirements: overrides.special_requirements ?? null,
    project_description: overrides.project_description ?? null,
    preferred_contact_time: overrides.preferred_contact_time ?? null,
    internal_notes: overrides.internal_notes ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
  }
}

describe("lead dashboard utilities", () => {
  const leads = [
    buildLead({ email: "alpha@corp.com", company_name: "Alpha", status: "new", created_at: new Date().toISOString() }),
    buildLead({ email: "beta@corp.com", company_name: "Beta", status: "quoted", lead_type: "custom_quote", estimated_total: 5000 }),
    buildLead({ email: "gamma@corp.com", company_name: "Gamma", status: "won", estimated_total: 10000, created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() }),
  ]

  it("filters by search, status, and lead type", () => {
    const filtered = filterLeads(leads, { searchTerm: "beta", status: "quoted", type: "custom_quote" })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].email).toBe("beta@corp.com")
  })

  it("ignores unknown filter values for security", () => {
    const filtered = filterLeads(leads, { status: "invalid" as never, type: "bad" as never })
    expect(filtered).toHaveLength(leads.length)
  })

  it("computes aggregate stats for dashboard cards", () => {
    const stats = computeLeadStats(leads, new Date())
    expect(stats.total).toBe(3)
    expect(stats.new).toBe(1)
    expect(stats.totalValue).toBe(15000)
    expect(stats.thisWeek).toBe(2)
  })
})
