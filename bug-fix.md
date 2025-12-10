# UX Bug Report - M&M Commercial Moving Website
**Website:** https://m2mmoving.com.au/  
**Date:** December 2025  
**Review Type:** Comprehensive User Experience Audit

---

## Executive Summary

This document outlines all identified UX bugs, usability issues, and improvement opportunities found during a comprehensive review of the M&M Commercial Moving website. Issues are categorized by priority and type to facilitate systematic resolution.

**Total Issues Found:** 47  
**Critical (P0):** 8  
**High (P1):** 15  
**Medium (P2):** 18  
**Low (P3):** 6

---

## Priority Legend

- **P0 (Critical):** Blocks core functionality, causes data loss, or creates legal/accessibility violations
- **P1 (High):** Significantly impacts user experience, conversion, or trust
- **P2 (Medium):** Minor usability issues that should be addressed
- **P3 (Low):** Nice-to-have improvements and optimizations

---

## P0 - CRITICAL ISSUES

### 1. Footer Navigation Links Are Dead Links
**Location:** `components/footer.tsx` (lines 10, 42, 47, 52, 63, 68, 73, 78)  
**Issue:** All footer navigation links use `href="#"` which provides no functionality  
**Impact:** Users cannot navigate to service pages, about page, contact, blog, or careers. Creates poor UX and reduces trust.  
**Fix:** Replace `href="#"` with actual routes:
- Services → `/#services` (scroll to section) or `/quote`
- About Us → Create `/about` page or link to company info
- Contact → `/#contact` or `/quote`
- Blog → Create `/blog` page or remove if not available
- Careers → Create `/careers` page or remove if not available

**Code Example:**
\`\`\`tsx
// Current (broken)
<a href="#" className="hover:text-primary transition-colors">Office Relocation</a>

// Fixed
<a href="/#services" className="hover:text-primary transition-colors">Office Relocation</a>
\`\`\`

---

### 2. Missing Form Validation Feedback
**Location:** `components/quote-builder.tsx`, `components/custom-quote-form.tsx`  
**Issue:** Forms don't show validation errors until submission. Users can't see what's wrong until they try to submit.  
**Impact:** Poor UX, users may abandon forms thinking they're broken  
**Fix:** Add real-time validation with inline error messages:
- Email format validation
- Required field indicators
- Phone number format validation (Australian format)
- Clear error messages below each field

**Example:**
\`\`\`tsx
{!email && touched.email && (
  <p className="text-xs text-destructive mt-1">Email is required</p>
)}
{email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
  <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
)}
\`\`\`

---

### 3. No Error Recovery for Failed API Calls
**Location:** `components/quote-assistant.tsx`, `components/quote-builder.tsx`  
**Issue:** When API calls fail (network errors, server errors), users see generic error messages with limited recovery options  
**Impact:** Users lose their progress, can't retry easily, may abandon the quote process  
**Fix:** 
- Implement retry logic with exponential backoff
- Save form state to localStorage
- Show clear error messages with actionable recovery steps
- Provide alternative contact methods prominently

---

### 4. Missing Accessibility: Skip to Content Link
**Location:** `app/layout.tsx`, `app/page.tsx`  
**Issue:** No skip navigation link for keyboard users and screen readers  
**Impact:** Accessibility violation (WCAG 2.1), poor experience for assistive technology users  
**Fix:** Add skip link at the top of the page:
\`\`\`tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground">
  Skip to main content
</a>
\`\`\`

---

### 5. Missing Alt Text for Decorative Icons
**Location:** Multiple components (navbar, footer, hero section)  
**Issue:** Icons used as decorative elements don't have proper `aria-hidden="true"` or alt text  
**Impact:** Screen readers announce unnecessary information, cluttering the experience  
**Fix:** Add `aria-hidden="true"` to decorative icons:
\`\`\`tsx
<Truck className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
\`\`\`

---

### 6. Payment Flow: No Clear Confirmation of What Happens Next
**Location:** `components/quote-assistant.tsx` (PaymentSection), `components/quote-builder.tsx`  
**Issue:** After payment completion, users see a success message but unclear next steps  
**Impact:** Users may be confused about what happens next, when they'll be contacted, or how to track their booking  
**Fix:** Add clear post-payment information:
- "You'll receive a confirmation email within 5 minutes"
- "Our team will contact you within 24 hours"
- "Reference number: [ID]"
- "What to expect next" section

---

### 7. Business Lookup Results: No "None of These" Option
**Location:** `components/quote-assistant.tsx` (BusinessResults component)  
**Issue:** If business lookup doesn't return the correct business, users can't proceed  
**Impact:** Users stuck in the flow, cannot complete quote  
**Fix:** Add "None of these match" button that allows manual entry:
\`\`\`tsx
<button onClick={() => setBusinessLookupResults(null)} className="text-sm text-muted-foreground hover:text-primary">
  None of these match - enter manually
</button>
\`\`\`

---

### 8. Calendar Picker: Past Dates Not Clearly Disabled
**Location:** `components/quote-assistant.tsx` (CalendarPicker component, line 636)  
**Issue:** Past dates are disabled but visual distinction is subtle (only color change)  
**Impact:** Users may try to select past dates, causing confusion  
**Fix:** 
- Add `cursor-not-allowed` class
- Add tooltip explaining why dates are disabled
- Make disabled state more visually distinct
- Add `aria-disabled="true"` for accessibility

---

## P1 - HIGH PRIORITY ISSUES

### 9. Mobile Navigation: Menu Doesn't Close on Link Click
**Location:** `components/navbar.tsx` (line 71)  
**Issue:** Mobile menu closes on navigation link click, but not consistently. Hash links (#services) may not scroll properly.  
**Impact:** Mobile users may experience jarring navigation  
**Fix:** Ensure smooth scroll behavior and consistent menu closing:
\`\`\`tsx
onClick={() => {
  setIsOpen(false)
  // Small delay to allow menu to close before scroll
  setTimeout(() => {
    const element = document.querySelector(link.href.replace('/', ''))
    element?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}}
\`\`\`

---

### 10. Quote Builder: No Way to Go Back After Submission
**Location:** `components/quote-builder.tsx` (line 353)  
**Issue:** After quote submission, users can only return to homepage. No way to edit or view submitted quote.  
**Impact:** Users can't review their submission or make corrections  
**Fix:** 
- Add "View Quote Details" button
- Provide a quote reference number they can use to track
- Allow editing if status is still "pending"

---

### 11. Custom Quote Form: Missing Error Display
**Location:** `components/custom-quote-form.tsx` (handleSubmit function)  
**Issue:** Form submission errors are not displayed to the user. Only success state is shown.  
**Impact:** Users don't know if submission failed, may resubmit unnecessarily  
**Fix:** Add error state display:
\`\`\`tsx
const [submitError, setSubmitError] = useState<string | null>(null)

// In handleSubmit
if (!result.success) {
  setSubmitError(result.error || "Failed to submit. Please try again.")
  return
}

// In JSX
{submitError && (
  <div className="border border-destructive bg-destructive/10 text-destructive p-3 rounded">
    {submitError}
  </div>
)}
\`\`\`

---

### 12. Phone Number Format Not Validated
**Location:** `components/quote-builder.tsx`, `components/custom-quote-form.tsx`  
**Issue:** Phone number inputs accept any format, no Australian phone number validation  
**Impact:** Invalid phone numbers may be collected, causing contact issues  
**Fix:** Add Australian phone number validation:
\`\`\`tsx
const validatePhone = (phone: string) => {
  // Australian phone: 04XX XXX XXX or +61 4XX XXX XXX
  const regex = /^(?:\+61|0)[2-478](?:[ -]?[0-9]){8}$/
  return regex.test(phone.replace(/\s/g, ''))
}
\`\`\`

---

### 13. Floating CTA Overlaps Content on Mobile
**Location:** `components/floating-cta.tsx` (line 74)  
**Issue:** Mobile sticky bottom bar may overlap page content, especially on shorter screens  
**Impact:** Content becomes unreadable, poor mobile UX  
**Fix:** Add bottom padding to main content when floating CTA is visible:
\`\`\`tsx
// In main layout
<main className="min-h-screen bg-background pb-20 md:pb-0">
\`\`\`

---

### 14. Quote Assistant: Auto-Scroll May Cause Motion Sickness
**Location:** `components/quote-assistant.tsx` (line 441)  
**Issue:** Auto-scrolling to bottom on every message may cause issues for users sensitive to motion  
**Impact:** Accessibility issue, may cause discomfort  
**Fix:** 
- Add `prefers-reduced-motion` media query check
- Only auto-scroll if user hasn't manually scrolled up
- Add smooth scroll option in settings

---

### 15. "Coming Soon" Features Reduce Trust
**Location:** `components/tech-features-section.tsx`, `components/testimonials-section.tsx`  
**Issue:** All tech features and testimonials marked as "Coming Soon" makes the site feel incomplete  
**Impact:** Reduces credibility and trust, may cause users to look elsewhere  
**Fix:** 
- Remove or hide "Coming Soon" sections until content is ready
- Replace with actual testimonials (even if just 1-2)
- Show partial features as "In Development" with timeline

---

### 16. No Loading States for Async Operations
**Location:** Multiple components (quote-assistant, quote-builder)  
**Issue:** Some async operations (business lookup, availability check) don't show loading indicators  
**Impact:** Users don't know if the system is working or frozen  
**Fix:** Add loading spinners and skeleton states for all async operations

---

### 17. Calendar: Month Navigation Doesn't Reset to Current Month
**Location:** `components/quote-assistant.tsx` (CalendarPicker, line 239)  
**Issue:** Calendar month state persists, users may navigate far into future and get lost  
**Impact:** Confusing UX, users may not find current month easily  
**Fix:** Add "Today" button that resets to current month:
\`\`\`tsx
<Button onClick={() => setCalendarMonth(new Date())} variant="ghost" size="sm">
  Today
</Button>
\`\`\`

---

### 18. Form: No "Save Draft" Functionality
**Location:** `components/quote-builder.tsx`, `components/custom-quote-form.tsx`  
**Issue:** Long forms can't be saved, users lose progress if they navigate away  
**Impact:** High abandonment rate, poor UX for complex quotes  
**Fix:** Implement localStorage draft saving:
\`\`\`tsx
useEffect(() => {
  const draft = localStorage.getItem('quote-draft')
  if (draft) {
    const data = JSON.parse(draft)
    // Restore form state
  }
}, [])

useEffect(() => {
  localStorage.setItem('quote-draft', JSON.stringify(formData))
}, [formData])
\`\`\`

---

### 19. No Browser Back Button Handling in Quote Builder
**Location:** `components/quote-builder.tsx`  
**Issue:** Browser back button doesn't work properly with multi-step form  
**Impact:** Users expect back button to work, creates confusion  
**Fix:** Use URL parameters or history API to track step:
\`\`\`tsx
const [step, setStep] = useState(() => {
  const params = new URLSearchParams(window.location.search)
  return parseInt(params.get('step') || '1')
})

useEffect(() => {
  window.history.pushState({ step }, '', `?step=${step}`)
}, [step])
\`\`\`

---

### 20. Payment Error Messages Not User-Friendly
**Location:** `components/quote-assistant.tsx` (StripeCheckout component)  
**Issue:** Stripe errors may show technical messages that users don't understand  
**Impact:** Users don't know how to fix payment issues  
**Fix:** Map Stripe error codes to user-friendly messages:
\`\`\`tsx
const getErrorMessage = (error: string) => {
  const errorMap: Record<string, string> = {
    'card_declined': 'Your card was declined. Please try a different payment method.',
    'insufficient_funds': 'Insufficient funds. Please check your account balance.',
    'expired_card': 'Your card has expired. Please use a different card.',
    // ... more mappings
  }
  return errorMap[error] || 'Payment failed. Please try again or contact support.'
}
\`\`\`

---

### 21. Missing Focus Indicators
**Location:** Multiple components (buttons, links, inputs)  
**Issue:** Focus states may not be visible enough for keyboard navigation  
**Impact:** Accessibility issue, keyboard users can't see where they are  
**Fix:** Ensure all interactive elements have visible focus states:
\`\`\`css
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
\`\`\`

---

### 22. Quote Assistant: Voice Input Not Accessible
**Location:** `components/quote-assistant.tsx` (line 499)  
**Issue:** Voice input button has no aria-label explaining its function  
**Impact:** Screen reader users don't know what the button does  
**Fix:** Add proper aria-label:
\`\`\`tsx
<Button
  aria-label={isListening ? "Stop voice input" : "Start voice input"}
  title={isListening ? "Stop voice input" : "Start voice input"}
>
\`\`\`

---

### 23. No Confirmation Before Leaving Page with Unsaved Data
**Location:** All form pages  
**Issue:** Users can accidentally navigate away and lose form data  
**Impact:** Frustration, data loss, increased abandonment  
**Fix:** Implement beforeunload warning:
\`\`\`tsx
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [hasUnsavedChanges])
\`\`\`

---

## P2 - MEDIUM PRIORITY ISSUES

### 24. Service Cards: No Call-to-Action
**Location:** `components/services-section.tsx`  
**Issue:** Service cards are informational only, no way to get quote for specific service  
**Impact:** Missed conversion opportunities  
**Fix:** Add "Get Quote" button to each service card linking to quote builder with pre-selected service

---

### 25. Stats Section: Numbers May Not Be Accurate
**Location:** `components/stats-section.tsx`  
**Issue:** Hard-coded stats (2 relocations, $0 damage) may become outdated  
**Impact:** Misleading information if not updated regularly  
**Fix:** Make stats dynamic from database or add "Last updated" date

---

### 26. Quote Builder: Square Meters Slider Hard to Use on Mobile
**Location:** `components/quote-builder.tsx` (line 600)  
**Issue:** Slider for square meters may be difficult to use precisely on touch devices  
**Impact:** Users may select wrong values, affecting quote accuracy  
**Fix:** Add manual input field alongside slider:
\`\`\`tsx
<div className="flex gap-2">
  <Slider value={squareMeters} onValueChange={setSquareMeters} />
  <Input 
    type="number" 
    value={squareMeters[0]} 
    onChange={(e) => setSquareMeters([parseInt(e.target.value) || 0])}
    className="w-24"
  />
</div>
\`\`\`

---

### 27. Custom Quote Form: Industry Type Select Uses Lowercase Values
**Location:** `components/custom-quote-form.tsx` (line 233)  
**Issue:** Industry type values are converted to lowercase with dashes, may cause data inconsistency  
**Impact:** Backend may receive inconsistent format  
**Fix:** Use consistent value format or map on backend

---

### 28. Hero Section: CTA Buttons May Be Too Small on Mobile
**Location:** `components/hero-section.tsx` (line 103)  
**Issue:** CTA buttons may be difficult to tap on mobile devices  
**Impact:** Poor mobile UX, reduced conversions  
**Fix:** Ensure buttons meet minimum touch target size (44x44px):
\`\`\`tsx
<Button size="lg" className="min-h-[44px] min-w-[120px]">
\`\`\`

---

### 29. Quote Assistant: Initial Prompts May Overwhelm Users
**Location:** `components/quote-assistant.tsx` (InitialPrompts component)  
**Issue:** 6 quick start options may be too many, causing choice paralysis  
**Impact:** Users may not know where to start  
**Fix:** Reduce to 3-4 most common options, add "Other" option

---

### 30. Footer: Logo Link Goes to "#" Instead of Homepage
**Location:** `components/footer.tsx` (line 10)  
**Issue:** Footer logo should link to homepage but uses `href="#"`  
**Impact:** Inconsistent navigation  
**Fix:** Change to `href="/"`

---

### 31. No Breadcrumb Navigation
**Location:** Quote pages, custom quote page  
**Issue:** Users can't easily see where they are in the site hierarchy  
**Impact:** Poor navigation, especially for deep pages  
**Fix:** Add breadcrumb component:
\`\`\`tsx
<Breadcrumb>
  <BreadcrumbItem><Link href="/">Home</Link></BreadcrumbItem>
  <BreadcrumbItem>Get Quote</BreadcrumbItem>
</Breadcrumb>
\`\`\`

---

### 32. Quote Display: Breakdown May Be Confusing
**Location:** `components/quote-assistant.tsx` (QuoteDisplay component)  
**Issue:** Quote breakdown shows individual line items but may not be clear what's included  
**Impact:** Users may not understand what they're paying for  
**Fix:** Add tooltips or expandable details for each line item

---

### 33. Calendar: No Visual Indicator for "Limited Availability"
**Location:** `components/quote-assistant.tsx` (CalendarPicker, line 650)  
**Issue:** Limited availability (1 slot) has ring indicator but may not be clear  
**Impact:** Users may not understand what the indicator means  
**Fix:** Add legend or tooltip explaining availability indicators

---

### 34. Mobile Menu: No Animation/Transition
**Location:** `components/navbar.tsx` (line 63)  
**Issue:** Mobile menu appears/disappears instantly, feels jarring  
**Impact:** Poor UX, feels unpolished  
**Fix:** Add smooth slide-in animation:
\`\`\`tsx
<div className={`md:hidden py-4 border-t border-border transition-all duration-300 ${
  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
}`}>
\`\`\`

---

### 35. Quote Builder: Additional Services Checkboxes Hard to Tap
**Location:** `components/quote-builder.tsx` (line 619)  
**Issue:** Checkbox labels are clickable but visual feedback may not be clear  
**Impact:** Users may not realize they can click the label  
**Fix:** Make entire card clickable with better hover states

---

### 36. No 404 Error Page
**Location:** Missing `app/not-found.tsx`  
**Issue:** Users hitting broken links see default Next.js 404  
**Impact:** Poor brand experience, users may think site is broken  
**Fix:** Create custom 404 page with navigation back to homepage

---

### 37. Quote Assistant: Progress Indicator May Be Confusing
**Location:** `components/quote-assistant.tsx` (BookingProgress component)  
**Issue:** Progress steps show numbers but may not be clear what each step means  
**Impact:** Users may not understand where they are in the process  
**Fix:** Add tooltips or expandable details for each step

---

### 38. Form Inputs: Placeholder Text May Be Confusing
**Location:** Multiple form components  
**Issue:** Some placeholders use examples that may not match actual format requirements  
**Impact:** Users may enter data in wrong format  
**Fix:** Use clearer placeholders and add format hints:
\`\`\`tsx
<Input 
  placeholder="04XX XXX XXX"
  pattern="[0-9]{10}"
  title="10-digit Australian mobile number"
/>
\`\`\`

---

### 39. No Social Proof Beyond Stats
**Location:** Homepage  
**Issue:** Only shows stats, no customer logos, certifications, or trust badges  
**Impact:** May not build enough trust for enterprise customers  
**Fix:** Add:
- Customer logos (if available)
- Industry certifications
- Insurance badges
- Security certifications

---

### 40. Quote Builder: Distance Input Not Validated
**Location:** `components/quote-builder.tsx` (line 584)  
**Issue:** Distance accepts any number, no validation for reasonable ranges  
**Impact:** Users may enter unrealistic distances, affecting quote accuracy  
**Fix:** Add validation:
\`\`\`tsx
const validateDistance = (distance: string) => {
  const num = parseInt(distance)
  return num >= 0 && num <= 1000 // Reasonable range for Melbourne
}
\`\`\`

---

### 41. Custom Quote Form: Date Picker Has No Min Date
**Location:** `components/custom-quote-form.tsx` (line 283)  
**Issue:** Users can select past dates for move date  
**Impact:** Invalid data, may cause confusion  
**Fix:** Add `min` attribute:
\`\`\`tsx
<Input 
  type="date" 
  min={new Date().toISOString().split('T')[0]}
/>
\`\`\`

---

## P3 - LOW PRIORITY ISSUES

### 42. No Print Styles
**Location:** Global CSS  
**Issue:** Pages don't have print-optimized styles  
**Impact:** Users can't easily print quotes or information  
**Fix:** Add print media queries to hide navigation, optimize layout

---

### 43. No Dark/Light Mode Toggle
**Location:** Site is dark mode only  
**Issue:** Some users may prefer light mode  
**Impact:** Minor preference issue  
**Fix:** Add theme toggle (though dark mode is part of brand identity, so this may be intentional)

---

### 44. No Keyboard Shortcuts
**Location:** Quote assistant, forms  
**Issue:** Power users may want keyboard shortcuts for common actions  
**Impact:** Minor efficiency issue  
**Fix:** Add keyboard shortcuts (e.g., Ctrl+Enter to submit)

---

### 45. Images Not Optimized
**Location:** Public folder, any image usage  
**Issue:** Images may not be using Next.js Image component for optimization  
**Impact:** Slower page loads, poor performance  
**Fix:** Use Next.js `Image` component with proper sizing

---

### 46. No Analytics Event Tracking
**Location:** Forms, CTAs, quote completion  
**Issue:** No tracking of user interactions for optimization  
**Impact:** Can't measure conversion funnels effectively  
**Fix:** Add analytics events for:
- Form starts
- Form completions
- CTA clicks
- Quote submissions
- Payment completions

---

### 47. No Sitemap or Robots.txt
**Location:** Missing files  
**Issue:** SEO may be impacted  
**Impact:** Search engines may not index site properly  
**Fix:** Add `sitemap.xml` and `robots.txt` files

---

## Priority To-Do List

### Immediate (This Week)
1. ✅ Fix footer dead links (P0 #1)
2. ✅ Add form validation feedback (P0 #2)
3. ✅ Add skip to content link (P0 #4)
4. ✅ Fix business lookup "none match" option (P0 #7)
5. ✅ Improve calendar disabled date visibility (P0 #8)
6. ✅ Add error recovery for API calls (P0 #3)

### High Priority (This Month)
7. ✅ Fix mobile navigation menu closing (P1 #9)
8. ✅ Add error display to custom quote form (P1 #11)
9. ✅ Validate phone number format (P1 #12)
10. ✅ Fix floating CTA overlap on mobile (P1 #13)
11. ✅ Add loading states for async operations (P1 #16)
12. ✅ Improve payment error messages (P1 #20)
13. ✅ Add focus indicators (P1 #21)
14. ✅ Add beforeunload warning for forms (P1 #23)
15. ✅ Add "Save Draft" functionality (P1 #18)

### Medium Priority (Next Month)
16. ✅ Add CTAs to service cards (P2 #24)
17. ✅ Make stats dynamic (P2 #25)
18. ✅ Improve mobile slider usability (P2 #26)
19. ✅ Add breadcrumb navigation (P2 #31)
20. ✅ Create custom 404 page (P2 #36)
21. ✅ Add social proof elements (P2 #39)

### Low Priority (Backlog)
22. ✅ Add print styles (P3 #42)
23. ✅ Optimize images (P3 #45)
24. ✅ Add analytics tracking (P3 #46)
25. ✅ Add sitemap and robots.txt (P3 #47)

---

## Testing Checklist

After fixes are implemented, test the following:

### Accessibility
- [ ] Screen reader navigation works smoothly
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Alt text is present for all images

### Mobile
- [ ] All forms work on mobile devices
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal scrolling
- [ ] Mobile menu works smoothly
- [ ] Floating CTA doesn't overlap content

### Forms
- [ ] Validation works in real-time
- [ ] Error messages are clear and helpful
- [ ] Required fields are marked
- [ ] Form data persists on refresh (draft save)
- [ ] Submission errors are displayed

### Navigation
- [ ] All links work correctly
- [ ] Hash links scroll smoothly
- [ ] Browser back button works
- [ ] Breadcrumbs are accurate

### Performance
- [ ] Page load time < 3 seconds
- [ ] Images are optimized
- [ ] No layout shift (CLS)
- [ ] Smooth animations (60fps)

---

## Notes

- Some "Coming Soon" features may be intentional for marketing purposes
- Dark mode is part of brand identity - consider carefully before adding light mode
- Consider A/B testing form improvements to measure impact
- Regular audits should be scheduled quarterly

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Next Review:** March 2026
