# Product Requirements Document (PRD)
## Maya Agent Conversation Flow Improvements

**Document Version:** 1.0  
**Date:** December 11, 2025  
**Author:** v0 AI Assistant  
**Status:** Draft

---

## Executive Summary

This PRD addresses critical issues in the Maya AI sales agent conversation flow that are causing customer drop-offs and lost sales opportunities. The three primary issues are:

1. **Limited Item Selection** - The current service picker doesn't capture granular item details
2. **Conversation Flow Breakage** - After initial selection, the conversation frequently stops
3. **Missing Guardrails & Error Handling** - Insufficient recovery mechanisms when errors occur

---

## Problem Statement

### Current State Analysis

Based on code review of:
- `components/quote-assistant.tsx` (1676 lines)
- `app/api/quote-assistant/route.ts` (722 lines)
- `lib/conversation/*` (error handling utilities)
- `lib/agents/maya/playbook.ts` (sales playbook)

### Issue 1: Limited Item Selection

**Current Behavior:**
- The `ServicePicker` component only offers 5 high-level categories:
  - Office Relocation
  - Warehouse Move
  - Data Centre
  - IT Equipment
  - Retail Store

**Problems:**
- No way to specify detailed inventory items (desks, chairs, servers, etc.)
- No quantity input for items
- Missing common commercial items (meeting room furniture, reception desks, filing cabinets, kitchen equipment, etc.)
- No way to add custom items not in the list
- Size estimation relies solely on square meters, not actual item counts

**Impact:**
- Inaccurate quotes due to lack of item granularity
- Customer frustration when their specific items aren't listed
- Sales team needs to follow up for clarification, adding friction

### Issue 2: Conversation Flow Stops After Selection

**Current Behavior:**
The conversation frequently breaks after:
- Service type selection
- Business confirmation
- Any tool call completion

**Root Causes Identified:**

1. **Tool calls without text response** (line 159-163 in route.ts):
   \`\`\`
   - Tool calls alone are not sufficient - always follow up with a conversational text response.
   \`\`\`
   Despite this instruction, Maya often calls tools without providing follow-up text.

2. **Missing state transitions** - The `currentStep` state doesn't always update correctly after selections

3. **Async message handling gaps** - When `sendMessage` is called, there's no guarantee Maya will respond with continuation

4. **Qualifying questions not triggered** - After service selection, the qualifying questions array exists but isn't consistently used:
   \`\`\`typescript
   office: {
     qualifyingQuestions: [
       "How many workstations or desks need to be moved?",
       "Do you have any server rooms or IT infrastructure?",
       ...
     ]
   }
   \`\`\`

5. **watchdog/timeout mechanism gaps** - The `ResponseMonitor` tracks timeouts but doesn't force continuation

**Impact:**
- Customers left waiting with no response
- High abandonment rate at service selection stage
- Loss of qualified leads

### Issue 3: Missing Guardrails & Error Handling

**Current Behavior:**
- Basic error classification exists (`ErrorClassifier`)
- Fallback responses defined but not always triggered
- Retry logic exists but not comprehensive

**Gaps Identified:**

1. **No conversation dead-end detection** - No system to detect when Maya fails to continue
2. **No proactive health monitoring** - Only checks health on initial load
3. **Limited fallback escalation** - Phone callback option exists but isn't surfaced prominently
4. **No session recovery** - If browser refreshes mid-conversation, context is partially lost
5. **No inactivity prompts** - If customer goes silent, Maya doesn't re-engage
6. **No input validation** - Invalid inputs (e.g., non-numeric square meters) can break flow

---

## Requirements

### Requirement 1: Expanded Item Selection System

#### 1.1 Item Inventory Component
Create a new `ItemInventoryPicker` component that allows customers to specify:

**Standard Commercial Items:**

| Category | Items |
|----------|-------|
| **Workstations** | Executive desk, Standard desk, Standing desk, Workstation pod |
| **Seating** | Executive chair, Task chair, Conference chair, Reception seating |
| **Storage** | Filing cabinet (2-drawer), Filing cabinet (4-drawer), Bookshelf, Credenza, Locker unit |
| **Meeting Rooms** | Conference table (small 4-seat), Conference table (large 10+ seat), Whiteboard, Presentation equipment |
| **Reception** | Reception desk, Waiting area furniture, Display units |
| **Kitchen/Break Room** | Refrigerator, Microwave stand, Vending machine, Break room table |
| **IT Equipment** | Server rack, Network cabinet, Desktop computer, Monitor, Printer/copier |
| **Specialty** | Safe/vault, Medical equipment, Lab equipment, Machinery |

**Implementation:**

\`\`\`typescript
interface InventoryItem {
  id: string
  category: string
  name: string
  icon: string
  baseWeight: number // kg
  baseCubicMeters: number
  handlingComplexity: 'standard' | 'fragile' | 'heavy' | 'specialized'
  defaultQuantity: number
}

interface CustomerInventory {
  items: Array<{
    itemId: string
    quantity: number
    notes?: string
  }>
  customItems: Array<{
    description: string
    quantity: number
    estimatedWeight?: number
  }>
  totalEstimatedCubicMeters: number
  totalEstimatedWeight: number
}
\`\`\`

#### 1.2 Smart Quantity Estimation
- After service type selection, show relevant item categories
- Allow +/- quantity adjustments with running total
- Auto-calculate square meters based on item counts
- Option to add custom items with description

#### 1.3 UI/UX Requirements
- Progressive disclosure: Start with categories, expand to items
- Visual icons for each item type
- Running total displayed (items, weight, estimated cost)
- "I'm not sure" option that triggers qualifying questions
- Mobile-friendly touch targets

### Requirement 2: Conversation Flow Continuity

#### 2.1 Forced Response After Tool Calls
**API Route Changes:**

\`\`\`typescript
// New middleware to ensure response after tool calls
const ensureConversationContinuity = {
  afterToolCall: (toolName: string, result: any) => {
    const continuationPrompts: Record<string, string> = {
      lookupBusiness: "I found your business details. Please confirm if this is correct.",
      confirmBusiness: "Great! Now let's identify what you need to move. What type of move is this?",
      showServiceOptions: "Please select the type of move that best fits your needs.",
      calculateQuote: "Here's your quote breakdown. When are you looking to move?",
      checkAvailability: "I've found some available dates. Which one works best for you?",
      collectContactInfo: "Perfect! To secure your booking, we just need the deposit.",
      initiatePayment: "Secure checkout is ready. Complete the payment to confirm your booking.",
    }
    return continuationPrompts[toolName] || "How can I help you next?"
  }
}
\`\`\`

#### 2.2 State Machine Implementation
Replace ad-hoc step tracking with formal state machine:

\`\`\`typescript
type ConversationState = 
  | { type: 'GREETING' }
  | { type: 'BUSINESS_LOOKUP', query?: string }
  | { type: 'BUSINESS_CONFIRM', business: BusinessResult }
  | { type: 'SERVICE_SELECT' }
  | { type: 'ITEM_INVENTORY', serviceType: string }
  | { type: 'QUALIFYING_QUESTIONS', questionIndex: number }
  | { type: 'LOCATIONS_COLLECT', stage: 'origin' | 'destination' }
  | { type: 'QUOTE_GENERATED', quote: QuoteEstimate }
  | { type: 'DATE_SELECT' }
  | { type: 'CONTACT_COLLECT', field: 'name' | 'email' | 'phone' }
  | { type: 'PAYMENT' }
  | { type: 'COMPLETE' }
  | { type: 'ERROR', previousState: ConversationState, error: string }
  | { type: 'HUMAN_HANDOFF', reason: string }

interface StateTransition {
  from: ConversationState['type']
  to: ConversationState['type']
  trigger: string
  guard?: () => boolean
  action?: () => void
}
\`\`\`

#### 2.3 Qualifying Question Flow
Ensure qualifying questions are asked after service selection:

\`\`\`typescript
const serviceQualifyingFlow = {
  office: [
    { question: "How many workstations or desks need to be moved?", field: 'workstationCount' },
    { question: "Do you have any server rooms or IT infrastructure?", field: 'hasServerRoom' },
    { question: "Are there any large items like boardroom tables?", field: 'hasLargeItems' },
  ],
  warehouse: [
    { question: "Do you have pallet racking that needs to be moved?", field: 'hasPalletRacking' },
    { question: "Is there any heavy machinery or forklifts?", field: 'hasMachinery' },
    { question: "What type of stock or inventory will be moved?", field: 'inventoryType' },
  ],
  // ... other service types
}
\`\`\`

#### 2.4 Message Queue System
Implement message queuing to prevent dropped messages:

\`\`\`typescript
interface MessageQueue {
  pending: Array<{
    id: string
    text: string
    priority: 'high' | 'normal' | 'low'
    retryCount: number
    maxRetries: number
    createdAt: Date
  }>
  processing: string | null
  completed: string[]
}
\`\`\`

### Requirement 3: Guardrails & Error Handling

#### 3.1 Conversation Health Monitor

\`\`\`typescript
interface ConversationHealth {
  lastUserMessage: Date | null
  lastAssistantMessage: Date | null
  consecutiveErrors: number
  totalMessages: number
  currentStep: string
  isStalled: boolean // true if >30s without response after user message
  stallCount: number
}

class ConversationHealthMonitor {
  // Detect stalled conversations
  detectStall(): boolean
  
  // Auto-recovery actions
  triggerRecovery(): void
  
  // Proactive re-engagement
  sendReEngagement(): void
  
  // Escalate to human
  escalateToHuman(reason: string): void
}
\`\`\`

#### 3.2 Error Recovery Strategies

| Error Type | Recovery Strategy | Fallback |
|------------|------------------|----------|
| Network Error | Retry 3x with exponential backoff | Show offline mode, save state |
| API Error (5xx) | Retry 2x, then switch to simplified prompts | Offer phone callback |
| Rate Limit | Queue messages, show wait indicator | Offer phone callback |
| AI Model Error | Retry with shorter context | Pre-canned response + human escalation |
| Timeout | Retry once, then fallback | "I'm having trouble - let me get someone to help" |
| Invalid Input | Validate client-side, provide examples | Show acceptable input formats |
| State Corruption | Clear state, restart from last checkpoint | Offer fresh start |

#### 3.3 Input Validation

\`\`\`typescript
const inputValidators = {
  businessName: {
    minLength: 2,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-&.']+$/,
    errorMessage: "Please enter a valid business name"
  },
  abn: {
    pattern: /^\d{11}$/,
    validate: (abn: string) => validateABN(abn), // Checksum validation
    errorMessage: "Please enter a valid 11-digit ABN"
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: "Please enter a valid email address"
  },
  phone: {
    pattern: /^(\+61|0)[2-9]\d{8}$/,
    errorMessage: "Please enter a valid Australian phone number"
  },
  squareMeters: {
    min: 10,
    max: 10000,
    errorMessage: "Please enter a size between 10 and 10,000 square meters"
  }
}
\`\`\`

#### 3.4 Proactive Re-engagement

\`\`\`typescript
const reEngagementMessages = {
  afterInactivity30s: "Are you still there? Take your time - I'm here when you're ready.",
  afterInactivity60s: "No rush! If you have any questions about the quote, I'm happy to help.",
  afterInactivity120s: "If now isn't a good time, I can save your progress and you can continue later. Or would you prefer someone to call you?",
  afterError: "I apologize for the hiccup. Let me try again - what was your question?",
  afterStall: "I notice I may have missed something. Let me recap where we are and continue.",
}
\`\`\`

#### 3.5 Human Escalation Path

\`\`\`typescript
interface HumanEscalation {
  triggers: [
    'customer_requests_human',
    'consecutive_errors_exceeded', // 3+ errors
    'conversation_stalled_twice',
    'complex_requirements_detected',
    'budget_above_threshold', // >$50,000
    'urgent_timeline', // <48 hours
    'negative_sentiment_detected',
  ]
  
  actions: {
    immediate_callback: {
      prompt: "I'll have someone call you right away. What's the best number?",
      sla: "5 minutes"
    },
    scheduled_callback: {
      prompt: "When would be a good time for our team to call?",
      options: ['Morning', 'Afternoon', 'Evening']
    },
    live_chat_handoff: {
      prompt: "Let me connect you with a team member who can help.",
      availability: "9am-5pm AEST"
    },
    email_followup: {
      prompt: "I'll have our team email you a detailed quote within 2 hours.",
      sla: "2 hours"
    }
  }
}
\`\`\`

#### 3.6 Session Persistence & Recovery

\`\`\`typescript
interface SessionPersistence {
  storage: 'localStorage' | 'sessionStorage' | 'server'
  
  // Auto-save on each state change
  autoSaveInterval: 10000 // 10 seconds
  
  // Data to persist
  persistedData: {
    conversationId: string
    messages: Message[]
    currentStep: string
    formData: Partial<QuoteFormData>
    selectedOptions: {
      business?: BusinessResult
      service?: ServiceOption
      items?: InventoryItem[]
      date?: string
    }
    timestamp: Date
    expiresAt: Date // 24 hours
  }
  
  // Recovery flow
  onSessionRestore: () => {
    // Show "Welcome back! You were getting a quote for [business]. Continue?"
    // Options: [Continue] [Start Fresh]
  }
}
\`\`\`

---

## Technical Implementation Plan

### Phase 1: Quick Wins (1-2 days)
1. Add forced text response after every tool call in `route.ts`
2. Implement 30-second stall detection with auto-recovery message
3. Add prominent "Call Us" button in error states
4. Fix state transition bugs in `quote-assistant.tsx`

### Phase 2: Item Inventory (3-5 days)
1. Design and implement `ItemInventoryPicker` component
2. Add item database with weights and cubic meters
3. Integrate with quote calculation
4. Update API tools to accept item arrays

### Phase 3: State Machine (3-5 days)
1. Implement formal state machine with XState or similar
2. Add state persistence to localStorage
3. Implement session recovery flow
4. Add state visualization for debugging

### Phase 4: Error Handling (2-3 days)
1. Implement comprehensive input validation
2. Add proactive re-engagement messages
3. Implement human escalation triggers
4. Add conversation health dashboard for monitoring

### Phase 5: Testing & Monitoring (2-3 days)
1. End-to-end conversation flow tests
2. Error scenario testing
3. Add analytics for drop-off points
4. Implement alerting for stalled conversations

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Conversation completion rate | ~40% (estimated) | 75% |
| Drop-off at service selection | High | <10% |
| Average time to quote | Unknown | <3 minutes |
| Error recovery success | ~50% | 90% |
| Customer satisfaction | Unknown | 4.5/5 |
| Human escalation rate | 0% | 15-20% (healthy) |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-engineering state machine | Delays | Start simple, iterate |
| AI hallucination in responses | Customer confusion | Strict prompts, validation |
| Performance with item inventory | UX degradation | Lazy loading, pagination |
| Breaking existing flows | Revenue impact | Feature flags, A/B testing |

---

## Appendix

### A. Current File Structure
\`\`\`
components/
  quote-assistant.tsx    # Main chat UI component (1676 lines)
  
app/api/
  quote-assistant/
    route.ts            # AI conversation handler (722 lines)
    
lib/
  conversation/
    error-classifier.ts  # Error type detection
    fallback-provider.ts # Fallback responses
    state-manager.ts     # Session persistence
    response-monitor.ts  # Timeout detection
    retry-handler.ts     # Retry logic
    
  agents/maya/
    playbook.ts         # Sales playbook & pricing
\`\`\`

### B. Key Dependencies
- `@ai-sdk/react` (useChat hook)
- `@ai-sdk/openai` (GPT-4o model)
- `@stripe/react-stripe-js` (payments)
- `zod` (schema validation)

### C. Environment Variables Required
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-11 | v0 AI | Initial draft |
