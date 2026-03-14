# Branch Review: `work` vs `main`

## Scope and comparison note
- A local `main` branch/reference is not present in this checkout, and no `origin` remote is configured.
- For this review, I used the latest historical merge-from-main commit (`f4ebff7`) as the practical baseline to identify what this branch adds.

## Key differences introduced on this branch
- Major marketplace expansion: provider onboarding, provider dashboards, marketplace job APIs, earnings, and admin provider operations.
- New Supabase foundation and RLS migrations for multi-sided marketplace entities (`providers`, `marketplace_jobs`, `job_bids`, `marketplace_payouts`, `provider_availability`, `user_profiles`).
- New Stripe Connect onboarding and webhook handling flow for provider payouts.
- Expanded agent-side logic including dispatch agent scaffolding and marketplace modules.
- Significant new automated coverage across onboarding, verification, jobs, notifications, earnings, insurance cron, and marketplace foundation.

## Merge blockers / high-priority fixes
1. **Status mismatch in job decline route**
   - `POST /api/marketplace/jobs/[id]/decline` writes `status: 'pending'` to `marketplace_jobs`.
   - `pending` is **not** a valid `marketplace_jobs.status` value in the schema/type/migration constraints.
   - Result: runtime DB constraint failure once this route is exercised against real Postgres.

2. **Column mismatch in accept/decline routes**
   - Accept/decline logic references `offer_sent_at` on `marketplace_jobs`.
   - `offer_sent_at` is not defined in the marketplace foundation migration.
   - Result: route queries/updates will fail in production DB unless migration or code is aligned.

3. **Authorization hardening needed on mutable marketplace endpoints**
   - Several routes trust a client-provided `provider_id` and do not derive actor identity from session (`auth.getUser`) before state transitions.
   - This should be tightened to server-derived user/provider identity and role checks before merge.

## Should-complete before merge (recommended)
1. **Reconcile state model end-to-end**
   - Pick canonical job statuses and enforce consistency across:
     - DB checks
     - Zod schemas
     - Type unions
     - API transitions/tests

2. **Reconcile DB schema vs API code**
   - Either add missing columns used by APIs (e.g., `offer_sent_at`) via migration, or remove from API logic.

3. **Concurrency safeguards for accept/assign flows**
   - Add conditional updates / transactional guards for race scenarios (e.g., two accepts / stale reads).

4. **Production merge prep tasks**
   - Ensure migration ordering and idempotency strategy is defined for existing environments.
   - Run full CI including type-check, lint, and integration tests against a real Postgres-backed Supabase instance.
   - Re-run branch comparison against the actual remote `main` once remote tracking is configured.

## Quick readiness verdict
- **Feature scope:** substantial and mostly implemented.
- **Merge readiness:** **not ready yet** until status/column mismatches and endpoint auth hardening are resolved.
