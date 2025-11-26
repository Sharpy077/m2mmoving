"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Building2,
  Server,
  Monitor,
  Package,
  Truck,
  Shield,
  Clock,
  ArrowRight,
  Calculator,
  MapPin,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { submitLead } from "@/app/actions/leads"

const moveTypes = [
  {
    id: "office",
    label: "Office Relocation",
    icon: Building2,
    basePrice: 2500,
    description:
      "Complete office moving solution for businesses of all sizes. From small startups to corporate headquarters.",
    minRequirements: ["Minimum 50m² space", "Access for loading dock or lift", "2 weeks advance booking recommended"],
    included: [
      "Workstation disassembly & reassembly",
      "IT equipment careful handling",
      "Furniture protection wrapping",
      "Floor & wall protection",
      "Basic labeling system",
      "Project coordinator assigned",
    ],
    idealFor: "Small to large offices, co-working spaces, corporate relocations",
    typicalDuration: "1-3 days",
  },
  {
    id: "datacenter",
    label: "Data Center",
    icon: Server,
    basePrice: 8000,
    description:
      "Mission-critical data center relocation with zero downtime protocols. Anti-static handling and climate-controlled transport.",
    minRequirements: [
      "Site assessment required",
      "Minimum 4 weeks advance booking",
      "After-hours access mandatory",
      "Network documentation required",
    ],
    included: [
      "Anti-static equipment handling",
      "Climate-controlled transport",
      "Server rack disassembly/assembly",
      "Cable management & labeling",
      "Real-time GPS tracking",
      "Dedicated project manager",
      "24/7 emergency support",
    ],
    idealFor: "Server rooms, colocation facilities, enterprise data centers",
    typicalDuration: "3-7 days",
  },
  {
    id: "it-equipment",
    label: "IT Equipment",
    icon: Monitor,
    basePrice: 3500,
    description:
      "Specialized transport for sensitive IT assets including servers, networking gear, and high-value electronics.",
    minRequirements: ["Equipment inventory list", "1 week advance booking", "Power-down schedule coordination"],
    included: [
      "Anti-static packaging",
      "Shock-absorbent cases",
      "Individual item tracking",
      "Photo documentation",
      "Basic reconnection assistance",
      "Equipment testing post-move",
    ],
    idealFor: "IT refresh projects, equipment upgrades, branch office setups",
    typicalDuration: "1-2 days",
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: Package,
    basePrice: 5000,
    description:
      "Industrial-scale warehouse and inventory relocation with full logistics coordination and inventory management.",
    minRequirements: [
      "Inventory audit required",
      "Forklift access at both sites",
      "3 weeks advance booking",
      "Loading bay availability",
    ],
    included: [
      "Pallet handling & transport",
      "Inventory tracking system",
      "Racking disassembly/assembly",
      "Heavy machinery moving",
      "Logistics coordination",
      "Multiple truck deployment",
    ],
    idealFor: "Distribution centers, manufacturing, retail stockrooms",
    typicalDuration: "3-10 days",
  },
]

const additionalServices = [
  {
    id: "packing",
    label: "Professional Packing",
    price: 800,
    description: "Full-service packing with premium materials",
  },
  { id: "storage", label: "Temporary Storage", price: 500, description: "Secure climate-controlled storage facility" },
  { id: "insurance", label: "Premium Insurance", price: 350, description: "Extended coverage up to $500K per item" },
  { id: "after-hours", label: "After-Hours Moving", price: 600, description: "Weekend & evening availability" },
  { id: "it-setup", label: "IT Setup & Reconnection", price: 1200, description: "Full IT infrastructure reconnection" },
  { id: "furniture", label: "Furniture Assembly", price: 450, description: "Professional assembly & placement" },
]

export function QuoteBuilder() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [squareMeters, setSquareMeters] = useState([200])
  const [distance, setDistance] = useState("")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [originSuburb, setOriginSuburb] = useState("")
  const [destSuburb, setDestSuburb] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedLead, setSubmittedLead] = useState<any>(null)

  const estimate = useMemo(() => {
    if (!selectedType) return null

    const moveType = moveTypes.find((t) => t.id === selectedType)
    if (!moveType) return null

    let total = moveType.basePrice
    const sizeMultiplier = squareMeters[0] / 100
    total += sizeMultiplier * 500

    const dist = Number.parseInt(distance) || 0
    if (dist > 50) {
      total += (dist - 50) * 8
    }

    selectedServices.forEach((serviceId) => {
      const service = additionalServices.find((s) => s.id === serviceId)
      if (service) {
        total += service.price
      }
    })

    return Math.round(total)
  }, [selectedType, squareMeters, distance, selectedServices])

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleSubmit = async () => {
    if (!email || !selectedType || !estimate) return

    setIsSubmitting(true)

    const result = await submitLead({
      lead_type: "instant_quote",
      email,
      phone: phone || undefined,
      company_name: companyName || undefined,
      contact_name: contactName || undefined,
      move_type: selectedType,
      origin_suburb: originSuburb || undefined,
      destination_suburb: destSuburb || undefined,
      distance_km: distance ? Number.parseInt(distance) : undefined,
      square_meters: squareMeters[0],
      estimated_total: estimate,
      additional_services: selectedServices.length > 0 ? selectedServices : undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitted(true)
      setSubmittedLead(result.lead)
    }
  }

  const selectedMoveType = moveTypes.find((t) => t.id === selectedType)

  if (submitted) {
    return (
      <Card className="border-secondary bg-card">
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-secondary flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-secondary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Quote Request Received</h2>
            <div className="font-mono text-secondary">
              QUOTE_ID: MM-{submittedLead?.id?.slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase()}
            </div>
            <div className="text-3xl font-bold text-primary">${estimate?.toLocaleString()} AUD</div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our team will review your quote request and contact you within 24 hours to confirm details and schedule
              your move.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false)
                  setEmail("")
                  setPhone("")
                  setCompanyName("")
                  setContactName("")
                  setSelectedType(null)
                  setSelectedServices([])
                }}
              >
                Request Another Quote
              </Button>
              <Button asChild>
                <Link href="/quote/custom">Need Custom Quote?</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Move Type Selection with Details */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-primary">[01]</span> SELECT_MOVE_TYPE
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {moveTypes.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.id
              const isExpanded = expandedType === type.id

              return (
                <div key={type.id} className="border border-border">
                  {/* Type Header */}
                  <button
                    onClick={() => {
                      setSelectedType(type.id)
                      setExpandedType(isExpanded ? null : type.id)
                    }}
                    className={`w-full p-4 text-left transition-all flex items-center gap-4 ${
                      isSelected ? "bg-primary/10 border-b border-primary" : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                          {type.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="text-sm font-mono text-muted-foreground">
                        From ${type.basePrice.toLocaleString()} AUD
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="w-4 h-4" />
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 bg-muted/30 space-y-4">
                      <p className="text-sm text-muted-foreground">{type.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Minimum Requirements */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono text-primary uppercase tracking-wider">
                            // Minimum Requirements
                          </h4>
                          <ul className="space-y-1">
                            {type.minRequirements.map((req, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">›</span>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* What's Included */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono text-secondary uppercase tracking-wider">
                            // What's Included
                          </h4>
                          <ul className="space-y-1">
                            {type.included.map((item, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Check className="w-3 h-3 text-secondary mt-1 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
                        <div className="text-xs">
                          <span className="text-muted-foreground font-mono">IDEAL_FOR: </span>
                          <span className="text-foreground">{type.idealFor}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground font-mono">DURATION: </span>
                          <span className="text-foreground">{type.typicalDuration}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Type Summary */}
      {selectedMoveType && (
        <Card className="border-secondary/50 bg-secondary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary flex items-center justify-center">
                <selectedMoveType.icon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{selectedMoveType.label} Selected</div>
                <div className="text-xs text-muted-foreground">
                  Typical duration: {selectedMoveType.typicalDuration}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-muted-foreground">Base Price</div>
                <div className="text-lg font-bold text-secondary">${selectedMoveType.basePrice.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Details */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-primary">[02]</span> LOCATION_PARAMETERS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" /> ORIGIN_SUBURB
              </Label>
              <Input
                placeholder="e.g., Melbourne CBD"
                value={originSuburb}
                onChange={(e) => setOriginSuburb(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" /> DESTINATION_SUBURB
              </Label>
              <Input
                placeholder="e.g., South Yarra"
                value={destSuburb}
                onChange={(e) => setDestSuburb(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-mono text-muted-foreground">DISTANCE_KM: {distance || "0"}</Label>
            <Input
              type="number"
              placeholder="Estimated distance in kilometers"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Space Size */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-primary">[03]</span> SPACE_DIMENSIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-mono text-muted-foreground">SQUARE_METERS</Label>
              <span className="font-mono text-primary text-xl">{squareMeters[0]} m²</span>
            </div>
            <Slider
              value={squareMeters}
              onValueChange={setSquareMeters}
              min={50}
              max={2000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>50 m²</span>
              <span>2000 m²</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Services */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-primary">[04]</span> ADDITIONAL_MODULES
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {additionalServices.map((service) => {
              const isSelected = selectedServices.includes(service.id)
              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${
                    isSelected ? "border-secondary bg-secondary/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    className="mt-1 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{service.label}</div>
                    <div className="text-xs text-muted-foreground mb-1">{service.description}</div>
                    <div className="text-sm font-mono text-secondary">+${service.price}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <span className="text-primary">[05]</span> CONTACT_DETAILS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">CONTACT_NAME</Label>
              <Input
                placeholder="Your name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">COMPANY_NAME</Label>
              <Input
                placeholder="Your company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">EMAIL_ADDRESS *</Label>
              <Input
                type="email"
                required
                placeholder="your@email.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-mono text-muted-foreground">PHONE_NUMBER</Label>
              <Input
                type="tel"
                placeholder="04XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Summary */}
      <Card className="border-primary bg-card">
        <CardHeader className="border-b border-primary bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg font-mono">
            <Calculator className="w-5 h-5 text-primary" />
            QUOTE_SUMMARY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {estimate ? (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-sm font-mono text-muted-foreground mb-1">ESTIMATED_TOTAL</div>
                  <div className="text-5xl font-bold text-primary">${estimate.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">AUD + GST</div>
                </div>
                <div className="text-right space-y-1 text-sm font-mono text-muted-foreground">
                  <div className="flex items-center gap-2 justify-end">
                    <Truck className="w-4 h-4" />
                    {moveTypes.find((t) => t.id === selectedType)?.label}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Shield className="w-4 h-4" />
                    {selectedServices.length} modules
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Clock className="w-4 h-4" />~{Math.ceil(squareMeters[0] / 100)} days
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="text-xs font-mono text-muted-foreground">
                  * This is an estimate only. Final pricing may vary based on site inspection.
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 uppercase tracking-wider"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!email || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm & Book
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 uppercase tracking-wider bg-transparent"
                    size="lg"
                    asChild
                  >
                    <Link href="/quote/custom">Request Custom Quote</Link>
                  </Button>
                </div>
                {!email && selectedType && (
                  <div className="text-xs text-primary font-mono">* Enter your email address to submit quote</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 border border-dashed border-muted-foreground flex items-center justify-center">
                <Calculator className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground font-mono">SELECT_MOVE_TYPE_TO_BEGIN</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
