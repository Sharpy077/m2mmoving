# M&M Commercial Moving

Production-ready commercial moving SaaS for Australian businesses — AI-powered quotes, Stripe payments, Twilio voice, and a full admin dashboard.

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # fill in your keys
pnpm dev                     # http://localhost:3000
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant guide — tech stack, conventions, TDD |
| [docs/PRD.md](./docs/PRD.md) | Full product requirements |
| [docs/FEATURE_DOCUMENTATION.md](./docs/FEATURE_DOCUMENTATION.md) | Feature specifications |
| [docs/azure-deploy.md](./docs/azure-deploy.md) | Azure deployment guide |
| [docs/MANUAL_STEPS.md](./docs/MANUAL_STEPS.md) | Manual setup steps |
| [docs/implementation-plan.md](./docs/implementation-plan.md) | UX improvement roadmap |
| [docs/README_TESTING.md](./docs/README_TESTING.md) | Testing guide |
| [docs/sql/](./docs/sql/) | Reference SQL scripts (canonical schema: `supabase/migrations/`) |

## Tech Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase · OpenAI · Stripe · Twilio · Resend

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build
pnpm test         # Run all tests (Vitest)
pnpm lint         # ESLint
```
