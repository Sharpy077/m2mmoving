# Branch vs Main Merge Review

## Scope and Constraints

- Current branch: `work`.
- This local clone does **not** contain a `main` ref (`git branch -a` only shows `work`).
- Attempting to fetch `origin/main` failed due blocked GitHub connectivity (`CONNECT tunnel failed, response 403`).
- Because of that, an exact file-by-file diff against the live `main` tip could not be generated in this environment.

## Best-Available Baseline

A historical commit referenced as `main` in repository history artifacts is available locally: `cb710d5`.
Using `cb710d5..HEAD` as a proxy, this branch appears to include substantial changes across app routes, APIs, components, tests, and docs.

## Key Differences (Proxy Diff: `cb710d5..HEAD`)

### 1) Major product/platform additions
- AI agent infrastructure and routes were added/expanded under `app/api/agents/*` and admin agent UI pages/components.
- Business card feature/pages were added.
- UX/accessibility additions landed (breadcrumbs, skip link, not-found improvements, payment confirmation, quote-flow updates).

### 2) Large code surface changed
- Diff stat indicates broad edits to `app/`, `components/`, `lib/`, `tests/`, and docs.
- The commit history between proxy-main and `HEAD` includes many merges plus repeated "commit changes" entries, indicating integration complexity and potential duplicate/superseded work.

### 3) Test posture is strong, lint posture is blocked
- `pnpm test` passes fully (31 files, 852 tests).
- `pnpm lint` fails because ESLint v9 requires a flat config file (`eslint.config.*`) but none is present.

## What should be completed before merging to main

### Required
1. **Re-establish canonical main comparison**
   - Fetch/track the true `main` and generate a clean diff from merge-base.
2. **Fix lint pipeline**
   - Add/port ESLint flat config (`eslint.config.js|mjs|cjs`) or pin ESLint to a compatible major.
3. **Run full merge gate on true main base**
   - Re-run tests + typecheck + lint after rebasing/merging main.

### Strongly Recommended
4. **Commit hygiene / history cleanup**
   - Consider squashing or curating noisy duplicate commits before merge (if policy allows).
5. **Conflict-risk audit in high-churn files**
   - Prioritize `app/api/quote-assistant/route.ts`, `components/quote-assistant.tsx`, `components/quote-builder.tsx`, and admin/agent files for manual review.
6. **Docs consistency check**
   - Ensure operational docs match current scripts/workflows, especially around lint and testing.

## Evidence References (in-repo)

- Lint/test scripts and toolchain expectations: `package.json` scripts (`lint`, `test`, `type-check`).
- Prior branch-merging context and historical main hash reference: `BRANCH_REVIEW_REPORT.md`.
