# Branch vs Main Review (prepared on `work`)

## Scope and limitation
- A local `main` branch and Git remote were not present in this checkout, so this review uses commit `f4ebff7` (`Merge main: ...`) as the most recent explicit main-integration point visible in history.

## Key differences since last known main merge (`f4ebff7`)

### 1) Marketplace + provider platform was introduced
- Added provider signup/profile APIs and admin/provider pages for onboarding, jobs, and earnings.
- Added marketplace job lifecycle APIs (bid/assign/accept/decline/status/rate).
- Added Stripe Connect onboarding and webhook handling.

### 2) Data model and access-control foundation added
- Added large Supabase migrations for marketplace foundation and RLS policies.
- Added marketplace domain modules (`matching`, `pricing`, `earnings`, `notifications`, schemas/types).

### 3) Agent layer expanded
- Added dispatch agent implementation and orchestration updates.

### 4) Test suite expanded heavily
- Added broad test coverage for marketplace, provider onboarding/verification/earnings, pricing, rate limiting, insurance expiry cron, Twilio routes, and dispatch agent behavior.
- Current branch test status is green locally via `pnpm test` (69 files, 1260 tests passing).

## Merge readiness: what still needs to be completed/implemented

1. **Rebase/merge against actual latest `main` and resolve drift**
   - Because this repository snapshot has no local `main` pointer, you should first fetch the canonical branch and run a fresh diff to detect any conflicts or regressions introduced after `f4ebff7`.

2. **Provider authorization hardening**
   - Middleware currently protects provider routes by checking authentication only, but does not enforce provider role/ownership before portal access.
   - Add role/provider membership enforcement (e.g., `user_profiles.role === 'provider'` and valid `provider_id`) for `/provider/*` protected routes.

3. **Environment + secrets readiness for production rollout**
   - Verify all required env vars and secrets for Stripe Connect, Supabase, and cron/webhook endpoints are present in each deployment environment.
   - Confirm webhook signature secrets and idempotency behaviors are configured end-to-end.

4. **DB rollout + RLS verification in staging**
   - Apply new marketplace migrations in staging and validate RLS behavior with real auth sessions (provider/admin/customer personas).
   - Run smoke tests for key flows: provider register → verify → Stripe onboarding → job assignment/acceptance → payout calculations.

5. **Operational readiness checks**
   - Validate monitoring/alerts on webhook and cron routes.
   - Confirm admin workflows for provider verification and insurance expiry handling work with production-like data volumes.

## Suggested pre-merge checklist
- [ ] Sync with true `main` and resolve merge conflicts.
- [ ] Run full CI (tests, lint, type-check, build) on the post-merge candidate.
- [ ] Run staging migration and RLS validation plan.
- [ ] Validate Stripe Connect onboarding + webhook signatures in staging.
- [ ] Validate provider route authorization semantics.
- [ ] Sign off on admin/provider UAT scenarios.
