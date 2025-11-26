"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Building2, User, Mail, Phone, Calendar, FileText, CheckCircle2, Loader2 } from "lucide-react"
import { submitLead } from "@/app/actions/leads"

const businessTypes = [
  "Corporate Office",
  "Medical / Healthcare",
  "Legal Firm",
  "Financial Services",
  "Technology / IT",
  "Retail",
  "Industrial / Manufacturing",
  "Educational Institution",
  "Government",
  "Other",
]

const specialRequirements = [
  { id: "server-room", label: "Server Room / Data Center Equipment" },
  { id: "medical", label: "Medical Equipment (Sensitive)" },
  { id: "hazmat", label: "Hazardous Materials Handling" },
  { id: "security", label: "High-Security Items / Safes" },
  { id: "art", label: "Artwork / Antiques" },
  { id: "weekend", label: "Weekend / After-Hours Only" },
  { id: "staged", label: "Staged / Phased Relocation" },
  { id: "international", label: "International Component" },
]

export function CustomQuoteForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedLead, setSubmittedLead] = useState<any>(null)
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    industryType: "",
    employeeCount: "",
    currentLocation: "",
    newLocation: "",
    targetMoveDate: "",
    estimatedSqm: "",
    projectDescription: "",
    preferredContactTime: "",
  })

  const toggleRequirement = (id: string) => {
    setSelectedRequirements((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await submitLead({
      lead_type: "custom_quote",
      email: formData.email,
      contact_name: formData.fullName || undefined,
      company_name: formData.companyName || undefined,
      phone: formData.phone || undefined,
      industry_type: formData.industryType || undefined,
      employee_count: formData.employeeCount || undefined,
      current_location: formData.currentLocation || undefined,
      new_location: formData.newLocation || undefined,
      target_move_date: formData.targetMoveDate || undefined,
      square_meters: formData.estimatedSqm ? Number.parseInt(formData.estimatedSqm) : undefined,
      special_requirements: selectedRequirements.length > 0 ? selectedRequirements : undefined,
      project_description: formData.projectDescription || undefined,
      preferred_contact_time: formData.preferredContactTime || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitted(true)
      setSubmittedLead(result.lead)
    }
  }

  if (submitted) {
    return (
      <Card className="border-secondary bg-card">
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-secondary flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-secondary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Request Received</h2>
            <div className="font-mono text-secondary">
              TRANSMISSION_ID: MM-
              {submittedLead?.id?.slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase()}
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our team will review your requirements and contact you within 24 hours with a tailored proposal.
            </p>
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false)
                  setFormData({
                    fullName: "",
                    companyName: "",
                    email: "",
                    phone: "",
                    industryType: "",
                    employeeCount: "",
                    currentLocation: "",
                    newLocation: "",
                    targetMoveDate: "",
                    estimatedSqm: "",
                    projectDescription: "",
                    preferredContactTime: "",
                  })
                  setSelectedRequirements([])
                }}
              >
                Submit Another Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Information */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-secondary">[01]</span> CONTACT_DATA
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> FULL_NAME *
              </Label>
              <Input
                required
                placeholder="John Smith"
                className="bg-background border-border"
                value={formData.fullName}
                onChange={(e) => updateFormData("fullName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" /> COMPANY_NAME *
              </Label>
              <Input
                required
                placeholder="Acme Corporation"
                className="bg-background border-border"
                value={formData.companyName}
                onChange={(e) => updateFormData("companyName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" /> EMAIL_ADDRESS *
              </Label>
              <Input
                required
                type="email"
                placeholder="john@company.com.au"
                className="bg-background border-border"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" /> PHONE_NUMBER *
              </Label>
              <Input
                required
                type="tel"
                placeholder="04XX XXX XXX"
                className="bg-background border-border"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-secondary">[02]</span> BUSINESS_PROFILE
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">INDUSTRY_TYPE *</Label>
              <Select
                required
                value={formData.industryType}
                onValueChange={(value) => updateFormData("industryType", value)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase().replace(/ /g, "-")}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">EMPLOYEE_COUNT</Label>
              <Select value={formData.employeeCount} onValueChange={(value) => updateFormData("employeeCount", value)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">CURRENT_LOCATION *</Label>
              <Input
                required
                placeholder="123 Collins St, Melbourne VIC 3000"
                className="bg-background border-border"
                value={formData.currentLocation}
                onChange={(e) => updateFormData("currentLocation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">NEW_LOCATION *</Label>
              <Input
                required
                placeholder="456 Bourke St, Melbourne VIC 3000"
                className="bg-background border-border"
                value={formData.newLocation}
                onChange={(e) => updateFormData("newLocation", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> TARGET_MOVE_DATE
              </Label>
              <Input
                type="date"
                className="bg-background border-border"
                value={formData.targetMoveDate}
                onChange={(e) => updateFormData("targetMoveDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">ESTIMATED_SQM</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                className="bg-background border-border"
                value={formData.estimatedSqm}
                onChange={(e) => updateFormData("estimatedSqm", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Requirements */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-secondary">[03]</span> SPECIAL_REQUIREMENTS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialRequirements.map((req) => {
              const isSelected = selectedRequirements.includes(req.id)
              return (
                <div
                  key={req.id}
                  onClick={() => toggleRequirement(req.id)}
                  className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${
                    isSelected ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <span className="text-sm text-foreground">{req.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-secondary">[04]</span> ADDITIONAL_INFO
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> PROJECT_DESCRIPTION
            </Label>
            <Textarea
              placeholder="Describe your relocation requirements, any challenges, access restrictions, or specific needs..."
              className="bg-background border-border min-h-[150px]"
              value={formData.projectDescription}
              onChange={(e) => updateFormData("projectDescription", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-mono text-muted-foreground">PREFERRED_CONTACT_TIME</Label>
            <Select
              value={formData.preferredContactTime}
              onValueChange={(value) => updateFormData("preferredContactTime", value)}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select preferred time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                <SelectItem value="evening">Evening (5pm - 7pm)</SelectItem>
                <SelectItem value="anytime">Anytime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Card className="border-secondary bg-card">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-secondary font-mono">*</span> Required fields must be completed
            </div>
            <Button
              type="submit"
              size="lg"
              className="uppercase tracking-wider w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Transmit Request
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
