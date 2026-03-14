# Branch Review: `work` vs `main`

## Baseline used for this review

`main` is not available as a local or remote Git ref in this clone, so this review compares `work` against commit `8fee6db` (the last merge commit before the two branch-specific security commits).

## Key differences identified

### 1) Security hardening and dependency hygiene
- `package.json` moved from many `latest` tags to pinned versions for core dependencies and added `pnpm.overrides` for known vulnerable transitive packages (`tar`, `fast-xml-parser`, `undici`, `qs`, `rollup`, `axios`, `esbuild`).
- `pnpm-lock.yaml` was regenerated substantially, consistent with a broad dependency remediation pass.

### 2) Runtime security controls added
- New environment validation module `lib/env.ts` enforces required secrets/URLs at startup.
- `lib/supabase/server.ts` and `lib/stripe.ts` now import `@/lib/env` so missing secrets fail fast.
- New in-memory IP rate limiter (`lib/rate-limit.ts`) is now used in:
  - `app/api/quote-assistant/route.ts`
  - `app/api/agents/chat/route.ts`
- `next.config.mjs` now sets hardened headers globally, including `HSTS`, `X-Frame-Options`, `Permissions-Policy`, and **CSP in report-only mode**.

### 3) Data exposure / observability changes
- Public debug endpoint `app/api/debug-env/route.ts` was removed (good: it exposed env-key presence/prefix information).
- API handlers in several files now avoid returning internal error details to clients and instead log/report internally.
- Monitoring hooks were added in agent and quote-assistant API paths.

### 4) Validation and auth tightening
- Stripe checkout action validates amount bounds before creating sessions.
- Voicemail API now enforces authenticated users for list/update operations.
- Business lookup returns proper `400` on invalid ABN format instead of `200` with an error message.

## What should be completed before merging into actual `main`

1. **Compare against the real `main` ref in CI or a full clone**  
   This local checkout has no `main`/`origin/main` ref; confirm that commit range and conflict surface against the true default branch before merge.

2. **Validate environment rollout for strict startup checks**  
   Because env validation is now imported by Stripe/Supabase server modules, missing keys will hard-fail module load. Ensure all deploy environments (preview/staging/prod) have required vars configured.

3. **Decide CSP rollout plan**  
   CSP is currently `Content-Security-Policy-Report-Only`. Collect/report violations and define a date/checklist to switch to enforcing mode.

4. **Re-run production audit in CI with proper registry auth/network**  
   Local `pnpm audit --prod` returned 403 from npm audit endpoint in this environment, so vulnerability status should be re-verified in CI.

5. **Review lockfile/dependency churn policy**  
   The lockfile change is large; ensure maintainers are comfortable with the version pinning and that release notes for high-impact upgrades (e.g., Next.js/Stripe SDK stack) are reviewed.

## Verification run in this environment

- `pnpm -s test` passed: **31 files, 852 tests passing**.
- `pnpm audit --prod` could not complete due to registry 403 in this environment.
