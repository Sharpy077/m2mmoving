# M&M Commercial Moving - Product Requirements Document

---

## 1. Executive Summary

**Product:** M&M Commercial Moving Website  
**Company:** M&M Commercial Moving Services (subsidiary of Sharp Horizons Technology Pty Ltd)  
**ABN:** 71 661 027 309  
**Market:** Melbourne, Victoria, Australia  
**Primary Contact:** 03 8820 1801 | sales@m2mmoving.au

M&M Commercial Moving is a tech-powered commercial relocation service targeting businesses in Melbourne. The website serves as the primary lead generation and booking platform, featuring an AI-powered quote assistant, manual quote builder, and admin dashboard for lead management.

**Current Status:** Early-stage operation with 2 completed relocations. Multiple planned features marked as "Coming Soon."

---

## 2. Product Vision and Goals

### Business Objectives

1. Generate qualified leads for commercial moving services
2. Enable instant quote generation to reduce friction in the sales funnel
3. Collect 50% deposits to confirm bookings
4. Differentiate from competitors through technology-forward branding

### Target Audience

- Corporate offices relocating within Melbourne metro
- IT departments managing equipment transfers
- Data centers requiring specialized migration
- Retail stores moving locations
- Warehouses and industrial facilities

---

## 3. Current Feature Inventory

### 3.1 Public-Facing Website

#### Homepage Components

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Navbar | `components/navbar.tsx` | Complete | Fixed header with navigation, phone CTA, quote button |
| Hero Section | `components/hero-section.tsx` | Complete | Main headline, value props, embedded AI assistant |
| Trust Bar | `components/trust-bar.tsx` | Complete | Credibility indicators |
| Stats Section | `components/stats-section.tsx` | Complete | Dynamic stats (2 relocations, $0 damage claims, 48hr avg, 100% satisfaction) |
| Services Section | `components/services-section.tsx` | Complete | 4 service cards |
| Tech Features | `components/tech-features-section.tsx` | Partial | 4 features, all marked "Coming Soon" |
| Testimonials | `components/testimonials-section.tsx` | Placeholder | "Coming Soon" placeholder |
| CTA Section | `components/cta-section.tsx` | Complete | Final call-to-action |
| Footer | `components/footer.tsx` | Complete | Contact info, links, company info |

### 3.2 AI Quote Assistant (Maya)

**File:** `components/quote-assistant.tsx`  
**API:** `app/api/quote-assistant/route.ts`  
**AI Model:** OpenAI GPT-4o via Vercel AI SDK

#### Conversation Flow

1. Welcome and business identification (ABN/company name lookup)
2. Business confirmation with visual selection
3. Service type picker (office, warehouse, datacenter, IT equipment, retail)
4. Qualifying questions based on service type
5. Location collection (origin/destination suburbs)
6. Quote calculation with detailed breakdown
7. Date selection via availability calendar
8. Contact information collection
9. Stripe payment for 50% deposit
10. Booking confirmation

#### AI Tools Available

| Tool | Purpose |
|------|---------|
| `lookupBusiness` | ABN/business name lookup via Australian Business Register |
| `confirmBusiness` | Confirm selected business |
| `showServiceOptions` | Display service type picker |
| `checkAvailability` | Fetch available dates |
| `confirmBookingDate` | Lock in selected date |
| `calculateQuote` | Generate pricing estimate |
| `collectContactInfo` | Gather customer details |
| `initiatePayment` | Show Stripe payment form |
| `requestCallback` | Schedule phone callback |

#### Additional Features

- Voice input (Web Speech API)
- Text-to-speech responses (Australian English)
- Error handling with fallback to phone
- Floating and embedded modes

### 3.3 Manual Quote Builder

**File:** `components/quote-builder.tsx`  
**Page:** `app/quote/page.tsx`

#### 3-Step Wizard

| Step | Content |
|------|---------|
| 1. Select Service | Move type cards with expandable details |
| 2. Configure | Location inputs, square meters slider (dynamic min per service, max 2000sqm), additional services checkboxes |
| 3. Confirm | Estimate display, contact form, submission |

#### Move Types and Pricing

| Type | Base Rate | Per SQM | Min SQM | Code |
|------|-----------|---------|---------|------|
| Office Relocation | $2,500 | $45 | 20 | OFF-REL |
| Data Center Migration | $5,000 | $85 | 50 | DC-MIG |
| IT Equipment Transport | $1,500 | $35 | 10 | IT-TRN |

#### Additional Services

| Service | Price | Description |
|---------|-------|-------------|
| Professional Packing | $450 | Full packing with materials |
| Temporary Storage | $300/week | Secure storage |
| Post-Move Cleaning | $350 | Old premises cleaning |
| Premium Insurance | $200 | $100K coverage |
| After Hours Service | $500 | Weekend/evening moves |
| IT Setup Assistance | $600 | Equipment reconnection |

### 3.4 Custom Quote Form

**File:** `components/custom-quote-form.tsx`  
**Page:** `app/quote/custom/page.tsx`

For complex projects requiring manual assessment. Collects:

- Contact information (name, company, email, phone)
- Business profile (industry, employee count)
- Locations (current and new addresses)
- Target date and estimated square meters
- Special requirements (server room, medical equipment, hazmat, security items, artwork, weekend-only, staged relocation, international)
- Project description

### 3.5 Admin Dashboard

**Page:** `app/admin/page.tsx`  
**Component:** `components/admin-dashboard.tsx`

#### Features

- Lead statistics cards (total, new, pipeline value, this week)
- Search and filter (by status, lead type)
- Lead table with sortable columns
- Lead detail modal with:
  - Contact information
  - Move details
  - Additional services/requirements
  - Internal notes (editable)
  - Status workflow (new → contacted → quoted → won/lost)

### 3.6 Voicemail Management

**Page:** `app/admin/voicemails/`  
**Component:** `components/voicemails-dashboard.tsx`  
**API:** `app/api/voicemails/`

#### Features

- Voicemail listing with status indicators
- Audio playback
- Transcription display
- Status management (new → listened → followed_up → archived)
- Caller information

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.0.3 |
| Runtime | React | 19.2.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (Radix primitives) | Latest |
| Database | Supabase | Latest |
| Authentication | Supabase Auth | Latest |
| Payments | Stripe (Embedded Checkout) | Latest |
| AI/LLM | Vercel AI SDK + OpenAI GPT-4o | Latest |
| Voice/SMS | Twilio | Latest |
| Analytics | Vercel Analytics | Latest |
| Hosting | Vercel | - |

### 4.2 Database Schema (Supabase)

#### Leads Table

```typescript
interface Lead {
  id: string
  lead_type: "instant_quote" | "custom_quote"
  status: "new" | "contacted" | "quoted" | "won" | "lost"
  contact_name: string | null
  company_name: string | null
  email: string
  phone: string | null
  move_type: string | null
  origin_suburb: string | null
  destination_suburb: string | null
  distance_km: number | null
  square_meters: number | null
  estimated_total: number | null
  deposit_amount: number | null
  deposit_paid: boolean | null
  payment_status: string | null
  scheduled_date: string | null
  additional_services: string[] | null
  industry_type: string | null
  employee_count: string | null
  current_location: string | null
  new_location: string | null
  target_move_date: string | null
  special_requirements: string[] | null
  project_description: string | null
  preferred_contact_time: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}
```

#### Voicemails Table

```typescript
interface Voicemail {
  id: string
  caller_number: string
  recording_url: string
  recording_sid: string
  duration: number
  transcription: string | null
  status: "new" | "listened" | "followed_up" | "archived"
  notes: string | null
  created_at: string
}
```

### 4.3 API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quote-assistant` | POST | AI chat completions |
| `/api/business-lookup` | GET | Australian Business Register lookup |
| `/api/availability` | GET | Fetch available booking dates |
| `/api/fleet-stats` | GET | Real-time fleet statistics |
| `/api/voicemails` | GET, PATCH | Voicemail management |
| `/api/voice/incoming` | POST | Twilio incoming call webhook |
| `/api/voice/voicemail` | POST | Twilio voicemail webhook |
| `/api/voice/transcription` | POST | Twilio transcription webhook |
| `/api/voice/status` | POST | Twilio call status webhook |
| `/api/stripe/webhook` | POST | Stripe checkout & payment webhooks |

### 4.4 Server Actions

| Action | File | Purpose |
|--------|------|---------|
| `submitLead` | `app/actions/leads.ts` | Create new lead |
| `getLeads` | `app/actions/leads.ts` | Fetch all leads |
| `updateLeadStatus` | `app/actions/leads.ts` | Update lead status |
| `updateLeadNotes` | `app/actions/leads.ts` | Update internal notes |
| `createDepositCheckoutSession` | `app/actions/stripe.ts` | Create Stripe checkout |
| `markDepositPaid` | `app/actions/stripe.ts` | Mark payment complete |

---

## 5. Design System

### 5.1 Visual Identity

- **Theme:** Dark mode by default (cyberpunk/tech aesthetic)
- **Primary Color:** Cyan/teal accent (`--primary`)
- **Secondary Color:** Green/lime accent (`--secondary`)
- **Accent Color:** Amber/orange (`--accent`)
- **Typography:**
  - Headers: Oxanium (geometric sans-serif)
  - Monospace: Source Code Pro
  - Body: Source Serif 4
- **Style:** Monospace code labels (e.g., `QUOTE_PROGRESS`, `OPERATIONAL_MODULES`)

### 5.2 UI Patterns

- Terminal-style status displays with command prompts
- Grid backgrounds with scanline effects
- Bordered cards with hover state transitions
- Progress bars for multi-step forms
- Badge indicators for status (color-coded)
- Square/angular design elements (minimal border-radius)

### 5.3 Component Library

Built on shadcn/ui with Radix primitives:
- Button, Input, Label, Textarea
- Card, Dialog, Sheet
- Select, Checkbox, Radio Group, Slider
- Tabs, Accordion, Collapsible
- Toast (Sonner), Tooltip
- Badge, Progress, Avatar

---

## 6. Current Gaps and Incomplete Features

### 6.1 Features Marked "Coming Soon"

| Feature | Section | Notes |
|---------|---------|-------|
| Real-Time Tracking | Tech Features | GPS tracking placeholder |
| AI Route Optimization | Tech Features | Route planning placeholder |
| Chain of Custody | Tech Features | Blockchain verification placeholder |
| Analytics Dashboard | Tech Features | Client portal placeholder |
| Client Testimonials | Testimonials | Awaiting first customer reviews |

### 6.2 Missing/Incomplete Functionality

| Item | Status | Impact |
|------|--------|--------|
| Availability API | Returns fallback dates | Not connected to real booking system |
| Fleet Stats API | Basic implementation | Needs real data source |
| Admin Authentication | Middleware exists | May need auth guards on routes |
| Mobile Responsiveness | Untested | May have layout issues on mobile |

> ✅ Stripe webhooks now confirm deposits asynchronously via `/api/stripe/webhook` (December 2025 release).
> ✅ Email notifications were implemented in December 2025 using Resend for both internal alerts and customer confirmations.

---

## 7. Recommendations for Future Development

### 7.1 High Priority (P0)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| Admin Authentication | 1 day | Security compliance |
| Calendar Integration | 2-3 days | Prevent double-bookings |

### 7.2 Medium Priority (P1)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| Customer Portal | 1 week | Self-service booking status |
| Real Testimonials | 2 days | Social proof, conversions |
| SEO Optimization | 2-3 days | Organic traffic |
| Performance Optimization | 1-2 days | User experience |

### 7.3 Low Priority (P2 - Future Roadmap)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| GPS Tracking | 2-3 weeks | Premium service offering |
| Client Analytics Dashboard | 2 weeks | Enterprise feature |
| Multi-language Support | 1 week | Market expansion |
| Mobile App | 4-6 weeks | Field operations |

---

## 8. Success Metrics

### 8.1 Conversion Funnel

```
Homepage Visits
    ↓
Quote Started (AI or Manual)
    ↓
Quote Completed
    ↓
Deposit Paid
    ↓
Move Completed
```

### 8.2 Key Performance Indicators (KPIs)

| Metric | Target | Current |
|--------|--------|---------|
| Lead generation rate | 10/week | TBD |
| Quote-to-booking conversion | 25% | TBD |
| Average deal value | $5,000 | TBD |
| Customer acquisition cost | <$500 | TBD |
| Customer satisfaction (NPS) | >50 | TBD |

### 8.3 Technical Metrics

| Metric | Target |
|--------|--------|
| Page Load Time (LCP) | <2.5s |
| Time to Interactive (TTI) | <3.5s |
| API Response Time | <500ms |
| Uptime | 99.9% |

---

## 9. Appendix

### 9.1 Environment Variables Required

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS="M&M Commercial Moving <notifications@m2mmoving.au>"
LEAD_NOTIFICATION_EMAILS=sales@m2mmoving.au

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+61...

# OpenAI
OPENAI_API_KEY=sk-...

# Vercel
VERCEL_URL=m2mmoving.au
```

### 9.2 File Structure

```
m2mmoving/
├── app/
│   ├── actions/           # Server actions
│   │   ├── auth.ts
│   │   ├── leads.ts
│   │   └── stripe.ts
│   ├── admin/             # Admin dashboard
│   │   ├── page.tsx
│   │   ├── settings/
│   │   └── voicemails/
│   ├── api/               # API routes
│   │   ├── availability/
│   │   ├── business-lookup/
│   │   ├── fleet-stats/
│   │   ├── quote-assistant/
│   │   ├── voice/
│   │   └── voicemails/
│   ├── auth/              # Authentication
│   │   ├── login/
│   │   └── logout/
│   ├── quote/             # Quote pages
│   │   ├── custom/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Feature components
├── lib/                   # Utilities
│   ├── supabase/
│   ├── stripe.ts
│   ├── twilio.ts
│   ├── types.ts
│   └── utils.ts
├── public/                # Static assets
├── styles/                # Additional styles
└── docs/                  # Documentation
    └── PRD.md            # This document
```

### 9.3 Contact Information

| Role | Contact |
|------|---------|
| Business Phone | 03 8820 1801 |
| Sales Email | sales@m2mmoving.au |
| Website | m2mmoving.au |
| Developer | Sharp Horizons Technology (sharphorizons.tech) |

### 9.4 Glossary

| Term | Definition |
|------|------------|
| ABN | Australian Business Number |
| Lead | Potential customer who has submitted a quote request |
| Instant Quote | Quote generated via AI assistant or quote builder |
| Custom Quote | Complex quote requiring manual assessment |
| Deposit | 50% upfront payment to confirm booking |

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**Prepared by:** Product Review  
**Status:** Approved

