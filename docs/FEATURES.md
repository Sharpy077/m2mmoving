# M&M Commercial Moving - Feature Documentation

**Last Updated:** December 2025  
**Version:** 1.0

---

## Table of Contents

1. [User-Facing Features](#user-facing-features)
2. [Admin Features](#admin-features)
3. [API Endpoints](#api-endpoints)
4. [Server Actions](#server-actions)
5. [Integration Features](#integration-features)

---

## User-Facing Features

### 1. Homepage (`/`)

**Purpose:** Primary landing page for lead generation and brand awareness

**Components:**
- **Navbar** (`components/navbar.tsx`)
  - Fixed header with navigation
  - Phone CTA button
  - Quote button linking to `/quote`
  - Responsive mobile menu

- **Hero Section** (`components/hero-section.tsx`)
  - Main headline and value proposition
  - Embedded AI quote assistant (Maya)
  - Call-to-action buttons

- **Trust Bar** (`components/trust-bar.tsx`)
  - Credibility indicators (insurance, licenses, certifications)
  - Trust badges display

- **Stats Section** (`components/stats-section.tsx`)
  - Dynamic statistics:
    - Completed relocations count
    - $0 damage claims
    - Average completion time (48hr)
    - Customer satisfaction (100%)

- **Services Section** (`components/services-section.tsx`)
  - Four service cards:
    1. Office Relocation
    2. Warehouse Relocation
    3. Data Centre Migration
    4. IT Equipment Transport

- **Tech Features Section** (`components/tech-features-section.tsx`)
  - Four features (currently marked "Coming Soon"):
    1. Real-Time Tracking
    2. AI Route Optimization
    3. Chain of Custody
    4. Analytics Dashboard

- **Testimonials Section** (`components/testimonials-section.tsx`)
  - Placeholder for customer reviews (Coming Soon)

- **CTA Section** (`components/cta-section.tsx`)
  - Final call-to-action with quote button

- **Footer** (`components/footer.tsx`)
  - Contact information
  - Company details (ABN: 71 661 027 309)
  - Navigation links
  - Social media links

- **Floating CTA** (`components/floating-cta.tsx`)
  - Persistent floating action button
  - Quick access to quote or phone

**Features:**
- ✅ Responsive design
- ✅ Dark mode theme
- ✅ SEO optimized
- ✅ Fast page load
- ✅ Accessible navigation

**User Flows:**
1. Visitor lands on homepage → Scrolls through sections → Clicks quote button
2. Visitor clicks phone CTA → Calls business directly
3. Visitor interacts with embedded AI assistant → Gets instant quote

---

### 2. AI Quote Assistant - Maya (`components/quote-assistant.tsx`)

**Purpose:** AI-powered conversational quote generation using OpenAI GPT-4o

**Location:** Embedded in hero section and available as floating widget

**API Endpoint:** `/api/quote-assistant` (POST)

**Conversation Flow:**
1. **Welcome & Business Identification**
   - Greets user
   - Asks for business name or ABN
   - Uses `lookupBusiness` tool to search Australian Business Register

2. **Business Confirmation**
   - Shows matching businesses
   - User selects correct business
   - Uses `confirmBusiness` tool

3. **Service Type Selection**
   - Displays service options:
     - Office Relocation
     - Warehouse Relocation
     - Data Centre Migration
     - IT Equipment Transport
     - Retail Store Relocation
   - Uses `showServiceOptions` tool

4. **Qualifying Questions**
   - Asks service-specific questions based on selected type
   - Collects details about scope of work

5. **Location Collection**
   - Asks for origin suburb
   - Asks for destination suburb
   - Calculates distance (if applicable)

6. **Quote Calculation**
   - Uses `calculateQuote` tool
   - Generates detailed pricing breakdown:
     - Base rate
     - Per square meter pricing
     - Additional services
     - Total estimate

7. **Date Selection**
   - Uses `checkAvailability` tool
   - Shows available dates from calendar
   - User selects preferred date
   - Uses `confirmBookingDate` tool

8. **Contact Information**
   - Uses `collectContactInfo` tool
   - Collects:
     - Name
     - Email
     - Phone number
     - Company name

9. **Payment Processing**
   - Uses `initiatePayment` tool
   - Creates Stripe checkout session
   - Processes 50% deposit payment

10. **Booking Confirmation**
    - Confirms booking details
    - Provides reference number
    - Sends confirmation email

**AI Tools Available:**
- `lookupBusiness` - ABN/business name lookup via Australian Business Register
- `confirmBusiness` - Confirm selected business
- `showServiceOptions` - Display service type picker
- `checkAvailability` - Fetch available dates from calendar
- `confirmBookingDate` - Lock in selected date
- `calculateQuote` - Generate pricing estimate with breakdown
- `collectContactInfo` - Gather customer details
- `initiatePayment` - Show Stripe payment form
- `requestCallback` - Schedule phone callback

**Additional Features:**
- ✅ Voice input support (Web Speech API)
- ✅ Text-to-speech responses (Australian English)
- ✅ Error handling with fallback to phone
- ✅ Floating and embedded modes
- ✅ Conversation history persistence
- ✅ Streaming responses for real-time feel

**Pricing Logic:**
- Base rates per service type
- Per square meter pricing
- Minimum square meters per service
- Additional services add-ons

**Security:**
- Input validation via Zod schemas
- Rate limiting on API endpoint
- Sanitized user inputs
- Secure payment processing via Stripe

---

### 3. Manual Quote Builder (`/quote`)

**Purpose:** Step-by-step manual quote generation for users who prefer structured forms

**Component:** `components/quote-builder.tsx`

**3-Step Wizard:**

**Step 1: Select Service**
- Move type cards with expandable details:
  - Office Relocation (OFF-REL)
  - Data Center Migration (DC-MIG)
  - IT Equipment Transport (IT-TRN)
- Each card shows:
  - Base rate
  - Per square meter rate
  - Minimum square meters
  - Description

**Step 2: Configure**
- Location inputs:
  - Origin suburb
  - Destination suburb
- Square meters slider:
  - Dynamic minimum per service type
  - Maximum: 2000 sqm
  - Real-time price calculation
- Additional services checkboxes:
  - Professional Packing ($450)
  - Temporary Storage ($300/week)
  - Post-Move Cleaning ($350)
  - Premium Insurance ($200)
  - After Hours Service ($500)
  - IT Setup Assistance ($600)

**Step 3: Confirm**
- Estimate display:
  - Base rate
  - Square meter calculation
  - Additional services
  - Total estimate
- Contact form:
  - Name (required)
  - Company (required)
  - Email (required, validated)
  - Phone (optional)
- Submission button
- Terms acceptance checkbox

**Features:**
- ✅ Real-time price calculation
- ✅ Form validation
- ✅ Progress indicator
- ✅ Responsive design
- ✅ Error handling
- ✅ Success confirmation

**Data Flow:**
1. User completes form → `submitLead` server action called
2. Lead saved to Supabase `leads` table
3. Email notifications sent (internal + customer)
4. User sees success message

**Pricing Calculation:**
```typescript
total = baseRate + (squareMeters * perSqmRate) + additionalServicesTotal
```

---

### 4. Custom Quote Form (`/quote/custom`)

**Purpose:** Complex quote requests requiring manual assessment

**Component:** `components/custom-quote-form.tsx`

**Fields Collected:**

**Contact Information:**
- Name (required)
- Company (required)
- Email (required, validated)
- Phone (required)

**Business Profile:**
- Industry type (dropdown)
- Employee count (dropdown)

**Locations:**
- Current address (full address)
- New address (full address)

**Move Details:**
- Target move date (date picker)
- Estimated square meters (number input)

**Special Requirements (checkboxes):**
- Server room
- Medical equipment
- Hazmat materials
- Security items
- Artwork/valuables
- Weekend-only availability
- Staged relocation
- International shipping

**Project Description:**
- Large textarea for detailed description

**Features:**
- ✅ Comprehensive form validation
- ✅ File upload capability (if needed)
- ✅ Special requirements tracking
- ✅ Email notification on submission
- ✅ Lead creation in database

**Use Cases:**
- Complex multi-phase moves
- Specialized equipment handling
- International relocations
- High-security requirements
- Custom scheduling needs

---

## Admin Features

### 5. Admin Dashboard (`/admin`)

**Purpose:** Central hub for lead management and business operations

**Component:** `components/admin-dashboard.tsx`

**Access Control:**
- Protected route (requires authentication)
- Middleware checks for admin access

**Features:**

**Statistics Cards:**
- Total Leads (count)
- New Leads (count, status = "new")
- Pipeline Value (sum of estimated_total where status != "lost")
- This Week Leads (count created in last 7 days)

**Search & Filter:**
- Search by:
  - Company name
  - Contact name
  - Email
  - Phone
- Filter by:
  - Status (new, contacted, quoted, won, lost)
  - Lead type (instant_quote, custom_quote)
  - Date range

**Lead Table:**
- Sortable columns:
  - Created date
  - Company name
  - Contact name
  - Status
  - Estimated total
  - Lead type
- Pagination (if needed)
- Row actions:
  - View details
  - Edit status
  - Add notes

**Lead Detail Modal:**
- Contact Information:
  - Name, email, phone
  - Company name
- Move Details:
  - Move type
  - Origin → Destination
  - Square meters
  - Scheduled date
- Financial:
  - Estimated total
  - Deposit amount
  - Deposit paid status
  - Payment status
- Additional Services:
  - List of selected services
- Special Requirements:
  - List of special requirements (custom quotes)
- Internal Notes:
  - Editable textarea
  - Timestamp on updates
- Status Workflow:
  - Dropdown to change status
  - Status options: new → contacted → quoted → won/lost
  - Visual status indicator (badge)

**Actions Available:**
- Update lead status
- Update internal notes
- View full lead history
- Export lead data (CSV)
- Send follow-up email

**Features:**
- ✅ Real-time updates
- ✅ Bulk actions (future)
- ✅ Export functionality
- ✅ Responsive design
- ✅ Keyboard shortcuts
- ✅ Audit trail

---

### 6. Voicemail Management (`/admin/voicemails`)

**Purpose:** Manage voicemail messages received via Twilio

**Component:** `components/voicemails-dashboard.tsx`

**API Endpoint:** `/api/voicemails` (GET, PATCH)

**Features:**

**Voicemail Listing:**
- Table view with columns:
  - Caller number
  - Duration
  - Status
  - Created date
  - Actions
- Sortable by date
- Filterable by status

**Status Indicators:**
- `new` - Unread voicemail (red badge)
- `listened` - Read but not acted upon (yellow badge)
- `followed_up` - Action taken (green badge)
- `archived` - Archived (gray badge)

**Voicemail Detail View:**
- Audio playback:
  - Play/pause controls
  - Progress bar
  - Duration display
- Transcription:
  - AI-generated transcription (if available)
  - Editable transcription
- Caller Information:
  - Phone number
  - Call date/time
  - Duration
- Status Management:
  - Dropdown to change status
  - Notes field
- Actions:
  - Mark as listened
  - Mark as followed up
  - Archive
  - Delete (future)

**Integration:**
- Twilio webhook receives voicemail
- Transcription via Twilio Speech Recognition
- Stored in Supabase `voicemails` table

**Features:**
- ✅ Audio playback
- ✅ Transcription display
- ✅ Status workflow
- ✅ Notes management
- ✅ Search functionality
- ✅ Bulk status updates

---

### 7. Admin Settings (`/admin/settings`)

**Purpose:** System configuration and preferences

**Status:** Placeholder page (to be implemented)

**Planned Features:**
- Email notification settings
- User management
- System preferences
- Integration settings
- API keys management

---

## API Endpoints

### 8. Quote Assistant API (`/api/quote-assistant`)

**Method:** POST

**Purpose:** Handle AI chat completions for quote assistant

**Request Body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant" | "system"
    content: string
  }>
}
```

**Response:** Streaming text response

**Features:**
- ✅ OpenAI GPT-4o integration
- ✅ Tool calling support
- ✅ Streaming responses
- ✅ Error handling
- ✅ Rate limiting
- ✅ Input validation

**Security:**
- Request validation
- Rate limiting
- Input sanitization
- Error message sanitization

---

### 9. Business Lookup API (`/api/business-lookup`)

**Method:** GET

**Purpose:** Search Australian Business Register for business information

**Query Parameters:**
- `query` - Business name or ABN (required)

**Response:**
```typescript
{
  businesses: Array<{
    abn: string
    name: string
    status: string
    // ... other fields
  }>
}
```

**Features:**
- ✅ ABN validation
- ✅ Business name search
- ✅ Caching (future)
- ✅ Error handling

**Security:**
- Input validation
- Rate limiting
- API key protection

---

### 10. Availability API (`/api/availability`)

**Method:** GET

**Purpose:** Fetch available booking dates

**Query Parameters:**
- `start` - Start date (ISO format, optional)
- `end` - End date (ISO format, optional)

**Response:**
```typescript
{
  availability: Array<{
    date: string
    is_available: boolean
    max_bookings: number
    current_bookings: number
  }>
}
```

**Features:**
- ✅ Date range filtering
- ✅ Weekend exclusion
- ✅ Booking capacity tracking
- ✅ Fallback to simulated dates if table doesn't exist

**Security:**
- Date validation
- SQL injection prevention
- Error handling

---

### 11. Fleet Stats API (`/api/fleet-stats`)

**Method:** GET

**Purpose:** Real-time fleet statistics

**Response:**
```typescript
{
  total_vehicles: number
  available_vehicles: number
  active_jobs: number
  // ... other stats
}
```

**Status:** Basic implementation (needs real data source)

---

### 12. Voicemails API (`/api/voicemails`)

**Method:** GET, PATCH

**GET - Fetch all voicemails:**
- Returns list of voicemails ordered by date
- Includes transcription, status, caller info

**PATCH - Update voicemail:**
- Request body: `{ id, status?, notes? }`
- Updates voicemail status and/or notes

**Security:**
- Authentication required
- Input validation
- SQL injection prevention

---

### 13. Voice Webhooks (`/api/voice/*`)

**Endpoints:**
- `/api/voice/incoming` - Handle incoming calls
- `/api/voice/voicemail` - Receive voicemail recordings
- `/api/voice/transcription` - Receive transcriptions
- `/api/voice/status` - Call status updates

**Purpose:** Twilio webhook handlers for voice functionality

**Features:**
- ✅ Voicemail recording storage
- ✅ Transcription processing
- ✅ Call status tracking
- ✅ Database updates

**Security:**
- Twilio signature validation
- Webhook authentication
- Error handling

---

### 14. Stripe Webhook (`/api/stripe/webhook`)

**Method:** POST

**Purpose:** Handle Stripe payment events

**Events Handled:**
- `checkout.session.completed` - Mark deposit as paid
- `payment_intent.succeeded` - Update payment status
- `payment_intent.payment_failed` - Handle failed payments

**Features:**
- ✅ Webhook signature verification
- ✅ Payment status updates
- ✅ Lead status updates
- ✅ Email notifications

**Security:**
- Stripe webhook signature validation
- Idempotency handling
- Error logging

---

## Server Actions

### 15. Lead Actions (`app/actions/leads.ts`)

**Functions:**

**`submitLead(data: LeadInsert)`**
- Creates new lead in database
- Sends email notifications (internal + customer)
- Returns success/error response

**`getLeads()`**
- Fetches all leads from database
- Ordered by creation date (newest first)
- Returns leads array

**`updateLeadStatus(id: string, status: string)`**
- Updates lead status
- Validates status value
- Returns success/error response

**`updateLeadNotes(id: string, notes: string)`**
- Updates internal notes for lead
- Timestamps update
- Returns success/error response

**Features:**
- ✅ Database transactions
- ✅ Email notifications
- ✅ Error handling
- ✅ Input validation

**Security:**
- Server-side only (marked with "use server")
- Input sanitization
- SQL injection prevention
- Error message sanitization

---

### 16. Stripe Actions (`app/actions/stripe.ts`)

**Functions:**

**`createDepositCheckoutSession(leadId, depositAmountCents, customerEmail)`**
- Creates Stripe checkout session
- Updates lead with payment info
- Returns client secret for embedded checkout

**`markDepositPaid(leadId: string)`**
- Marks deposit as paid in database
- Updates payment status
- Updates lead status to "quoted"

**`createDepositCheckout({ amount, customerEmail, ... })`**
- Alternative checkout creation with full details
- Includes metadata for tracking

**Features:**
- ✅ Stripe integration
- ✅ Embedded checkout
- ✅ Payment tracking
- ✅ Error handling

**Security:**
- Server-side only
- Stripe API key protection
- Payment amount validation
- Metadata sanitization

---

### 17. Auth Actions (`app/actions/auth.ts`)

**Status:** To be implemented

**Planned Functions:**
- `login(email, password)`
- `logout()`
- `checkAuth()`
- `refreshSession()`

---

## Integration Features

### 18. Email Notifications

**Provider:** Resend

**Features:**
- ✅ Internal lead notifications
- ✅ Customer confirmation emails
- ✅ HTML email templates
- ✅ Error handling

**Configuration:**
- `RESEND_API_KEY` - API key
- `EMAIL_FROM_ADDRESS` - Sender address
- `LEAD_NOTIFICATION_RECIPIENTS` - Internal recipients

---

### 19. Payment Processing

**Provider:** Stripe

**Features:**
- ✅ Embedded checkout
- ✅ 50% deposit collection
- ✅ Payment status tracking
- ✅ Webhook handling
- ✅ Receipt generation

**Configuration:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key
- `STRIPE_SECRET_KEY` - Secret key

---

### 20. Voice/SMS

**Provider:** Twilio

**Features:**
- ✅ Incoming call handling
- ✅ Voicemail recording
- ✅ Transcription
- ✅ Call status tracking

**Configuration:**
- `TWILIO_ACCOUNT_SID` - Account SID
- `TWILIO_AUTH_TOKEN` - Auth token
- `TWILIO_PHONE_NUMBER` - Phone number

---

### 21. Database

**Provider:** Supabase (PostgreSQL)

**Tables:**
- `leads` - Lead/quote data
- `voicemails` - Voicemail recordings
- `availability` - Booking calendar
- `vehicles` - Fleet management (future)

**Features:**
- ✅ Row-level security
- ✅ Real-time subscriptions (future)
- ✅ Migrations
- ✅ Backup/restore

---

## Security Features

### Authentication & Authorization
- Admin route protection
- Session management
- Role-based access control (future)

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

### Payment Security
- PCI compliance via Stripe
- Webhook signature verification
- Secure API keys storage

### Privacy
- GDPR compliance considerations
- Data retention policies
- User data access/deletion

---

## Performance Features

### Optimization
- Next.js server-side rendering
- Image optimization
- Code splitting
- Lazy loading
- Caching strategies

### Monitoring
- Error tracking
- Performance monitoring
- Uptime monitoring
- Analytics integration

---

## Accessibility Features

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance
- Focus management

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancements

### Planned Features
- Customer portal for booking status
- Real-time GPS tracking
- Mobile app
- Multi-language support
- Advanced analytics dashboard
- Automated follow-up sequences
- Integration with CRM systems

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Maintained by:** Development Team
