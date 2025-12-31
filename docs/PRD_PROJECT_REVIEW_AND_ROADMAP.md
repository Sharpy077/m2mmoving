# M&M Commercial Moving - Project Review & Roadmap PRD

**Document Version:** 1.1  
**Review Date:** December 31, 2025  
**Status:** Comprehensive Project Audit - UPDATED  
**Prepared By:** AI Review Agent

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Identified Issues](#3-identified-issues)
4. [Security Assessment](#4-security-assessment)
5. [Code Quality Review](#5-code-quality-review)
6. [Duplicate & Redundancy Analysis](#6-duplicate--redundancy-analysis)
7. [Documentation Review](#7-documentation-review)
8. [Future State Vision](#8-future-state-vision)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Success Metrics](#10-success-metrics)

---

## 1. Executive Summary

### 1.1 Project Overview

M&M Commercial Moving is a Next.js 16 web application providing commercial relocation services in Melbourne, Australia. The platform features an AI-powered quote assistant (Maya), manual quote builder, admin dashboard, and integrations with Stripe, Supabase, Twilio, and OpenAI.

### 1.2 Key Findings

| Category | Status | Summary |
|----------|--------|---------|
| **Core Functionality** | Good | Quote systems, admin dashboard, payments working |
| **AI Assistant (Maya)** | Moderate | Functional but has documented conversation flow issues |
| **Security** | Needs Attention | RLS configured but some gaps in service role usage |
| **Code Quality** | Moderate | Some duplication, unused code, missing error boundaries |
| **Documentation** | Excessive | Multiple overlapping PRDs creating confusion |
| **Database Schema** | Good | Proper RLS policies on all 7 tables |
| **Integration Status** | Good | All integrations connected (Supabase, Stripe, Twilio, Resend) |

### 1.3 Critical Priorities

1. **HIGH:** Consolidate duplicate documentation (14 docs in /docs folder)
2. **HIGH:** Fix Maya conversation reliability issues
3. **MEDIUM:** Remove duplicate font imports in layout.tsx
4. **MEDIUM:** Address missing environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
5. **LOW:** Clean up unused code and console.log statements

---

## 2. Current State Analysis

### 2.1 Technology Stack

| Component | Version | Status |
|-----------|---------|--------|
| Next.js | 16.0.3 | Current |
| React | 19.2.0 | Current |
| TypeScript | 5.x | Current |
| Tailwind CSS | 4.x | Current |
| Supabase | Latest | Connected |
| Stripe | Latest | Connected |
| Twilio | Latest | Connected |
| OpenAI (via Vercel AI SDK) | Latest | Connected |
| Resend | Latest | Connected |

### 2.2 Database Schema (Live)

| Table | RLS Status | Policies |
|-------|------------|----------|
| `availability` | Enabled | 3 policies (insert, select, update) |
| `conversation_analytics` | Enabled | 2 policies (service role) |
| `conversation_sessions` | Enabled | 1 policy (service role) |
| `escalation_tickets` | Enabled | 2 policies (service role) |
| `leads` | Enabled | 3 policies (read, insert, update) |
| `vehicles` | Enabled | 1 policy (public read) |
| `voicemails` | Enabled | 3 policies (read, insert, update) |

### 2.3 Feature Completion Status

| Feature Category | Complete | Partial | Planned | Total |
|------------------|----------|---------|---------|-------|
| User-Facing | 10 | 0 | 0 | 10 |
| Admin-Facing | 4 | 1 | 3 | 8 |
| Technical | 5 | 1 | 1 | 7 |
| Security | 6 | 0 | 0 | 6 |
| Integrations | 5 | 0 | 0 | 5 |
| **Total** | **30** | **2** | **4** | **36** |

**Overall Completion: 83%**

### 2.4 AI Agent System Status

| Agent | Codename | Status | Notes |
|-------|----------|--------|-------|
| Maya (Sales) | MAYA_SALES | Implemented | Quote assistant, conversation issues documented |
| Aurora (Marketing) | AURORA_MKT | Planned | Not started |
| Hunter (Lead Gen) | HUNTER_LG | Planned | Not started |
| Sentinel (Support) | SENTINEL_CS | Planned | Not started |
| Phoenix (Retention) | PHOENIX_RET | Planned | Not started |
| Echo (Reputation) | ECHO_REP | Planned | Not started |
| Oracle (Analytics) | ORACLE_ANL | Planned | Not started |
| Nexus (Operations) | NEXUS_OPS | Planned | Not started |
| Cortex (Orchestrator) | CORTEX_ORCH | Partial | Basic routing exists |

---

## 3. Identified Issues

### 3.1 Critical Issues

#### Issue 1: Maya Conversation Flow Reliability
**Files Affected:** `components/quote-assistant.tsx`, `app/api/quote-assistant/route.ts`  
**Description:** Multiple PRDs document persistent issues with Maya failing to respond after user selections.  
**Impact:** Customer drop-off, lost leads  
**Evidence:** 
- `docs/PRD_MAYA_CONVERSATION_FLOW_FIX.md`
- `docs/PRD_CONVERSATION_ERROR_HANDLING.md`
- `docs/PRD-BUG-FIXES-QUOTE-ASSISTANT.md`

**Root Causes Identified:**
1. Tool calls return but Maya doesn't always generate text response
2. `DefaultChatTransport` usage may be incorrect
3. No watchdog timer to detect non-responses
4. Session state management fragility

#### Issue 2: Missing Environment Variables
**Files Affected:** Supabase integration  
**Description:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing from the environment.  
**Impact:** Client-side Supabase functionality may fail  
**Current Workaround:** Fallback to `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 3.2 Moderate Issues

#### Issue 3: Duplicate Font Imports
**File:** `app/layout.tsx`  
**Description:** Fonts imported twice (once with prefix, once without)
```typescript
// Duplicate imports
import { Oxanium, Source_Code_Pro, Source_Serif_4, Oxanium as V0_Font_Oxanium, Source_Code_Pro as V0_Font_Source_Code_Pro, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'

// Then re-imported again
const oxaniumFont = Oxanium({ subsets: ["latin"], ... })
const _oxanium = V0_Font_Oxanium({ subsets: ['latin'], ... })
```
**Impact:** Increased bundle size, potential font loading issues  
**Fix:** Remove duplicate imports

#### Issue 4: Documentation Overload
**Location:** `/docs/` folder  
**Description:** 14 documents with significant overlap and potential contradictions
- `PRD.md` (main)
- `PRD_MAYA_QUOTE_ASSISTANT_V2.md`
- `PRD_MAYA_CONVERSATION_FLOW_FIX.md`
- `PRD_CONVERSATION_ERROR_HANDLING.md`
- `PRD-BUG-FIXES-QUOTE-ASSISTANT.md`
- `PRD_CLAUDE_MIGRATION.md`
- `FEATURES.md`
- `FEATURE_DOCUMENTATION.md`
- And more...

**Impact:** Confusion about current requirements, difficulty tracking what's implemented  
**Fix:** Consolidate into single source of truth

#### Issue 5: Duplicate Hook Files
**Files Affected:**
- `hooks/use-mobile.ts` AND `components/ui/use-mobile.tsx`
- `hooks/use-toast.ts` AND `components/ui/use-toast.ts`

**Impact:** Import confusion, potential duplicate code  
**Note:** Components import from `@/hooks/*`, but shadcn components may use `components/ui/*`

### 3.3 Low Priority Issues

#### Issue 6: Root-Level Documentation Files
**Files:** `bug-fix.md`, `implementation-plan.md`, `implementation-checklist.md`  
**Description:** Documentation scattered at project root instead of `/docs/`  
**Impact:** Disorganization  
**Fix:** Move to `/docs/` folder

#### Issue 7: Unused Agent Implementations
**Files:** Multiple agent files in `lib/agents/`  
**Description:** Aurora, Hunter, Phoenix, etc. have stub implementations but are not connected  
**Impact:** Dead code increasing complexity  
**Fix:** Either implement or remove stub files

---

## 4. Security Assessment

### 4.1 Security Strengths

| Area | Status | Notes |
|------|--------|-------|
| Row Level Security | Configured | All 7 tables have RLS enabled |
| Authentication | Implemented | Supabase Auth with middleware protection |
| Admin Route Protection | Implemented | Middleware redirects unauthenticated users |
| Payment Security | Implemented | Stripe handles all payment data |
| Environment Variables | Properly Used | No hardcoded secrets in code |

### 4.2 Security Concerns

#### Concern 1: Service Role Key Usage
**Risk Level:** Medium  
**Location:** `app/api/analytics/conversation/route.ts`, `lib/agents/db.ts`  
**Issue:** Service role key used in some API routes. While necessary for certain operations, it bypasses RLS.  
**Recommendation:** Audit all service role usage; ensure it's only used where necessary.

#### Concern 2: Public Lead Submissions
**Risk Level:** Low  
**Table:** `leads`  
**Issue:** Public can insert leads without authentication.  
**Status:** This is intentional for lead capture functionality.  
**Recommendation:** Implement rate limiting on lead submission API.

#### Concern 3: No Rate Limiting on AI API
**Risk Level:** Medium  
**Endpoint:** `/api/quote-assistant`  
**Issue:** No visible rate limiting on AI chat endpoint.  
**Recommendation:** Add rate limiting to prevent abuse.

### 4.3 Security Recommendations

1. **Add Rate Limiting:** Implement rate limiting on all public API endpoints
2. **Audit Service Role Usage:** Review all instances where service role bypasses RLS
3. **Add CSRF Protection:** Ensure all mutating endpoints have CSRF protection
4. **Input Validation:** Add comprehensive input validation on all form submissions
5. **Log Security Events:** Add logging for failed auth attempts, suspicious activity

---

## 5. Code Quality Review

### 5.1 Architecture Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| File Organization | Good | Clear separation of concerns |
| Component Structure | Good | Proper component splitting |
| API Design | Good | RESTful patterns, proper error handling |
| Type Safety | Good | TypeScript throughout |
| State Management | Moderate | Mix of local state, SWR, Supabase |
| Error Handling | Moderate | Try-catch blocks present, but inconsistent |

### 5.2 Code Smells Identified

1. **Large Components:** `quote-assistant.tsx` (831+ lines) and `quote-builder.tsx` (1100+ lines) could be split
2. **Duplicate Logic:** Quote pricing calculated in multiple places
3. **Magic Numbers:** Pricing constants scattered across files
4. **Inconsistent Error Messages:** Different error formats across API routes

### 5.3 Testing Status

| Type | Status | Coverage |
|------|--------|----------|
| Unit Tests | Present | `tests/` folder exists |
| Integration Tests | Present | Feature tests exist |
| E2E Tests | Not Found | No Playwright/Cypress config |
| API Tests | Present | Some route testing |

---

## 6. Duplicate & Redundancy Analysis

### 6.1 No Duplicate Maya Chats Found

**Finding:** There is only ONE Maya chat implementation:
- `components/quote-assistant.tsx` - The AI-powered conversational assistant

The `quote-builder.tsx` is a SEPARATE feature:
- Manual 3-step wizard (not AI-powered)
- Different purpose: structured form vs. conversational AI

**Recommendation:** Both components serve different use cases and should remain separate.

### 6.2 Duplicate Documentation (Critical)

| Document | Overlap With | Recommendation |
|----------|--------------|----------------|
| `PRD_MAYA_QUOTE_ASSISTANT_V2.md` | `PRD.md` Section 3.2 | Merge into PRD.md |
| `PRD_MAYA_CONVERSATION_FLOW_FIX.md` | `PRD-BUG-FIXES-QUOTE-ASSISTANT.md` | Consolidate |
| `PRD_CONVERSATION_ERROR_HANDLING.md` | Above | Consolidate |
| `FEATURES.md` | `FEATURE_DOCUMENTATION.md` | Consolidate |
| `bug-fix.md` (root) | `/docs/` content | Move to /docs |

### 6.3 Duplicate/Redundant Files

| File | Issue | Action |
|------|-------|--------|
| `hooks/use-mobile.tsx` exists in components/ui | Shadcn default | Keep in /hooks, ensure imports consistent |
| Font variables declared twice in layout.tsx | Build artifact | Clean up duplicate imports |
| Multiple testing markdown files | Scattered reports | Consolidate into single test report |

---

## 7. Documentation Review

### 7.1 Documentation Inventory

| File | Purpose | Status | Action |
|------|---------|--------|--------|
| `PRD.md` | Main product requirements | Current | Keep as primary |
| `FEATURES.md` | Feature list | Outdated | Merge into FEATURE_DOCUMENTATION |
| `FEATURE_DOCUMENTATION.md` | Detailed feature specs | Current | Keep |
| `PRD_MAYA_*.md` (3 files) | Maya-specific issues | Redundant | Consolidate |
| `PRD-BUG-FIXES-*.md` | Bug documentation | Redundant | Consolidate |
| `PRD_CLAUDE_MIGRATION.md` | Model migration plan | Reference | Archive |
| `README.md` | Overview | Current | Keep |
| `TESTING_SUMMARY.md` | Test results | Current | Keep |
| `TEST_RESULTS.md` | Detailed test results | Redundant | Merge |
| `feature-test-report.md` | Test report | Redundant | Merge |
| `feature-validation.md` | Validation checklist | Useful | Keep |
| `IMPLEMENTATION_SUMMARY.md` | Implementation notes | Reference | Keep |

### 7.2 Recommended Documentation Structure

```
/docs/
├── PRD.md                      # Main product requirements (single source of truth)
├── FEATURE_DOCUMENTATION.md    # Detailed feature specs
├── TESTING.md                  # Consolidated test documentation
├── CHANGELOG.md                # Version history (new)
├── SECURITY.md                 # Security documentation (new)
└── /archive/                   # Old/superseded documents
    ├── PRD_MAYA_*.md
    ├── PRD_CLAUDE_MIGRATION.md
    └── ...
```

---

## 8. Future State Vision

### 8.1 Short-Term Goals (Q1 2026)

1. **Maya Reliability:** Achieve 99% response rate through watchdog timers and retry logic
2. **Documentation Consolidation:** Single source of truth for all requirements
3. **Code Cleanup:** Remove duplicates, consolidate utilities
4. **Rate Limiting:** Implement on all public APIs
5. **Stripe Webhooks:** Ensure reliable payment confirmation

### 8.2 Medium-Term Goals (Q2 2026)

1. **AI Agent Expansion:** Implement Hunter (lead gen) and Sentinel (support) agents
2. **Customer Portal:** Self-service booking status and updates
3. **Analytics Dashboard:** Real-time business metrics
4. **Performance Optimization:** Sub-2s page loads
5. **E2E Testing:** Playwright test coverage for critical flows

### 8.3 Long-Term Goals (Q3-Q4 2026)

1. **Full AI Salesforce:** All planned agents operational
2. **Mobile Application:** Native iOS/Android apps
3. **GPS Integration:** Real-time fleet tracking
4. **Multi-tenant:** Support for franchise operations
5. **International Expansion:** Multi-region support

---

## 9. Implementation Roadmap

### Phase 1: Stability & Cleanup (Weeks 1-2)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Fix Maya conversation reliability | P0 | 3 days | - |
| Consolidate documentation | P0 | 2 days | - |
| Remove duplicate font imports | P1 | 1 hour | - |
| Add rate limiting to APIs | P1 | 1 day | - |
| Clean up unused agent stubs | P2 | 1 day | - |
| Move root docs to /docs/ | P2 | 1 hour | - |

### Phase 2: Enhancement (Weeks 3-4)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement Stripe webhook handling | P0 | 2 days | - |
| Add E2E tests for booking flow | P1 | 3 days | - |
| Split large components | P1 | 2 days | - |
| Enhance admin settings page | P2 | 2 days | - |
| Add security event logging | P2 | 1 day | - |

### Phase 3: Expansion (Weeks 5-8)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Implement Hunter agent | P1 | 1 week | - |
| Implement Sentinel agent | P1 | 1 week | - |
| Customer portal MVP | P1 | 2 weeks | - |
| Analytics dashboard | P2 | 1 week | - |

---

## 10. Success Metrics

### 10.1 Technical Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Maya Response Rate | ~85% | 99% | 2 weeks |
| Page Load Time | Unknown | <2s | 4 weeks |
| API Error Rate | Unknown | <1% | 2 weeks |
| Test Coverage | Partial | 80% | 8 weeks |
| Documentation Files | 14+ | 5 core | 2 weeks |

### 10.2 Business Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Quote Conversion | Unknown | 30% | Q1 2026 |
| Lead Response Time | Manual | <5 min | Q1 2026 |
| Customer Satisfaction | Unknown | 4.5/5 | Q2 2026 |
| Support Resolution (AI) | N/A | 80% auto | Q2 2026 |

### 10.3 Quality Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Code Duplication | Moderate | Low | 4 weeks |
| Type Coverage | Good | 95% | 4 weeks |
| Security Audit Score | Unknown | A | 4 weeks |
| Accessibility Score | Unknown | WCAG AA | 8 weeks |

---

## Appendix A: Files Requiring Immediate Attention

1. `app/layout.tsx` - Remove duplicate font imports
2. `components/quote-assistant.tsx` - Implement watchdog timer
3. `app/api/quote-assistant/route.ts` - Add rate limiting
4. `/docs/*.md` - Consolidate documentation
5. `bug-fix.md`, `implementation-plan.md` - Move to /docs

## Appendix B: Environment Variable Status

| Variable | Status | Notes |
|----------|--------|-------|
| SUPABASE_URL | Present | Server-side |
| SUPABASE_ANON_KEY | Present | Server-side |
| NEXT_PUBLIC_SUPABASE_URL | **Missing** | Required for client |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | **Missing** | Required for client |
| STRIPE_SECRET_KEY | Present | - |
| STRIPE_PUBLISHABLE_KEY | Present | - |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Present | - |
| STRIPE_WEBHOOK_SECRET | Present | - |
| TWILIO_* | Present | All configured |
| OPENAI_API_KEY | Present | - |
| RESEND_API_KEY | Present | - |

## Appendix C: Agent Implementation Status Matrix

| Agent | Model | API Route | Component | DB Tables | Tests |
|-------|-------|-----------|-----------|-----------|-------|
| Maya | Complete | Complete | Complete | Partial | Partial |
| Aurora | Stub | None | None | None | None |
| Hunter | Stub | None | None | None | None |
| Sentinel | Stub | None | None | None | None |
| Phoenix | Stub | None | None | None | None |
| Echo | Stub | None | None | None | None |
| Oracle | Stub | None | None | None | None |
| Nexus | Stub | None | None | None | None |
| Cortex | Partial | Partial | None | None | None |

---

**End of Document**

*This PRD should be reviewed and updated quarterly or after major releases.*
