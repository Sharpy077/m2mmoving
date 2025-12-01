# M&M Commercial Moving - Feature Documentation

**Last Updated:** December 2025  
**Version:** 2.0

---

## Table of Contents

1. [User-Side Features](#user-side-features)
2. [Admin-Side Features](#admin-side-features)
3. [API Endpoints](#api-endpoints)
4. [Security Features](#security-features)
5. [Integration Features](#integration-features)

---

## User-Side Features

### 1. Homepage & Landing Page

**Location:** `app/page.tsx`

**Components:**
- **Navbar** (`components/navbar.tsx`)
  - Fixed header navigation
  - Phone CTA button (03 8820 1801)
  - Quote button linking to `/quote`
  - Responsive design

- **Hero Section** (`components/hero-section.tsx`)
  - Main headline and value propositions
  - Embedded AI quote assistant (Maya)
  - Call-to-action buttons

- **Trust Bar** (`components/trust-bar.tsx`)
  - Credibility indicators
  - Insurance coverage display
  - Service guarantees

- **Stats Section** (`components/stats-section.tsx`)
  - Dynamic statistics:
    - Completed relocations: 2
    - Damage claims: $0
    - Average response time: 48 hours
    - Customer satisfaction: 100%

- **Services Section** (`components/services-section.tsx`)
  - 4 service cards:
    - Office Relocation
    - Data Center Migration
    - IT Equipment Transport
    - Warehouse Relocation

- **Tech Features Section** (`components/tech-features-section.tsx`)
  - 4 features (marked "Coming Soon"):
    - Real-Time Tracking
    - AI Route Optimization
    - Chain of Custody
    - Analytics Dashboard

- **Testimonials Section** (`components/testimonials-section.tsx`)
  - Placeholder for customer testimonials

- **CTA Section** (`components/cta-section.tsx`)
  - Final call-to-action
  - Quote request button

- **Footer** (`components/footer.tsx`)
  - Contact information
  - Company details (ABN: 71 661 027 309)
  - Navigation links

- **Floating CTA** (`components/floating-cta.tsx`)
  - Persistent quote button
  - Scroll-aware visibility

**Features:**
- ✅ Responsive design
- ✅ Dark theme by default
- ✅ SEO optimized metadata
- ✅ Analytics integration (Vercel Analytics)

---

### 2. AI Quote Assistant (Maya)

**Location:** `components/quote-assistant.tsx`  
**API:** `app/api/quote-assistant/route.ts`

**Capabilities:**
- Natural language conversation flow
- Business lookup via Australian Business Register (ABN/name)
- Service type selection (5 options)
- Qualifying questions based on service type
- Quote calculation with detailed breakdown
- Availability calendar integration
- Contact information collection
- Stripe payment integration (50% deposit)
- Voice input/output support (Web Speech API)
- Error handling with fallback to phone

**Conversation Flow:**
1. Welcome & business identification
2. Business confirmation
3. Service type selection
4. Qualifying questions
5. Location collection (origin/destination)
6. Quote calculation
7. Date selection
8. Contact information
9. Payment processing
10. Booking confirmation

**AI Tools:**
- `lookupBusiness` - ABN/business name lookup
- `confirmBusiness` - Confirm selected business
- `showServiceOptions` - Display service picker
- `checkAvailability` - Fetch available dates
- `confirmBookingDate` - Lock in selected date
- `calculateQuote` - Generate pricing estimate
- `collectContactInfo` - Gather customer details
- `initiatePayment` - Show Stripe payment form
- `requestCallback` - Schedule phone callback

**UI Modes:**
- Floating chat widget (default)
- Embedded mode (in hero section)
- Minimizable/maximizable

**Features:**
- ✅ Real-time streaming responses
- ✅ Voice input/output
- ✅ Progress indicator
- ✅ Interactive service picker
- ✅ Calendar date selection
- ✅ Payment integration
- ✅ Error recovery

---

### 3. Manual Quote Builder

**Location:** `app/quote/page.tsx`  
**Component:** `components/quote-builder.tsx`

**3-Step Wizard:**

**Step 1: Select Service**
- Move type cards with expandable details:
  - Office Relocation (OFF-REL)
  - Data Center Migration (DC-MIG)
  - IT Equipment Transport (IT-TRN)
- Each card shows:
  - Base rate
  - Minimum requirements
  - What's included
  - Ideal for
  - Typical duration

**Step 2: Configure**
- Location inputs:
  - Origin suburb
  - Destination suburb
  - Estimated distance (km)
- Square meters slider:
  - Dynamic minimum per service type
  - Maximum: 2000 sqm
  - Real-time validation
- Additional services checkboxes:
  - Professional Packing ($450)
  - Temporary Storage ($300/week)
  - Post-Move Cleaning ($350)
  - Premium Insurance ($200)
  - After Hours Service ($500)
  - IT Setup Assistance ($600)

**Step 3: Confirm**
- Estimate display with breakdown
- Contact form:
  - Email (required)
  - Phone
  - Contact name
  - Company name
- Submit to create lead
- Optional deposit payment

**Pricing Logic:**
- Base rate + (sqm × per sqm rate) + distance cost + additional services
- Minimum sqm enforcement
- Real-time calculation

**Features:**
- ✅ Progress indicator
- ✅ Form validation
- ✅ Real-time price calculation
- ✅ Deposit payment option
- ✅ Lead submission
- ✅ Email notifications

---

### 4. Custom Quote Form

**Location:** `app/quote/custom/page.tsx`  
**Component:** `components/custom-quote-form.tsx`

**Fields:**
- Contact Information:
  - Name
  - Company
  - Email
  - Phone
- Business Profile:
  - Industry type
  - Employee count
- Locations:
  - Current address
  - New address
- Move Details:
  - Target date
  - Estimated square meters
- Special Requirements (checkboxes):
  - Server room
  - Medical equipment
  - Hazmat materials
  - Security items
  - Artwork
  - Weekend-only access
  - Staged relocation
  - International move
- Project Description (textarea)

**Features:**
- ✅ Comprehensive form validation
- ✅ Special requirements tracking
- ✅ Lead submission
- ✅ Email notifications

---

## Admin-Side Features

### 1. Admin Dashboard

**Location:** `app/admin/page.tsx`  
**Component:** `components/admin-dashboard.tsx`

**Statistics Cards:**
- Total Leads
- New Leads
- Pipeline Value (sum of estimated totals)
- This Week (leads created in last 7 days)

**Filters:**
- Search by name, email, or company
- Status filter (new, contacted, quoted, won, lost)
- Type filter (instant_quote, custom_quote)

**Leads Table:**
- Sortable columns:
  - Date
  - Contact
  - Type
  - Move details
  - Value
  - Status
- Inline status update dropdown
- Click row to view details

**Lead Detail Modal:**
- Contact Information:
  - Email (clickable mailto)
  - Phone (clickable tel)
  - Company name
  - Submission date
- Move Details:
  - Move type
  - Estimated value
  - Origin/destination
  - Square meters
  - Target date
- Additional Services/Requirements:
  - Badge display
- Project Description:
  - Full text display
- Internal Notes:
  - Editable textarea
  - Save button
- Status Update:
  - Quick action buttons
  - Status workflow buttons

**Features:**
- ✅ Real-time statistics
- ✅ Advanced filtering
- ✅ Inline editing
- ✅ Status workflow management
- ✅ Notes management
- ✅ Responsive table

---

### 2. Voicemail Management

**Location:** `app/admin/voicemails/page.tsx`  
**Component:** `components/voicemails-dashboard.tsx`  
**API:** `app/api/voicemails/route.ts`

**Statistics:**
- New Messages count
- Listened count
- Followed Up count

**Filter Tabs:**
- All
- New
- Listened
- Followed Up
- Archived

**Voicemail List:**
- Caller number
- Status badge
- Date/time received
- Duration
- Transcription preview (if available)
- Play button (opens recording URL)

**Voicemail Detail Modal:**
- Full caller information
- Audio player
- Full transcription
- Status update buttons:
  - Mark Listened
  - Followed Up
  - Archive

**Features:**
- ✅ Status tracking
- ✅ Audio playback
- ✅ Transcription display
- ✅ Status workflow
- ✅ Filtering

---

### 3. Admin Authentication

**Location:** `app/auth/login/page.tsx`  
**Action:** `app/actions/auth.ts`

**Login Form:**
- Email input
- Password input
- Error display
- Loading state
- Redirect to `/admin` on success

**Logout:**
- Route: `app/auth/logout/route.ts`
- Clears session
- Redirects to homepage

**Security:**
- Supabase Auth integration
- Server-side validation
- Session management

**Features:**
- ✅ Secure authentication
- ✅ Error handling
- ✅ Session management
- ✅ Redirect handling

---

### 4. Admin Settings (Placeholder)

**Location:** `app/admin/settings/page.tsx`

**Status:** Placeholder page exists, functionality to be implemented

---

## API Endpoints

### Public APIs

#### 1. Quote Assistant
- **Route:** `POST /api/quote-assistant`
- **Purpose:** AI chat completions for quote assistant
- **Input:** Messages array
- **Output:** Streaming text response with tool calls
- **Features:**
  - OpenAI GPT-4o integration
  - Tool-based conversation flow
  - Message validation

#### 2. Business Lookup
- **Route:** `GET /api/business-lookup?q={query}&type={name|abn}`
- **Purpose:** Australian Business Register lookup
- **Input:** Query string and type
- **Output:** Business results array
- **Features:**
  - ABN validation
  - Name search
  - JSONP parsing

#### 3. Availability
- **Route:** `GET /api/availability?start={date}&end={date}`
- **Purpose:** Fetch available booking dates
- **Input:** Start and end dates
- **Output:** Availability array
- **Features:**
  - Database integration
  - Fallback date generation
  - Weekend filtering

#### 4. Fleet Stats
- **Route:** `GET /api/fleet-stats`
- **Purpose:** Real-time fleet statistics
- **Status:** Basic implementation

### Admin APIs

#### 5. Voicemails
- **Route:** `GET /api/voicemails`
- **Purpose:** Fetch all voicemails
- **Output:** Voicemails array

- **Route:** `PATCH /api/voicemails`
- **Purpose:** Update voicemail status/notes
- **Input:** `{ id, status?, notes? }`
- **Output:** Success boolean

### Webhook APIs

#### 6. Stripe Webhook
- **Route:** `POST /api/stripe/webhook`
- **Purpose:** Handle Stripe payment events
- **Events:**
  - `checkout.session.completed` - Update lead payment status
  - `payment_intent.succeeded` - Log successful payment
  - `payment_intent.payment_failed` - Log failed payment
- **Security:** Signature verification

#### 7. Twilio Voice Webhooks
- **Route:** `POST /api/voice/incoming` - Incoming call handler
- **Route:** `POST /api/voice/voicemail` - Voicemail recording handler
- **Route:** `POST /api/voice/transcription` - Transcription handler
- **Route:** `POST /api/voice/status` - Call status handler

---

## Server Actions

### Lead Management
**File:** `app/actions/leads.ts`

- `submitLead(data: LeadInsert)`
  - Creates new lead in database
  - Sends email notifications (internal + customer)
  - Returns success/error

- `getLeads()`
  - Fetches all leads
  - Ordered by created_at desc
  - Returns leads array

- `updateLeadStatus(id: string, status: string)`
  - Updates lead status
  - Returns success/error

- `updateLeadNotes(id: string, notes: string)`
  - Updates internal notes
  - Returns success/error

### Payment Processing
**File:** `app/actions/stripe.ts`

- `createDepositCheckoutSession(leadId, amount, email)`
  - Creates Stripe checkout session
  - Updates lead with payment info
  - Returns client secret

- `markDepositPaid(leadId: string)`
  - Updates lead payment status
  - Sets deposit_paid = true
  - Updates status to "quoted"

- `createDepositCheckout({ amount, customerEmail, ... })`
  - Creates checkout without lead ID
  - Returns client secret

### Authentication
**File:** `app/actions/auth.ts`

- `loginAction(formData: FormData)`
  - Validates email/password
  - Signs in via Supabase Auth
  - Redirects to /admin on success

- `logoutAction()`
  - Signs out user
  - Redirects to homepage

---

## Security Features

### 1. Authentication
- Supabase Auth integration
- Server-side session validation
- Protected admin routes (middleware)

### 2. Data Validation
- Server action input validation
- TypeScript type safety
- Zod schema validation (where applicable)

### 3. API Security
- Stripe webhook signature verification
- Server-only actions
- Environment variable protection

### 4. Input Sanitization
- Form data validation
- SQL injection prevention (Supabase)
- XSS prevention (React)

---

## Integration Features

### 1. Email (Resend)
- Lead notification emails (internal)
- Customer confirmation emails
- Configurable recipients

### 2. Payments (Stripe)
- Embedded checkout
- 50% deposit collection
- Webhook integration
- Payment status tracking

### 3. Voice (Twilio)
- Incoming call handling
- Voicemail recording
- Transcription
- Status tracking

### 4. Database (Supabase)
- Leads table
- Voicemails table
- Availability table
- Real-time subscriptions (potential)

### 5. AI (OpenAI)
- GPT-4o for quote assistant
- Vercel AI SDK
- Tool-based function calling

---

## Feature Status Summary

### ✅ Completed Features
- Homepage with all sections
- AI Quote Assistant (Maya)
- Manual Quote Builder
- Custom Quote Form
- Admin Dashboard
- Voicemail Management
- Admin Authentication
- Email Notifications
- Stripe Payment Integration
- Business Lookup API
- Availability API

### 🟡 Partial Features
- Fleet Stats API (basic implementation)
- Admin Settings (placeholder)

### 🔴 Planned Features
- Real-Time Tracking
- AI Route Optimization
- Chain of Custody
- Analytics Dashboard
- Client Testimonials
- Customer Portal
- Calendar Integration (prevent double-bookings)

---

## Technical Stack

- **Framework:** Next.js 16.0.3
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.x
- **Components:** shadcn/ui (Radix primitives)
- **Database:** Supabase
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **AI:** OpenAI GPT-4o via Vercel AI SDK
- **Voice/SMS:** Twilio
- **Email:** Resend
- **Analytics:** Vercel Analytics
- **Testing:** Vitest

---

**End of Feature Documentation**
