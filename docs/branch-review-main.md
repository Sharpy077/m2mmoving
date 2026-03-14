# Branch Review: `work` vs `main`

Date: 2026-03-14

## Scope & Method

Because this repository does not currently contain a local `main` branch or a configured remote to fetch one from, this review compares the current `work` HEAD (`e6575d2`) against its direct parent commit (`f76a55d`) as the best available approximation of the latest shared baseline.

Commands used:

- `git branch -a`
- `git remote -v`
- `git log --oneline --decorate --graph --all -n 30`
- `git diff --stat f76a55d..HEAD`
- `git diff f76a55d..HEAD -- CLAUDE.md`
- `cat package.json`

## Key Differences Identified

### 1) Documentation-only change set

The branch introduces a large documentation update to `CLAUDE.md` and no application/runtime code changes.

- Files changed: `CLAUDE.md`
- Delta: 172 insertions, 11 deletions
- Theme: mandatory TDD process, workflow, templates, test placement guidance, mocking references, and pre-submission checklist.

### 2) Stronger process expectations for contributors/agents

The updated guidance adds a hard requirement to use Red-Green-Refactor and to write tests before implementation. It also expands testing instructions from a short conventions section to prescriptive templates for server actions, routes, libraries, and React components.

## What Should Be Completed Before Merging to `main`

Since this branch is docs-only, merge readiness is mostly about validating consistency and enforceability:

1. **Confirm branch baseline against true `main`.**
   - Once remote access is configured, run an exact comparison against `origin/main` to verify there are no missing code commits or merge conflicts.

2. **Validate that TDD policy is enforceable, not just documented.**
   - Consider adding CI gates (if not already present), e.g. requiring `pnpm test` on PRs.
   - Optionally add contribution checklist entries in PR template to align with new TDD requirements.

3. **Align all developer-facing docs with the new mandatory TDD statement.**
   - Ensure README / CONTRIBUTING / internal runbooks do not conflict with the new guidance.

4. **Sanity-check template accuracy against current codebase.**
   - Confirm mock import paths and example return shapes remain valid over time to avoid contributors copying stale snippets.

5. **Socialize workflow change with team.**
   - Because this introduces a mandatory engineering process change, confirm maintainers explicitly approve and communicate it.

## Merge Risk Assessment

- **Runtime risk:** Low (no production code changed).
- **Process impact risk:** Medium (new mandatory policy may cause confusion if not consistently enforced across CI and docs).

## Recommendation

Proceed with merge **after** validating against actual `main` and ensuring CI/documentation alignment for the newly mandatory TDD workflow.
