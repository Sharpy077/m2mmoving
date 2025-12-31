# PRD: Maya Quote Assistant - Complete Implementation

**Product:** M&M Commercial Moving - AI Quote Assistant (Maya)  
**Version:** 2.0  
**Priority:** P0 (Critical)  
**Status:** Implementation Ready  
**Date:** December 2024

---

## 1. Executive Summary

### Overview
Maya is an AI-powered conversational assistant that guides commercial customers through the quote and booking process for M&M Commercial Moving. She provides instant quotes, checks availability, processes deposits, and escalates to humans when needed.

### Current Problem
The Maya chat quote builder is failing to display on the home page due to critical AI SDK implementation errors:
- **Root Error**: `Cannot read properties of undefined (reading 'state')` in the AI SDK's `makeRequest` function
- **Cause**: Incorrect AI SDK v5 implementation - using `api` parameter but backend returns incompatible stream format
- **Impact**: 100% failure rate, customers cannot get quotes, complete revenue loss from online leads

### Solution
Implement AI SDK v5 correctly following official patterns:
1. Use `DefaultChatTransport` with proper configuration on the client
2. Return `toUIMessageStreamResponse()` from the API route
3. Standardize all `sendMessage` calls to use `{ text: string }` format
4. Add comprehensive error handling and fallbacks

---

## 2. Product Definition

### 2.1 What is Maya?
Maya is the AI persona for M&M Commercial Moving's quote assistant. She is:
- **Personality**: Professional, friendly, efficient, knowledgeable about commercial moving
- **Purpose**: Guide customers from initial inquiry to booked move with deposit
- **Capability**: Natural conversation, quote generation, availability checking, payment processing
- **Fallback**: Seamless escalation to human agents when needed

### 2.2 User Journey

\`\`\`
┌──────────────────────────────────────────────────────────────────────────────┐
│                         MAYA CONVERSATION FLOW                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DISCOVERY          QUALIFICATION         QUOTE           BOOKING           │
│   ─────────          ─────────────         ─────           ───────           │
│                                                                              │
│   1. Greeting    →   3. Business      →   6. Generate  →   8. Select Date   │
│   2. Service         4. Origin/Dest       7. Present       9. Contact Info  │
│      Selection       5. Move Details         Quote         10. Deposit      │
│                                                            11. Confirm      │
│                                                                              │
│   FALLBACKS AT EVERY STEP:                                                   │
│   • Error → Retry (3x) → Fallback message → Human escalation                │
│   • User confused → Re-explain → Human escalation                           │
│   • User requests human → Immediate escalation                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 2.3 Conversation Stages

| Stage | Description | User Actions | Maya Actions | Tools Used |
|-------|-------------|--------------|--------------|------------|
| **DISCOVERY** | User arrives, Maya introduces herself | View initial message, select service type | Greet, show service options | `showServiceOptions` |
| **QUALIFICATION** | Gather move details | Provide business name, addresses, size, dates | Ask qualifying questions, lookup business | `lookupBusiness`, qualifying questions |
| **QUOTE** | Generate and present quote | Review quote, request adjustments | Calculate and display quote | `calculateQuote` |
| **BOOKING** | Finalize booking | Select date, provide contact, pay deposit | Show calendar, collect info, process payment | `checkAvailability`, `captureContactDetails`, `processPayment` |
| **ESCALATION** | Human handoff when needed | Request human, complex needs | Transfer to agent, preserve context | `requestHumanAgent` |

---

## 3. Technical Implementation

### 3.1 AI SDK v5 Correct Pattern

**Client Side (quote-assistant.tsx)**:
\`\`\`typescript
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, sendMessage, status, error } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/quote-assistant",
  }),
  id: conversationId,
  onError: (err) => {
    // Error handling
  },
  onFinish: () => {
    // Cleanup
  },
})

// Send messages with correct format
sendMessage({ text: "Hello" })
\`\`\`

**Server Side (route.ts)**:
\`\`\`typescript
import { convertToModelMessages, streamText, UIMessage } from "ai"

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  
  const result = streamText({
    model: "openai/gpt-5",
    messages: convertToModelMessages(messages),
    tools: { /* ... */ },
  })
  
  return result.toUIMessageStreamResponse()
}
\`\`\`

### 3.2 Key Technical Changes

| Component | Current (Broken) | Fix |
|-----------|------------------|-----|
| Client useChat | Uses `api` parameter directly | Use `DefaultChatTransport` |
| Client sendMessage | Mixed formats | Standardize to `{ text: string }` |
| API Response | Custom stream format | `toUIMessageStreamResponse()` |
| Message Conversion | Manual | `convertToModelMessages()` |

### 3.3 File Changes Required

1. **components/quote-assistant.tsx**
   - Add `DefaultChatTransport` import
   - Update `useChat` configuration
   - Standardize all `sendMessage` calls

2. **app/api/quote-assistant/route.ts**
   - Import `convertToModelMessages`, `UIMessage`
   - Convert messages properly
   - Return `toUIMessageStreamResponse()`

---

## 4. Conversation Flows

### 4.1 Happy Path Flow

\`\`\`
USER                              MAYA                                TOOLS
────                              ────                                ─────
                                  "Hi! I'm Maya, your AI assistant    
                                  for M&M Commercial Moving..."       showServiceOptions
                                  [Shows 5 service type buttons]

"I need to move my office"        "Great! I'd be happy to help with   
                                  your office move. First, what's 
                                  your business name?"

"ABC Consulting"                  "Let me look that up..."            lookupBusiness
                                  "I found ABC Consulting Pty Ltd     
                                  at 123 Collins St. Is that you?"
                                  [Yes/No buttons]

[Clicks Yes]                      "Perfect! Where are you moving to?"

"456 Bourke Street"               "And roughly how many workstations  
                                  and how much square footage?"

"About 20 desks, 200sqm"          "Let me calculate your quote..."    calculateQuote
                                  [Shows detailed quote card:
                                   - Base rate
                                   - Estimated hours
                                   - Crew size
                                   - Total: $2,450
                                   - Deposit: $490]

"That looks good"                 "Excellent! Let me check our        checkAvailability
                                  availability..."
                                  [Shows calendar with available dates]

[Selects Dec 15]                  "Great choice! To secure this date, 
                                  I'll need a few details."
                                  [Shows contact form]

[Fills form]                      "Perfect! The deposit is $490.       captureContactDetails
                                  Here's the payment link."
                                  [Shows Stripe payment button]

[Completes payment]               "Booking confirmed! You'll receive   processPayment
                                  a confirmation email shortly.
                                  Reference: MM-2024-1234"
\`\`\`

### 4.2 Error Recovery Flow

\`\`\`
USER                              MAYA                                SYSTEM
────                              ────                                ──────
"I need a quote"                  [API call fails]                    Error detected
                                  "One moment..."                      Retry 1/3
                                  [API call fails]                     Retry 2/3
                                  [API call fails]                     Retry 3/3
                                  "I'm having a bit of trouble.        Fallback shown
                                  You can call us at 03 8820 1801
                                  or try again."
                                  [Retry button] [Call button]
\`\`\`

### 4.3 Human Escalation Flow

\`\`\`
USER                              MAYA                                TOOLS
────                              ────                                ─────
"I want to speak to a person"     "Of course! I'll connect you with   requestHumanAgent
                                  our team right away."
                                  
                                  "Here are your options:
                                  📞 Call: 03 8820 1801
                                  📧 Email: quotes@mmmoving.com.au
                                  💬 Request callback (within 1 hour)"
                                  
                                  [Call Now] [Email] [Request Callback]
\`\`\`

---

## 5. Error Handling Strategy

### 5.1 Error Classification

| Error Type | Detection | Recovery | Fallback |
|------------|-----------|----------|----------|
| **Network** | `TypeError: Failed to fetch` | 3 retries, 1s/2s/4s backoff | Show offline card |
| **API 5xx** | Status 500-504 | 2 retries, 2s/5s backoff | Show error + phone |
| **Rate Limit** | Status 429 | Wait + retry with backoff | Show "busy" message |
| **AI Error** | Model failure | Simplified retry | Human escalation |
| **Timeout** | No response in 15s | Cancel + retry | Show timeout card |
| **Stream** | Interrupted stream | Resume or restart | Request non-stream |

### 5.2 User-Facing Error Messages

| Scenario | Message |
|----------|---------|
| **Temporary failure** | "Just a moment, I'm reconnecting..." |
| **Persistent failure** | "I'm having trouble right now. You can call us directly at 03 8820 1801." |
| **High traffic** | "We're experiencing high demand. Please wait a moment or call us." |
| **Timeout** | "That's taking longer than expected. Let me try a different approach." |

---

## 6. Guardrails

### 6.1 Conversation Guardrails

| Guardrail | Implementation |
|-----------|----------------|
| **Stay on topic** | System prompt restricts to moving-related topics |
| **No pricing manipulation** | Quote calculations done server-side only |
| **PII protection** | Contact info captured via secure form, not free text |
| **Hallucination prevention** | Business lookup verifies real ABN data |
| **Loop detection** | Max 3 times asking same question before escalation |
| **Sentiment monitoring** | Detect frustration → offer human escalation |

### 6.2 Technical Guardrails

| Guardrail | Implementation |
|-----------|----------------|
| **Rate limiting** | Max 20 messages/minute per session |
| **Message length** | Max 500 characters user input |
| **Session timeout** | 30 minute inactivity timeout |
| **Retry limits** | Max 3 retries per operation |
| **Token limits** | Max 4000 tokens per response |

---

## 7. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Chat initialization rate | 0% (broken) | 99%+ | Successful first message |
| Conversation completion | N/A | 70%+ | Reach quote stage |
| Quote acceptance | N/A | 40%+ | Accept quote |
| Booking conversion | N/A | 25%+ | Complete deposit |
| Error recovery rate | N/A | 95%+ | Recover from errors |
| Human escalation rate | N/A | <15% | Requests for human |
| User satisfaction | N/A | 4.5/5 | Post-chat survey |

---

## 8. Implementation Checklist

### Phase 1: Critical Fix (Immediate)
- [ ] Update `useChat` to use `DefaultChatTransport`
- [ ] Update API route to return `toUIMessageStreamResponse()`
- [ ] Use `convertToModelMessages()` for proper message formatting
- [ ] Standardize all `sendMessage` calls to `{ text: string }`
- [ ] Test basic conversation flow

### Phase 2: Error Handling (Day 2)
- [ ] Implement error classification
- [ ] Add retry mechanism with backoff
- [ ] Add fallback UI components
- [ ] Add timeout detection
- [ ] Test error scenarios

### Phase 3: Polish (Day 3)
- [ ] Add loading states
- [ ] Add typing indicators
- [ ] Add re-engagement prompts
- [ ] Add session recovery
- [ ] Performance optimization

---

## 9. Appendix

### A. AI SDK v5 Reference

Key imports:
\`\`\`typescript
// Client
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

// Server
import { convertToModelMessages, streamText, UIMessage } from "ai"
\`\`\`

Message format:
\`\`\`typescript
// Sending messages
sendMessage({ text: "User message" })

// Response streaming
result.toUIMessageStreamResponse()
\`\`\`

### B. Tool Definitions

\`\`\`typescript
const tools = {
  showServiceOptions: tool({ /* ... */ }),
  lookupBusiness: tool({ /* ... */ }),
  calculateQuote: tool({ /* ... */ }),
  checkAvailability: tool({ /* ... */ }),
  captureContactDetails: tool({ /* ... */ }),
  processPayment: tool({ /* ... */ }),
  requestHumanAgent: tool({ /* ... */ }),
}
\`\`\`

### C. Contact Information for Escalation

- **Phone**: 03 8820 1801
- **Email**: quotes@mmmoving.com.au
- **Hours**: Mon-Fri 8am-6pm, Sat 9am-2pm AEST
