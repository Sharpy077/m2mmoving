import type { Lead } from "@/lib/types"

export type LeadStatusFilter = Lead["status"] | "all"
export type LeadTypeFilter = Lead["lead_type"] | "all"

export interface LeadFilters {
  searchTerm?: string
  status?: LeadStatusFilter
  type?: LeadTypeFilter
}

const allowedStatuses = new Set<LeadStatusFilter>(["new", "contacted", "quoted", "won", "lost", "all"])
const allowedLeadTypes = new Set<LeadTypeFilter>(["instant_quote", "custom_quote", "all"])

function normalizeSearchTerm(term?: string): string {
  return term?.trim().toLowerCase() ?? ""
}

function normalizeStatus(status?: LeadStatusFilter): LeadStatusFilter {
  return status && allowedStatuses.has(status) ? status : "all"
}

function normalizeType(type?: LeadTypeFilter): LeadTypeFilter {
  return type && allowedLeadTypes.has(type) ? type : "all"
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const searchTerm = normalizeSearchTerm(filters.searchTerm)
  const statusFilter = normalizeStatus(filters.status)
  const typeFilter = normalizeType(filters.type)

  return leads.filter((lead) => {
    const matchesSearch = searchTerm
      ? [lead.email, lead.company_name, lead.contact_name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm))
      : true

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter
    const matchesType = typeFilter === "all" || lead.lead_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })
}

export function computeLeadStats(leads: Lead[], now: Date = new Date()) {
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const total = leads.length
  const newLeads = leads.filter((lead) => lead.status === "new").length
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_total || 0), 0)
  const thisWeek = leads.filter((lead) => {
    const createdAt = new Date(lead.created_at)
    return createdAt >= weekAgo && createdAt <= now
  }).length

  return {
    total,
    new: newLeads,
    totalValue,
    thisWeek,
  }
}
