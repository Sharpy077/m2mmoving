# E2E Tests for M&M Commercial Moving

## Overview

This directory contains Playwright end-to-end tests that exercise key user and API flows.

## Test Structure

```text
e2e/
├── homepage.spec.ts         # Landing page flow checks
├── quote-assistant.spec.ts  # Maya quote assistant flow checks
├── admin.spec.ts            # Admin dashboard flow checks
├── booking-flow.spec.ts     # Booking journey checks
├── api-health.spec.ts       # Public/API health checks
└── README.md                # This file
```

## Running Tests

### Prerequisites

```bash
npx playwright install
```

### Run all tests

```bash
npx playwright test
```

### Run a specific test file

```bash
npx playwright test e2e/homepage.spec.ts
```

### Run in UI mode

```bash
npx playwright test --ui
```

### Run in debug mode

```bash
npx playwright test --debug
```

### View the HTML report

```bash
npx playwright show-report
```

## Test Configuration

See `playwright.config.ts` for full configuration details.

Common settings include:

- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Base URL: `http://localhost:3000` (or `PLAYWRIGHT_TEST_BASE_URL`)
- Retries: `2` in CI, `0` locally
- Screenshots: on failure
- Videos/trace: on first retry

## CI Integration (Current State)

At the time of writing, the repository contains this GitHub Actions workflow:

- `.github/workflows/azure-container-apps.yml`

That workflow performs container build/push and Azure deployment. It does **not** currently run Playwright tests.

If you want E2E tests in CI, add a dedicated workflow in `.github/workflows/` (for example, `e2e.yml`) that starts the app and runs `npx playwright test`.

## Writing New Tests

```ts
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path')
  })

  test('should do something', async ({ page }) => {
    await expect(page.getByText('Expected Text')).toBeVisible()
  })
})
```

## Troubleshooting

### Tests timing out

- Increase timeout values in `playwright.config.ts`
- Verify the target app/dev server is running

### Element not found

- Add explicit waits for dynamic content where appropriate
- Prefer resilient selectors over brittle CSS chains

### Authentication issues

- Use auth fixtures (if introduced)
- Reuse authenticated `storageState` where applicable
