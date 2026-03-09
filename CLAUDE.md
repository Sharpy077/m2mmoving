# CLAUDE.md — M&M Commercial Moving

AI assistant guide for understanding and working with this codebase.

---

## Project Overview

**M&M Commercial Moving** is a production-ready commercial moving SaaS application built for Australian businesses. It features an AI-powered quote system, multi-agent architecture, Stripe payments, Twilio communications, and a full admin dashboard.

- **Hosting:** Vercel
- **Database:** Supabase (PostgreSQL)
- **AI/LLM:** OpenAI GPT-4o via Vercel AI SDK
- **Payments:** Stripe
- **Communications:** Twilio (voice/SMS) + Resend (email)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Components | Radix UI primitives via shadcn/ui (56+ components) |
| Forms | React Hook Form + Zod 3.25 |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth with SSR session management |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| Payments | Stripe + `@stripe/react-stripe-js` |
| Voice/SMS | Twilio |
| Email | Resend + `@react-email/render` |
| Testing | Vitest 2 + Testing Library + happy-dom |
| Animation | Framer Motion |
| Icons | Lucide React |

---

## Repository Structure

```
m2mmoving/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (fonts, metadata, analytics)
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles + CSS variables
│   ├── not-found.tsx           # 404 page
│   ├── (admin)/                # Route group: admin section
│   │   ├── admin/page.tsx      # Admin dashboard
│   │   ├── admin/voicemails/   # Voicemail management
│   │   └── admin/settings/     # Settings page
│   ├── auth/                   # Authentication routes
│   │   ├── login/page.tsx
│   │   ├── login/loading.tsx
│   │   └── logout/route.ts     # API route: logout
│   ├── quote/                  # Quote builder route
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── business-card/          # Business card page
│   ├── actions/                # Server actions
│   │   ├── auth.ts             # Login/logout actions
│   │   ├── leads.ts            # Lead submission
│   │   └── stripe.ts           # Payment actions
│   └── api/                    # API route handlers
│       ├── quote-assistant/    # AI chat completions (streaming)
│       ├── agents/             # Multi-agent endpoints (chat, stream, stats)
│       ├── business-lookup/    # ABN (Australian Business Number) lookup
│       ├── availability/       # Calendar availability
│       ├── voicemails/         # Voicemail CRUD
│       ├── fleet-stats/        # Fleet statistics
│       ├── stripe/webhook/     # Stripe webhook handler
│       ├── voice/              # Twilio webhook handlers
│       │   ├── incoming/       # Incoming call handling
│       │   ├── voicemail/      # Voicemail recording
│       │   ├── status/         # Call status updates
│       │   └── transcription/  # Voice transcription
│       └── debug-env/          # Environment debug (dev only)
│
├── components/                 # React components
│   ├── quote-assistant.tsx     # AI-powered quote chat (~50 KB)
│   ├── quote-builder.tsx       # Step-by-step quote form (~47 KB)
│   ├── custom-quote-form.tsx   # Complex/custom quote requests
│   ├── admin-dashboard.tsx     # Admin lead management
│   ├── voicemails-dashboard.tsx
│   ├── hero-section.tsx        # Landing page hero
│   ├── services-section.tsx
│   ├── stats-section.tsx
│   ├── testimonials-section.tsx
│   ├── trust-bar.tsx
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── payment-confirmation.tsx
│   ├── error-boundary.tsx
│   ├── theme-provider.tsx
│   └── ui/                     # shadcn/ui component library (56 components)
│
├── lib/                        # Shared libraries and business logic
│   ├── agents/                 # Multi-agent AI system
│   │   ├── base-agent.ts       # Abstract agent class
│   │   ├── types.ts            # Agent type definitions
│   │   ├── db.ts               # Agent DB operations
│   │   ├── schema.sql          # Agent tables schema
│   │   ├── index.ts            # Agent registry
│   │   ├── maya/               # Quote assistant agent
│   │   ├── aurora/             # Response coordinator
│   │   ├── bridge/             # Integration handler
│   │   ├── cipher/             # Security agent
│   │   ├── cortex/             # Orchestrator
│   │   ├── echo/               # Communication relay
│   │   ├── guardian/           # Access control
│   │   ├── hunter/             # Lead prospecting
│   │   ├── nexus/              # Connection manager
│   │   ├── oracle/             # Prediction/analytics
│   │   ├── phoenix/            # Recovery/escalation
│   │   ├── prism/              # Data transformation
│   │   └── sentinel/           # Monitoring/alerts
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   └── middleware.ts       # Session management
│   ├── stripe.ts               # Stripe SDK configuration
│   ├── stripe-errors.ts        # Stripe error handling
│   ├── twilio.ts               # Twilio SDK configuration
│   ├── email.ts                # Resend email service
│   ├── validation.ts           # Shared form validation
│   ├── monitoring.ts           # Application monitoring
│   ├── types.ts                # Global TypeScript types
│   ├── utils.ts                # General utilities (cn, etc.)
│   ├── landing/                # Landing page utilities
│   ├── quote/                  # Quote calculation logic
│   ├── leads/                  # Lead management logic
│   └── voicemails/             # Voicemail utilities
│
├── hooks/                      # Custom React hooks
│   ├── use-agent-chat.ts       # Agent chat state hook
│   ├── use-toast.ts            # Toast notifications
│   ├── use-mobile.ts           # Mobile viewport detection
│   ├── use-form-persistence.ts # Form state persistence
│   ├── use-beforeunload.ts     # Unsaved changes warning
│   └── use-error-recovery.ts  # Error recovery logic
│
├── supabase/
│   └── migrations/             # Database migration SQL files
│
├── tests/                      # Vitest test suite (250+ tests)
├── scripts/                    # SQL scripts for table creation
├── public/                     # Static assets
├── docs/                       # Project documentation (PRD, features, tests)
├── middleware.ts               # Next.js middleware (Supabase session)
├── next.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── components.json             # shadcn/ui config
```

---

## Development Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm test         # Run all tests with Vitest
pnpm lint         # Run ESLint
```

> **Package manager:** `pnpm` (use pnpm-lock.yaml, never npm or yarn)

---

## Environment Variables

Copy these into `.env.local` for local development:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Resend
RESEND_API_KEY=
```

---

## Code Conventions

### TypeScript
- **Strict mode** is enabled — no implicit `any`, full type coverage
- Use `@/` path alias for all imports (maps to project root)
- Define prop types inline using interfaces or `type` — export when shared
- Prefer `type` over `interface` for object shapes unless extending

### File Naming
- **Kebab-case** for all files: `quote-builder.tsx`, `use-toast.ts`
- **PascalCase** for React component names (the export, not filename)
- Server actions in `app/actions/`, not co-located with pages

### Components
- Default to **Server Components** (no `"use client"`)
- Add `"use client"` only when using hooks, event handlers, or browser APIs
- Use **shadcn/ui** components from `components/ui/` — do not rewrite primitives
- Install new shadcn components with `npx shadcn@latest add <component>`

### Styling
- **Tailwind CSS v4** — utility-first, no CSS modules
- Use `cn()` from `lib/utils.ts` for conditional class merging (clsx + tailwind-merge)
- CSS variables defined in `app/globals.css` use **oklch color space**
- Dark mode supported via `next-themes` and `dark:` Tailwind variants
- Do not write raw CSS unless absolutely necessary

### Forms
- Use **React Hook Form** with **Zod** schema validation
- Zod schemas defined in `lib/validation.ts` or co-located with the form
- Use `@hookform/resolvers/zod` for integration

### Database (Supabase)
- All database access goes through `lib/supabase/server.ts` (server) or `lib/supabase/client.ts` (browser)
- Write new tables as SQL migration files in `supabase/migrations/`
- Use Row-Level Security (RLS) policies for all user-facing tables
- The `scripts/` directory has ad-hoc SQL for manual table setup — prefer migrations

### Server Actions
- Defined in `app/actions/*.ts`
- Use `"use server"` directive at top of file
- Always validate inputs with Zod before database operations
- Return `{ error: string } | { success: true, data: ... }` shape for consistent error handling

### API Routes
- Located in `app/api/*/route.ts`
- Follow REST conventions: GET for reads, POST for creates, PATCH/PUT for updates
- Stripe and Twilio webhooks use POST and verify signatures before processing
- Streaming AI responses use `StreamingTextResponse` or equivalent from Vercel AI SDK

### AI Agents
- All agents extend `BaseAgent` from `lib/agents/base-agent.ts`
- Each agent lives in its own directory under `lib/agents/<codename>/`
- Agent names are codenames: Maya (quotes), Aurora, Bridge, Cipher, Cortex, Echo, Guardian, Hunter, Nexus, Oracle, Phoenix, Prism, Sentinel
- Agent DB operations (conversations, messages, handoffs) use `lib/agents/db.ts`
- The orchestrator agent is **Cortex** — route complex multi-agent flows through it

### Testing
- All tests use **Vitest** with `@testing-library/react`
- Test files live in `tests/` directory with `.test.ts` or `.test.tsx` extensions
- Run a single test file: `pnpm test tests/quote-builder.test.tsx`
- Mock Supabase, Stripe, Twilio, and OpenAI in tests — never call real APIs
- Test setup file: `tests/setupTests.ts`

---

## Key Architectural Patterns

### Authentication Flow
1. Middleware (`middleware.ts`) calls `updateSession()` on every request
2. Supabase SSR client reads/refreshes tokens from cookies
3. Protected routes (e.g., `/admin`) check session in the server component
4. Login via `app/actions/auth.ts` → redirects to `/admin`

### Quote Flow
1. User visits `/quote` → `QuoteBuilder` component (multi-step form)
2. Optionally uses `QuoteAssistant` (AI chat) for natural language quotes
3. Quote data submitted via server action → stored in Supabase `leads` table
4. Admin notified via email (Resend) and sees lead in admin dashboard
5. Payment via Stripe if deposit required

### AI Quote Assistant
- API route: `app/api/quote-assistant/route.ts`
- Uses Vercel AI SDK streaming with OpenAI GPT-4o
- Maya agent (`lib/agents/maya/`) handles conversation context
- Conversation history stored in Supabase agent tables

### Stripe Payment Flow
1. Server action in `app/actions/stripe.ts` creates PaymentIntent
2. Client uses `@stripe/react-stripe-js` Elements for card input
3. Webhook at `app/api/stripe/webhook/route.ts` handles `payment_intent.succeeded`
4. Lead record updated with payment status

### Twilio Voice Flow
1. Incoming call hits `app/api/voice/incoming/route.ts`
2. TwiML response routes call or triggers voicemail
3. Voicemail recording stored, transcription requested
4. Transcription webhook: `app/api/voice/transcription/route.ts`
5. Voicemail visible in admin at `/admin/voicemails`

---

## Important Notes for AI Assistants

1. **Never use `npm` or `yarn`** — this project uses `pnpm`
2. **Never bypass TypeScript errors** with `// @ts-ignore` or by setting `noEmit: false` — fix the type
3. **next.config.mjs** currently ignores TypeScript build errors (`ignoreBuildErrors: true`) — this is intentional for deployment, but fix types in code anyway
4. **Tailwind CSS v4** syntax differs from v3 — use PostCSS plugin approach, not `@tailwind` directives
5. **Images are unoptimized** (`unoptimized: true` in next.config.mjs) — this is intentional
6. **Zod version is 3.25** — some Zod v4 APIs may not be available
7. **React 19 + Next.js 16** — async server components and improved Actions are available
8. **Path alias `@/`** resolves to the project root (not `src/`) — check `tsconfig.json`
9. **Agent codenames** are fixed — do not rename agents without updating all references in `lib/agents/index.ts`
10. **Supabase migrations** are append-only — never modify existing migration files, always create new ones

---

## Testing Conventions

```bash
pnpm test                          # Run all tests
pnpm test tests/quote-builder      # Run specific test file
pnpm test --reporter=verbose       # Verbose output
pnpm exec vitest ui                # Open Vitest UI dashboard
```

Test categories in `tests/`:
- `features.test.tsx` — comprehensive feature coverage (primary test suite)
- `security.test.ts` — auth, validation, XSS/injection prevention
- `api-endpoints.test.ts` — API route testing with mocked services
- `stripe-webhook.test.ts` — payment webhook handling
- `twilio.test.ts` — voice/SMS integration tests

---

## Database Schema Summary

Key tables (PostgreSQL via Supabase):

| Table | Purpose |
|-------|---------|
| `leads` | Customer quote/lead submissions |
| `voicemails` | Twilio voicemail recordings + transcriptions |
| `availability` | Calendar booking slots |
| `vehicles` | Fleet vehicle management |
| `agent_conversations` | AI agent conversation sessions |
| `agent_messages` | Individual messages in conversations |
| `agent_handoffs` | Agent-to-agent handoff records |
| `agent_escalations` | Escalation tracking |

---

## Deployment

- **Platform:** Vercel (auto-deploy from `master` branch)
- **Build command:** `next build`
- **Output:** `.next/`
- **Environment variables:** Set in Vercel project settings
- **Database migrations:** Run manually via Supabase dashboard or CLI before deploying schema changes

---

## Documentation

- `docs/PRD.md` — Full product requirements document
- `docs/FEATURE_DOCUMENTATION.md` — Feature specifications
- `docs/TEST_RESULTS.md` — Detailed test analysis
- `implementation-plan.md` — UX improvement roadmap
- `BRANCH_REVIEW_REPORT.md` — Code review findings
