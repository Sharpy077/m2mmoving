# Testing & Documentation Guide

## Documentation Index

Testing-related docs currently maintained in this repository:

| Document | Purpose |
|---|---|
| [`docs/TESTING_COMPLETE.md`](./TESTING_COMPLETE.md) | Historical testing completion report |
| [`docs/FEATURE_DOCUMENTATION.md`](./FEATURE_DOCUMENTATION.md) | Feature-level documentation |
| [`docs/README.md`](./README.md) | Main docs index |
| [`e2e/README.md`](../e2e/README.md) | End-to-end testing guide |

> Note: older files such as `docs/TEST_RESULTS.md` and `docs/TESTING_SUMMARY.md` are archived under [`docs/archive/`](./archive/).

## Current Test Locations

- Unit/integration tests: [`tests/`](../tests/)
- Feature-focused tests: [`tests/features/`](../tests/features/)
- Consolidated feature suite (TSX): [`tests/features.test.tsx`](../tests/features.test.tsx)
- End-to-end Playwright tests: [`e2e/`](../e2e/)

## How to Run Tests Locally

```bash
npm install
npm test
npm run test:coverage
npx playwright test
```

## Evidence-Based Status

Current repository automation and artifacts show:

- There is an active GitHub Actions workflow for build/deploy: [`.github/workflows/azure-container-apps.yml`](../.github/workflows/azure-container-apps.yml).
- This workflow builds/pushes a Docker image and deploys to Azure Container Apps on pushes to `main`/`master` and manual dispatch.
- No dedicated test-report document is currently maintained at `docs/TEST_RESULTS.md` or `docs/TESTING_SUMMARY.md`.
- No dedicated CI workflow file for E2E tests currently exists in [`.github/workflows/`](../.github/workflows/).

Because public CI run results are not embedded in this repository, avoid absolute claims (for example, specific pass percentages, security grades, or production-readiness guarantees) unless linked to an actual report artifact.
