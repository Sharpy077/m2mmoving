# QA Checklist - M2M Moving

## Pre-Test Setup
- [ ] Set environment variables (OpenAI, Twilio, Supabase, Stripe)
- [ ] Run `npm install` to install dependencies
- [ ] Start dev server with `npm run dev`
- [ ] Configure Twilio webhooks to point to ngrok/public URL

---

## 1. Homepage & Navigation
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Homepage loads | Page displays with hero section | | |
| Navigation links work | All nav items navigate correctly | | |
| Mobile responsiveness | Layout adapts to mobile viewport | | |
| Footer links work | All footer links functional | | |

---

## 2. AI Quote Assistant (Web)
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Chat widget visible | Quote assistant component renders | | |
| Send message | Message appears in chat | | |
| Receive AI response | AI reply displays within 8s | | |
| Session persistence | Follow-up messages maintain context | | |
| Empty message rejected | Shows validation error | | |
| Long message truncated | Handles 2000+ char messages | | |
| Quote tool triggered | Estimate returned when details given | | |
| Error handling | Graceful error message on failure | | |

---

## 3. Twilio Voice Integration
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Inbound call answered | TwiML greeting plays | | |
| Speech recognition | User speech captured | | |
| AI response spoken | Reply via TTS | | |
| Multi-turn conversation | Context maintained across turns | | |
| Hangup handling | Call ends gracefully | | |
| Invalid signature rejected | Returns 401 | | |

---

## 4. Twilio SMS/WhatsApp Integration
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Inbound SMS received | Message processed | | |
| AI response sent | Reply SMS delivered | | |
| Session by phone number | Context per sender | | |
| Empty message handled | Default prompt returned | | |
| Invalid signature rejected | Returns 401 | | |
| WhatsApp message (if configured) | Same flow as SMS | | |

---

## 5. API Endpoints
| Endpoint | Method | Test | Pass |
|----------|--------|------|------|
| /api/health | GET | Returns `{ status: "ok" }` | |
| /api/quote-assistant | POST | Returns AI response | |
| /api/quote-assistant | POST | Rate limits after 20 req/min | |
| /api/twilio/voice | POST | Returns TwiML | |
| /api/twilio/message | POST | Returns TwiML | |
| /api/availability | GET | Returns availability slots | |
| /api/bookings | POST | Creates booking | |
| /api/leads | POST | Creates lead | |

---

## 6. Security Checks
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| XSS prevention | Script tags sanitized | | |
| SQL injection prevention | Parameterized queries used | | |
| Twilio signature validation | Invalid sigs rejected | | |
| Rate limiting | 429 after threshold | | |
| CORS headers | Restricted origins | | |
| Missing API key | Graceful error | | |
| PII in logs | No sensitive data logged | | |

---

## 7. Error Scenarios
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| OpenAI API down | Fallback message | | |
| Twilio API down | Error logged, graceful fail | | |
| Invalid JSON body | 400 with error message | | |
| Missing required fields | Validation error | | |
| DB connection failed | 500 with safe message | | |

---

## 8. Performance
| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Quote assistant response | < 5s P95 | | |
| Voice AI turn latency | < 8s P95 | | |
| Page load time | < 3s | | |
| Time to interactive | < 5s | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

## Issues Found

| ID | Description | Severity | Status | Fix Commit |
|----|-------------|----------|--------|------------|
| | | | | |

---

## Notes

- Run tests with `npm test`
- Check coverage with `npm test -- --coverage`
- Twilio testing requires ngrok or public URL for webhooks
