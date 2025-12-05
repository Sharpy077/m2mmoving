"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Building2,
  Server,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Mail,
  Phone,
  User,
  Building,
  CreditCard,
  AlertCircle,
  Cpu,
} from "lucide-react"
import Link from "next/link"
import { submitLead } from "@/app/actions/leads"
import { createDepositCheckoutSession, markDepositPaid } from "@/app/actions/stripe"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { moveTypes, additionalServices } from "@/lib/quote/config"
import { calculateQuoteEstimate, sanitizeDistance } from "@/lib/quote/estimator"

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

export function QuoteBuilder() {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [squareMeters, setSquareMeters] = useState([100])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [originSuburb, setOriginSuburb] = useState("")
  const [destSuburb, setDestSuburb] = useState("")
  const [distance, setDistance] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedLead, setSubmittedLead] = useState<any>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [showPayment, setShowPayment] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const estimateResult = useMemo(() => {
    if (!selectedType) return null
    return calculateQuoteEstimate({
      moveTypeId: selectedType,
      squareMeters: squareMeters[0],
      distanceKm: distance,
      selectedServices,
    })
  }, [selectedType, squareMeters, distance, selectedServices])

  const estimate = estimateResult?.total ?? null
  const depositAmount = estimateResult?.deposit ?? 0

  const handleSubmit = async () => {
    if (!email || !selectedType || !estimate) {
      console.log("[v0] Submit validation failed:", { email, selectedType, estimate })
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    console.log("[v0] Starting lead submission...")

    try {
      const result = await submitLead({
        lead_type: "instant_quote",
        email,
        phone: phone || undefined,
        company_name: companyName || undefined,
        contact_name: contactName || undefined,
        move_type: selectedType,
        origin_suburb: originSuburb || undefined,
        destination_suburb: destSuburb || undefined,
        distance_km: distance ? sanitizeDistance(distance) : undefined,
        square_meters: estimateResult?.effectiveSquareMeters ?? squareMeters[0],
        estimated_total: estimate,
        additional_services: selectedServices.length > 0 ? selectedServices : undefined,
      })

      console.log("[v0] Lead submission result:", result)

      if (result.success) {
        setSubmitted(true)
        setSubmittedLead(result.lead)
      } else {
        setSubmitError(result.error || "Failed to submit quote. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Lead submission error:", error)
      setSubmitError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayDeposit = async () => {
    if (!submittedLead || !estimate) return
    if (!STRIPE_PUBLISHABLE_KEY) {
      setSubmitError("Online payments are not configured yet. Please contact our team to pay the deposit.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    console.log("[v0] Initiating deposit payment for lead:", submittedLead.id)

    try {
      const result = await createDepositCheckoutSession(
        submittedLead.id,
        depositAmount * 100, // Convert to cents
        email,
      )

      console.log("[v0] Checkout session result:", result)

      if (result.success && result.clientSecret) {
        setPaymentClientSecret(result.clientSecret)
        setShowPayment(true)
      } else {
        setSubmitError(result.error || "Failed to initiate payment. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Payment initiation error:", error)
      setSubmitError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentComplete = useCallback(async () => {
    if (!submittedLead) return

    console.log("[v0] Payment completed, updating lead status...")
    await markDepositPaid(submittedLead.id)
    setPaymentComplete(true)
    setShowPayment(false)
  }, [submittedLead])

  const fetchClientSecret = useCallback(() => {
    return Promise.resolve(paymentClientSecret!)
  }, [paymentClientSecret])

  const handleTypeClick = (typeId: string) => {
    if (expandedType === typeId) {
      setSelectedType(typeId)
      setExpandedType(null)
    } else {
      setExpandedType(typeId)
      setSelectedType(typeId)
    }
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const selectedMoveType = moveTypes.find((t) => t.id === selectedType)
  const isBelowMinimum = selectedMoveType && squareMeters[0] < selectedMoveType.minSqm

  if (paymentComplete) {
    return (
      <div className="border border-primary/30 bg-black/50 p-8">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-secondary flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-mono mb-2">PAYMENT_CONFIRMED</p>
            <h3 className="text-2xl font-bold text-secondary">Booking Confirmed!</h3>
          </div>
          <div className="border border-secondary/30 bg-secondary/5 p-4 text-left font-mono text-sm">
            <p className="text-muted-foreground">
              REFERENCE: <span className="text-foreground">{submittedLead?.id?.slice(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-muted-foreground">
              DEPOSIT_PAID: <span className="text-secondary">${depositAmount.toLocaleString()} AUD</span>
            </p>
            <p className="text-muted-foreground">
              REMAINING: <span className="text-foreground">${depositAmount.toLocaleString()} AUD</span>
            </p>
            <p className="text-muted-foreground">
              STATUS: <span className="text-secondary">CONFIRMED</span>
            </p>
          </div>
          <p className="text-muted-foreground">
            Our team will contact you within 24 hours to finalize your move details.
          </p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">Return to Homepage</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (showPayment && paymentClientSecret) {
    return (
      <div className="border border-primary/30 bg-black/50 p-6">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground font-mono mb-2">SECURE_PAYMENT_PORTAL</p>
          <h3 className="text-xl font-bold">Pay 50% Deposit</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Deposit Amount: <span className="text-secondary font-bold">${depositAmount.toLocaleString()} AUD</span>
          </p>
        </div>
        {stripePromise ? (
          <div className="bg-white rounded-sm overflow-hidden">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret,
                onComplete: handlePaymentComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <div className="bg-muted/20 border border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground rounded-sm">
            Online payments are not configured yet. Please contact our team to complete the booking.
          </div>
        )}
        <Button
          variant="outline"
          className="mt-4 w-full bg-transparent"
          onClick={() => {
            setShowPayment(false)
            setPaymentClientSecret(null)
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quote
        </Button>
      </div>
    )
  }

  if (submitted && submittedLead) {
    return (
      <div className="border border-primary/30 bg-black/50 p-8">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-secondary flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-mono mb-2">QUOTE_CONFIRMED</p>
            <h3 className="text-2xl font-bold text-secondary">Quote Submitted!</h3>
          </div>
          <div className="border border-secondary/30 bg-secondary/5 p-4 text-left font-mono text-sm">
            <p className="text-muted-foreground">
              REFERENCE: <span className="text-foreground">{submittedLead.id.slice(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-muted-foreground">
              ESTIMATE: <span className="text-secondary">${estimate?.toLocaleString()} AUD</span>
            </p>
            <p className="text-muted-foreground">
              STATUS: <span className="text-foreground">PENDING_REVIEW</span>
            </p>
          </div>

          <div className="border border-primary/30 bg-black/30 p-6 text-left space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">PAYMENT_OPTIONS</p>
              <h4 className="font-bold">Secure Your Booking</h4>
            </div>
            <div className="flex items-center justify-between border border-secondary/30 bg-secondary/5 p-4">
              <div>
                <p className="font-mono text-sm text-muted-foreground">50% DEPOSIT</p>
                <p className="text-2xl font-bold text-secondary">${depositAmount.toLocaleString()} AUD</p>
                <p className="text-xs text-muted-foreground">Remaining balance due on completion</p>
              </div>
              <CreditCard className="w-8 h-8 text-secondary" />
            </div>
            {submitError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}
            <Button
              className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              onClick={handlePayDeposit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Deposit Now
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Or our team will contact you within 24 hours to discuss payment options
            </p>
          </div>

          <Link href="/">
            <Button variant="outline" className="border-primary/50 bg-transparent">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-primary/30 bg-black/50">
      {/* Progress Bar */}
      <div className="border-b border-primary/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground">QUOTE_PROGRESS</span>
          <span className="text-xs font-mono text-primary">{step}/3</span>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select Move Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">STEP_01: SELECT_SERVICE</p>
              <h3 className="text-xl font-bold">Choose Your Move Type</h3>
              <p className="text-sm text-muted-foreground mt-1">Click to view details and select</p>
            </div>

            <div className="grid gap-3">
              {moveTypes.map((type) => {
                const Icon = type.icon
                const isSelected = selectedType === type.id
                const isExpanded = expandedType === type.id

                return (
                  <div key={type.id}>
                    <button
                      onClick={() => handleTypeClick(type.id)}
                      className={`w-full p-4 border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 flex items-center justify-center border ${
                              isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/30"
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className="font-bold">{type.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{type.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">from</p>
                          <p className="font-bold text-primary">${type.baseRate.toLocaleString()}</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border border-t-0 border-primary/30 bg-black/30 p-4 space-y-4">
                        <p className="text-sm text-muted-foreground">{type.description}</p>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-mono text-primary mb-2">MINIMUM_REQUIREMENTS</p>
                            <ul className="space-y-1">
                              {type.minRequirements.map((req, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary">▸</span>
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-mono text-secondary mb-2">WHATS_INCLUDED</p>
                            <ul className="space-y-1">
                              {type.included.map((item, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-secondary mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2 border-t border-primary/20">
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">IDEAL_FOR</p>
                            <p className="text-xs">{type.idealFor.join(", ")}</p>
                          </div>
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">TYPICAL_DURATION</p>
                            <p className="text-xs">{type.typicalDuration}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Configure Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">STEP_02: CONFIGURE</p>
              <h3 className="text-xl font-bold">Configure Your Move</h3>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground">LOCATION_DATA</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Origin Suburb</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Melbourne CBD"
                      value={originSuburb}
                      onChange={(e) => setOriginSuburb(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Destination Suburb</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Richmond"
                      value={destSuburb}
                      onChange={(e) => setDestSuburb(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Estimated Distance (km)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="bg-black/50 border-muted-foreground/30"
                />
              </div>
            </div>

            {/* Square Meters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">SPACE_SIZE</p>
                <p className="text-sm font-bold text-primary">{squareMeters[0]} sqm</p>
              </div>
              <Slider
                value={squareMeters}
                onValueChange={setSquareMeters}
                min={selectedMoveType?.minSqm ?? 10}
                max={2000}
                step={10}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{selectedMoveType?.minSqm ?? 10} sqm</span>
                <span>2000 sqm</span>
              </div>
            </div>

            {/* Additional Services */}
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground">ADDITIONAL_SERVICES</p>
              <div className="grid gap-2">
                {additionalServices.map((service) => (
                  <label
                    key={service.id}
                    className={`flex items-center justify-between p-3 border cursor-pointer transition-all ${
                      selectedServices.includes(service.id)
                        ? "border-secondary bg-secondary/10"
                        : "border-muted-foreground/30 hover:border-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-secondary">+${service.price}</p>
                  </label>
                ))}
              </div>
            </div>

            {isBelowMinimum && (
              <div className="flex items-center gap-2 p-3 border border-destructive bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                Your selected space size is below the minimum requirement for this move type.
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-primary/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={isBelowMinimum}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">STEP_03: CONFIRM</p>
              <h3 className="text-xl font-bold">Review & Confirm</h3>
            </div>

            {/* Estimate Display */}
            <div className="border border-secondary bg-secondary/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono text-muted-foreground">ESTIMATED_TOTAL</p>
                <p className="text-xs font-mono text-secondary">AUD</p>
              </div>
              <p className="text-4xl font-bold text-secondary">${estimate?.toLocaleString()}</p>
              {isBelowMinimum && selectedMoveType && (
                <p className="text-xs text-accent mt-2 font-mono">
                  * Minimum cost applies for spaces under {selectedMoveType.minSqm} sqm
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">*Final quote may vary based on site assessment</p>

              <div className="mt-4 pt-4 border-t border-secondary/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">50% Deposit Required</p>
                  <p className="text-lg font-bold text-foreground">${depositAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground">CONTACT_INFORMATION</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">
                    Email <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="04XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contact Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="John Smith"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Acme Pty Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 border border-destructive bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-primary/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
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
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Need a custom solution?{" "}
              <Link href="/quote/custom" className="text-primary hover:underline">
                Request a custom quote
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
