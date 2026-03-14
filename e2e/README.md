# E2E Tests for M&M Commercial Moving

## Overview

This directory contains end-to-end tests using Playwright to verify the complete user journey and critical paths through the application.

## Test Structure

```
e2e/
├── homepage.spec.ts       # Landing page tests
├── quote-assistant.spec.ts # Maya AI assistant tests
├── admin.spec.ts          # Admin dashboard tests
├── booking-flow.spec.ts   # Complete booking journey
├── api-health.spec.ts     # API endpoint health checks
└── README.md              # This file
```

## Running Tests

### Prerequisites

```bash
# Install Playwright browsers
npx playwright install
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test e2e/homepage.spec.ts
```

### Run Tests in UI Mode

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### View Test Report

```bash
npx playwright show-report
```

## Test Configuration

See `playwright.config.ts` for configuration options:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:3000` (or `PLAYWRIGHT_TEST_BASE_URL` env var)
- **Retries**: 2 in CI, 0 locally
- **Screenshots**: Only on failure
- **Videos**: On first retry
- **Trace**: On first retry

## Writing New Tests

```typescript
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

## CI Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch

Configure in `.github/workflows/e2e.yml` (if using GitHub Actions).

## Troubleshooting

### Tests timing out
- Increase timeout in playwright.config.ts
- Check if dev server is running

### Element not found
- Use `await page.waitForTimeout(1000)` for dynamic content
- Use more flexible selectors (`.or()` chains)

### Authentication issues
- Set up auth fixtures in `e2e/fixtures/`
- Use `test.use({ storageState: 'auth.json' })` for authenticated tests
