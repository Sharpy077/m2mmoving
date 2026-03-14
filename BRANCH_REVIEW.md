# Branch Review: `work` vs presumed `main` baseline

## Scope of this branch

This branch introduces a **documentation-only** change in `CLAUDE.md`.

### Key differences

1. Adds a new core rule: **TDD is mandatory**.
2. Replaces the old "Testing Conventions" section with a full **Test-Driven Development (TDD)** section.
3. Adds:
   - Red/Green/Refactor workflow guidance
   - Updated testing command list
   - Test file placement matrix
   - Domain-specific test templates (server actions, API routes, utilities, React components)
   - Mocking cheat sheet
   - Pre-submission checklist
   - Updated list of existing test categories

## Merge-readiness assessment

### ✅ What is ready

- The branch is self-contained and low risk from a runtime perspective (docs-only).
- Commands referenced in the new TDD section are present in `package.json` scripts:
  - `test`
  - `test:watch`
  - `test:coverage`

### ⚠️ What should be completed before/after merge

1. **Confirm branch base with repository owner**
   - This local clone does not currently contain a `main` branch reference.
   - A canonical comparison target (for example `origin/main`) should be confirmed in CI/remote before final merge.

2. **Add enforcement for the new mandatory policy**
   - The branch sets TDD as mandatory, but there is no automated enforcement in CI yet.
   - Consider adding one or more checks:
     - PR template checkbox requiring tests-first workflow confirmation
     - CI gate for changed source files without corresponding tests
     - Coverage threshold or changed-lines coverage check

3. **Validate examples periodically**
   - The templates in `CLAUDE.md` are useful but can drift over time.
   - Add an owner/review cadence for keeping snippets aligned with current utilities and patterns.

4. **Cross-tooling consistency**
   - If your team uses multiple AI-assistant instruction files (`CLAUDE.md`, `AGENTS.md`, etc.), mirror this TDD policy in each relevant instruction file to avoid mixed guidance.

## Recommendation

Merge is reasonable as a docs-policy update, **provided maintainers treat this as phase 1** and follow with CI/policy enforcement so "mandatory" TDD is verifiable rather than aspirational.
