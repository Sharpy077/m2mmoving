# Implementation Plan - UX Bug Fixes
**Project:** M&M Commercial Moving Website UX Improvements  
**Total Issues:** 47  
**Estimated Timeline:** 6-8 weeks  
**Document Version:** 1.0

---

## Implementation Strategy

### Phase Approach
1. **Phase 1 (Week 1-2):** Critical P0 fixes - Foundation & Accessibility
2. **Phase 2 (Week 3-4):** High Priority P1 fixes - Core UX Improvements
3. **Phase 3 (Week 5-6):** Medium Priority P2 fixes - Polish & Enhancement
4. **Phase 4 (Week 7-8):** Low Priority P3 fixes - Optimization & Analytics

### Development Workflow
1. Create feature branch for each phase
2. Implement fixes with tests
3. Code review
4. QA testing
5. Deploy to staging
6. User acceptance testing
7. Production deployment

---

## PHASE 1: CRITICAL FIXES (P0) - Week 1-2

### Issue #1: Footer Navigation Links Are Dead Links
**Priority:** P0  
**Estimated Time:** 30 minutes  
**Dependencies:** None

#### Implementation Steps:

1. **Update Footer Component**
   - File: `components/footer.tsx`
   - Replace all `href="#"` with proper routes

\`\`\`tsx
// Before (line 10, 42, 47, 52, 63, 68, 73, 78)
<a href="#" className="...">Office Relocation</a>

// After
<a href="/#services" className="...">Office Relocation</a>
<a href="/quote" className="...">Get Quote</a>
// For pages that don't exist yet, use mailto or remove
<a href="mailto:sales@m2mmoving.au?subject=About Us" className="...">About Us</a>
\`\`\`

2. **Create Missing Pages (if needed)**
   - Create placeholder pages for About, Blog, Careers if they should exist
   - Or remove links if pages won't exist

3. **Test**
   - Click all footer links
   - Verify smooth scrolling for hash links
   - Check mobile navigation

**Files to Modify:**
- `components/footer.tsx`

---

### Issue #2: Missing Form Validation Feedback
**Priority:** P0  
**Estimated Time:** 4-6 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Create Validation Utilities**
   - File: `lib/validation.ts` (new file)

\`\`\`typescript
export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "Please enter a valid email address"
  return null
}

export const validatePhone = (phone: string): string | null => {
  if (!phone) return null // Phone is optional
  // Australian phone: 04XX XXX XXX or +61 4XX XXX XXX
  const cleaned = phone.replace(/\s/g, '')
  const regex = /^(?:\+61|0)[2-478](?:[0-9]){8}$/
  if (!regex.test(cleaned)) {
    return "Please enter a valid Australian phone number (e.g., 04XX XXX XXX)"
  }
  return null
}

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateNumber = (value: string, min?: number, max?: number): string | null => {
  const num = parseInt(value)
  if (isNaN(num)) return "Please enter a valid number"
  if (min !== undefined && num < min) return `Must be at least ${min}`
  if (max !== undefined && num > max) return `Must be at most ${max}`
  return null
}
\`\`\`

2. **Update Quote Builder with Validation**
   - File: `components/quote-builder.tsx`

\`\`\`tsx
// Add state for touched fields and errors
const [touched, setTouched] = useState<Record<string, boolean>>({})
const [errors, setErrors] = useState<Record<string, string | null>>({})

// Add validation function
const validateField = (field: string, value: string) => {
  let error: string | null = null
  
  switch (field) {
    case 'email':
      error = validateEmail(value)
      break
    case 'phone':
      error = validatePhone(value)
      break
    case 'contactName':
      if (step === 3) error = validateRequired(value, 'Contact name')
      break
    case 'distance':
      if (value) error = validateNumber(value, 0, 1000)
      break
  }
  
  setErrors(prev => ({ ...prev, [field]: error }))
  return error === null
}

// Update input handlers
const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value
  setEmail(value)
  if (touched.email) validateField('email', value)
}

const handleEmailBlur = () => {
  setTouched(prev => ({ ...prev, email: true }))
  validateField('email', email)
}

// Update JSX to show errors
<div className="space-y-2">
  <Label className="text-xs">
    Email <span className="text-primary">*</span>
  </Label>
  <Input
    type="email"
    value={email}
    onChange={handleEmailChange}
    onBlur={handleEmailBlur}
    className={cn(
      "pl-10 bg-black/50 border-muted-foreground/30",
      errors.email && "border-destructive"
    )}
  />
  {errors.email && (
    <p className="text-xs text-destructive mt-1">{errors.email}</p>
  )}
</div>
\`\`\`

3. **Update Custom Quote Form with Validation**
   - File: `components/custom-quote-form.tsx`
   - Apply same validation pattern

4. **Test**
   - Test all validation rules
   - Verify error messages appear/disappear correctly
   - Test on mobile devices

**Files to Modify:**
- `lib/validation.ts` (new)
- `components/quote-builder.tsx`
- `components/custom-quote-form.tsx`

---

### Issue #3: No Error Recovery for Failed API Calls
**Priority:** P0  
**Estimated Time:** 3-4 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Create Error Recovery Hook**
   - File: `hooks/use-error-recovery.ts` (new)

\`\`\`typescript
import { useState, useCallback } from 'react'

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  onRetry?: () => void
}

export function useErrorRecovery<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options
  const [error, setError] = useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const executeWithRetry = useCallback(async () => {
    setError(null)
    let attempts = 0

    while (attempts < maxRetries) {
      try {
        const result = await asyncFn()
        setRetryCount(0)
        return result
      } catch (err) {
        attempts++
        setRetryCount(attempts)
        
        if (attempts < maxRetries) {
          setIsRetrying(true)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
          onRetry?.()
        } else {
          setError(err as Error)
          setIsRetrying(false)
          throw err
        }
      }
    }
  }, [asyncFn, maxRetries, retryDelay, onRetry])

  const retry = useCallback(() => {
    setError(null)
    return executeWithRetry()
  }, [executeWithRetry])

  return {
    error,
    isRetrying,
    retryCount,
    retry,
    execute: executeWithRetry
  }
}
\`\`\`

2. **Create Form State Persistence**
   - File: `hooks/use-form-persistence.ts` (new)

\`\`\`typescript
import { useEffect } from 'react'

export function useFormPersistence<T>(
  formData: T,
  storageKey: string,
  enabled: boolean = true
) {
  // Save to localStorage
  useEffect(() => {
    if (enabled && formData) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData))
      } catch (error) {
        console.error('Failed to save form data:', error)
      }
    }
  }, [formData, storageKey, enabled])

  // Load from localStorage
  const loadSavedData = (): T | null => {
    if (!enabled) return null
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Failed to load form data:', error)
      return null
    }
  }

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error('Failed to clear form data:', error)
    }
  }

  return { loadSavedData, clearSavedData }
}
\`\`\`

3. **Update Quote Assistant with Error Recovery**
   - File: `components/quote-assistant.tsx`

\`\`\`tsx
import { useErrorRecovery } from '@/hooks/use-error-recovery'
import { useFormPersistence } from '@/hooks/use-form-persistence'

// In component
const { error: apiError, retry, isRetrying } = useErrorRecovery(
  async () => {
    // Wrap sendMessage in retry logic
    return await sendMessage({ text: inputValue })
  },
  { maxRetries: 3, retryDelay: 1000 }
)

// Save form state
useFormPersistence(
  {
    currentQuote,
    contactInfo,
    selectedDate,
    confirmedBusiness
  },
  'quote-assistant-state',
  true
)

// Enhanced error display
{apiError && (
  <div className="bg-destructive/10 border border-destructive rounded-lg p-4 my-3">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-destructive mb-1">Connection Error</h4>
        <p className="text-sm text-muted-foreground mb-3">
          {apiError.message || "Unable to connect to the assistant. Please check your internet connection."}
        </p>
        <div className="flex gap-2">
          <Button onClick={retry} size="sm" variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
          </Button>
          <Button onClick={handleCall} size="sm" variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Call Us Instead
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
\`\`\`

4. **Test**
   - Simulate network failures
   - Test retry mechanism
   - Verify form state persistence
   - Test recovery after page refresh

**Files to Create:**
- `hooks/use-error-recovery.ts`
- `hooks/use-form-persistence.ts`

**Files to Modify:**
- `components/quote-assistant.tsx`
- `components/quote-builder.tsx`

---

### Issue #4: Missing Accessibility - Skip to Content Link
**Priority:** P0  
**Estimated Time:** 1 hour  
**Dependencies:** None

#### Implementation Steps:

1. **Create Skip Link Component**
   - File: `components/skip-link.tsx` (new)

\`\`\`tsx
"use client"

import Link from "next/link"

export function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Skip to main content
    </Link>
  )
}
\`\`\`

2. **Add to Root Layout**
   - File: `app/layout.tsx`

\`\`\`tsx
import { SkipLink } from "@/components/skip-link"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <SkipLink />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
\`\`\`

3. **Add Main Content ID**
   - File: `app/page.tsx`

\`\`\`tsx
<main id="main-content" className="min-h-screen bg-background">
  {/* ... */}
</main>
\`\`\`

4. **Add CSS for Screen Reader Only**
   - File: `app/globals.css`

\`\`\`css
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
}
\`\`\`

5. **Test**
   - Test with keyboard navigation (Tab key)
   - Test with screen reader
   - Verify skip link appears on focus

**Files to Create:**
- `components/skip-link.tsx`

**Files to Modify:**
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`

---

### Issue #5: Missing Alt Text for Decorative Icons
**Priority:** P0  
**Estimated Time:** 2 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Audit All Icon Usage**
   - Search for all icon components
   - Identify decorative vs. functional icons

2. **Add aria-hidden to Decorative Icons**
   - Files: Multiple components

\`\`\`tsx
// Decorative icons (no action, just visual)
<Truck className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
<Building2 className="w-5 h-5 text-primary" aria-hidden="true" />

// Functional icons (buttons, links) - add aria-label instead
<Button aria-label="Close menu">
  <X className="w-4 h-4" aria-hidden="true" />
</Button>
\`\`\`

3. **Update Components**
   - `components/navbar.tsx` - Logo icon
   - `components/footer.tsx` - Logo and contact icons
   - `components/hero-section.tsx` - Feature icons
   - `components/services-section.tsx` - Service icons
   - All other components with decorative icons

4. **Test**
   - Run accessibility audit
   - Test with screen reader
   - Verify no unnecessary announcements

**Files to Modify:**
- `components/navbar.tsx`
- `components/footer.tsx`
- `components/hero-section.tsx`
- `components/services-section.tsx`
- `components/stats-section.tsx`
- `components/tech-features-section.tsx`
- All other components with icons

---

### Issue #6: Payment Flow - No Clear Confirmation
**Priority:** P0  
**Estimated Time:** 2-3 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Create Payment Confirmation Component**
   - File: `components/payment-confirmation.tsx` (new)

\`\`\`tsx
"use client"

import { CheckCircle2, Mail, Clock, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PaymentConfirmationProps {
  referenceId: string
  depositAmount: number
  estimatedTotal: number
  scheduledDate?: string
}

export function PaymentConfirmation({
  referenceId,
  depositAmount,
  estimatedTotal,
  scheduledDate
}: PaymentConfirmationProps) {
  return (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-muted-foreground">
          Your deposit has been processed successfully.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Booking Details
            </h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-bold">{referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit Paid:</span>
                <span className="text-green-500">${depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span>${(estimatedTotal - depositAmount).toLocaleString()}</span>
              </div>
              {scheduledDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span>{new Date(scheduledDate).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Confirmation Email</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a detailed confirmation email within 5 minutes with:
                </p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                  <li>Booking reference number</li>
                  <li>Move details and timeline</li>
                  <li>Contact information for your move coordinator</li>
                  <li>Payment receipt</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <p className="font-semibold">What Happens Next?</p>
                <ol className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>Our team will contact you within 24 hours to confirm details</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>We'll schedule a site assessment (if needed)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>You'll receive a final confirmation 48 hours before your move</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Questions?</strong> Contact us at{" "}
              <a href="tel:+61388201801" className="text-primary hover:underline">
                03 8820 1801
              </a>{" "}
              or{" "}
              <a href="mailto:sales@m2mmoving.au" className="text-primary hover:underline">
                sales@m2mmoving.au
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
\`\`\`

2. **Update Quote Assistant Payment Section**
   - File: `components/quote-assistant.tsx`

\`\`\`tsx
import { PaymentConfirmation } from "@/components/payment-confirmation"

// Replace payment complete section
{paymentComplete && currentQuote && contactInfo && (
  <PaymentConfirmation
    referenceId={submittedLead?.id?.slice(0, 8).toUpperCase() || "PENDING"}
    depositAmount={currentQuote.depositRequired}
    estimatedTotal={currentQuote.estimatedTotal}
    scheduledDate={selectedDate || undefined}
  />
)}
\`\`\`

3. **Update Quote Builder Payment Section**
   - File: `components/quote-builder.tsx`
   - Apply same pattern

4. **Test**
   - Complete payment flow
   - Verify all information displays correctly
   - Check email confirmation (if implemented)

**Files to Create:**
- `components/payment-confirmation.tsx`

**Files to Modify:**
- `components/quote-assistant.tsx`
- `components/quote-builder.tsx`

---

### Issue #7: Business Lookup - No "None of These" Option
**Priority:** P0  
**Estimated Time:** 1-2 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Update Business Results Component**
   - File: `components/quote-assistant.tsx`

\`\`\`tsx
// In BusinessResults component
const BusinessResults = () => {
  if (!businessLookupResults?.length) return null

  return (
    <div className="space-y-2 my-3">
      <p className="text-sm text-muted-foreground">Select your business:</p>
      {businessLookupResults.map((business, i) => (
        <button
          key={i}
          onClick={() => handleSelectBusiness(business)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left"
        >
          {/* ... existing business card ... */}
        </button>
      ))}
      
      {/* Add "None of these" option */}
      <button
        onClick={() => {
          setBusinessLookupResults(null)
          sendMessage({
            text: "None of these match my business. I'll enter the details manually."
          })
        }}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/50 bg-transparent hover:bg-muted/50 hover:border-primary/50 transition-all text-left text-sm text-muted-foreground hover:text-foreground"
      >
        <span className="text-primary">+</span>
        <span>None of these match - enter manually</span>
      </button>
    </div>
  )
}
\`\`\`

2. **Handle Manual Entry Flow**
   - Update AI prompt to handle manual business entry
   - Allow users to provide business name and ABN manually

3. **Test**
   - Test business lookup with no matches
   - Test "none of these" flow
   - Verify manual entry works

**Files to Modify:**
- `components/quote-assistant.tsx`
- `app/api/quote-assistant/route.ts` (may need AI prompt updates)

---

### Issue #8: Calendar - Past Dates Not Clearly Disabled
**Priority:** P0  
**Estimated Time:** 1-2 hours  
**Dependencies:** None

#### Implementation Steps:

1. **Update Calendar Picker Component**
   - File: `components/quote-assistant.tsx`

\`\`\`tsx
// In CalendarPicker component
<button
  key={day}
  disabled={!isAvailable || isPast}
  onClick={() => isAvailable && !isPast && handleSelectDate(dateStr)}
  className={cn(
    "h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors relative",
    isSelected
      ? "bg-primary text-primary-foreground"
      : isAvailable && !isPast
        ? "hover:bg-primary/20 text-foreground cursor-pointer"
        : "text-muted-foreground/40 cursor-not-allowed opacity-50",
    isPast && "line-through"
  )}
  aria-disabled={!isAvailable || isPast}
  title={
    isPast
      ? "This date has passed"
      : !isAvailable
        ? "This date is not available"
        : "Select this date"
  }
>
  {day}
</button>
\`\`\`

2. **Add Visual Indicators**
   - Add tooltip explaining disabled states
   - Improve visual distinction

3. **Test**
   - Test calendar interaction
   - Verify disabled dates are clear
   - Test with screen reader

**Files to Modify:**
- `components/quote-assistant.tsx`

---

## PHASE 2: HIGH PRIORITY FIXES (P1) - Week 3-4

### Issue #9: Mobile Navigation Menu Issues
**Priority:** P1  
**Estimated Time:** 2-3 hours

#### Implementation Steps:

1. **Fix Menu Closing and Smooth Scroll**
   - File: `components/navbar.tsx`

\`\`\`tsx
const handleNavClick = (href: string) => {
  setIsOpen(false)
  
  if (href.startsWith('#')) {
    // Small delay to allow menu to close
    setTimeout(() => {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
}

// Update nav links
{navLinks.map((link) => (
  <Link
    key={link.name}
    href={link.href}
    onClick={(e) => {
      if (link.href.startsWith('#')) {
        e.preventDefault()
        handleNavClick(link.href)
      } else {
        setIsOpen(false)
      }
    }}
    className="..."
  >
    {link.name}
  </Link>
))}
\`\`\`

2. **Add Menu Animation**
   - Add smooth slide-in/out animation

\`\`\`tsx
<div className={cn(
  "md:hidden py-4 border-t border-border transition-all duration-300 ease-in-out",
  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
)}>
\`\`\`

3. **Test**
   - Test on various mobile devices
   - Verify smooth scrolling
   - Test menu animations

**Files to Modify:**
- `components/navbar.tsx`

---

### Issue #11: Custom Quote Form Error Display
**Priority:** P1  
**Estimated Time:** 1-2 hours

#### Implementation Steps:

1. **Add Error State**
   - File: `components/custom-quote-form.tsx`

\`\`\`tsx
const [submitError, setSubmitError] = useState<string | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsSubmitting(true)
  setSubmitError(null) // Clear previous errors

  try {
    const result = await submitLead({...})
    
    if (result.success) {
      setSubmitted(true)
      setSubmittedLead(result.lead)
    } else {
      setSubmitError(result.error || "Failed to submit quote. Please try again.")
    }
  } catch (error) {
    setSubmitError("An unexpected error occurred. Please try again or contact us directly.")
    console.error("Form submission error:", error)
  } finally {
    setIsSubmitting(false)
  }
}

// Add error display in JSX
{submitError && (
  <Card className="border-destructive bg-destructive/10">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-destructive mb-1">Submission Error</h4>
          <p className="text-sm text-muted-foreground">{submitError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setSubmitError(null)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
\`\`\`

2. **Test**
   - Test error scenarios
   - Verify error messages display
   - Test error dismissal

**Files to Modify:**
- `components/custom-quote-form.tsx`

---

### Issue #12: Phone Number Format Validation
**Priority:** P1  
**Estimated Time:** 1 hour

#### Implementation Steps:

1. **Update Validation Utility**
   - File: `lib/validation.ts` (already created in Issue #2)

\`\`\`typescript
export const validatePhone = (phone: string, required: boolean = false): string | null => {
  if (!phone || phone.trim() === '') {
    return required ? "Phone number is required" : null
  }
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Australian phone formats:
  // Mobile: 04XX XXX XXX or +61 4XX XXX XXX
  // Landline: 0X XXXX XXXX or +61 X XXXX XXXX
  const mobileRegex = /^(?:\+61|0)4[0-9]{8}$/
  const landlineRegex = /^(?:\+61|0)[2-8][0-9]{8}$/
  
  if (!mobileRegex.test(cleaned) && !landlineRegex.test(cleaned)) {
    return "Please enter a valid Australian phone number (e.g., 04XX XXX XXX or (03) XXXX XXXX)"
  }
  
  return null
}
\`\`\`

2. **Add Phone Formatting**
   - Optional: Add auto-formatting as user types

\`\`\`tsx
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 8) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
  }
  return cleaned
}
\`\`\`

3. **Update Forms**
   - Apply validation to all phone inputs

4. **Test**
   - Test various phone formats
   - Test validation messages
   - Test on mobile devices

**Files to Modify:**
- `lib/validation.ts`
- `components/quote-builder.tsx`
- `components/custom-quote-form.tsx`

---

### Issue #13: Floating CTA Overlaps Content
**Priority:** P1  
**Estimated Time:** 1 hour

#### Implementation Steps:

1. **Add Bottom Padding to Main Content**
   - File: `app/page.tsx`

\`\`\`tsx
<main className="min-h-screen bg-background pb-20 md:pb-0">
  {/* ... */}
</main>
\`\`\`

2. **Update Quote Page**
   - File: `app/quote/page.tsx`

\`\`\`tsx
<main className="min-h-screen bg-background pb-20 md:pb-0">
  {/* ... */}
</main>
\`\`\`

3. **Test**
   - Test on various mobile screen sizes
   - Verify no content overlap
   - Test scrolling behavior

**Files to Modify:**
- `app/page.tsx`
- `app/quote/page.tsx`
- `app/quote/custom/page.tsx`

---

### Issue #16: Loading States for Async Operations
**Priority:** P1  
**Estimated Time:** 3-4 hours

#### Implementation Steps:

1. **Create Loading Component**
   - File: `components/ui/loading-spinner.tsx` (if not exists)

2. **Add Loading States**
   - Business lookup
   - Availability check
   - Quote calculation
   - Payment processing

\`\`\`tsx
// In quote-assistant.tsx
const [isLookingUpBusiness, setIsLookingUpBusiness] = useState(false)
const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)

// Show loading during business lookup
{isLookingUpBusiness && (
  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
    <Loader2 className="h-4 w-4 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground">Looking up business...</span>
  </div>
)}
\`\`\`

3. **Test**
   - Test all loading states
   - Verify smooth transitions
   - Test on slow connections

**Files to Modify:**
- `components/quote-assistant.tsx`
- `components/quote-builder.tsx`

---

### Issue #18: Save Draft Functionality
**Priority:** P1  
**Estimated Time:** 3-4 hours

#### Implementation Steps:

1. **Use Form Persistence Hook** (already created in Issue #3)

2. **Update Quote Builder**
   - File: `components/quote-builder.tsx`

\`\`\`tsx
import { useFormPersistence } from '@/hooks/use-form-persistence'

// Save form state
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
  step < 3 // Only save if not submitted
)

// Load on mount
useEffect(() => {
  const saved = loadSavedData()
  if (saved && !submitted) {
    // Restore form state
    setStep(saved.step || 1)
    setSelectedType(saved.selectedType || null)
    // ... restore other fields
  }
}, [])

// Clear on successful submission
useEffect(() => {
  if (submitted) {
    clearSavedData()
  }
}, [submitted])
\`\`\`

3. **Add "Restore Draft" Banner**
   - Show banner if draft exists

\`\`\`tsx
const [showDraftBanner, setShowDraftBanner] = useState(false)

useEffect(() => {
  const draft = loadSavedData()
  if (draft && !submitted) {
    setShowDraftBanner(true)
  }
}, [])

{showDraftBanner && (
  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-primary" />
      <span className="text-sm">You have a saved draft. Would you like to continue?</span>
    </div>
    <div className="flex gap-2">
      <Button size="sm" onClick={restoreDraft}>Restore</Button>
      <Button size="sm" variant="ghost" onClick={() => {
        clearSavedData()
        setShowDraftBanner(false)
      }}>Start Fresh</Button>
    </div>
  </div>
)}
\`\`\`

4. **Test**
   - Test draft saving
   - Test draft restoration
   - Test draft clearing
   - Test across browser sessions

**Files to Modify:**
- `components/quote-builder.tsx`
- `components/custom-quote-form.tsx`

---

### Issue #20: Payment Error Messages
**Priority:** P1  
**Estimated Time:** 2-3 hours

#### Implementation Steps:

1. **Create Error Message Mapper**
   - File: `lib/stripe-errors.ts` (new)

\`\`\`typescript
export const getStripeErrorMessage = (error: string): string => {
  const errorMap: Record<string, string> = {
    'card_declined': 'Your card was declined. Please try a different payment method or contact your bank.',
    'insufficient_funds': 'Insufficient funds. Please check your account balance or use a different card.',
    'expired_card': 'Your card has expired. Please use a different card.',
    'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
    'incorrect_number': 'The card number is incorrect. Please check and try again.',
    'processing_error': 'An error occurred while processing your payment. Please try again.',
    'generic_decline': 'Your card was declined. Please contact your bank or try a different payment method.',
    'lost_card': 'Your card was declined. Please contact your bank.',
    'stolen_card': 'Your card was declined. Please contact your bank.',
    'pickup_card': 'Your card was declined. Please contact your bank.',
    'restricted_card': 'Your card cannot be used for this transaction. Please contact your bank.',
    'security_violation': 'Your card was declined due to a security violation. Please contact your bank.',
    'service_not_allowed': 'This card type is not accepted. Please use a different card.',
    'stop_payment_order': 'Your card was declined. Please contact your bank.',
    'testmode_decline': 'This is a test card and cannot be used in live mode.',
    'try_again_later': 'Payment processing is temporarily unavailable. Please try again in a few minutes.',
  }

  // Try to match error code
  for (const [code, message] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(code)) {
      return message
    }
  }

  // Default message
  return 'Payment failed. Please try again or contact support at 03 8820 1801.'
}
\`\`\`

2. **Update Payment Components**
   - File: `components/quote-assistant.tsx`

\`\`\`tsx
import { getStripeErrorMessage } from '@/lib/stripe-errors'

// In StripeCheckout component
if (creationError || !clientSecret || !stripePromise) {
  const userFriendlyError = creationError 
    ? getStripeErrorMessage(creationError)
    : "Unable to load payment form."
    
  return (
    <div className="text-center py-4 space-y-2">
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-4">{userFriendlyError}</p>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={handleCall}>
          <Phone className="h-4 w-4 mr-2" />
          Call to complete booking
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCreationError(null)}>
          Try Again
        </Button>
      </div>
    </div>
  )
}
\`\`\`

3. **Test**
   - Test various error scenarios
   - Verify user-friendly messages
   - Test error recovery

**Files to Create:**
- `lib/stripe-errors.ts`

**Files to Modify:**
- `components/quote-assistant.tsx`
- `components/quote-builder.tsx`

---

### Issue #21: Focus Indicators
**Priority:** P1  
**Estimated Time:** 2 hours

#### Implementation Steps:

1. **Update Global CSS**
   - File: `app/globals.css`

\`\`\`css
@layer base {
  *:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 2px;
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Remove default outline for mouse users */
  *:focus:not(:focus-visible) {
    outline: none;
  }
}
\`\`\`

2. **Test All Interactive Elements**
   - Buttons
   - Links
   - Form inputs
   - Custom components

3. **Test**
   - Keyboard navigation
   - Screen reader
   - Visual verification

**Files to Modify:**
- `app/globals.css`

---

### Issue #23: Beforeunload Warning
**Priority:** P1  
**Estimated Time:** 1-2 hours

#### Implementation Steps:

1. **Create Hook for Beforeunload**
   - File: `hooks/use-beforeunload.ts` (new)

\`\`\`typescript
import { useEffect } from 'react'

export function useBeforeUnload(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
}
\`\`\`

2. **Apply to Forms**
   - File: `components/quote-builder.tsx`

\`\`\`tsx
import { useBeforeUnload } from '@/hooks/use-beforeunload'

const hasUnsavedChanges = step > 1 && !submitted && (
  email || phone || companyName || contactName
)

useBeforeUnload(hasUnsavedChanges)
\`\`\`

3. **Test**
   - Test browser warning
   - Test navigation away
   - Test form submission (should not warn)

**Files to Create:**
- `hooks/use-beforeunload.ts`

**Files to Modify:**
- `components/quote-builder.tsx`
- `components/custom-quote-form.tsx`
- `components/quote-assistant.tsx`

---

## PHASE 3: MEDIUM PRIORITY FIXES (P2) - Week 5-6

### Issue #24: Service Cards - Add CTAs
**Priority:** P2  
**Estimated Time:** 2 hours

#### Implementation Steps:

1. **Update Services Section**
   - File: `components/services-section.tsx`

\`\`\`tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

// In service card
<CardContent>
  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
    {service.description}
  </p>
  <Button 
    asChild 
    variant="outline" 
    size="sm" 
    className="w-full group"
  >
    <Link href={`/quote?service=${service.id}`}>
      Get Quote
      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  </Button>
</CardContent>
\`\`\`

2. **Update Quote Builder to Accept Service Parameter**
   - File: `app/quote/page.tsx`

\`\`\`tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function QuotePage() {
  const searchParams = useSearchParams()
  const serviceParam = searchParams.get('service')

  // Pass to QuoteBuilder component
  return <QuoteBuilder initialService={serviceParam} />
}
\`\`\`

3. **Test**
   - Test service card CTAs
   - Verify pre-selection works
   - Test mobile interaction

**Files to Modify:**
- `components/services-section.tsx`
- `app/quote/page.tsx`
- `components/quote-builder.tsx`

---

### Issue #26: Mobile Slider Usability
**Priority:** P2  
**Estimated Time:** 2 hours

#### Implementation Steps:

1. **Add Manual Input to Slider**
   - File: `components/quote-builder.tsx`

\`\`\`tsx
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
        className="w-24 h-8 text-center"
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
\`\`\`

2. **Test**
   - Test on mobile devices
   - Test manual input
   - Test slider interaction

**Files to Modify:**
- `components/quote-builder.tsx`

---

### Issue #31: Breadcrumb Navigation
**Priority:** P2  
**Estimated Time:** 2-3 hours

#### Implementation Steps:

1. **Create Breadcrumb Component** (if not exists)
   - File: `components/breadcrumbs.tsx` (new)

\`\`\`tsx
"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
\`\`\`

2. **Add to Pages**
   - File: `app/quote/page.tsx`

\`\`\`tsx
import { Breadcrumbs } from "@/components/breadcrumbs"

<Breadcrumbs
  items={[
    { label: "Get Quote", href: "/quote" }
  ]}
  className="mb-6"
/>
\`\`\`

3. **Test**
   - Test navigation
   - Verify accessibility
   - Test on mobile

**Files to Create:**
- `components/breadcrumbs.tsx`

**Files to Modify:**
- `app/quote/page.tsx`
- `app/quote/custom/page.tsx`

---

### Issue #36: Custom 404 Page
**Priority:** P2  
**Estimated Time:** 1-2 hours

#### Implementation Steps:

1. **Create 404 Page**
   - File: `app/not-found.tsx` (new)

\`\`\`tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, AlertTriangle } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/quote">
                Get Quote
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
\`\`\`

2. **Test**
   - Navigate to non-existent page
   - Test all buttons
   - Verify styling

**Files to Create:**
- `app/not-found.tsx`

---

## PHASE 4: LOW PRIORITY FIXES (P3) - Week 7-8

### Issue #45: Image Optimization
**Priority:** P3  
**Estimated Time:** 2-3 hours

#### Implementation Steps:

1. **Audit All Images**
   - Find all `<img>` tags
   - Replace with Next.js `Image` component

2. **Update Components**
   - Use `next/image` for all images
   - Add proper sizing
   - Add alt text

\`\`\`tsx
import Image from "next/image"

<Image
  src="/placeholder-logo.png"
  alt="M&M Commercial Moving Logo"
  width={40}
  height={40}
  priority
/>
\`\`\`

3. **Test**
   - Verify image loading
   - Check performance
   - Test on slow connections

**Files to Modify:**
- All components with images

---

### Issue #46: Analytics Event Tracking
**Priority:** P3  
**Estimated Time:** 3-4 hours

#### Implementation Steps:

1. **Create Analytics Utility**
   - File: `lib/analytics.ts` (new)

\`\`\`typescript
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties)
  }
  
  // Also send to your analytics service
  // Example: posthog.capture(eventName, properties)
}

export const trackFormStart = (formType: 'quote-builder' | 'custom-quote' | 'quote-assistant') => {
  trackEvent('form_start', { form_type: formType })
}

export const trackFormComplete = (formType: string, data: Record<string, any>) => {
  trackEvent('form_complete', { form_type: formType, ...data })
}

export const trackCTAClick = (ctaLocation: string, ctaText: string) => {
  trackEvent('cta_click', { location: ctaLocation, text: ctaText })
}

export const trackPaymentStart = (amount: number) => {
  trackEvent('payment_start', { amount })
}

export const trackPaymentComplete = (amount: number, referenceId: string) => {
  trackEvent('payment_complete', { amount, reference_id: referenceId })
}
\`\`\`

2. **Add Tracking to Components**
   - Form starts
   - Form completions
   - CTA clicks
   - Payment events

\`\`\`tsx
import { trackFormStart, trackFormComplete } from '@/lib/analytics'

// On form start
useEffect(() => {
  trackFormStart('quote-builder')
}, [])

// On form complete
const handleSubmit = async () => {
  // ... submit logic
  trackFormComplete('quote-builder', {
    move_type: selectedType,
    estimated_total: estimate
  })
}
\`\`\`

3. **Test**
   - Verify events fire correctly
   - Check analytics dashboard
   - Test all tracked events

**Files to Create:**
- `lib/analytics.ts`

**Files to Modify:**
- `components/quote-builder.tsx`
- `components/custom-quote-form.tsx`
- `components/quote-assistant.tsx`
- `components/navbar.tsx`
- `components/hero-section.tsx`

---

### Issue #47: Sitemap and Robots.txt
**Priority:** P3  
**Estimated Time:** 1-2 hours

#### Implementation Steps:

1. **Create Sitemap**
   - File: `app/sitemap.ts` (new)

\`\`\`typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://m2mmoving.com.au'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/quote/custom`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
\`\`\`

2. **Create Robots.txt**
   - File: `app/robots.ts` (new)

\`\`\`typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://m2mmoving.com.au/sitemap.xml',
  }
}
\`\`\`

3. **Test**
   - Verify sitemap.xml is accessible
   - Verify robots.txt is accessible
   - Test with Google Search Console

**Files to Create:**
- `app/sitemap.ts`
- `app/robots.ts`

---

## Testing Strategy

### Unit Tests
- Validation functions
- Utility functions
- Custom hooks

### Integration Tests
- Form submissions
- API error handling
- Payment flows

### E2E Tests
- Complete quote flow
- Mobile navigation
- Accessibility testing

### Manual Testing Checklist
- [ ] All P0 issues resolved
- [ ] All P1 issues resolved
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Performance testing
- [ ] Error scenarios tested

---

## Deployment Plan

### Phase 1 Deployment (Week 2)
- Deploy P0 fixes to staging
- Internal QA testing
- Deploy to production

### Phase 2 Deployment (Week 4)
- Deploy P1 fixes to staging
- User acceptance testing
- Deploy to production

### Phase 3 Deployment (Week 6)
- Deploy P2 fixes to staging
- Deploy to production

### Phase 4 Deployment (Week 8)
- Deploy P3 fixes to staging
- Deploy to production

---

## Success Metrics

### Before Implementation
- Form abandonment rate: [TBD]
- Average time to complete quote: [TBD]
- Error rate: [TBD]
- Accessibility score: [TBD]

### After Implementation
- Target: 20% reduction in form abandonment
- Target: 15% reduction in completion time
- Target: 50% reduction in errors
- Target: WCAG AA compliance

---

## Risk Mitigation

### Potential Risks
1. **Breaking Changes**: Test thoroughly before deployment
2. **Performance Impact**: Monitor page load times
3. **User Confusion**: Gradual rollout with feature flags
4. **Data Loss**: Implement backup/restore for form data

### Mitigation Strategies
- Feature flags for gradual rollout
- A/B testing for major changes
- Comprehensive testing before production
- Rollback plan for each phase

---

## Documentation Updates

After implementation, update:
- User documentation (if applicable)
- Developer documentation
- API documentation
- Accessibility statement

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Next Review:** After Phase 1 completion
