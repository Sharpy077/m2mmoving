# M&M Commercial Moving - Consolidated Documentation

**Last Updated:** December 31, 2025  
**Status:** Active  
**Version:** 2.0

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [PRD_PROJECT_REVIEW_AND_ROADMAP.md](./PRD_PROJECT_REVIEW_AND_ROADMAP.md) | Current state analysis & roadmap |
| [FEATURE_DOCUMENTATION.md](./FEATURE_DOCUMENTATION.md) | Detailed feature specifications |
| This Document | Consolidated overview & archive index |

---

## 1. Project Overview

M&M Commercial Moving is a Next.js 16 web application providing commercial relocation services in Melbourne, Australia. The platform features:

- **Maya AI Assistant** - Conversational quote and booking system
- **Admin Dashboard** - Lead management, analytics, and operations
- **Payment Integration** - Stripe for deposits and payments
- **Communication** - Twilio SMS/Voice, Resend email

### Tech Stack

| Component | Version |
|-----------|---------|
| Next.js | 16.0.3 |
| React | 19.2.0 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Supabase | Latest |
| Stripe | Latest |
| AI SDK | Latest |

---

## 2. Feature Status Summary

### Completed (30/36 - 83%)

**User-Facing:**
- Homepage with service showcase
- Maya AI Quote Assistant (primary booking method)
- Contact page
- Service detail pages
- Responsive mobile design
- Accessibility (WCAG 2.1 AA)

**Admin:**
- Authentication (Supabase Auth)
- Lead management dashboard
- Availability calendar
- Voicemail management

**Technical:**
- Supabase integration with RLS
- Stripe payment processing
- Twilio communications
- Email confirmations (Resend)

### Remaining (6 features)

1. **Stripe Webhook Reliability** - Ensure payment confirmations are always processed
2. **Admin Settings Page** - Complete configuration UI
3. **E2E Testing** - Playwright test coverage
4. **Hunter Agent** - Automated lead generation
5. **Sentinel Agent** - Customer support automation
6. **Analytics Dashboard** - Real-time business metrics

---

## 3. Architecture Decisions

### Why Maya AI Instead of Manual Forms

The `/quote` page now uses the Maya AI assistant instead of a manual step-by-step form because:

1. **Better User Experience** - Conversational interface feels more natural
2. **Flexibility** - Maya can handle edge cases and complex requirements
3. **Data Quality** - AI can validate and clarify information in real-time
4. **Reduced Friction** - Users don't need to navigate multiple form steps

### Database Design

All tables use Row Level Security (RLS):
- `leads` - Customer quote requests
- `availability` - Scheduling data
- `vehicles` - Fleet information
- `voicemails` - Voice messages
- `conversation_sessions` - Maya chat history
- `conversation_analytics` - AI performance metrics
- `escalation_tickets` - Human handoff tracking

---

## 4. Security Measures

- **Authentication**: Supabase Auth with middleware protection
- **Authorization**: RLS policies on all database tables
- **Rate Limiting**: 20 requests/minute on AI endpoints
- **Payment Security**: All payment data handled by Stripe
- **Environment Variables**: No hardcoded secrets

---

## 5. Archived Documents

The following documents have been superseded and archived for reference:

| Document | Reason | Archive Date |
|----------|--------|--------------|
| `PRD.md` | Replaced by PRD_PROJECT_REVIEW_AND_ROADMAP.md | 2025-12-31 |
| `PRD_MAYA_QUOTE_ASSISTANT_V2.md` | Merged into main PRD | 2025-12-31 |
| `PRD_MAYA_CONVERSATION_FLOW_FIX.md` | Issues resolved | 2025-12-31 |
| `PRD_CONVERSATION_ERROR_HANDLING.md` | Merged into main PRD | 2025-12-31 |
| `PRD-BUG-FIXES-QUOTE-ASSISTANT.md` | Issues resolved | 2025-12-31 |
| `PRD_CLAUDE_MIGRATION.md` | Migration complete | 2025-12-31 |
| `FEATURES.md` | Merged into FEATURE_DOCUMENTATION.md | 2025-12-31 |

---

## 6. Development Guidelines

### Adding New Features

1. Check existing patterns in similar features
2. Use Supabase for data persistence (never localStorage)
3. Add RLS policies for new tables
4. Include rate limiting on public APIs
5. Update this documentation

### Code Standards

- TypeScript strict mode
- Tailwind CSS for styling
- shadcn/ui components
- Server components by default
- Client components only when needed

---

## 7. Contact & Support

- **Technical Issues**: Check `/docs/` for troubleshooting
- **Business Inquiries**: operations@m2mmoving.au
- **Phone**: (03) 8820 1801

---

*This document is the single source of truth for project documentation. All other docs should reference this or be archived.*
