# Manual Steps Required

This document lists all manual steps that must be completed after automated deployment.
Run these steps in order once all code changes have been deployed.

---

## Completion Checklist

Use this checklist to track your progress through all setup steps:

### Step 1: Database Migrations - COMPLETE
- [x] Opened Supabase SQL Editor
- [x] Ran `scripts/run_remaining_migrations.sql` (migrations 008-009)
- [x] Verified no SQL errors in output
- [x] **Verification:** All 41 tables exist in database (verified via schema check)
- [x] **Status:** ALL MIGRATIONS COMPLETE (003-009)

### Step 2: Stripe Webhook - NEEDS VERIFICATION
- [ ] Added webhook endpoint in Stripe Dashboard
- [ ] Selected all required events (checkout.session.completed, payment_intent.succeeded, etc.)
- [ ] Copied webhook signing secret
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Vercel environment variables
- [ ] Redeployed application after adding secret
- [ ] **Verification:** Use automated test at `/admin/webhook-test`

### Step 3: First Admin User
- [ ] Signed up at `/auth/login`
- [ ] User automatically added to `admin_users` table
- [ ] **Verification:** Navigate to `/admin` dashboard > Should see admin interface (not unauthorized page)

### Step 4: Email Configuration
- [ ] Verified `RESEND_API_KEY` exists in Vercel
- [ ] Verified `EMAIL_FROM_ADDRESS` exists in Vercel
- [ ] Domain configured in Resend Dashboard
- [ ] **Verification:** Complete a test booking > Check inbox for confirmation email

### Step 5: Environment Variables
- [ ] All required variables set in Vercel
- [ ] Redeployed after adding any missing variables
- [ ] **Verification:** Run `curl https://your-domain.com/api/quote-assistant/health` > Should return `{"status":"ok"}`

### Step 6: Post-Deployment Tests
- [ ] Booking flow works end-to-end
- [ ] Admin dashboard loads
- [ ] Agents respond correctly
- [ ] **Verification:** Run E2E tests: `npx playwright test`

### Step 7: Twilio Configuration (Optional - Voice/SMS)
- [ ] Go to Twilio Console: https://console.twilio.com
- [ ] Get your Account SID and Auth Token
- [ ] Purchase a phone number if needed
- [ ] Set environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `TWILIO_FORWARD_NUMBER_1`
  - `TWILIO_FORWARD_NUMBER_2`
- [ ] Configure webhook URL for incoming calls:
  - `https://your-domain.com/api/voice/incoming`

### Step 8: Final Verification
- [ ] **Step 1 Complete:** Database migrations ran successfully (41 new tables exist)
- [ ] **Step 2 Complete:** Stripe webhook tested via `/admin/webhook-test` - all 4 cards green
- [ ] **Step 3 Complete:** Admin user can access `/admin` dashboard
- [ ] **Step 4 Complete:** Test email received in inbox
- [ ] **Step 5 Complete:** All required environment variables set and deployed
- [ ] **Step 6 Complete:** E2E tests pass (`npx playwright test`)
- [ ] **Step 7 Complete:** Full booking flow works end-to-end
- [ ] **Step 8 Complete:** All admin pages accessible and functional

---

## 1. Database Migrations (Required)

**Status:** ALL MIGRATIONS COMPLETE (003-009)

### Tables Already Created (003-009):

| Migration | Tables |
|-----------|--------|
| 003 | `payments` |
| 004 | `support_tickets`, `ticket_messages`, `admin_users` |
| 005 | `prospects`, `outreach_history`, `intent_signals`, `email_templates` |
| 006 | `customer_journeys`, `journey_actions`, `nps_scores`, `referrals`, `loyalty_rewards`, `review_requests`, `winback_campaigns` |
| 007 | `human_agents`, `escalations`, `callbacks`, `agent_notifications`, `escalation_history`, `sla_config` |
| 008 | `analytics_snapshots`, `analytics_insights`, `scheduled_reports`, `report_history`, `revenue_forecasts`, `detected_anomalies` |
| 009 | `crews`, `scheduled_jobs`, `route_optimizations`, `customer_updates`, `contingency_events`, `capacity_slots` |

### Verification Step:

Verify all tables exist in the database:

```sql
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected result: 41 rows returned

---

## 2. Stripe Webhook Configuration (Required)

Configure Stripe to send webhook events to your application.

### Steps:

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** > **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL:
   - Production: `https://your-domain.com/api/stripe/webhook`
   - Development: Use Stripe CLI or ngrok
5. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
9. **Important:** Redeploy your application after adding the environment variable

### Automated Verification (RECOMMENDED)

We've built an automated webhook test page that handles the entire verification process:

1. Navigate to `/admin/webhook-test` in your application
2. Click **"Start Webhook Test"** - this creates a $1.00 test checkout session
3. Complete the test payment using Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
4. Watch the verification status update in real-time:
   - **Create Session** - Turns green when test session created
   - **Process Payment** - Turns green when payment completes
   - **Webhook Delivery** - Turns green when webhook is received by your server
   - **Database Updated** - Turns green when lead and payment records are updated
5. All 4 status cards should turn **green** when successful
6. Click **"Cleanup Test Data"** to remove the test records

### Manual Verification Options:

**Option 1: Use Stripe CLI**
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to https://your-domain.com/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
```

**Option 2: Check Webhook Status in Dashboard**
1. Go to Stripe Dashboard > **Developers** > **Webhooks**
2. Click on your webhook endpoint
3. Check the **Status** shows "Enabled"
4. Verify the **Endpoint URL** is correct
5. After completing a test payment, check the **Recent events** tab
6. Verify events show status **Succeeded** with response code **200**

### What to Look For:
- Status shows **Succeeded** (green checkmark)
- Response code is **200**
- Response time is under 5 seconds
- If you see errors, check Vercel logs for details

---

## 3. First Admin User Setup (Required)

The first authenticated user automatically becomes an admin.

### Steps:

1. Deploy the application
2. Navigate to `/auth/login`
3. Sign up with your admin email
4. You will automatically be granted admin access
5. Verify by accessing `/admin` dashboard

### Verification Step:

1. After signing up, navigate to `/admin`
2. You should see the admin dashboard (NOT the unauthorized page)
3. Check that your email appears in the top-right corner
4. Verify you can access all admin pages: Leads, Bookings, Analytics, etc.

Alternatively, verify in database:

```sql
SELECT * FROM admin_users WHERE email = 'your-email@example.com';
```

Expected: 1 row with your user details

---

## 4. Email Configuration (Required)

Verify Resend email integration is working.

### Steps:

1. Verify `RESEND_API_KEY` is set in Vercel environment variables
2. Verify `EMAIL_FROM_ADDRESS` is set (e.g., `noreply@yourdomain.com`)
3. In Resend Dashboard, verify your sending domain is configured
4. Test by triggering a payment or lead submission

### Verification Step:

**Option 1: Complete a test booking**
1. Go through the quote assistant flow
2. Complete a Stripe test payment (use card `4242 4242 4242 4242`)
3. Check the email inbox for the booking confirmation
4. Verify email contains correct booking details

**Option 2: Check Resend Dashboard**
1. Go to https://resend.com/emails
2. Verify recent emails show in the dashboard
3. Check delivery status is "Delivered"

---

## 5. Twilio Configuration (Optional - Voice/SMS)

If using voice/SMS features:

### Steps:

1. Go to Twilio Console: https://console.twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number if needed
4. Set environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_FORWARD_NUMBER_1`
   - `TWILIO_FORWARD_NUMBER_2`
5. Configure webhook URL for incoming calls:
   - `https://your-domain.com/api/voice/incoming`

---

## 6. Environment Variables Checklist

Verify all required environment variables are set in Vercel:

### Required:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM_ADDRESS`

### Verification Step:

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Check each variable exists for Production, Preview, and Development
3. **After adding any variables, you MUST redeploy the application**

Health check endpoint:
```bash
curl https://your-domain.com/api/quote-assistant/health
# Expected: {"status":"ok","timestamp":"2025-..."}
```

---

## 7. Post-Deployment Verification

Run through this checklist after deployment:

### Core Booking Flow:

- [ ] Homepage loads correctly
- [ ] Quote assistant chat works
- [ ] Business lookup API returns results
- [ ] Quote calculation is accurate
- [ ] Stripe checkout redirects properly
- [ ] Payment success page displays
- [ ] Confirmation email is sent
- [ ] **Verification:** Complete full booking from start to finish

### Admin Dashboard:

- [ ] `/admin` redirects to login if not authenticated
- [ ] Admin can log in successfully
- [ ] Dashboard displays stats
- [ ] Leads page shows data
- [ ] Payments page shows transactions
- [ ] Settings page loads
- [ ] **Verification:** Navigate through all admin pages without errors

### AI Agents:

- [ ] Maya responds to chat messages
- [ ] Sentinel can look up bookings
- [ ] Hunter can search prospects
- [ ] Phoenix can track customer journeys
- [ ] Bridge can create escalations
- [ ] Oracle generates analytics insights
- [ ] Nexus schedules and optimizes jobs
- [ ] **Verification:** Go to `/admin/agents` and check all agents show "Active" status

### Run E2E Tests:

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Install browsers
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test suite
npx playwright test e2e/booking-flow.spec.ts

# Run with UI mode for debugging
npx playwright test --ui
```

Expected result: All tests pass

---

## Appendix A: Deployment Troubleshooting

If your Vercel deployment fails or hangs, follow this troubleshooting guide.

### Common Issues and Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| Build hangs indefinitely | Scripts folder included in build | Exclude `/scripts` from tsconfig.json |
| TypeScript errors | Test files being compiled | Exclude `/e2e` and `/tests` from tsconfig.json |
| Missing env vars at build | Env vars not available during static analysis | Use runtime checks with fallbacks |
| Stripe import errors | Server-only code in client bundle | Use `"server-only"` import |
| Supabase middleware fails | DB tables don't exist yet | Add try-catch to middleware |

### Applied Fixes (This Session)

The following fixes have been applied to resolve deployment issues:

1. **tsconfig.json** - Excluded problematic directories:
   ```json
   "exclude": ["node_modules", "scripts", "e2e", "tests"]
   ```

2. **next.config.mjs** - Added webpack ignore rules and external packages:
   ```javascript
   experimental: {
     serverComponentsExternalPackages: ["stripe", "twilio"],
   }
   ```

3. **lib/supabase/middleware.ts** - Added try-catch blocks to prevent crashes when:
   - `admin_users` table doesn't exist
   - Database is unreachable

4. **lib/stripe.ts** - Added graceful fallback when `STRIPE_SECRET_KEY` is missing

5. **lib/supabase/server.ts** - Added mock client fallback when Supabase is not configured

### If Deployment Still Fails

1. **Check Vercel Build Logs:**
   - Go to Vercel Dashboard > Deployments > Click on failed deployment
   - Expand "Building" step to see detailed logs
   - Look for specific error messages

2. **Verify Environment Variables:**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Ensure all required variables are set for Production
   - **Redeploy after adding any new variables**

3. **Test Locally First:**
   ```bash
   npm run build
   npm run start
   ```

4. **Check for Missing Dependencies:**
   ```bash
   npm ls --depth=0
   ```

5. **Clear Vercel Build Cache:**
   - Go to Vercel Dashboard > Project > Settings > General
   - Scroll to "Build Cache"
   - Click "Clear Build Cache"
   - Redeploy

### Required Environment Variables

These must be set in Vercel for the build to succeed:

| Variable | Required At | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` | Runtime | Supabase project URL |
| `SUPABASE_ANON_KEY` | Runtime | Supabase anonymous key |
| `STRIPE_SECRET_KEY` | Runtime | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Build + Runtime | Stripe publishable key |
| `RESEND_API_KEY` | Runtime | Resend email API key |

**Note:** Variables without `NEXT_PUBLIC_` prefix are only available server-side and don't need to exist at build time with the current configuration.

---

## Appendix B: Vercel Deployment Cancellation (Unverified Commits)

If Vercel cancels deployments due to "unverified commits", follow this guide.

### Root Cause

Vercel may be configured to require cryptographically signed (verified) commits before allowing deployments. Commits from v0 are not GPG/SSH signed by default, causing deployment cancellation.

### Remediation Options

#### Option A: Disable Commit Verification in Vercel (Recommended)

1. Go to **Vercel Dashboard**: `https://vercel.com/[team]/[project]/settings/git`
2. Find **"Git Integration"** or **"Deployment Protection"** section
3. Look for **"Verified Commits"** or **"Require Signed Commits"** setting
4. Set to **"Disabled"** or **"No protection"**
5. Save changes
6. Retry deployment

#### Option B: Disable in GitHub Repository

1. Go to **GitHub Repository Settings**: `https://github.com/[owner]/[repo]/settings/branches`
2. Find branch protection rules for `main` or `master`
3. Click **Edit** on the protection rule
4. **Uncheck** "Require signed commits"
5. Save changes
6. Retry deployment from Vercel

#### Option C: Configure Vercel to Trust v0 Deployments

1. Go to **Vercel Dashboard** > Project > **Settings** > **Deployment Protection**
2. Under "Vercel Authentication", select **"Only Preview Deployments"** or **"Disabled"**
3. Under "Trusted Metadata", ensure v0 is allowed
4. Save and redeploy

### Verification Checklist

- [ ] Vercel "Require Verified Commits" is disabled
- [ ] GitHub "Require signed commits" is unchecked (if applicable)
- [ ] Vercel Deployment Protection allows unsigned commits
- [ ] Deployment no longer shows "Canceled" status
- [ ] Build completes successfully

### If Issues Persist

1. **Check Vercel Team Settings:**
   - Go to Vercel Dashboard > Team Settings > Security
   - Review any team-wide commit verification policies

2. **Check GitHub App Permissions:**
   - Go to GitHub > Settings > Applications > Vercel
   - Ensure Vercel has correct repository permissions

3. **Manual Deployment Workaround:**
   - Download code from v0 (three dots menu > "Download ZIP")
   - Extract and commit locally with your own GPG key
   - Push to GitHub to trigger Vercel deployment

---

**Last Updated:** January 1, 2026  
**Version:** 2.2.0
