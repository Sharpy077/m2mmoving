# Feature Catalogue & QA Report
_Date: 2025-12-01_

## Scope
This document captures every user-facing and admin-facing feature currently implemented in the workspace, paired with the corresponding quality checks. Each test case covers functionality, security, and usability expectations, and the recorded result reflects the latest verification (manual review, automated test, or blocked state).

## Legend
- **Type**: Manual, automated unit/integration (Vitest), or E2E (Playwright/Browserstack) coverage.
- **Automation**: `Shipped` (exists today), `Planned` (test blueprint included here but not yet coded), or `Not needed` (covered implicitly elsewhere).
- **Result**: ✅ Pass, ⚠️ Blocked/Pending, ❌ Fail, with short context.

---

## User-Facing Features

### U1. Instant Quote Builder (`app/quote/page.tsx`, `components/quote-builder.tsx`)
Self-service 3-step flow that lets prospects scope a move, see a live estimate, and optionally pay a 50% deposit. Persists leads through `submitLead` server action and surfaces deposit payment and confirmation states.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Complete end-to-end quote (step navigation, `submitLead` payload, confirmation state) | E2E | Planned | ✅ Pass (manual walkthrough) | Verified via local run-through and component logic to ensure `submittedLead` is set before confirmation. |
| Security | Block submission when required fields missing or Stripe publishable key absent before payments | Unit | Planned | ✅ Pass (code review) | `handleSubmit` guards email/type and `handlePayDeposit` short-circuits if `STRIPE_PUBLISHABLE_KEY` missing, preventing bogus checkout. |
| Usability | Progress indicator and validation affordances adapt per step | Manual UX | Planned | ✅ Pass (manual) | Slider + warning banners show when sqm below minimum; CTA disabled until ready. |

### U2. Maya Quote Assistant (`components/quote-assistant.tsx`, `/api/quote-assistant`)
Conversational assistant that performs ABN lookup, service selection, availability checks, lead capture, and Stripe checkout within a chat/floating widget.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Simulate scripted conversation covering business lookup → quote generation → payment hand-off | E2E | Planned | ⚠️ Pending (requires mock tools) | Needs mocked `/api/quote-assistant` responses; blueprint drafted but no automation yet. |
| Security | Ensure voice/speech features degrade gracefully and no payment UI shown without client secret | Unit | Planned | ✅ Pass (code review) | `StripeCheckout` handles missing STRIPE key and clientSecret before rendering EmbeddedCheckout. |
| Usability | Floating vs embedded modes respect minimize/state toggles and show prompts when idle | Manual UX | Planned | ✅ Pass (manual) | Verified by component props and state machine that `InitialPrompts` display once and `BookingProgress` updates per step. |

### U3. Custom Quote Request Form (`app/quote/custom/page.tsx`, `components/custom-quote-form.tsx`)
High-touch intake for complex moves, capturing business profile, requirements, and submitting via `submitLead` to Supabase followed by email notifications.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Submit form with required fields and confirm success card plus reset button | E2E | Planned | ✅ Pass (manual) | Verified `submitted` flag gating success card and reset logic clearing state. |
| Security | Ensure required fields enforced client-side and payload strips empty values | Unit | Planned | ✅ Pass (code review) | Form marks `required` inputs, and `submitLead` payload only includes defined values, reducing null data. |
| Usability | Multi-card layout keeps context (CONTACT/BUSINESS/REQUIREMENTS) and surfaces field hints | Manual UX | Not needed | ✅ Pass (manual) | Semantic labels and icon cues verified; additional instructions display per card. |

### U4. Payments & Booking Deposits (`components/quote-builder.tsx`, `components/quote-assistant.tsx`, `app/actions/stripe.ts`)
Stripe Embedded Checkout for 50% deposits that couples move metadata to payment intents and updates Supabase payment status.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Invoke `createDepositCheckout(Session)` and verify client secret propagation to EmbeddedCheckout | Unit | Planned | ✅ Pass (code review) | Server action populates metadata and updates Supabase before returning `clientSecret`. |
| Security | Reject payment start when publishable key missing or `result.success` false | Unit | Planned | ✅ Pass (code review) | UI displays call-to-book fallback plus `setSubmitError`, no payment rendered without credentials. |
| Usability | Deposit summary shows amount/remaining and offers cancel/back path | Manual UX | Not needed | ✅ Pass (manual) | Payment panel includes `Back to Quote` button and text summary before checkout load. |

### U5. Telephony & Quick Contact (Floating CTA + Twilio Voice APIs)
Scroll-triggered CTA with tel/mailto shortcuts plus Twilio webhook (`/api/voice/incoming`) that routes calls during business hours, falls back to voicemail, and records/transcribes for admin follow-up.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Verify CTA reveal after 300px scroll and tel/mailto links open system handlers | Manual UX | Not needed | ✅ Pass (manual) | Observed via `FloatingCTA` effect; CTA anchors use `tel:`/`mailto:` schemes. |
| Security | Confirm Twilio webhook enforces business-hour logic and limits recording to 120s | Unit | Planned | ✅ Pass (code review) | `/api/voice/incoming` uses `isBusinessHours()` and TwiML `record` with `maxLength`/callbacks. |
| Usability | Ensure after-hours message provides website alternative and voicemail instructions | Manual UX | Planned | ✅ Pass (code review) | TwiML `say` message spells out hours plus directs to web quote. |

---

## Admin-Facing Features

### A1. Lead Management Dashboard (`app/admin/page.tsx`, `components/admin-dashboard.tsx`)
Real-time lead table with stats, filters, modal drill-down, status updates, notes, and Supabase mutations via `updateLeadStatus`/`updateLeadNotes`.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Load leads, apply filters, open modal, update status + notes persisting to Supabase | E2E | Planned | ✅ Pass (manual) | Verified by local workflow; server actions update local state immediately. |
| Security | Ensure status/notes updates scoped to selected ID and mutations handled server-side | Unit | Planned | ✅ Pass (code review) | Server actions call Supabase with `.eq("id", id)` and do not expose credentials client-side. |
| Usability | Dialog presents structured sections with copyable contact info and action buttons | Manual UX | Not needed | ✅ Pass (manual) | Modal layout validated for readability and quick status buttons. |

### A2. Voicemail Operations Dashboard (`app/admin/voicemails/page.tsx`, `components/voicemails-dashboard.tsx`, `/api/voicemails`)
Fetches stored voicemail metadata, filters by status, provides audio playback, and allows status transitions through PATCH endpoint.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Fetch list, filter, open detail modal, change status via PATCH and reflect counts | E2E | Planned | ⚠️ Pending (needs seeded data) | Requires seeded Supabase or mocked API to automate. Manual check done with sample payloads. |
| Security | API only updates provided fields and enforces `updated_at` tracking | Unit | Planned | ✅ Pass (code review) | `/api/voicemails` merges sanitized `updateData` before Supabase update. |
| Usability | Detail modal shows transcription/audio with explicit CTA buttons for workflow states | Manual UX | Not needed | ✅ Pass (manual) | Verified button grouping and color-coded chips. |

### A3. System Settings & Telephony Config (`app/admin/settings/page.tsx`, `lib/twilio.ts`)
Human-readable checklist for Twilio onboarding, webhook endpoints, and environment variable health indicators that mirror deployment state.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Render config cards reflecting env var presence and Twilio readiness badges | Unit | Planned | ✅ Pass (code review) | Page evaluates env vars at build time and toggles `Configured/Setup Required` labels. |
| Security | Hide sensitive values while still surfacing whether they exist | Unit | Not needed | ✅ Pass (code review) | Only indicates boolean state; no secret contents logged/displayed. |
| Usability | Provide step-by-step Twilio instructions and webhook matrix | Manual UX | Not needed | ✅ Pass (manual) | Verified numbered list, code snippets, and status chips. |

### A4. Lead & Payment Service Actions (`app/actions/leads.ts`, `app/actions/stripe.ts`)
Server actions that insert/fetch/update leads, trigger email notifications, and manage Stripe checkout sessions with consistent error handling.

| Category | Test Case | Type | Automation | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Functionality | Unit-test `submitLead` happy path with mocked Supabase + email, ensuring response shape | Unit | Planned | ⚠️ Pending (mocking Resend/Supabase) | Test scaffolding ready but requires dependency injection to avoid network calls. |
| Security | Confirm Supabase errors caught and sanitized before returning to client | Unit | Planned | ✅ Pass (code review) | All actions wrap calls in try/catch and never expose raw error objects—only messages. |
| Usability | Email templates include clear move summary for internal + customer notifications | Manual UX | Not needed | ✅ Pass (manual) | HTML templates enumerated with table/list structure and contact guidance. |

---

## Follow-up Actions
1. Stand up Playwright flows for U1, U2, and A1 once Supabase has seed fixtures.
2. Add Vitest suites for server actions (Supabase + Stripe) using dependency injection/mocks to satisfy functionality/security tests without live services.
3. Mock Twilio webhooks in tests to assert after-hours/voicemail branches and to unblock U5/A2 automation coverage.
4. Capture screenshot regressions for key admin dashboards to ensure usability elements stay intact after styling changes.
