"use client"
import { forwardRef, useState } from "react"

import { Building2, CheckCircle, Phone, Warehouse, Server, Monitor, Store, ArrowRight } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface ServiceOption {
  id: string
  name: string
  icon: string
  description: string
}

interface BusinessResult {
  name: string
  abn: string
  type: string
  state: string
  status: string
  tradingNames?: string[]
  address?: string
  gstRegistered?: boolean
}

interface QuoteEstimate {
  moveType: string
  moveTypeKey?: string
  estimatedTotal: number
  depositRequired: number
  hourlyRate?: number
  estimatedHours: number
  crewSize: number
  truckSize: string
  squareMeters: number
  origin: string
  destination: string
  additionalServices?: string[]
  breakdown: {
    label: string
    amount: number
  }[]
  showAvailability?: boolean
}

interface AvailableDate {
  date: string
  available: boolean
  slots?: number
}

interface ContactInfo {
  contactName: string
  email: string
  phone: string
  companyName?: string
}

interface PaymentInfo {
  clientSecret: string
  amount: number
}

export interface QuoteAssistantHandle {
  open: () => void
}

interface QuoteAssistantProps {
  embedded?: boolean
  onScrolledAway?: (isAway: boolean) => void
}

const ServiceIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const iconClass = className || "h-6 w-6"
  switch (icon) {
    case "building":
      return <Building2 className={iconClass} />
    case "warehouse":
      return <Warehouse className={iconClass} />
    case "server":
      return <Server className={iconClass} />
    case "computer":
      return <Monitor className={iconClass} />
    case "store":
      return <Store className={iconClass} />
    default:
      return <Building2 className={iconClass} />
  }
}

const ServicePicker = ({
  services,
  onSelect,
}: {
  services: ServiceOption[]
  onSelect: (service: ServiceOption) => void
}) => {
  return (
    <div className="grid grid-cols-1 gap-2 my-3">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelect(service)}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ServiceIcon icon={service.icon} className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">{service.name}</div>
            <div className="text-xs text-muted-foreground truncate">{service.description}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  )
}

const InitialPrompts = ({ onSelect }: { onSelect: (prompt: string) => void }) => {
  const prompts = [
    { text: "I need to move my office", icon: Building2 },
    { text: "Warehouse relocation", icon: Warehouse },
    { text: "Data centre migration", icon: Server },
    { text: "Retail store move", icon: Store },
    { text: "IT equipment transport", icon: Monitor },
    { text: "I'd like to speak to someone", icon: Phone },
  ]

  return (
    <div className="space-y-3 my-4">
      <p className="text-sm text-muted-foreground text-center">Quick start - select an option or type below:</p>
      <div className="grid grid-cols-2 gap-2">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt.text)}
            className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left text-sm"
            aria-label={prompt.text}
          >
            <prompt.icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const BookingProgress = ({
  step,
}: {
  step: "business" | "service" | "details" | "quote" | "date" | "contact" | "payment" | "complete"
}) => {
  const steps = [
    { id: "business", label: "Business" },
    { id: "service", label: "Service" },
    { id: "details", label: "Details" },
    { id: "quote", label: "Quote" },
    { id: "date", label: "Date" },
    { id: "payment", label: "Book" },
  ]

  const currentIndex = steps.findIndex((s) => s.id === step)

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg mb-3">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < currentIndex
                ? "bg-primary text-primary-foreground"
                : i === currentIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIndex ? <CheckCircle className="h-3 w-3" /> : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-1 ${i < currentIndex ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  )
}

export const QuoteAssistant = forwardRef<QuoteAssistantHandle, QuoteAssistantProps>(
  ({ embedded = false, onScrolledAway }, ref) => {
    const [isOpen, setIsOpen] = useState(embedded)
