"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  FileText,
  Save,
  Loader2,
} from "lucide-react"
import { updateLeadStatus, updateLeadNotes } from "@/app/actions/leads"
import type { Lead } from "@/lib/types"

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  quoted: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  won: "bg-green-500/20 text-green-400 border-green-500/50",
  lost: "bg-red-500/20 text-red-400 border-red-500/50",
}

const moveTypeLabels: Record<string, string> = {
  office: "Office Relocation",
  datacenter: "Data Center",
  "it-equipment": "IT Equipment",
  warehouse: "Warehouse",
}

interface AdminDashboardProps {
  initialLeads: Lead[]
}

export function AdminDashboard({ initialLeads }: AdminDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter
    const matchesType = typeFilter === "all" || lead.lead_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    totalValue: leads.reduce((sum, l) => sum + (l.estimated_total || 0), 0),
    thisWeek: leads.filter((l) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(l.created_at) > weekAgo
    }).length,
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setIsSaving(true)
    const result = await updateLeadStatus(leadId, newStatus)
    if (result.success) {
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus as Lead["status"] } : lead)),
      )
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: newStatus as Lead["status"] } : null))
      }
    }
    setIsSaving(false)
  }

  const handleSaveNotes = async () => {
    if (!selectedLead) return
    setIsSaving(true)
    const result = await updateLeadNotes(selectedLead.id, editNotes)
    if (result.success) {
      setLeads((prev) =>
        prev.map((lead) => (lead.id === selectedLead.id ? { ...lead, internal_notes: editNotes } : lead)),
      )
      setSelectedLead((prev) => (prev ? { ...prev, internal_notes: editNotes } : null))
    }
    setIsSaving(false)
  }

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead)
    setEditNotes(lead.internal_notes || "")
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground font-mono">TOTAL_LEADS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.new}</div>
                <div className="text-sm text-muted-foreground font-mono">NEW_LEADS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">${stats.totalValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-mono">PIPELINE_VALUE</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.thisWeek}</div>
                <div className="text-sm text-muted-foreground font-mono">THIS_WEEK</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-background border-border">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="instant_quote">Instant Quote</SelectItem>
                  <SelectItem value="custom_quote">Custom Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="font-mono text-lg">
            LEADS_DATABASE <span className="text-muted-foreground">({filteredLeads.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">DATE</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">CONTACT</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">TYPE</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">MOVE</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">VALUE</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">STATUS</th>
                  <th className="text-left p-4 font-mono text-xs text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openLeadDetail(lead)}
                  >
                    <td className="p-4">
                      <div className="text-sm text-foreground">{new Date(lead.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">{lead.contact_name || lead.email}</div>
                      <div className="text-xs text-muted-foreground">{lead.company_name || "-"}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {lead.lead_type === "instant_quote" ? "INSTANT" : "CUSTOM"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">
                        {lead.move_type ? moveTypeLabels[lead.move_type] || lead.move_type : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lead.square_meters ? `${lead.square_meters} m²` : "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-mono text-secondary">
                        {lead.estimated_total ? `$${lead.estimated_total.toLocaleString()}` : "TBD"}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${statusColors[lead.status]} border font-mono text-xs uppercase`}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Select
                        value={lead.status}
                        onValueChange={(value) => {
                          handleStatusChange(lead.id, value)
                        }}
                      >
                        <SelectTrigger
                          className="w-[120px] h-8 text-xs bg-background border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl flex items-center gap-2">
              LEAD_DETAIL
              <Badge
                className={`${statusColors[selectedLead?.status || "new"]} border font-mono text-xs uppercase ml-2`}
              >
                {selectedLead?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="font-mono text-muted-foreground">
              ID: {selectedLead?.id?.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> EMAIL
                  </div>
                  <a href={`mailto:${selectedLead.email}`} className="text-sm text-primary hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> PHONE
                  </div>
                  {selectedLead.phone ? (
                    <a href={`tel:${selectedLead.phone}`} className="text-sm text-primary hover:underline">
                      {selectedLead.phone}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> COMPANY
                  </div>
                  <div className="text-sm text-foreground">{selectedLead.company_name || "-"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> SUBMITTED
                  </div>
                  <div className="text-sm text-foreground">{new Date(selectedLead.created_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Move Details */}
              <div className="border-t border-border pt-4">
                <h3 className="font-mono text-sm text-muted-foreground mb-3">// MOVE_DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLead.move_type && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">MOVE_TYPE</div>
                      <div className="text-sm text-foreground">
                        {moveTypeLabels[selectedLead.move_type] || selectedLead.move_type}
                      </div>
                    </div>
                  )}
                  {selectedLead.estimated_total && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">ESTIMATED_VALUE</div>
                      <div className="text-sm text-secondary font-bold">
                        ${selectedLead.estimated_total.toLocaleString()} AUD
                      </div>
                    </div>
                  )}
                  {selectedLead.origin_suburb && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> FROM
                      </div>
                      <div className="text-sm text-foreground">{selectedLead.origin_suburb}</div>
                    </div>
                  )}
                  {selectedLead.destination_suburb && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> TO
                      </div>
                      <div className="text-sm text-foreground">{selectedLead.destination_suburb}</div>
                    </div>
                  )}
                  {selectedLead.current_location && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">CURRENT_ADDRESS</div>
                      <div className="text-sm text-foreground">{selectedLead.current_location}</div>
                    </div>
                  )}
                  {selectedLead.new_location && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">NEW_ADDRESS</div>
                      <div className="text-sm text-foreground">{selectedLead.new_location}</div>
                    </div>
                  )}
                  {selectedLead.square_meters && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">SPACE_SIZE</div>
                      <div className="text-sm text-foreground">{selectedLead.square_meters} m²</div>
                    </div>
                  )}
                  {selectedLead.target_move_date && (
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-muted-foreground">TARGET_DATE</div>
                      <div className="text-sm text-foreground">
                        {new Date(selectedLead.target_move_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Services / Requirements */}
              {(selectedLead.additional_services?.length || selectedLead.special_requirements?.length) && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-mono text-sm text-muted-foreground mb-3">// SELECTED_OPTIONS</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.additional_services?.map((service) => (
                      <Badge key={service} variant="outline" className="font-mono text-xs">
                        {service}
                      </Badge>
                    ))}
                    {selectedLead.special_requirements?.map((req) => (
                      <Badge key={req} variant="outline" className="font-mono text-xs border-accent text-accent">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Description */}
              {selectedLead.project_description && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-mono text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PROJECT_DESCRIPTION
                  </h3>
                  <p className="text-sm text-foreground bg-muted/30 p-3 border border-border">
                    {selectedLead.project_description}
                  </p>
                </div>
              )}

              {/* Internal Notes */}
              <div className="border-t border-border pt-4">
                <h3 className="font-mono text-sm text-muted-foreground mb-3">// INTERNAL_NOTES</h3>
                <Textarea
                  placeholder="Add internal notes about this lead..."
                  className="bg-background border-border min-h-[100px]"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleSaveNotes} disabled={isSaving} size="sm">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Notes
                  </Button>
                </div>
              </div>

              {/* Status Update */}
              <div className="border-t border-border pt-4">
                <h3 className="font-mono text-sm text-muted-foreground mb-3">// UPDATE_STATUS</h3>
                <div className="flex flex-wrap gap-2">
                  {["new", "contacted", "quoted", "won", "lost"].map((status) => (
                    <Button
                      key={status}
                      variant={selectedLead.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(selectedLead.id, status)}
                      disabled={isSaving}
                      className="font-mono uppercase text-xs"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
