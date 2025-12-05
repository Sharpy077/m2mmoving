# M&M Commercial Moving - Feature Documentation

## Table of Contents
- [User-Facing Features](#user-facing-features)
- [Admin-Facing Features](#admin-facing-features)
- [AI Agent System](#ai-agent-system)
- [Technical Infrastructure](#technical-infrastructure)

---

## User-Facing Features

### 1. Homepage & Landing Experience

**Feature**: Marketing Landing Page
**Purpose**: Showcase company services and convert visitors to leads

**Components**:
- **Hero Section**: Eye-catching headline with CTA buttons
- **Trust Bar**: Display company credentials and certifications
- **Stats Section**: Key metrics and achievements
- **Services Section**: Overview of service offerings
- **Tech Features Section**: Highlight technology-driven approach
- **Testimonials Section**: Customer reviews and social proof
- **CTA Section**: Final call-to-action before footer
- **Floating CTA**: Sticky button for quick quote access

**Technology Stack**:
- Next.js 16 (App Router)
- React 19
- Tailwind CSS
- Framer Motion (animations)

**User Flow**:
1. User lands on homepage
2. Views company information and services
3. Clicks "Get Quote" CTA
4. Redirected to quote builder

---

### 2. Instant Quote Builder

**Feature**: Interactive Multi-Step Quote Form
**Purpose**: Allow users to get instant pricing estimates for commercial moves

**Location**: `/quote`

**Components**:
- **Step 1: Service Selection**
  - Office Relocation (base: $2,500, $45/sqm)
  - Data Center Migration (base: $5,000, $85/sqm)
  - IT Equipment Transport (base: $1,500, $35/sqm)
  - Detailed service information expandable cards
  - Minimum square meter requirements per service

- **Step 2: Configuration**
  - Origin suburb input
  - Destination suburb input
  - Distance estimation (km)
  - Square meter slider (10-2000 sqm)
  - Additional services checkboxes:
    - Professional Packing ($450)
    - Temporary Storage ($300)
    - Post-Move Cleaning ($350)
    - Premium Insurance ($200)
    - After Hours Service ($500)
    - IT Setup Assistance ($600)

- **Step 3: Contact & Confirmation**
  - Email (required)
  - Phone (optional)
  - Contact name (optional)
  - Company name (optional)
  - Real-time price calculation
  - 50% deposit amount display

**Features**:
- Real-time price calculation
- Minimum space requirements validation
- Progress bar showing completion status
- Responsive design (mobile-friendly)
- Error handling and validation

**Pricing Algorithm**:
\`\`\`
Total = Base Rate + (Square Meters × Per SQM Rate) + (Distance × $8/km) + Additional Services
Deposit = Total × 50%
\`\`\`

**Integration Points**:
- Supabase (lead storage)
- Resend (email notifications)
- Stripe (payment processing)

**User Flow**:
1. User selects move type
2. Configures move details
3. Enters contact information
4. Submits quote request
5. Receives confirmation
6. Option to pay 50% deposit immediately

---

### 3. Custom Quote Form

**Feature**: Detailed Custom Quote Request
**Purpose**: Handle complex or custom moving requirements

**Location**: `/quote/custom`

**Fields**:
- Company name
- Contact name
- Email
- Phone
- Industry type
- Employee count
- Current location (address)
- New location (address)
- Target move date
- Special requirements (multiple checkboxes)
- Project description (textarea)
- Preferred contact time

**Features**:
- More detailed than instant quote
- Suitable for large/complex projects
- Manual follow-up by sales team

**Integration**:
- Saves to leads table with `lead_type: "custom_quote"`
- Sends email notification to sales team

---

### 4. Payment System

**Feature**: Stripe Embedded Checkout
**Purpose**: Accept 50% deposits for move bookings

**Components**:
- Embedded Stripe Checkout
- Payment status tracking
- Confirmation screen

**Payment Flow**:
1. User completes quote
2. Selects "Pay Deposit Now"
3. Stripe checkout session created
4. User enters payment details
5. Payment processed
6. Lead status updated to "quoted"
7. Confirmation screen with booking reference

**Security**:
- Stripe PCI compliance
- Server-side payment validation
- Webhook verification for payment status

**Metadata Tracked**:
- Lead ID
- Deposit amount
- Customer email
- Move details

---

### 5. Authentication (Limited User Access)

**Feature**: Basic Auth for Admin Access
**Purpose**: Protect admin routes

**Location**: `/auth/login`

**Features**:
- Email/password authentication
- Supabase Auth integration
- Session management
- Redirect to admin dashboard on success

---

## Admin-Facing Features

### 1. Admin Dashboard (Leads Management)

**Feature**: Lead Management System
**Purpose**: View, manage, and track all incoming leads

**Location**: `/admin`

**Components**:
- Lead list table with sorting/filtering
- Status management (new, contacted, quoted, won, lost)
- Lead details modal
- Internal notes system
- Real-time updates

**Lead Information Displayed**:
- Contact details (name, email, phone, company)
- Move details (type, locations, size)
- Pricing information (estimate, deposit)
- Status and timestamps
- Payment status

**Actions Available**:
- Update lead status
- Add/edit internal notes
- View full lead details
- Filter by status
- Sort by date/value

**Integration**:
- Supabase for data storage
- Server actions for mutations
- Real-time subscriptions (if enabled)

---

### 2. AI Salesforce Command Center

**Feature**: AI Agent Monitoring Dashboard
**Purpose**: Monitor and manage autonomous AI agents

**Location**: `/admin/agents`

**Dashboard Components**:

1. **Header Section**:
   - Live/Paused toggle
   - Refresh button
   - Settings button

2. **Metrics Grid** (8 cards):
   - Total Conversations
   - Active Now (with pulse indicator)
   - Avg Response Time
   - Success Rate
   - Quotes Generated
   - Leads Qualified
   - Escalations
   - Revenue Influenced

3. **Agent Fleet Grid**:
   - Visual cards for each AI agent
   - Status indicators (active/idle/busy/error)
   - Mini stats (messages handled, success rate)
   - Category-based color coding
   - Click to view details

4. **Live Activity Feed**:
   - Real-time agent actions
   - Color-coded by type (success/info/warning/error)
   - Timestamp display
   - Action details

5. **Performance Charts**:
   - Performance over time (1h/24h/7d/30d views)
   - Agent comparison chart
   - Visual bar charts

6. **Agent Detail Modal**:
   - Full agent information
   - Detailed metrics
   - Actions (view logs, configure, pause/resume)

**AI Agents Monitored**:
- **Maya** (Sales) - MAYA_SALES
- **Sentinel** (Customer Support) - SENTINEL_CS
- **Hunter** (Lead Generation) - HUNTER_LG
- **Aurora** (Marketing) - AURORA_MKT
- **Oracle** (Business Intelligence) - ORACLE_BI
- **Phoenix** (Retention & Loyalty) - PHOENIX_RET
- **Echo** (Reputation Management) - ECHO_REP
- **Nexus** (Operations) - NEXUS_OPS
- **Prism** (Dynamic Pricing) - PRISM_PRICE
- **Cipher** (Security & Compliance) - CIPHER_SEC
- **Bridge** (Human Handoff) - BRIDGE_HH
- **Guardian** (Quality Assurance) - GUARDIAN_QA

**Features**:
- Live monitoring (auto-refresh every 5 seconds)
- Category-based organization
- Performance metrics tracking
- Agent status management
- Activity logging

---

### 3. Voicemails Dashboard

**Feature**: Voicemail Management
**Purpose**: View and manage voicemail recordings from customers

**Location**: `/admin/voicemails`

**Planned Features**:
- List of voicemail recordings
- Playback functionality
- Transcription display
- Caller information
- Timestamp and duration
- Mark as read/unread
- Archive functionality

**Integration**:
- Twilio for voice calls
- Supabase for storage
- Potential AI transcription

---

### 4. Settings Page

**Feature**: Admin Configuration
**Purpose**: Manage system settings

**Location**: `/admin/settings`

**Planned Features**:
- Email notification settings
- Payment configuration
- AI agent settings
- Business hours
- Service pricing updates
- User management

---

## AI Agent System

### Architecture

**Orchestrator**: CORTEX
- Central coordination system
- Routes requests to appropriate agents
- Manages inter-agent communication
- Handles escalations

**Agent Categories**:

1. **Sales & Lead Generation**:
   - Maya: Main sales agent, handles quotes
   - Hunter: Identifies and qualifies leads

2. **Customer Support**:
   - Sentinel: Handles customer inquiries
   - Bridge: Manages human handoff when needed

3. **Marketing & Retention**:
   - Aurora: Marketing campaigns and content
   - Phoenix: Customer retention and loyalty
   - Echo: Reputation and review management

4. **Operations & Analytics**:
   - Nexus: Operations and scheduling
   - Oracle: Business intelligence and insights
   - Prism: Dynamic pricing optimization

5. **Quality & Security**:
   - Guardian: Quality assurance
   - Cipher: Security and compliance

### Agent Capabilities

Each agent has:
- Unique codename and identity
- Specific capabilities and tools
- Trigger definitions
- Escalation rules
- Rate limiting
- Performance metrics

### Communication

**Inter-Agent Communication**:
- Request/response pattern
- Notifications
- Handoff protocol
- Context sharing

**User-Facing Interactions**:
- API endpoints (`/api/agents/*`)
- Chat interface (planned)
- Automated email responses
- Voice integration (planned)

---

## Technical Infrastructure

### Database (Supabase)

**Tables**:

1. **leads**:
   - Lead information
   - Move details
   - Pricing data
   - Payment status
   - Internal notes
   - Timestamps

2. **agent_conversations**:
   - Conversation history
   - Agent assignments
   - Context data

3. **agent_metrics**:
   - Performance data
   - Response times
   - Success rates

4. **voicemails**:
   - Recording metadata
   - Transcriptions
   - Caller information

5. **vehicles**:
   - Fleet management
   - Availability tracking

6. **availability**:
   - Booking calendar
   - Resource scheduling

### Email System (Resend)

**Email Types**:

1. **Lead Notifications**:
   - Internal team notification (new lead)
   - Customer confirmation email
   - Quote summary

2. **Booking Confirmations**:
   - Payment receipt
   - Booking details
   - Next steps

### Payment Processing (Stripe)

**Features**:
- Embedded checkout
- Webhook handling
- Payment status tracking
- Refund capability
- Subscription management (future)

**Webhook Events**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.failed`

### Voice System (Twilio)

**Features**:
- Inbound call handling
- Voicemail recording
- Transcription service
- Call status tracking
- SMS notifications (future)

**API Endpoints**:
- `/api/voice/incoming` - Handle incoming calls
- `/api/voice/status` - Call status updates
- `/api/voice/transcription` - Voicemail transcription
- `/api/voice/voicemail` - Voicemail recording

### Authentication (Supabase Auth)

**Features**:
- Email/password authentication
- Session management
- Row-level security
- Protected routes via middleware

### Monitoring & Analytics

**Vercel Analytics**:
- Page views
- User interactions
- Performance metrics

**Custom Monitoring**:
- AI agent performance
- API response times
- Error tracking
- User flow analysis

---

## API Endpoints

### Public Endpoints

1. **Quote Assistant**: `/api/quote-assistant`
   - Chat interface for quote questions
   - AI-powered responses

2. **Business Lookup**: `/api/business-lookup`
   - ABN/ACN lookup
   - Company information retrieval

3. **Availability**: `/api/availability`
   - Check available dates
   - Booking calendar

4. **Fleet Stats**: `/api/fleet-stats`
   - Vehicle availability
   - Fleet information

### Agent Endpoints

1. **Agent List**: `/api/agents`
   - Get all available agents

2. **Agent Details**: `/api/agents/[agent]`
   - Get specific agent info

3. **Agent Chat**: `/api/agents/chat`
   - Send message to agent
   - Get response

4. **Agent Stream**: `/api/agents/stream`
   - Streaming responses
   - Real-time updates

5. **Agent Stats**: `/api/agents/stats`
   - Performance metrics
   - Activity data

### Protected Endpoints

1. **Stripe Webhook**: `/api/stripe/webhook`
   - Payment event handling
   - Lead status updates

2. **Voicemails**: `/api/voicemails`
   - List voicemails
   - Management actions

---

## Security Features

### Authentication & Authorization
- Supabase Auth for admin access
- JWT token validation
- Session management
- Protected routes via middleware

### Data Protection
- Row-level security in Supabase
- Environment variable protection
- API key security
- HTTPS enforcement

### Payment Security
- Stripe PCI compliance
- Webhook signature verification
- Server-side validation
- No card data storage

### Input Validation
- Form validation (client + server)
- SQL injection prevention (Supabase)
- XSS protection
- CSRF protection (Next.js)

---

## Deployment & Environment

### Environment Variables Required

**Database**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Email**:
- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `LEAD_NOTIFICATION_RECIPIENTS`

**Payments**:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Voice**:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**AI**:
- `OPENAI_API_KEY` (for AI agents)

### Deployment Platform
- Vercel (recommended)
- Next.js 16 App Router
- Edge runtime support
- Automatic HTTPS

---

## Future Enhancements

### Planned Features

1. **User Account System**:
   - Customer portal
   - Booking history
   - Document storage

2. **Real-time Tracking**:
   - GPS tracking during move
   - Live updates
   - ETA calculations

3. **Advanced AI Features**:
   - Voice AI for phone calls
   - Predictive lead scoring
   - Automated scheduling

4. **Mobile App**:
   - Customer app
   - Driver app
   - Real-time communication

5. **Enhanced Analytics**:
   - Revenue forecasting
   - Capacity planning
   - Performance dashboards

6. **Integration Expansions**:
   - CRM integration
   - Accounting software
   - Calendar systems

---

## Performance Metrics

### Current Performance
- Lighthouse Score: Target 90+
- Time to Interactive: <3s
- First Contentful Paint: <1.5s
- Core Web Vitals: Green

### Scalability
- Serverless architecture
- Edge caching
- Database indexing
- CDN for static assets

---

## Support & Maintenance

### Error Handling
- Global error boundary
- API error responses
- User-friendly error messages
- Error logging

### Logging
- Console logging (development)
- Error tracking (production)
- Agent activity logs
- API request logs

### Backup & Recovery
- Supabase automatic backups
- Point-in-time recovery
- Data export capabilities

---

Last Updated: December 1, 2025
Version: 1.0.0
