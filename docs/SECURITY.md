# Security Documentation - M2M Moving

## Overview

This document outlines security measures implemented in the M2M Moving platform.

---

## Authentication & Authorization

### Twilio Webhook Security
- All Twilio webhooks validate request signatures using `twilio.validateRequest()`
- Signature checked against `TWILIO_AUTH_TOKEN`
- Invalid signatures return 401 Unauthorized

### API Key Management
- All API keys stored in environment variables
- Keys never logged or exposed in responses
- Least-privilege principle: separate keys per service

---

## Input Validation

### Message Sanitization
- All user input sanitized to prevent XSS
- HTML entities escaped: `<`, `>`, `"`, `'`, `/`
- Script tags and event handlers stripped

### Schema Validation
- All API inputs validated with Zod schemas
- Type coercion and bounds checking
- Clear error messages without internal details

### Length Limits
| Field | Max Length |
|-------|------------|
| Chat message | 2000 chars |
| Phone number | 15 chars (E.164) |
| ZIP code | 10 chars |
| Session ID | 36 chars (UUID) |

---

## Rate Limiting

### Configuration
| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/quote-assistant | 20 req | 1 min |
| /api/twilio/* | 60 req | 1 min |
| Default | 30 req | 1 min |

### Response
- 429 Too Many Requests when exceeded
- `Retry-After` header included
- `X-RateLimit-Remaining` header on success

---

## Data Protection

### PII Handling
- Phone numbers used only for session keys
- Transcripts stored with minimal PII
- Logs redact sensitive fields

### Encryption
- All traffic over HTTPS
- Database connections encrypted (Supabase)
- API keys never transmitted in URL params

---

## Error Handling

### Safe Error Messages
- Internal errors return generic messages
- Stack traces never exposed to clients
- Detailed errors logged server-side only

### Logging
- Structured JSON logs
- Request IDs for tracing
- Sensitive fields redacted: `password`, `token`, `key`, `secret`

---

## Dependency Security

### Vulnerability Scanning
- Run `npm audit` regularly
- Update dependencies monthly
- Pin major versions to avoid breaking changes

### Known Issues
Check: https://github.com/Sharpy077/m2mmoving/security/dependabot

---

## Security Headers

### Recommended (add via middleware)
```typescript
headers: {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'"
}
```

---

## Incident Response

1. **Detect**: Monitor logs and alerts
2. **Contain**: Rotate affected keys immediately
3. **Investigate**: Review logs and access patterns
4. **Remediate**: Patch vulnerability, update dependencies
5. **Report**: Document incident and notify stakeholders

---

## Checklist

- [x] Twilio signature validation
- [x] Input sanitization
- [x] Rate limiting
- [x] Schema validation
- [x] Safe error messages
- [ ] Security headers middleware
- [ ] CORS configuration
- [ ] CSP headers
- [ ] Regular dependency audits

---

## Contact

Security issues: Report via GitHub Security tab or contact the maintainer directly.
