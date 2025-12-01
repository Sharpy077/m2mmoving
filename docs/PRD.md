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
| Stripe Webhooks | Not implemented | Payment confirmation unreliable |
| Mobile Responsiveness | Untested | May have layout issues on mobile |

> ✅ Email notifications were implemented in December 2025 using Resend for both internal alerts and customer confirmations.

---

## 7. AI Salesforce Architecture

M&M Commercial Moving operates with an AI-first salesforce—a network of specialized AI agents that handle the entire customer lifecycle from awareness to advocacy. This autonomous system operates 24/7, scales infinitely, and maintains consistent quality at a fraction of traditional salesforce costs.

### 7.1 AI Salesforce Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI SALESFORCE COMMAND CENTER                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   AURORA    │  │   HUNTER    │  │    MAYA     │  │   SENTINEL  │       │
│  │  Marketing  │  │    Lead     │  │    Sales    │  │   Support   │       │
│  │   Agent     │  │    Agent    │  │    Agent    │  │    Agent    │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐       │
│  │   PHOENIX   │  │    ECHO     │  │   ORACLE    │  │    NEXUS    │       │
│  │  Retention  │  │ Reputation  │  │  Analytics  │  │ Coordinator │       │
│  │   Agent     │  │   Agent     │  │    Agent    │  │    Agent    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   CIPHER    │  │   BRIDGE    │  │   PRISM     │  │  GUARDIAN   │       │
│  │Competitive  │  │  Partner    │  │  Pricing    │  │ Compliance  │       │
│  │   Intel     │  │   Agent     │  │    Agent    │  │    Agent    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    CORTEX - Central AI Orchestrator                   │ │
│  │     Coordinates all agents • Maintains context • Resolves conflicts   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.2 Core Sales Agents (User Requested)

#### 7.2.1 AURORA - Marketing Agent

**Codename:** `AURORA_MKT`  
**Purpose:** Autonomous content creation, campaign management, and brand amplification  
**Status:** 🔴 Planned

| Capability | Description | Integration |
|------------|-------------|-------------|
| **Content Generation** | Blog posts, landing pages, email sequences, ad copy | OpenAI GPT-4o, Claude |
| **Social Media Management** | Post scheduling, engagement, trend monitoring | LinkedIn, Facebook, Instagram APIs |
| **SEO Optimization** | Keyword research, meta optimization, content strategy | Ahrefs/SEMrush API |
| **Email Marketing** | Drip campaigns, newsletters, A/B testing | Resend, Mailchimp |
| **Ad Campaign Management** | Google Ads, Meta Ads optimization | Google Ads API, Meta Marketing API |
| **Visual Content** | Image generation for posts, infographics | DALL-E, Midjourney |

**Autonomous Workflows:**
```
AURORA_MKT.workflows = {
  daily: [
    "Generate 3 social media posts for each platform",
    "Respond to comments and mentions",
    "Monitor brand mentions across web"
  ],
  weekly: [
    "Publish SEO-optimized blog post",
    "Send newsletter to subscriber list",
    "Analyze ad performance and reallocate budget",
    "Generate weekly marketing report"
  ],
  monthly: [
    "Comprehensive SEO audit",
    "Content calendar planning",
    "Competitor content analysis"
  ],
  triggered: [
    "New testimonial → Create social proof content",
    "Industry news → Create thought leadership piece",
    "Low engagement → A/B test new approaches"
  ]
}
```

**Sample Tools:**
| Tool | Purpose |
|------|---------|
| `generateBlogPost` | Create SEO-optimized blog content |
| `schedulePost` | Queue social media content |
| `analyzePerformance` | Get campaign analytics |
| `optimizeAds` | Adjust ad spend based on ROAS |
| `generateEmailSequence` | Create nurture campaign |

---

#### 7.2.2 HUNTER - Lead Generation Agent

**Codename:** `HUNTER_LG`  
**Purpose:** Proactive prospect identification and outreach automation  
**Status:** 🔴 Planned

| Capability | Description | Integration |
|------------|-------------|-------------|
| **Prospect Identification** | Identify businesses likely to relocate | ABR API, LinkedIn Sales Nav |
| **Intent Signal Monitoring** | Track commercial real estate listings, lease expirations | Domain.com.au, REA API |
| **Outbound Sequences** | Personalized cold outreach campaigns | Email, LinkedIn, SMS |
| **Data Enrichment** | Company info, decision-maker identification | Apollo, Clearbit |
| **Lead Scoring** | ML-based qualification scoring | Custom model |
| **Meeting Scheduling** | Autonomous calendar booking | Cal.com, Calendly |

**Intent Signals Monitored:**
```typescript
interface IntentSignal {
  type: 
    | "commercial_lease_listing"    // New office listed for lease
    | "lease_expiration"            // Lease ending within 6 months
    | "hiring_surge"                // Rapid headcount growth
    | "funding_announcement"        // Series A, B, C funding
    | "office_renovation"           // Permits filed
    | "expansion_news"              // Press releases
    | "competitor_mention"          // Searched for moving services
    | "linkedin_job_post"           // Facilities/office manager hire
  confidence: number               // 0-100
  source: string
  company: CompanyProfile
  timing: "immediate" | "near_term" | "future"
}
```

**Outreach Templates:**
- Cold email sequences (5-touch)
- LinkedIn connection + InMail sequence
- Direct mail trigger (high-value prospects)
- Phone call scripts for human follow-up

**Sample Tools:**
| Tool | Purpose |
|------|---------|
| `scanRealEstateListings` | Monitor commercial property moves |
| `enrichCompanyData` | Get firmographics and contacts |
| `scoreLead` | Calculate lead quality score |
| `sendOutboundEmail` | Execute personalized outreach |
| `scheduleFollowUp` | Auto-schedule next touch |
| `findDecisionMaker` | Identify facility managers, office managers |

---

#### 7.2.3 MAYA - Sales Agent (Enhanced)

**Codename:** `MAYA_SALES`  
**Purpose:** Full-cycle sales from qualification to close  
**Status:** 🟡 Partial (Quote assistant exists, expanding to full sales)

| Capability | Description | Integration |
|------------|-------------|-------------|
| **Quote Generation** | ✅ Existing - instant quotes | OpenAI, Stripe |
| **Qualification** | BANT scoring, needs analysis | CRM integration |
| **Objection Handling** | Trained responses for common objections | Knowledge base |
| **Proposal Generation** | Custom proposal documents | PDF generation |
| **Contract Negotiation** | Price negotiation within parameters | Business rules engine |
| **Follow-Up Cadence** | Automated touch-point management | Email, SMS, Voice |
| **Upselling** | Recommend additional services | ML recommendations |

**Sales Playbook Automation:**
```typescript
interface SalesPlaybook {
  stage: "discovery" | "qualification" | "proposal" | "negotiation" | "closing"
  
  discovery: {
    questions: [
      "What's driving your decision to relocate?",
      "What's your timeline looking like?",
      "Who else is involved in this decision?",
      "Have you moved offices before? What worked/didn't?"
    ]
    objectionHandlers: Map<string, string>
  }
  
  qualification: {
    budget_check: "Confirm budget range aligns with estimate"
    authority_check: "Identify all decision makers"
    need_check: "Validate move is necessary and urgent"
    timeline_check: "Confirm realistic timeline"
  }
  
  proposal: {
    template: "dynamic based on service mix"
    customization: "company logo, specific requirements"
    validity: "14 days"
  }
  
  negotiation: {
    max_discount: 10  // percentage
    approval_required_above: 15  // escalate to human
    value_adds: ["free packing materials", "extended insurance", "priority scheduling"]
  }
  
  closing: {
    deposit_required: 50  // percentage
    contract_type: "digital signature"
    onboarding_handoff: "NEXUS_OPS"
  }
}
```

**Enhanced Tools:**
| Tool | Purpose |
|------|---------|
| `qualifyLead` | BANT scoring and qualification |
| `generateProposal` | Create custom proposal PDF |
| `handleObjection` | Match objection to best response |
| `negotiatePrice` | Apply discounts within parameters |
| `sendContract` | Generate and send digital contract |
| `scheduleCallBack` | Book human sales call if needed |

---

#### 7.2.4 SENTINEL - Customer Support Agent

**Codename:** `SENTINEL_CS`  
**Purpose:** 24/7 customer support, issue resolution, and satisfaction management  
**Status:** 🔴 Planned

| Capability | Description | Integration |
|------------|-------------|-------------|
| **Inquiry Handling** | Answer questions via chat, email, phone | Multi-channel |
| **Booking Management** | Reschedule, modify, cancel bookings | Supabase, Calendar |
| **Issue Resolution** | Handle complaints, damages, delays | Ticketing system |
| **Status Updates** | Proactive move status notifications | SMS, Email |
| **FAQ Automation** | Instant answers to common questions | Knowledge base |
| **Escalation Management** | Route complex issues to humans | Workflow engine |
| **CSAT Collection** | Post-interaction surveys | Survey tools |

**Support Tiers:**
```
Tier 0: Self-Service
├── FAQ chatbot
├── Booking portal
├── Status tracking
└── Document downloads

Tier 1: AI Agent (SENTINEL)
├── Complex inquiries
├── Booking modifications
├── Minor issue resolution
├── Proactive outreach
└── Sentiment monitoring

Tier 2: Human Escalation
├── Damage claims > $500
├── Negative sentiment detected
├── Legal/compliance issues
├── VIP customers
└── Agent requested escalation
```

**Sample Tools:**
| Tool | Purpose |
|------|---------|
| `getBookingStatus` | Retrieve move status |
| `modifyBooking` | Reschedule or update booking |
| `fileComplaint` | Create support ticket |
| `offerCompensation` | Approve goodwill gestures |
| `escalateToHuman` | Route to human agent |
| `sendStatusUpdate` | Proactive notification |

---

### 7.3 Extended AI Agent Network (Suggested Additions)

#### 7.3.1 PHOENIX - Retention & Loyalty Agent

**Codename:** `PHOENIX_RET`  
**Purpose:** Customer re-engagement, referral programs, and lifetime value maximization  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Win-Back Campaigns** | Re-engage churned or dormant customers |
| **Referral Program** | Automated referral tracking and rewards |
| **Anniversary Outreach** | "1 year since your move" campaigns |
| **Cross-Sell Campaigns** | Storage, cleaning, IT services |
| **Loyalty Rewards** | Points/discount program management |
| **NPS Follow-Up** | Convert detractors, amplify promoters |

**Retention Triggers:**
```typescript
const retentionTriggers = {
  "move_completed": {
    "+7_days": "Send satisfaction survey",
    "+30_days": "Request Google review",
    "+90_days": "Referral program invitation",
    "+365_days": "Anniversary check-in"
  },
  "nps_score": {
    "promoter_9_10": "Request testimonial + referral",
    "passive_7_8": "Offer incentive for next service",
    "detractor_0_6": "Escalate to human + recovery offer"
  },
  "inactivity": {
    "180_days": "Re-engagement email sequence",
    "365_days": "Win-back offer"
  }
}
```

---

#### 7.3.2 ECHO - Reputation Management Agent

**Codename:** `ECHO_REP`  
**Purpose:** Online reputation monitoring, review generation, and brand sentiment analysis  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Review Monitoring** | Track Google, Facebook, ProductReview, TrustPilot |
| **Review Response** | Automated, personalized review responses |
| **Review Generation** | Request reviews from satisfied customers |
| **Sentiment Analysis** | Real-time brand sentiment tracking |
| **Social Listening** | Monitor mentions across social platforms |
| **Crisis Detection** | Alert on negative viral content |

**Review Response Matrix:**
| Rating | Response Strategy |
|--------|-------------------|
| 5 stars | Thank, highlight specific praise, invite referral |
| 4 stars | Thank, address any minor concerns, request feedback |
| 3 stars | Apologize, offer to make it right, take offline |
| 1-2 stars | Immediate escalation + human response within 2hrs |

---

#### 7.3.3 ORACLE - Analytics & Insights Agent

**Codename:** `ORACLE_ANL`  
**Purpose:** Business intelligence, forecasting, and strategic recommendations  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Performance Dashboards** | Real-time KPI tracking |
| **Revenue Forecasting** | ML-based revenue predictions |
| **Pipeline Analysis** | Deal stage health and velocity |
| **Attribution Modeling** | Marketing channel effectiveness |
| **Anomaly Detection** | Alert on unusual patterns |
| **Strategic Recommendations** | AI-generated insights and actions |

**Sample Insights Generated:**
```
[ORACLE] Weekly Insight Report - December 2025

📈 OPPORTUNITIES
• Lead volume up 23% WoW - attributable to LinkedIn campaign
• Data center moves converting at 45% (vs 25% avg) - increase ad spend
• Thursday-Friday quote requests have highest close rate

⚠️ ALERTS  
• Pipeline velocity slowed by 2.3 days - investigate follow-up delays
• Customer acquisition cost up 15% - recommend pausing underperforming ads
• 3 high-value deals stalled >14 days - recommend outreach

🎯 RECOMMENDATIONS
1. Shift 20% of Google Ads budget to LinkedIn (higher ROAS)
2. Implement 48hr follow-up SLA for quotes >$10K
3. Launch retargeting campaign for abandoned quotes
```

---

#### 7.3.4 NEXUS - Operations Coordinator Agent

**Codename:** `NEXUS_OPS`  
**Purpose:** Scheduling optimization, resource allocation, and operational efficiency  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Schedule Optimization** | AI-powered job scheduling |
| **Route Planning** | Multi-stop route optimization |
| **Crew Assignment** | Match crew skills to job requirements |
| **Equipment Allocation** | Truck and equipment management |
| **Customer Communication** | Day-of coordination and updates |
| **Contingency Planning** | Weather delays, traffic adjustments |

**Scheduling Algorithm:**
```typescript
interface SchedulingFactors {
  job_duration: number           // Estimated hours
  travel_time: number            // Between jobs
  crew_skills: string[]          // Required certifications
  equipment_needs: string[]      // Truck size, dollies, lifts
  customer_preference: TimeSlot  // Preferred timing
  profitability: number          // Revenue per hour
  location_clustering: boolean   // Group nearby jobs
  weather_forecast: WeatherData  // Rain/heat warnings
}
```

---

#### 7.3.5 CIPHER - Competitive Intelligence Agent

**Codename:** `CIPHER_CI`  
**Purpose:** Market monitoring, competitor tracking, and strategic positioning  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Competitor Pricing** | Monitor competitor rates and offers |
| **Market Trends** | Track commercial real estate activity |
| **Win/Loss Analysis** | Understand why deals won or lost |
| **Feature Comparison** | Maintain competitive feature matrix |
| **Opportunity Alerts** | Identify market gaps and opportunities |

**Intelligence Sources:**
- Competitor websites (pricing, services, testimonials)
- Job boards (hiring = growth indicator)
- Press releases and news
- Google Ads auction insights
- Social media activity
- Customer feedback on competitors

---

#### 7.3.6 BRIDGE - Partner & Vendor Agent

**Codename:** `BRIDGE_PRT`  
**Purpose:** Supplier relationships, partnership development, and vendor management  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Vendor Communication** | Automated PO, invoicing, queries |
| **Partnership Outreach** | Identify and approach strategic partners |
| **Referral Network** | Real estate agents, fit-out companies |
| **Supplier Negotiations** | Price comparisons, contract renewals |
| **Compliance Tracking** | Insurance, certifications, SLAs |

**Partner Categories:**
- Commercial real estate agents (referral partners)
- Office fit-out companies (mutual referrals)
- IT service providers (co-selling)
- Storage facilities (overflow capacity)
- Cleaning services (bundled offerings)

---

#### 7.3.7 PRISM - Dynamic Pricing Agent

**Codename:** `PRISM_PRC`  
**Purpose:** Real-time price optimization based on demand, capacity, and market conditions  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Demand Pricing** | Surge pricing during peak periods |
| **Capacity Optimization** | Discount slow periods to fill capacity |
| **Competitive Pricing** | React to competitor price changes |
| **Margin Protection** | Ensure minimum profitability |
| **Bundle Optimization** | Optimal service package pricing |

**Pricing Variables:**
```typescript
interface PricingEngine {
  base_rate: number
  
  multipliers: {
    demand: number        // 0.8 - 1.5 based on booking volume
    lead_time: number     // Higher for urgent, lower for advance
    distance: number      // Distance-based tiers
    complexity: number    // Service difficulty
    time_of_week: number  // Weekday vs weekend
    seasonality: number   // End of month/quarter premium
    capacity: number      // Available crew/trucks
  }
  
  constraints: {
    min_margin: 0.25           // Never go below 25% margin
    max_surge: 1.5             // Cap at 150% of base
    price_change_frequency: "daily"
    competitor_match: boolean  // Match competitor prices?
  }
}
```

---

#### 7.3.8 GUARDIAN - Compliance & Quality Agent

**Codename:** `GUARDIAN_QA`  
**Purpose:** Service quality monitoring, regulatory compliance, and risk management  
**Status:** 🔴 Planned

| Capability | Description |
|------------|-------------|
| **Quality Audits** | Post-move quality checks |
| **Compliance Monitoring** | Insurance, licenses, OH&S |
| **Documentation** | Auto-generate compliance reports |
| **Risk Assessment** | Flag high-risk jobs for review |
| **Training Recommendations** | Identify crew training needs |
| **Incident Management** | Log and track incidents |

**Compliance Checklist Automation:**
- [ ] Public liability insurance current
- [ ] Workers compensation valid
- [ ] Vehicle registrations current
- [ ] Driver licenses verified
- [ ] OH&S certifications up to date
- [ ] Customer contracts signed
- [ ] Payment terms acknowledged

---

### 7.4 Central Orchestrator - CORTEX

**Codename:** `CORTEX_MAIN`  
**Purpose:** Coordinate all AI agents, maintain shared context, resolve conflicts, and ensure cohesive operation  
**Status:** 🔴 Planned

```typescript
interface CortexOrchestrator {
  // Shared memory and context
  memory: {
    customer_profiles: Map<string, CustomerProfile>
    conversation_history: Map<string, Message[]>
    business_rules: BusinessRules
    performance_metrics: Metrics
  }
  
  // Agent coordination
  coordination: {
    handoff_protocols: AgentHandoff[]    // How agents pass work
    conflict_resolution: ConflictRules   // When agents disagree
    priority_queue: TaskQueue            // What gets done first
    load_balancing: LoadBalancer         // Distribute work
  }
  
  // Human escalation
  escalation: {
    triggers: EscalationTrigger[]
    routing: EscalationRoutes
    sla: ServiceLevelAgreements
  }
  
  // Learning and improvement
  learning: {
    feedback_loop: FeedbackProcessor
    a_b_testing: ExperimentEngine
    model_updates: ModelVersioning
  }
}
```

**Agent Communication Protocol:**
```
[HUNTER] → [CORTEX] "New qualified lead: ABC Corp, score 85"
[CORTEX] → [MAYA] "Engage lead: ABC Corp, context attached"
[MAYA] → [CORTEX] "Quote sent: $12,500, awaiting response"
[CORTEX] → [ORACLE] "Log opportunity: ABC Corp, $12,500, stage: proposal"
[MAYA] → [CORTEX] "Deal won! Customer booked for Dec 15"
[CORTEX] → [NEXUS] "Schedule job: ABC Corp, Dec 15, requirements attached"
[CORTEX] → [SENTINEL] "Customer onboarded: ABC Corp, enable support"
[CORTEX] → [PHOENIX] "Add to retention queue: ABC Corp, move date Dec 15"
```

---

### 7.5 AI Salesforce Implementation Roadmap

| Phase | Agents | Timeline | Priority |
|-------|--------|----------|----------|
| **Phase 1: Foundation** | MAYA (enhanced), SENTINEL | Q1 2026 | P0 |
| **Phase 2: Growth** | HUNTER, AURORA | Q2 2026 | P0 |
| **Phase 3: Intelligence** | ORACLE, PRISM | Q2 2026 | P1 |
| **Phase 4: Operations** | NEXUS, GUARDIAN | Q3 2026 | P1 |
| **Phase 5: Ecosystem** | PHOENIX, ECHO, CIPHER, BRIDGE | Q3-Q4 2026 | P2 |
| **Phase 6: Orchestration** | CORTEX | Q4 2026 | P1 |

---

### 7.6 Technology Stack for AI Agents

| Component | Technology | Purpose |
|-----------|------------|---------|
| **LLM Backbone** | OpenAI GPT-4o, Claude 3.5 | Core reasoning |
| **Agent Framework** | LangChain / CrewAI / AutoGen | Multi-agent orchestration |
| **Vector Database** | Pinecone / Supabase pgvector | Long-term memory |
| **Workflow Engine** | Temporal / Inngest | Reliable task execution |
| **Communication** | Twilio, Resend, LinkedIn API | Multi-channel outreach |
| **Analytics** | PostHog, Mixpanel | Agent performance tracking |
| **Monitoring** | Langfuse, Helicone | LLM observability |

---

### 7.7 AI Salesforce KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Lead Response Time** | <5 min | Time from inquiry to first contact |
| **Qualification Accuracy** | >85% | Leads correctly qualified |
| **Quote Conversion** | 30% | Quotes that become bookings |
| **Customer Satisfaction** | >4.5/5 | Post-interaction CSAT |
| **Support Resolution** | >80% auto | Issues resolved without human |
| **Cost per Lead** | <$50 | Total marketing spend / leads |
| **Agent Uptime** | 99.9% | System availability |
| **Escalation Rate** | <15% | Interactions requiring human |

---

### 7.8 Human-in-the-Loop Design

The AI Salesforce is designed with strategic human oversight points:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUMAN OVERSIGHT DASHBOARD                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPROVAL QUEUE                    ESCALATION INBOX             │
│  ├── Discounts > 15%               ├── Negative sentiment       │
│  ├── Custom pricing                ├── Damage claims            │
│  ├── Non-standard terms            ├── Legal questions          │
│  └── Enterprise deals              └── VIP requests             │
│                                                                 │
│  QUALITY REVIEW                    TRAINING & FEEDBACK          │
│  ├── Random interaction audit      ├── Mark good examples       │
│  ├── Flagged conversations         ├── Correct mistakes         │
│  └── Weekly performance review     └── Update knowledge base    │
│                                                                 │
│  STRATEGY CONTROL                  OVERRIDE CONTROLS            │
│  ├── Pricing rules                 ├── Pause/resume agents      │
│  ├── Outreach templates            ├── Manual takeover          │
│  ├── Qualification criteria        └── Emergency stop           │
│  └── Campaign approvals                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Traditional Development Recommendations

### 8.1 High Priority (P0)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| Stripe Webhooks | 1 day | Payment reliability |
| Admin Authentication | 1 day | Security compliance |
| Calendar Integration | 2-3 days | Prevent double-bookings |

### 8.2 Medium Priority (P1)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| Customer Portal | 1 week | Self-service booking status |
| Real Testimonials | 2 days | Social proof, conversions |
| SEO Optimization | 2-3 days | Organic traffic |
| Performance Optimization | 1-2 days | User experience |

### 8.3 Low Priority (P2 - Future Roadmap)

| Feature | Effort | Business Value |
|---------|--------|----------------|
| GPS Tracking | 2-3 weeks | Premium service offering |
| Client Analytics Dashboard | 2 weeks | Enterprise feature |
| Multi-language Support | 1 week | Market expansion |
| Mobile App | 4-6 weeks | Field operations |

---

## 9. Success Metrics

### 9.1 Conversion Funnel

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

### 9.2 Key Performance Indicators (KPIs)

| Metric | Target | Current |
|--------|--------|---------|
| Lead generation rate | 10/week | TBD |
| Quote-to-booking conversion | 25% | TBD |
| Average deal value | $5,000 | TBD |
| Customer acquisition cost | <$500 | TBD |
| Customer satisfaction (NPS) | >50 | TBD |

### 9.3 Technical Metrics

| Metric | Target |
|--------|--------|
| Page Load Time (LCP) | <2.5s |
| Time to Interactive (TTI) | <3.5s |
| API Response Time | <500ms |
| Uptime | 99.9% |

---

## 10. Appendix

### 10.1 Environment Variables Required

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS="M&M Commercial Moving <notifications@m2mmoving.au>"
LEAD_NOTIFICATION_EMAILS=sales@m2mmoving.au
MONITORING_ALERT_EMAILS=admin@m2mmoving.au

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

### 10.2 File Structure

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

### 10.3 Contact Information

| Role | Contact |
|------|---------|
| Business Phone | 03 8820 1801 |
| Sales Email | sales@m2mmoving.au |
| Website | m2mmoving.au |
| Developer | Sharp Horizons Technology (sharphorizons.tech) |

### 10.4 Glossary

| Term | Definition |
|------|------------|
| ABN | Australian Business Number |
| Lead | Potential customer who has submitted a quote request |
| Instant Quote | Quote generated via AI assistant or quote builder |
| Custom Quote | Complex quote requiring manual assessment |
| Deposit | 50% upfront payment to confirm booking |
| AI Salesforce | Network of AI agents handling customer lifecycle |
| CORTEX | Central AI orchestrator coordinating all agents |

---

**Document Version:** 2.0  
**Last Updated:** December 1, 2025  
**Prepared by:** Product Review  
**Status:** Approved - AI Salesforce Architecture Added

