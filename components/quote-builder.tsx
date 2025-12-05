"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { submitLead } from "@/app/actions/leads"
import { createDepositCheckoutSession, markDepositPaid } from "@/app/actions/stripe"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { validateEmail, validatePhone, validateDistance } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { PaymentConfirmation } from "@/components/payment-confirmation"
import { useBeforeUnload } from "@/hooks/use-beforeunload"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { FileText, X } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

const moveTypes = [
  {
    id: "office",
    name: "Office Relocation",
    icon: Building2,
    baseRate: 2500,
    perSqm: 45,
    code: "OFF-REL",
    minSqm: 20,
    description:
      "Complete office moves including workstations, furniture, and equipment. Our team handles everything from packing to setup at your new location.",
    minRequirements: [
      "Minimum 20 sqm office space",
      "2 weeks advance booking recommended",
      "Building access coordination required",
    ],
    included: [
      "Workstation disassembly & reassembly",
      "IT equipment handling",
      "Furniture protection & wrapping",
      "Labeling & inventory system",
      "Weekend/after-hours moves available",
    ],
    idealFor: ["Corporate offices", "Co-working spaces", "Professional services firms"],
    typicalDuration: "1-3 days depending on size",
  },
  {
    id: "datacenter",
    name: "Data Center Migration",
    icon: Server,
    baseRate: 5000,
    perSqm: 85,
    code: "DC-MIG",
    minSqm: 50,
    description:
      "Specialized data centre relocations with anti-static handling and careful planning for mission-critical infrastructure.",
    minRequirements: [
      "Technical site assessment required",
      "4 weeks minimum planning period",
      "Detailed asset inventory",
      "Downtime window scheduling",
    ],
    included: [
      "Anti-static equipment handling",
      "Secure transport vehicles",
      "Cable management & documentation",
      "Rack disassembly & reassembly",
      "Project coordination",
    ],
    idealFor: ["Data centres", "Server rooms", "Network operations centres"],
    typicalDuration: "3-7 days with staged migration",
  },
  {
    id: "it-equipment",
    name: "IT Equipment Transport",
    icon: Cpu,
    baseRate: 1500,
    perSqm: 35,
    code: "IT-TRN",
    minSqm: 10,
    description:
      "Safe transport of computers, servers, networking equipment, and peripherals with proper packaging and handling protocols.",
    minRequirements: ["Equipment inventory list", "1 week advance booking", "Power-down coordination"],
    included: [
      "Anti-static packaging",
      "Individual item tracking",
      "Secure chain of custody",
      "Setup assistance at destination",
      "Equipment testing support",
    ],
    idealFor: ["IT departments", "Tech companies", "Equipment refreshes"],
    typicalDuration: "1-2 days",
  },
]

const additionalServices = [
  {
    id: "packing",
    name: "Professional Packing",
    price: 450,
    description: "Full packing service with quality materials",
  },
  { id: "storage", name: "Temporary Storage", price: 300, description: "Secure storage per week if needed" },
  { id: "cleaning", name: "Post-Move Cleaning", price: 350, description: "Professional cleaning of old premises" },
  { id: "insurance", name: "Premium Insurance", price: 200, description: "Enhanced coverage up to $100,000" },
  { id: "afterhours", name: "After Hours Service", price: 500, description: "Weekend or evening move scheduling" },
  { id: "itsetup", name: "IT Setup Assistance", price: 600, description: "Help reconnecting IT equipment" },
]

interface QuoteBuilderProps {
  initialService?: string
}

export function QuoteBuilder({ initialService }: QuoteBuilderProps = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState(() => {
    const stepParam = searchParams.get('step')
    return stepParam ? parseInt(stepParam) : 1
  })
  const [selectedType, setSelectedType] = useState<string | null>(initialService || null)
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
  
  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const [showPayment, setShowPayment] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const estimate = useMemo(() => {
    if (!selectedType) return null
    const type = moveTypes.find((t) => t.id === selectedType)
    if (!type) return null

    const effectiveSqm = Math.max(squareMeters[0], type.minSqm)
    let total = type.baseRate + type.perSqm * effectiveSqm

    if (distance) {
      total += Number.parseInt(distance) * 8
    }

    selectedServices.forEach((serviceId) => {
      const service = additionalServices.find((s) => s.id === serviceId)
      if (service) total += service.price
    })

    return Math.round(total)
  }, [selectedType, squareMeters, selectedServices, distance])

  const depositAmount = estimate ? Math.round(estimate * 0.5) : 0

  // Validation functions
  const validateField = (field: string, value: string) => {
    let error: string | null = null
    
    switch (field) {
      case 'email':
        error = validateEmail(value)
        break
      case 'phone':
        error = validatePhone(value, false)
        break
      case 'distance':
        error = validateDistance(value)
        break
    }
    
    setErrors(prev => ({ ...prev, [field]: error }))
    return error === null
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (touched.email) {
      validateField('email', value)
    }
  }

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }))
    validateField('email', email)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhone(value)
    if (touched.phone) {
      validateField('phone', value)
    }
  }

  const handlePhoneBlur = () => {
    setTouched(prev => ({ ...prev, phone: true }))
    validateField('phone', phone)
  }

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDistance(value)
    if (touched.distance) {
      validateField('distance', value)
    }
  }

  const handleDistanceBlur = () => {
    setTouched(prev => ({ ...prev, distance: true }))
    validateField('distance', distance)
  }

  const handleSubmit = async () => {
    // Validate all required fields before submission
    setTouched({ email: true })
    const emailValid = validateField('email', email)
    
    if (!emailValid) {
      return
    }
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
        distance_km: distance ? Number.parseInt(distance) : undefined,
        square_meters: squareMeters[0],
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

  // Update URL when step changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (step > 1) {
      params.set('step', step.toString())
    } else {
      params.delete('step')
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState({ step }, '', newUrl)
  }, [step, searchParams])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.step) {
        setStep(e.state.step)
      } else {
        const params = new URLSearchParams(window.location.search)
        const stepParam = params.get('step')
        if (stepParam) {
          setStep(parseInt(stepParam))
        } else {
          setStep(1)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleStepChange = (newStep: number) => {
    setStep(newStep)
  }

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

  // Check if there are unsaved changes
  const hasUnsavedChanges = step > 1 && !submitted && !paymentComplete && (
    email || phone || companyName || contactName || originSuburb || destSuburb || distance
  )

  // Warn before leaving with unsaved changes
  useBeforeUnload(hasUnsavedChanges)

  // Form persistence
  const formState = {
    step,
    selectedType,
    squareMeters,
    selectedServices,
    originSuburb,
    destSuburb,
    distance,
    email,
    phone,
    companyName,
    contactName
  }

  const { loadSavedData, clearSavedData } = useFormPersistence(
    formState,
    'quote-builder-draft',
    step < 3 && !submitted && !paymentComplete
  )

  const [showDraftBanner, setShowDraftBanner] = useState(false)

  // Load draft on mount or pre-select service
  useEffect(() => {
    if (initialService && !selectedType) {
      setSelectedType(initialService)
      setExpandedType(initialService)
    }
    
    if (!submitted && !paymentComplete) {
      const saved = loadSavedData()
      if (saved && (saved.step > 1 || saved.email || saved.phone)) {
        setShowDraftBanner(true)
      }
    }
  }, [initialService])

  const restoreDraft = () => {
    const saved = loadSavedData()
    if (saved) {
      setStep(saved.step || 1)
      setSelectedType(saved.selectedType || null)
      setSquareMeters(saved.squareMeters || [100])
      setSelectedServices(saved.selectedServices || [])
      setOriginSuburb(saved.originSuburb || "")
      setDestSuburb(saved.destSuburb || "")
      setDistance(saved.distance || "")
      setEmail(saved.email || "")
      setPhone(saved.phone || "")
      setCompanyName(saved.companyName || "")
      setContactName(saved.contactName || "")
      setShowDraftBanner(false)
    }
  }

  // Clear draft on successful submission
  useEffect(() => {
    if (submitted || paymentComplete) {
      clearSavedData()
      setShowDraftBanner(false)
    }
  }, [submitted, paymentComplete])

  if (paymentComplete && submittedLead && estimate) {
    return (
      <div className="border border-primary/30 bg-black/50 p-8">
        <PaymentConfirmation
          referenceId={submittedLead.id.slice(0, 8).toUpperCase()}
          depositAmount={depositAmount}
          estimatedTotal={estimate}
          moveType={selectedMoveType?.name}
        />
        <div className="mt-6 text-center">
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
            {selectedMoveType && (
              <p className="text-muted-foreground">
                SERVICE: <span className="text-foreground">{selectedMoveType.name}</span>
              </p>
            )}
            {(originSuburb || destSuburb) && (
              <p className="text-muted-foreground">
                ROUTE: <span className="text-foreground">
                  {originSuburb || 'TBD'} → {destSuburb || 'TBD'}
                </span>
              </p>
            )}
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
      {/* Draft Banner */}
      {showDraftBanner && (
        <div className="bg-primary/10 border-b border-primary/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm">You have a saved draft. Would you like to continue?</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={restoreDraft}>
              Restore
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                clearSavedData()
                setShowDraftBanner(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="border-b border-primary/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">QUOTE_PROGRESS</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  {step === 1 && "Step 1: Select your move type and service details"}
                  {step === 2 && "Step 2: Enter location and space information"}
                  {step === 3 && "Step 3: Review your quote and provide contact information"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
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
              onClick={() => handleStepChange(2)}
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
                      placeholder="Melbourne CBD"
                      value={originSuburb}
                      onChange={(e) => setOriginSuburb(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                      title="Enter the suburb or area where your move starts"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Destination Suburb</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Richmond"
                      value={destSuburb}
                      onChange={(e) => setDestSuburb(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                      title="Enter the suburb or area where your move ends"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Estimated Distance (km)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={distance}
                  onChange={handleDistanceChange}
                  onBlur={handleDistanceBlur}
                  min="0"
                  max="1000"
                  className={cn(
                    "bg-black/50 border-muted-foreground/30",
                    errors.distance && "border-destructive"
                  )}
                  title="Estimated distance in kilometers (0-1000 km)"
                />
                {errors.distance && (
                  <p className="text-xs text-destructive mt-1">{errors.distance}</p>
                )}
                <p className="text-xs text-muted-foreground">Optional - helps us provide a more accurate quote</p>
              </div>
            </div>

            {/* Square Meters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">SPACE_SIZE</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={squareMeters[0]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      const clamped = Math.max(
                        selectedMoveType?.minSqm ?? 10,
                        Math.min(2000, value)
                      )
                      setSquareMeters([clamped])
                    }}
                    min={selectedMoveType?.minSqm ?? 10}
                    max={2000}
                    className="w-24 h-8 text-center text-sm font-bold"
                  />
                  <span className="text-sm text-muted-foreground">sqm</span>
                </div>
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
                    className={`flex items-center justify-between p-3 border cursor-pointer transition-all rounded-lg ${
                      selectedServices.includes(service.id)
                        ? "border-secondary bg-secondary/10 hover:bg-secondary/15"
                        : "border-muted-foreground/30 hover:border-secondary/50 hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-secondary flex-shrink-0 ml-2">+${service.price}</p>
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
              <Button variant="outline" onClick={() => handleStepChange(1)} className="flex-1 border-primary/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => handleStepChange(3)}
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

            {/* Quote Breakdown */}
            <div className="border border-primary/30 bg-black/50 p-6 space-y-4">
              <p className="text-xs font-mono text-muted-foreground mb-4">QUOTE_BREAKDOWN</p>
              
              {selectedMoveType && (
                <>
                  <div className="flex items-center justify-between border-b border-primary/30 pb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-muted-foreground">BASE_PRICE</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Base price includes standard moving equipment, crew, and basic insurance coverage.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm font-bold text-primary">${selectedMoveType.baseRate.toLocaleString()}</p>
                  </div>
                  
                  {squareMeters[0] > 0 && (
                    <div className="flex items-center justify-between border-b border-primary/30 pb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-muted-foreground">
                          SQM_CHARGE ({squareMeters[0]} sqm × ${selectedMoveType.perSqm})
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Charged per square meter of space being moved. Larger spaces require more time and resources.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        ${(selectedMoveType.perSqm * squareMeters[0]).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {distance && Number.parseInt(distance) > 0 && (
                    <div className="flex items-center justify-between border-b border-primary/30 pb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-muted-foreground">
                          DISTANCE_FEE ({distance} km × $8)
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Distance-based fee covers fuel, travel time, and vehicle wear for longer moves.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        ${(Number.parseInt(distance) * 8).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {selectedServices.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-muted-foreground">ADDITIONAL_SERVICES</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Optional services to enhance your move, such as premium insurance or after-hours scheduling.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {selectedServices.map((serviceId) => {
                        const service = additionalServices.find((s) => s.id === serviceId)
                        return service ? (
                          <div key={serviceId} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{service.name}</span>
                            <span className="font-bold text-secondary">+${service.price}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center justify-between border-t-2 border-primary pt-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-muted-foreground">ESTIMATED_TOTAL</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">This is an estimate. Final pricing may vary based on site assessment and actual requirements.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-secondary">${estimate?.toLocaleString()}</p>
              </div>
              
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
                      placeholder="your.email@company.com.au"
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      className={cn(
                        "pl-10 bg-black/50 border-muted-foreground/30",
                        errors.email && "border-destructive"
                      )}
                      required
                      title="Your business email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="0412 345 678"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      className={cn(
                        "pl-10 bg-black/50 border-muted-foreground/30",
                        errors.phone && "border-destructive"
                      )}
                      title="Australian phone number (mobile: 04XX XXX XXX or landline: (03) XXXX XXXX)"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Optional - helps us contact you quickly</p>
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
                      title="Name of the person we should contact"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Acme Corporation Pty Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10 bg-black/50 border-muted-foreground/30"
                      title="Your company or business name"
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
              <Button variant="outline" onClick={() => handleStepChange(2)} className="flex-1 border-primary/50">
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
