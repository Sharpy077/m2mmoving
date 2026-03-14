# Azure Deployment Guide — M&M Commercial Moving

Two deployment options are provided. Choose based on your needs:

| Option | Service | Free Tier | Best For |
|--------|---------|-----------|----------|
| **Option A** | Azure Static Web Apps | Yes (free forever) | Quick preview / UI testing |
| **Option B** | Azure Container Apps | Yes (consumption-based) | Full production features |

---

## Option A — Azure Static Web Apps (Recommended for UI/UX Testing)

**Fastest path to see the app running. Free tier. ~10 minutes to deploy.**

### Prerequisites
- Azure account (free at https://azure.microsoft.com/free)
- GitHub repository with this code
- All environment variables from `.env.example`

### Step 1 — Create the Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Search **"Static Web Apps"** → **+ Create**
3. Fill in:
   - **Subscription**: your subscription
   - **Resource Group**: create new → `m2mmoving-rg`
   - **Name**: `m2mmoving`
   - **Plan type**: `Free`
   - **Region**: `East Asia` (closest to Australia) or `Australia East` if available
   - **Source**: `GitHub`
4. Click **Sign in with GitHub** → authorize → select your repo + `master` branch
5. **Build Details**:
   - Build Preset: `Next.js`
   - App location: `/`
   - Output location: `.next`
6. Click **Review + Create** → **Create**

Azure will automatically create `.github/workflows/azure-static-web-apps.yml` — but we've already created a more complete one. You can delete the auto-generated one.

### Step 2 — Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

```
AZURE_STATIC_WEB_APPS_API_TOKEN    (copy from Azure portal → Static Web App → Manage deployment token)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
RESEND_API_KEY
NEXT_PUBLIC_APP_URL                (your Azure SWA URL, e.g. https://your-app.azurestaticapps.net)
```

### Step 3 — Trigger Deployment

Push to `master` branch — GitHub Actions will build and deploy automatically.

Your app will be live at: `https://<random-name>.azurestaticapps.net`

### Limitations of Azure SWA with Next.js
- Streaming AI responses may have minor latency differences
- Some edge middleware features need testing
- No WebSocket support

---

## Option B — Azure Container Apps (Full Feature Support)

**Recommended for production. Supports all Next.js features including streaming.**

### Prerequisites
- Azure CLI installed: `brew install azure-cli` or https://aka.ms/installazurecli
- Docker installed locally (for local testing)

### Step 1 — Login to Azure CLI

```bash
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### Step 2 — Create Azure Resources

```bash
# Variables
RESOURCE_GROUP="m2mmoving-rg"
LOCATION="australiaeast"
ACR_NAME="m2mmovingacr"
ENV_NAME="m2mmoving-env"
APP_NAME="m2mmoving-app"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Apps environment (free consumption tier)
az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Create container app (will be updated by CI/CD)
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3
```

### Step 3 — Create Azure Service Principal for GitHub Actions

```bash
az ad sp create-for-rbac \
  --name "m2mmoving-github-actions" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

Copy the JSON output and add it as a GitHub secret named `AZURE_CREDENTIALS`.

### Step 4 — Add GitHub Secrets

Same secrets as Option A, plus:
```
AZURE_CREDENTIALS    (JSON from step above)
```

### Step 5 — Deploy

Push to `master` — the `azure-container-apps.yml` workflow will build the Docker image and deploy.

Your app URL: `https://<app-name>.<random>.<region>.azurecontainerapps.io`

---

## Local Docker Testing (Before Azure Deployment)

Test the Docker build locally before pushing:

```bash
# Build the image
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-key \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  -t m2mmoving:local .

# Run with all env vars
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e STRIPE_SECRET_KEY=your-key \
  -e STRIPE_WEBHOOK_SECRET=your-key \
  -e TWILIO_ACCOUNT_SID=your-sid \
  -e TWILIO_AUTH_TOKEN=your-token \
  -e TWILIO_PHONE_NUMBER=+61xxxxxxxxx \
  -e RESEND_API_KEY=your-key \
  m2mmoving:local
```

Visit http://localhost:3000

---

## Post-Deployment Webhook Updates

After deployment, update these external service webhooks to point to your Azure URL:

### Stripe
- Dashboard → Webhooks → Add endpoint
- URL: `https://your-azure-url/api/stripe/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Twilio
- Console → Phone Numbers → your number → Voice Configuration
- Incoming calls: `https://your-azure-url/api/voice/incoming`
- Status callback: `https://your-azure-url/api/voice/status`

### Supabase Auth
- Project Settings → Auth → URL Configuration
- Site URL: `https://your-azure-url`
- Redirect URLs: add `https://your-azure-url/auth/callback`

---

## Cost Estimate

| Service | Free Tier |
|---------|-----------|
| Azure Static Web Apps | Free (100 GB bandwidth/month) |
| Azure Container Apps | Free (180,000 vCPU-seconds/month) |
| Azure Container Registry | ~$5/month if used |

For UI/UX testing, **Azure Static Web Apps (Option A) is completely free**.
