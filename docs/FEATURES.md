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

### 1. Homepage (`/`)

**Purpose:** Main landing page showcasing services and value proposition

**Components:**
- **Navbar** (`components/navbar.tsx`)
  - Fixed header navigation
  - Phone CTA button: (03) 8820 1801
  - Quote button linking to `/quote`
  - Responsive mobile menu

- **Hero Section** (`components/hero-section.tsx`)
  - Main headline and value proposition
  - Embedded AI Quote Assistant (Maya)
  - Call-to-action buttons

- **Trust Bar** (`components/trust-bar.tsx`)
  - Credibility indicators (ABN, Insurance, Licenses)
  - Static trust signals

- **Stats Section** (`components/stats-section.tsx`)
  - Dynamic statistics display:
    - Completed relocations: 2
    - Damage claims: $0
    - Average completion time: 48 hours
    - Customer satisfaction: 100%
  - Real-time data from API

- **Services Section** (`components/services-section.tsx`)
  - 4 service cards:
    - Office Relocation
    - Data Center Migration
    - IT Equipment Transport
    - Warehouse Relocation
  - Expandable details per service

- **Tech Features Section** (`components/tech-features-section.tsx`)
  - 4 features (currently marked "Coming Soon"):
    - Real-Time Tracking
    - AI Route Optimization
    - Chain of Custody
    - Analytics Dashboard

- **Testimonials Section** (`components/testimonials-section.tsx`)
  - Placeholder section ("Coming Soon")
  - Awaiting customer reviews

- **CTA Section** (`components/cta-section.tsx`)
  - Final call-to-action
  - Quote request button

- **Footer** (`components/footer.tsx`)
  - Contact information
  - Company details (ABN: 71 661 027 309)
  - Navigation links
  - Social media links

- **Floating CTA** (`components/floating-cta.tsx`)
  - Persistent floating action button
  - Quick quote access

**User Flows:**
1. Visitor lands on homepage → Scrolls through sections → Clicks "Get Quote"
2. Visitor clicks phone number → Initiates call
3. Visitor interacts with AI assistant → Starts quote process

---

### 2. AI Quote Assistant - Maya (`components/quote-assistant.tsx`)

**Purpose:** Conversational AI-powered quote generation

**API Endpoint:** `POST /api/quote-assistant`

**Features:**
- **Conversational Interface**
  - Natural language conversation
  - Step-by-step guidance
  - Voice input support (Web Speech API)
  - Text-to-speech responses (Australian English)

- **Business Lookup**
  - Australian Business Register (ABR) integration
  - ABN or business name search
  - Business confirmation with visual selection

- **Service Type Selection**
  - 5 move types:
    - Office Relocation
    - Warehouse Relocation
    - Data Center Migration
    - IT Equipment Transport
    - Retail Store Relocation
  - Visual service picker

- **Qualifying Questions**
  - Dynamic questions based on service type
  - Square meters estimation
  - Special requirements identification

- **Quote Calculation**
  - Real-time pricing calculation
  - Detailed breakdown:
    - Base rate
    - Per square meter cost
    - Distance charges
    - Additional services
  - Deposit calculation (50% of total)

- **Availability Checking**
  - Calendar integration
  - Available date selection
  - Booking slot management

- **Contact Collection**
  - Name, email, phone
  - Company information
  - Preferred contact time

- **Payment Integration**
  - Stripe Embedded Checkout
  - Secure deposit payment
  - Payment confirmation

- **Error Handling**
  - Fallback to phone support
  - Graceful error messages
  - Retry mechanisms

**Conversation Flow:**
1. Welcome → Business identification
2. Business confirmation → Service type selection
3. Qualifying questions → Location collection
4. Quote calculation → Date selection
5. Contact collection → Payment
6. Confirmation → Email notification

**AI Tools Available:**
- `lookupBusiness` - ABR lookup
- `confirmBusiness` - Business confirmation
- `showServiceOptions` - Service picker
- `checkAvailability` - Date availability
- `confirmBookingDate` - Date selection
- `calculateQuote` - Price calculation
- `collectContactInfo` - Contact details
- `initiatePayment` - Stripe checkout
- `requestCallback` - Phone callback scheduling

**Modes:**
- Floating mode (bottom-right corner)
- Embedded mode (within hero section)

---

### 3. Manual Quote Builder (`/quote`)

**Purpose:** Step-by-step manual quote generation

**Component:** `components/quote-builder.tsx`

**Features:**

**Step 1: Select Service**
- Move type cards with expandable details
- Service types:
  - Office Relocation (OFF-REL)
  - Data Center Migration (DC-MIG)
  - IT Equipment Transport (IT-TRN)
- Visual service selection

**Step 2: Configure**
- Location inputs:
  - Origin suburb
  - Destination suburb
- Square meters slider:
  - Dynamic minimum per service type
  - Maximum: 2000 sqm
- Additional services checkboxes:
  - Professional Packing: $450
  - Temporary Storage: $300/week
  - Post-Move Cleaning: $350
  - Premium Insurance: $200
  - After Hours Service: $500
  - IT Setup Assistance: $600

**Step 3: Confirm**
- Estimate display with breakdown
- Contact form:
  - Name (required)
  - Email (required)
  - Phone (optional)
  - Company name (optional)
- Form submission
- Email notifications

**Pricing Logic:**
- Base rate + (square meters × per sqm rate)
- Distance calculation (if provided)
- Additional services added
- Minimum square meters enforced per service type

**Validation:**
- Required fields validation
- Email format validation
- Square meters range validation
- Error messages displayed

---

### 4. Custom Quote Form (`/quote/custom`)

**Purpose:** Complex quote requests requiring manual assessment

**Component:** `components/custom-quote-form.tsx`

**Fields:**
- **Contact Information**
  - Name (required)
  - Company name (required)
  - Email (required)
  - Phone (required)

- **Business Profile**
  - Industry type (dropdown)
  - Employee count (dropdown)

- **Locations**
  - Current address (required)
  - New address (required)

- **Move Details**
  - Target date (date picker)
  - Estimated square meters (number input)

- **Special Requirements** (checkboxes)
  - Server room
  - Medical equipment
  - Hazardous materials
  - Security items
  - Artwork/valuables
  - Weekend-only access
  - Staged relocation
  - International move

- **Project Description** (textarea)
  - Detailed project description
  - Special considerations

**Submission:**
- Form validation
- Lead creation in database
- Email notifications (internal + customer)
- Confirmation message

**Use Cases:**
- Complex multi-phase moves
- Specialized equipment handling
- International relocations
- Staged relocations
- Unique requirements

---

## Admin-Side Features

### 1. Admin Dashboard (`/admin`)

**Purpose:** Lead management and CRM functionality

**Component:** `components/admin-dashboard.tsx`

**Features:**

**Statistics Cards:**
- Total Leads: Count of all leads
- New Leads: Leads with status "new"
- Pipeline Value: Sum of estimated totals
- This Week: Leads created in last 7 days

**Search & Filter:**
- Search by:
  - Email
  - Company name
  - Contact name
- Filter by:
  - Status (new, contacted, quoted, won, lost)
  - Lead type (instant_quote, custom_quote)

**Leads Table:**
- Sortable columns:
  - Date (created_at)
  - Contact (name, company)
  - Type (instant/custom)
  - Move (type, square meters)
  - Value (estimated total)
  - Status (badge with color coding)
- Inline status update dropdown
- Click row to view details

**Lead Detail Modal:**
- **Contact Information**
  - Email (clickable mailto link)
  - Phone (clickable tel link)
  - Company name
  - Submission date

- **Move Details**
  - Move type
  - Estimated value
  - Origin and destination
  - Square meters
  - Target date
  - Additional services
  - Special requirements

- **Project Description**
  - Full text display

- **Internal Notes**
  - Editable textarea
  - Save functionality
  - Timestamp tracking

- **Status Management**
  - Status workflow buttons:
    - New → Contacted → Quoted → Won/Lost
  - Status color coding:
    - New: Blue
    - Contacted: Yellow
    - Quoted: Purple
    - Won: Green
    - Lost: Red

**Actions:**
- Update lead status
- Edit internal notes
- View full lead details
- Export capabilities (future)

**Data Source:**
- Server action: `getLeads()` from `app/actions/leads.ts`
- Real-time updates on status change

---

### 2. Voicemails Dashboard (`/admin/voicemails`)

**Purpose:** Voicemail management and follow-up tracking

**Component:** `components/voicemails-dashboard.tsx`

**API Endpoint:** `GET /api/voicemails`, `PATCH /api/voicemails`

**Features:**

**Statistics Cards:**
- New Messages: Count of "new" status
- Listened: Count of "listened" status
- Followed Up: Count of "followed_up" status

**Filter Tabs:**
- All
- New
- Listened
- Followed Up
- Archived

**Voicemail List:**
- Display fields:
  - Caller number
  - Status badge (color-coded)
  - Date/time received
  - Duration
  - Transcription preview (if available)
- Visual indicators:
  - New voicemails: Left border highlight
  - Status badges with colors

**Voicemail Detail Modal:**
- **Caller Information**
  - Phone number
  - Duration
  - Received timestamp
  - Status

- **Recording**
  - Audio player
  - Direct link to recording URL

- **Transcription**
  - Full transcription text (if available)
  - Formatted display

- **Status Actions**
  - Mark as Listened
  - Mark as Followed Up
  - Archive

**Status Workflow:**
- New → Listened → Followed Up → Archived

**Integration:**
- Twilio webhook integration
- Automatic transcription (if configured)
- Recording URL storage

---

### 3. AI Agents Dashboard (`/admin/agents`)

**Purpose:** Monitor and manage AI salesforce agents

**Component:** `components/admin/agent-dashboard.tsx`

**API Endpoint:** `GET /api/agents`, `POST /api/agents`

**Features:**
- Agent status monitoring
- Performance metrics
- Activity logs
- Health checks
- Agent configuration

**Agents Available:**
- MAYA_SALES - Sales agent (quote assistant)
- AURORA_MKT - Marketing agent (planned)
- HUNTER_LG - Lead generation agent (planned)
- SENTINEL_CS - Customer support agent (planned)
- CORTEX_MAIN - Central orchestrator (planned)

**Status Information:**
- Agent health status
- Queue status
- Memory usage
- Timestamp

---

## API Endpoints

### Lead Management

**POST `/api/leads`** (via server action)
- Create new lead
- Email notifications
- Database insertion

**GET `/api/leads`** (via server action)
- Fetch all leads
- Filtering and sorting
- Admin dashboard data source

**PATCH `/api/leads`** (via server action)
- Update lead status
- Update internal notes

### Quote Assistant

**POST `/api/quote-assistant`**
- AI conversation endpoint
- Stream text responses
- Tool execution
- Message validation

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I need a quote"
    }
  ]
}
```

**Response:** Streaming text with tool calls

### Business Lookup

**GET `/api/business-lookup`**
- Australian Business Register lookup
- ABN or name search
- Business information retrieval

**Query Parameters:**
- `q`: Search query (ABN or name)
- `type`: Search type ("name" or "abn")

**Response:**
```json
{
  "results": [
    {
      "abn": "71661027309",
      "name": "Business Name",
      "tradingName": "Trading Name",
      "entityType": "Company",
      "state": "VIC",
      "postcode": "3000",
      "status": "Active"
    }
  ]
}
```

### Availability

**GET `/api/availability`**
- Check available booking dates
- Calendar integration
- Booking slot management

**Query Parameters:**
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "availability": [
    {
      "date": "2024-12-15",
      "is_available": true,
      "current_bookings": 2,
      "max_bookings": 5
    }
  ]
}
```

### Voicemails

**GET `/api/voicemails`**
- Fetch all voicemails
- Order by created_at descending
- Admin dashboard data source

**Response:**
```json
{
  "voicemails": [
    {
      "id": "vm_123",
      "caller_number": "+61400000000",
      "recording_url": "https://...",
      "recording_sid": "RE...",
      "duration": 45,
      "transcription": "Hello...",
      "status": "new",
      "notes": null,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ]
}
```

**PATCH `/api/voicemails`**
- Update voicemail status
- Update notes

**Request Body:**
```json
{
  "id": "vm_123",
  "status": "listened",
  "notes": "Customer called about quote"
}
```

### Stripe Webhooks

**POST `/api/stripe/webhook`**
- Payment confirmation
- Deposit status updates
- Lead status updates

**Events Handled:**
- `checkout.session.completed` - Payment successful
- Updates lead with payment status
- Marks deposit as paid
- Changes lead status to "quoted"

### Twilio Voice Webhooks

**POST `/api/voice/incoming`**
- Incoming call handling
- Call routing logic

**POST `/api/voice/voicemail`**
- Voicemail recording received
- Store recording URL
- Trigger transcription

**POST `/api/voice/transcription`**
- Transcription received
- Update voicemail record
- Store transcription text

**POST `/api/voice/status`**
- Call status updates
- Call completion tracking

### Fleet Stats

**GET `/api/fleet-stats`**
- Real-time fleet statistics
- Vehicle availability
- Crew availability

### AI Agents

**GET `/api/agents`**
- Agent health status
- System status
- Queue information

**POST `/api/agents`**
- Interact with AI agents
- Route requests through CORTEX
- Process agent actions

**Request Body:**
```json
{
  "agent": "MAYA_SALES",
  "type": "message",
  "content": "User message",
  "conversationId": "conv_123",
  "customerId": "cust_123"
}
```

---

## Security Features

### Authentication

**Middleware:** `middleware.ts`
- Route protection
- Admin route authentication
- Session management

**Admin Routes:**
- `/admin/*` - Protected routes
- Authentication required
- Session validation

### Input Validation

**Server Actions:**
- Zod schema validation (where applicable)
- Type checking
- Sanitization

**API Routes:**
- Request validation
- Error handling
- Rate limiting (future)

### Payment Security

**Stripe Integration:**
- Webhook signature verification
- Secure payment processing
- PCI compliance
- No card data stored

**Webhook Security:**
- Signature validation
- Event verification
- Error monitoring

### Data Protection

**Database:**
- Supabase Row Level Security (RLS)
- Encrypted connections
- Backup and recovery

**Email:**
- Secure email delivery (Resend)
- No sensitive data in emails
- BCC for internal notifications

---

## Integration Features

### Email Integration (Resend)

**Features:**
- Lead notification emails (internal)
- Customer confirmation emails
- Monitoring alerts
- Email templates

**Configuration:**
- `RESEND_API_KEY` - API key
- `EMAIL_FROM_ADDRESS` - Sender address
- `LEAD_NOTIFICATION_RECIPIENTS` - Internal recipients
- `MONITORING_ALERT_EMAILS` - Alert recipients

### Payment Integration (Stripe)

**Features:**
- Embedded Checkout
- Deposit collection (50%)
- Payment confirmation
- Webhook processing

**Configuration:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key
- `STRIPE_SECRET_KEY` - Secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook secret

### Voice Integration (Twilio)

**Features:**
- Incoming call handling
- Voicemail recording
- Transcription service
- Call status tracking

**Configuration:**
- `TWILIO_ACCOUNT_SID` - Account SID
- `TWILIO_AUTH_TOKEN` - Auth token
- `TWILIO_PHONE_NUMBER` - Phone number

### Database Integration (Supabase)

**Features:**
- Lead storage
- Voicemail storage
- User authentication
- Real-time updates

**Tables:**
- `leads` - Lead information
- `voicemails` - Voicemail records
- `availability` - Booking availability
- `vehicles` - Fleet information

### AI Integration (OpenAI)

**Features:**
- GPT-4o for quote assistant
- Natural language processing
- Tool calling
- Streaming responses

**Configuration:**
- `OPENAI_API_KEY` - API key

### Business Lookup (Australian Business Register)

**Features:**
- ABN lookup
- Business name search
- Business information retrieval

**API:** External ABR API

---

## Feature Status Summary

### ✅ Implemented

- Homepage with all sections
- AI Quote Assistant (Maya)
- Manual Quote Builder
- Custom Quote Form
- Admin Dashboard
- Voicemails Dashboard
- Lead Management
- Payment Processing (Stripe)
- Email Notifications
- Business Lookup
- Availability Checking
- AI Agents API

### 🚧 Partial Implementation

- AI Agents Dashboard (basic structure)
- Fleet Stats API (basic implementation)
- Availability API (fallback dates)

### 🔴 Planned / Coming Soon

- Real-Time Tracking
- AI Route Optimization
- Chain of Custody
- Analytics Dashboard
- Client Testimonials
- Full AI Salesforce (AURORA, HUNTER, SENTINEL, etc.)
- CORTEX Orchestrator

---

## Testing Coverage

See `docs/TEST_RESULTS.md` for comprehensive test results covering:
- Functionality tests
- Security tests
- Usability tests
- Integration tests
- Performance tests

---

**Document Version:** 2.0  
**Last Updated:** December 2025
