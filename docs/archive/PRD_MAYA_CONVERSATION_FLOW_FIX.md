# PRD: Maya Conversation Flow & Reliability Fixes

**Product:** M&M Commercial Moving - AI Quote Assistant (Maya)  
**Feature:** Conversation Flow Continuity, Expanded Item Selection & Guardrails  
**Priority:** P0 (Critical)  
**Status:** Planning  
**Date:** December 2024  
**Version:** 1.0

---

## 1. Executive Summary

### Problem Statement

The Maya AI Quote Assistant is experiencing three critical issues that are causing customer drop-off and lost leads:

1. **Limited Item Selection**: The current service picker only displays 5 basic move types. Customers need more granular options for:
   - Specific item categories (furniture, IT equipment, specialized machinery)
   - Additional services (packing, storage, cleaning)
   - Move complexity indicators (floors, lifts, access restrictions)
   - Item quantity estimators for accurate quoting

2. **Conversation Flow Breaks After Selection**: When users select a service type or make any option selection, Maya frequently:
   - Fails to acknowledge the selection
   - Doesn't continue with the next qualifying question
   - Leaves users in a "dead end" with no response
   - Tool calls complete but no text response follows

3. **Insufficient Guardrails & Error Handling**: The current system lacks:
   - Watchdog timers to detect Maya non-responses
   - Automatic conversation recovery mechanisms
   - Graceful degradation to human handoff
   - Comprehensive error boundaries
   - Session persistence for interrupted conversations

### Business Impact

| Metric | Current State | Impact |
|--------|---------------|--------|
| Conversation Completion Rate | ~40% | 60% potential leads lost |
| Option Selection Response Rate | ~65% | 35% users stuck/abandoned |
| Quote Generation Rate | ~35% | Low conversion funnel |
| Average Session Duration | 2.5 min | Users give up early |
| Customer Satisfaction | Unknown | Brand trust eroded |

### Solution Overview

Implement three parallel workstreams:
1. **Expanded Item Selection System** - Comprehensive item picker with categories, quantities, and intelligent suggestions
2. **Conversation Continuity Engine** - Watchdog timers, automatic prompts, and state recovery
3. **Guardrail Framework** - Error boundaries, fallbacks, human escalation, and monitoring

---

## 2. Goals & Success Metrics

### Primary Goals

1. **100% Response Rate**: Maya MUST respond to every user action within 10 seconds
2. **Complete Item Selection**: Users can specify exactly what they're moving
3. **Zero Dead Ends**: No conversation state can result in user abandonment
4. **Automatic Recovery**: All errors trigger recovery without user intervention
5. **Human Safety Net**: Seamless escalation when automation fails

### Success Metrics

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Conversation Completion | ~40% | 85%+ | % reaching quote stage |
| Selection Response Rate | ~65% | 100% | % of selections acknowledged |
| Quote Accuracy | Unknown | 90%+ | Quote vs actual price variance |
| Session Recovery Rate | 0% | 95%+ | % of interrupted sessions resumed |
| Human Escalation Rate | N/A | <5% | % requiring human intervention |
| Average Time to Quote | 8+ min | <5 min | Time from start to quote |
| Customer Satisfaction | Unknown | 4.5/5 | Post-interaction survey |

---

## 3. Issue #1: Expanded Item Selection

### 3.1 Current State Analysis

**Current Service Picker** (`showServiceOptionsTool`):
\`\`\`typescript
services: [
  { id: "office", name: "Office Relocation" },
  { id: "warehouse", name: "Warehouse Move" },
  { id: "datacenter", name: "Data Centre" },
  { id: "it-equipment", name: "IT Equipment" },
  { id: "retail", name: "Retail Store" },
]
\`\`\`

**Problems:**
- Too generic - users need to specify WHAT they're moving
- No quantity estimation - can't calculate accurate quotes
- Missing specialty items - medical, lab, artwork, etc.
- No additional services selection in flow
- Can't indicate special requirements (fragile, heavy, etc.)

### 3.2 Proposed Solution: Multi-Stage Item Selection

#### Stage 1: Move Type Selection (Keep Current)
Keep the existing 5 move types as the first-level categorization.

#### Stage 2: Item Category Selection (NEW)
After move type selection, show relevant item categories:

**Office Relocation Categories:**
\`\`\`typescript
const officeItemCategories = [
  { id: "workstations", name: "Workstations & Desks", icon: "desk", estimator: "count" },
  { id: "chairs", name: "Office Chairs", icon: "chair", estimator: "count" },
  { id: "meeting", name: "Meeting Room Furniture", icon: "table", estimator: "rooms" },
  { id: "reception", name: "Reception Area", icon: "sofa", estimator: "sqm" },
  { id: "filing", name: "Filing Cabinets & Storage", icon: "cabinet", estimator: "count" },
  { id: "it-office", name: "IT Equipment", icon: "computer", estimator: "count" },
  { id: "kitchen", name: "Kitchen/Break Room", icon: "coffee", estimator: "sqm" },
  { id: "executive", name: "Executive Furniture", icon: "briefcase", estimator: "rooms" },
]
\`\`\`

**Warehouse Categories:**
\`\`\`typescript
const warehouseItemCategories = [
  { id: "racking", name: "Pallet Racking", icon: "layers", estimator: "bays" },
  { id: "machinery", name: "Machinery & Equipment", icon: "cog", estimator: "count" },
  { id: "forklifts", name: "Forklifts & Pallet Jacks", icon: "truck", estimator: "count" },
  { id: "inventory", name: "Inventory/Stock", icon: "package", estimator: "pallets" },
  { id: "shelving", name: "Shelving Units", icon: "grid", estimator: "count" },
  { id: "workbenches", name: "Workbenches", icon: "wrench", estimator: "count" },
]
\`\`\`

**Data Centre Categories:**
\`\`\`typescript
const datacenterItemCategories = [
  { id: "server-racks", name: "Server Racks (42U)", icon: "server", estimator: "count" },
  { id: "network", name: "Network Equipment", icon: "wifi", estimator: "count" },
  { id: "ups", name: "UPS Systems", icon: "battery", estimator: "count" },
  { id: "cooling", name: "Cooling Infrastructure", icon: "thermometer", estimator: "units" },
  { id: "cabling", name: "Structured Cabling", icon: "cable", estimator: "sqm" },
  { id: "storage", name: "Storage Arrays", icon: "database", estimator: "count" },
]
\`\`\`

**IT Equipment Categories:**
\`\`\`typescript
const itEquipmentCategories = [
  { id: "desktops", name: "Desktop Computers", icon: "monitor", estimator: "count" },
  { id: "laptops", name: "Laptops", icon: "laptop", estimator: "count" },
  { id: "monitors", name: "Monitors", icon: "display", estimator: "count" },
  { id: "printers", name: "Printers/Copiers", icon: "printer", estimator: "count" },
  { id: "phones", name: "Phone Systems", icon: "phone", estimator: "count" },
  { id: "av", name: "AV Equipment", icon: "video", estimator: "count" },
]
\`\`\`

**Retail Categories:**
\`\`\`typescript
const retailItemCategories = [
  { id: "displays", name: "Display Fixtures", icon: "frame", estimator: "count" },
  { id: "shelving-retail", name: "Retail Shelving", icon: "grid", estimator: "meters" },
  { id: "pos", name: "POS Systems", icon: "credit-card", estimator: "count" },
  { id: "refrigeration", name: "Refrigeration", icon: "snowflake", estimator: "count" },
  { id: "signage", name: "Signage", icon: "sign", estimator: "count" },
  { id: "stock-retail", name: "Stock/Inventory", icon: "package", estimator: "pallets" },
]
\`\`\`

#### Stage 3: Quantity Estimator (NEW)
For each selected category, show appropriate quantity input:

\`\`\`typescript
interface ItemQuantityInput {
  categoryId: string
  quantity: number
  unit: "count" | "sqm" | "rooms" | "bays" | "pallets" | "meters"
  specialRequirements?: {
    fragile?: boolean
    heavy?: boolean  // >50kg items
    oversized?: boolean
    climateControlled?: boolean
    securityRequired?: boolean
  }
}
\`\`\`

**UI Component: ItemQuantityPicker**
\`\`\`typescript
const ItemQuantityPicker = ({
  category,
  onUpdate,
}: {
  category: ItemCategory
  onUpdate: (quantity: ItemQuantityInput) => void
}) => {
  // Render quantity input with +/- buttons
  // Show special requirements checkboxes
  // Calculate estimated weight/volume
}
\`\`\`

#### Stage 4: Additional Services Selection (Enhanced)
Move additional services into the main flow (not just quote add-ons):

\`\`\`typescript
const additionalServicesFlow = [
  {
    id: "packing",
    name: "Professional Packing",
    price: 450,
    question: "Would you like our team to pack your items?",
    description: "Full packing service with quality materials",
    recommended: ["fragile", "executive", "av"]
  },
  {
    id: "unpacking", 
    name: "Unpacking & Setup",
    price: 350,
    question: "Do you need us to unpack and set up at the new location?",
    description: "Complete unpacking and furniture placement"
  },
  {
    id: "storage",
    name: "Temporary Storage",
    price: 300,
    unit: "week",
    question: "Do you need temporary storage between locations?",
    description: "Secure, climate-controlled storage"
  },
  {
    id: "cleaning",
    name: "Post-Move Cleaning",
    price: 350,
    question: "Would you like professional cleaning of your old premises?",
    description: "Deep clean to get your bond back"
  },
  {
    id: "insurance",
    name: "Premium Insurance",
    price: 200,
    question: "Would you like extended insurance coverage?",
    description: "$100,000 coverage for high-value items",
    recommended: ["datacenter", "av", "executive"]
  },
  {
    id: "afterhours",
    name: "After Hours Service",
    price: 500,
    question: "Do you need the move outside business hours?",
    description: "Weekend or evening moves available"
  },
  {
    id: "itsetup",
    name: "IT Setup Assistance",
    price: 600,
    question: "Would you like help reconnecting your IT equipment?",
    description: "Certified technicians for IT reconnection",
    recommended: ["datacenter", "it-office", "network"]
  }
]
\`\`\`

### 3.3 New Tool: showItemSelector

\`\`\`typescript
const showItemSelectorTool = {
  description: "Display item category selector after move type is selected. Use to gather detailed inventory.",
  inputSchema: z.object({
    moveType: z.string().describe("Selected move type: office, warehouse, datacenter, it-equipment, or retail"),
    previousSelections: z.array(z.object({
      categoryId: z.string(),
      quantity: z.number(),
      unit: z.string()
    })).optional().describe("Any previously selected items")
  }),
  execute: async ({ moveType, previousSelections }) => {
    const categories = getItemCategoriesForMoveType(moveType)
    return {
      success: true,
      showItemSelector: true,
      moveType,
      categories,
      previousSelections: previousSelections || [],
      message: "Let me know what items you'll be moving. Select all that apply:",
    }
  }
}
\`\`\`

### 3.4 New Tool: collectItemQuantities

\`\`\`typescript
const collectItemQuantitiesTool = {
  description: "Collect quantity estimates for selected item categories. Use after user selects item types.",
  inputSchema: z.object({
    selectedCategories: z.array(z.string()).describe("IDs of selected item categories"),
    moveType: z.string()
  }),
  execute: async ({ selectedCategories, moveType }) => {
    const categories = getItemCategoriesForMoveType(moveType)
      .filter(c => selectedCategories.includes(c.id))
    
    return {
      success: true,
      showQuantityInputs: true,
      categories,
      message: "Great! Now let me get some quantities. Approximate numbers are fine:",
    }
  }
}
\`\`\`

### 3.5 Enhanced Quote Calculation

Update `calculateQuoteTool` to use detailed item inventory:

\`\`\`typescript
const calculateQuoteToolV2 = {
  description: "Calculate quote based on detailed item inventory",
  inputSchema: z.object({
    moveType: z.string(),
    items: z.array(z.object({
      categoryId: z.string(),
      quantity: z.number(),
      unit: z.string(),
      specialRequirements: z.object({
        fragile: z.boolean().optional(),
        heavy: z.boolean().optional(),
        oversized: z.boolean().optional(),
        climateControlled: z.boolean().optional(),
        securityRequired: z.boolean().optional()
      }).optional()
    })),
    originSuburb: z.string(),
    destinationSuburb: z.string(),
    estimatedDistanceKm: z.number(),
    additionalServices: z.array(z.string()),
    accessRequirements: z.object({
      originFloor: z.number().optional(),
      originLift: z.boolean().optional(),
      destinationFloor: z.number().optional(),
      destinationLift: z.boolean().optional(),
      parkingRestrictions: z.boolean().optional()
    }).optional()
  }),
  execute: async (params) => {
    // Calculate based on:
    // 1. Base rate for move type
    // 2. Item-specific pricing (fragile items cost more)
    // 3. Volume estimation from item quantities
    // 4. Access difficulty multipliers
    // 5. Additional services
    // 6. Distance
    
    const volumeEstimate = calculateVolumeFromItems(params.items)
    const complexityMultiplier = calculateComplexity(params.items, params.accessRequirements)
    
    // ... detailed calculation
    
    return {
      estimatedTotal,
      depositRequired,
      breakdown,
      volumeEstimate,
      crewRecommendation,
      truckRecommendation,
      estimatedDuration,
      itemSummary: params.items.map(i => ({
        category: i.categoryId,
        quantity: i.quantity,
        estimatedVolume: getItemVolume(i)
      }))
    }
  }
}
\`\`\`

---

## 4. Issue #2: Conversation Flow Breaks After Selection

### 4.1 Root Cause Analysis

**Current Flow Problem:**
\`\`\`
User selects "Office Relocation"
  ↓
showServiceOptionsTool executes → returns {success: true, showServicePicker: true}
  ↓
UI receives tool result → hides picker, shows selection
  ↓
❌ Maya doesn't generate follow-up text
  ↓
User waits... waits... gives up
\`\`\`

**Why This Happens:**
1. Tool call returns but Maya doesn't always generate a text response
2. Streaming can complete with just tool output, no text
3. No "watchdog" to detect missing response
4. System prompt instructions not enforced
5. No automatic follow-up mechanism

### 4.2 Solution: Conversation Continuity Engine

#### 4.2.1 Response Watchdog Timer

Implement a client-side watchdog that detects when Maya fails to respond:

\`\`\`typescript
class ConversationWatchdog {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private readonly RESPONSE_TIMEOUT_MS = 10000 // 10 seconds
  private readonly TOOL_TIMEOUT_MS = 15000 // 15 seconds for tool-heavy responses
  
  // Start watching after user action
  startWatch(actionId: string, actionType: 'message' | 'selection' | 'tool') {
    const timeout = actionType === 'tool' ? this.TOOL_TIMEOUT_MS : this.RESPONSE_TIMEOUT_MS
    
    const timer = setTimeout(() => {
      this.handleTimeout(actionId, actionType)
    }, timeout)
    
    this.timers.set(actionId, timer)
  }
  
  // Cancel when response received
  cancelWatch(actionId: string) {
    const timer = this.timers.get(actionId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(actionId)
    }
  }
  
  // Handle timeout - trigger recovery
  private handleTimeout(actionId: string, actionType: string) {
    this.timers.delete(actionId)
    this.onTimeout(actionId, actionType)
  }
  
  onTimeout: (actionId: string, actionType: string) => void = () => {}
}
\`\`\`

#### 4.2.2 Automatic Follow-Up Prompts

When watchdog detects no response after selection, automatically send a follow-up:

\`\`\`typescript
const SELECTION_FOLLOW_UPS: Record<string, string> = {
  'service': "I selected {selection}. What information do you need next?",
  'business': "Yes, that's the correct business. What's next?",
  'date': "I'd like to book for {selection}. Please confirm.",
  'item': "I've selected my items. Can you calculate a quote?",
}

function handleSelectionTimeout(selectionType: string, selectionValue: string) {
  const template = SELECTION_FOLLOW_UPS[selectionType] || "I made a selection. Please continue."
  const message = template.replace('{selection}', selectionValue)
  
  // Automatically send follow-up message
  sendMessage(message)
  
  // Log for monitoring
  trackEvent('maya_timeout_recovery', { selectionType, selectionValue })
}
\`\`\`

#### 4.2.3 Enhanced Selection Handler

Update the `ServicePicker` and other selection components to ensure responses:

\`\`\`typescript
const ServicePicker = ({ services, onSelect }: Props) => {
  const [isSelecting, setIsSelecting] = useState(false)
  const watchdog = useConversationWatchdog()
  const { sendMessage } = useChat()
  
  const handleSelect = async (service: ServiceOption) => {
    setIsSelecting(true)
    
    // Start watchdog
    const actionId = `select-service-${Date.now()}`
    watchdog.startWatch(actionId, 'selection')
    
    // Immediately send a message confirming the selection
    // This ensures Maya has context to respond
    const confirmMessage = `I need ${service.name} services.`
    
    try {
      await sendMessage(confirmMessage)
      watchdog.cancelWatch(actionId)
    } catch (error) {
      // Watchdog will handle timeout
    }
    
    onSelect(service)
    setIsSelecting(false)
  }
  
  return (/* ... */)
}
\`\`\`

#### 4.2.4 Server-Side Response Guarantee

Update API route to ALWAYS include a text response after tool calls:

\`\`\`typescript
// In route.ts
const systemPromptEnforcement = `
CRITICAL RULES - YOU MUST FOLLOW THESE:

1. AFTER EVERY TOOL CALL, YOU MUST PROVIDE A TEXT RESPONSE
   - Tool output alone is NOT sufficient
   - Users cannot see tool output - they need your response
   - Example: After showServiceOptions tool, say "Great! Which type of move are you planning?"

2. AFTER EVERY USER SELECTION, YOU MUST:
   a) Acknowledge what they selected
   b) Explain what it means or confirm understanding  
   c) Ask the next question or provide next step
   
   Example flow:
   User: "I need Office Relocation"
   You: "Perfect! Office relocation is one of our specialties. We handle everything from small 
         offices to large corporate moves. To give you an accurate quote, I need a few details.
         First, approximately how many workstations or desks will be moving?"

3. NEVER END A RESPONSE WITH JUST A TOOL CALL
   - Always follow up with conversational text
   - If unsure what to say, ask a clarifying question

4. IF YOU DON'T KNOW WHAT TO SAY, USE THESE FALLBACKS:
   - "Thanks for that information. Let me note that down."
   - "Got it! What else can you tell me about your move?"
   - "Perfect. And [next qualifying question]?"
`

// Wrap streamText to ensure text response
async function ensureTextResponse(stream: ReturnType<typeof streamText>) {
  let hasTextResponse = false
  let hasToolCall = false
  
  // Monitor stream for text content
  // If stream ends with only tool calls, inject follow-up
  
  return enhancedStream
}
\`\`\`

#### 4.2.5 Tool Output + Text Response Pattern

Modify each tool to include a `followUpMessage` that Maya MUST use:

\`\`\`typescript
const showServiceOptionsTool = {
  // ... existing schema
  execute: async ({ context }) => {
    return {
      success: true,
      showServicePicker: true,
      services: [...],
      // NEW: Explicit follow-up text
      _followUpRequired: true,
      _suggestedResponse: "Great! I've shown you our service options. Which type of move are you planning? Select the option that best matches your needs.",
    }
  }
}
\`\`\`

Update system prompt to use `_suggestedResponse`:
\`\`\`
When a tool returns _suggestedResponse, you MUST include that text (or similar) in your response.
\`\`\`

### 4.3 Conversation State Machine

Implement explicit state machine to ensure flow progression:

\`\`\`typescript
type ConversationStep = 
  | 'welcome'
  | 'business_lookup'
  | 'business_confirm'
  | 'service_select'
  | 'item_select'
  | 'item_quantities'
  | 'locations'
  | 'additional_services'
  | 'quote_present'
  | 'date_select'
  | 'contact_collect'
  | 'payment'
  | 'confirmation'

interface StepConfig {
  expectedActions: string[]
  requiredResponses: string[]
  timeoutMs: number
  fallbackAction: () => void
  nextStep: ConversationStep | ((result: any) => ConversationStep)
}

const CONVERSATION_FLOW: Record<ConversationStep, StepConfig> = {
  'welcome': {
    expectedActions: ['user_message', 'prompt_select'],
    requiredResponses: ['greeting', 'business_ask'],
    timeoutMs: 30000,
    fallbackAction: () => showInitialPrompts(),
    nextStep: 'business_lookup'
  },
  'service_select': {
    expectedActions: ['service_picker_shown', 'service_selected'],
    requiredResponses: ['acknowledge_selection', 'qualifying_question'],
    timeoutMs: 10000,
    fallbackAction: () => sendFollowUp("Which type of move works for you?"),
    nextStep: 'item_select'
  },
  // ... other steps
}

class ConversationStateMachine {
  private currentStep: ConversationStep = 'welcome'
  private stepHistory: ConversationStep[] = []
  private pendingResponses: Set<string> = new Set()
  
  transition(action: string, result?: any) {
    const config = CONVERSATION_FLOW[this.currentStep]
    
    // Validate action is expected
    if (!config.expectedActions.includes(action)) {
      this.handleUnexpectedAction(action)
      return
    }
    
    // Track required responses
    config.requiredResponses.forEach(r => this.pendingResponses.add(r))
    
    // Set up timeout for responses
    setTimeout(() => {
      if (this.pendingResponses.size > 0) {
        config.fallbackAction()
      }
    }, config.timeoutMs)
    
    // Determine next step
    const nextStep = typeof config.nextStep === 'function' 
      ? config.nextStep(result) 
      : config.nextStep
    
    this.stepHistory.push(this.currentStep)
    this.currentStep = nextStep
  }
  
  markResponseReceived(responseType: string) {
    this.pendingResponses.delete(responseType)
  }
}
\`\`\`

---

## 5. Issue #3: Guardrails & Error Handling

### 5.1 Comprehensive Error Boundary System

#### 5.1.1 Error Categories & Responses

\`\`\`typescript
enum ErrorCategory {
  NETWORK = 'network',
  API = 'api', 
  AI_MODEL = 'ai_model',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  PAYMENT = 'payment',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

interface ErrorHandler {
  category: ErrorCategory
  detect: (error: unknown) => boolean
  recover: (error: unknown, context: ConversationContext) => Promise<RecoveryAction>
  userMessage: string
  retryable: boolean
  maxRetries: number
  backoffMs: number[]
}

const ERROR_HANDLERS: ErrorHandler[] = [
  {
    category: ErrorCategory.TIMEOUT,
    detect: (e) => e instanceof Error && (e.message.includes('timeout') || e.name === 'AbortError'),
    recover: async (e, ctx) => {
      // Retry with shorter context
      return { action: 'retry', modifiedContext: shortenContext(ctx) }
    },
    userMessage: "I'm taking a moment to think. Let me try again...",
    retryable: true,
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000]
  },
  {
    category: ErrorCategory.AI_MODEL,
    detect: (e) => e instanceof Error && (
      e.message.includes('model') || 
      e.message.includes('token') ||
      e.message.includes('rate_limit')
    ),
    recover: async (e, ctx) => {
      // Fall back to simpler prompt
      return { action: 'simplify', modifiedContext: simplifyPrompt(ctx) }
    },
    userMessage: "I'm experiencing a brief technical hiccup. One moment...",
    retryable: true,
    maxRetries: 2,
    backoffMs: [2000, 5000]
  },
  {
    category: ErrorCategory.NETWORK,
    detect: (e) => e instanceof Error && (
      e.message.includes('fetch') ||
      e.message.includes('network') ||
      e.message.includes('connection')
    ),
    recover: async (e, ctx) => {
      // Check connectivity, queue message
      if (!navigator.onLine) {
        return { action: 'queue', queuedMessage: ctx.lastMessage }
      }
      return { action: 'retry' }
    },
    userMessage: "I'm having trouble connecting. Your message is saved - I'll send it when connection is restored.",
    retryable: true,
    maxRetries: 5,
    backoffMs: [1000, 2000, 4000, 8000, 16000]
  },
  {
    category: ErrorCategory.UNKNOWN,
    detect: () => true, // Catch-all
    recover: async (e, ctx) => {
      // Log error, offer human escalation
      await logError(e, ctx)
      return { action: 'escalate' }
    },
    userMessage: "I apologize, but I'm having trouble right now. Would you like me to have someone call you instead?",
    retryable: false,
    maxRetries: 0,
    backoffMs: []
  }
]
\`\`\`

#### 5.1.2 Graceful Degradation Ladder

When errors persist, degrade gracefully through levels:

\`\`\`typescript
const DEGRADATION_LEVELS = [
  {
    level: 1,
    name: 'retry',
    description: 'Retry same operation',
    action: (ctx) => retryLastOperation(ctx),
    maxAttempts: 3
  },
  {
    level: 2,
    name: 'simplify',
    description: 'Retry with simplified prompt/context',
    action: (ctx) => retryWithSimplifiedContext(ctx),
    maxAttempts: 2
  },
  {
    level: 3,
    name: 'fallback_response',
    description: 'Use cached/templated response',
    action: (ctx) => useFallbackResponse(ctx),
    maxAttempts: 1
  },
  {
    level: 4,
    name: 'form_mode',
    description: 'Switch to simple form-based quote',
    action: (ctx) => switchToFormMode(ctx),
    maxAttempts: 1
  },
  {
    level: 5,
    name: 'human_escalation',
    description: 'Offer callback/email',
    action: (ctx) => offerHumanEscalation(ctx),
    maxAttempts: 1
  }
]

class GracefulDegradation {
  private currentLevel: number = 0
  private attemptCounts: Map<number, number> = new Map()
  
  async handleFailure(error: unknown, context: ConversationContext): Promise<void> {
    const level = DEGRADATION_LEVELS[this.currentLevel]
    const attempts = this.attemptCounts.get(this.currentLevel) || 0
    
    if (attempts < level.maxAttempts) {
      this.attemptCounts.set(this.currentLevel, attempts + 1)
      await level.action(context)
    } else {
      // Move to next degradation level
      this.currentLevel = Math.min(this.currentLevel + 1, DEGRADATION_LEVELS.length - 1)
      this.attemptCounts.set(this.currentLevel, 0)
      await this.handleFailure(error, context)
    }
  }
  
  reset() {
    this.currentLevel = 0
    this.attemptCounts.clear()
  }
}
\`\`\`

### 5.2 Human Escalation System

#### 5.2.1 Escalation Triggers

\`\`\`typescript
interface EscalationTrigger {
  id: string
  condition: (context: ConversationContext) => boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  action: EscalationAction
}

const ESCALATION_TRIGGERS: EscalationTrigger[] = [
  {
    id: 'repeated_failures',
    condition: (ctx) => ctx.errorCount >= 3,
    priority: 'high',
    action: 'offer_callback'
  },
  {
    id: 'user_frustration',
    condition: (ctx) => detectFrustration(ctx.messages),
    priority: 'high', 
    action: 'proactive_callback_offer'
  },
  {
    id: 'complex_requirements',
    condition: (ctx) => ctx.quote?.estimatedTotal > 20000,
    priority: 'medium',
    action: 'specialist_referral'
  },
  {
    id: 'explicit_request',
    condition: (ctx) => ctx.lastMessage.toLowerCase().includes('speak to someone'),
    priority: 'critical',
    action: 'immediate_callback'
  },
  {
    id: 'payment_failure',
    condition: (ctx) => ctx.paymentAttempts >= 2,
    priority: 'high',
    action: 'payment_support'
  },
  {
    id: 'stuck_in_step',
    condition: (ctx) => ctx.timeInCurrentStep > 180000, // 3 minutes
    priority: 'medium',
    action: 'offer_help'
  }
]

function detectFrustration(messages: Message[]): boolean {
  const frustrationIndicators = [
    'not working',
    'doesn\'t work',
    'broken',
    'frustrated',
    'annoying',
    'waste of time',
    'useless',
    'stuck',
    'help me',
    '???',
    '!!!'
  ]
  
  const recentMessages = messages.slice(-5)
  return recentMessages.some(msg => 
    frustrationIndicators.some(indicator => 
      msg.content.toLowerCase().includes(indicator)
    )
  )
}
\`\`\`

#### 5.2.2 Escalation UI Component

\`\`\`typescript
const EscalationOptions = ({ 
  trigger,
  onSelectOption,
  context 
}: EscalationProps) => {
  const options = [
    {
      id: 'callback',
      icon: Phone,
      title: 'Request Callback',
      description: 'Have someone call you within 15 minutes',
      action: () => requestCallback(context)
    },
    {
      id: 'call_now',
      icon: Phone,
      title: 'Call Us Now',
      description: '03 8820 1801 (Mon-Fri 8am-6pm)',
      action: () => window.open('tel:0388201801')
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Email Quote Request',
      description: 'We\'ll send a detailed quote within 2 hours',
      action: () => sendEmailQuoteRequest(context)
    },
    {
      id: 'continue',
      icon: MessageSquare,
      title: 'Continue with Maya',
      description: 'Try to resolve the issue',
      action: () => continueConversation(context)
    }
  ]
  
  return (
    <div className="escalation-options">
      <p className="text-sm text-muted-foreground mb-3">
        I want to make sure you get the help you need. How would you like to proceed?
      </p>
      <div className="grid gap-2">
        {options.map(option => (
          <Button
            key={option.id}
            variant="outline"
            className="justify-start h-auto py-3 bg-transparent"
            onClick={option.action}
          >
            <option.icon className="h-4 w-4 mr-3" />
            <div className="text-left">
              <div className="font-medium">{option.title}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
\`\`\`

### 5.3 Session Persistence & Recovery

#### 5.3.1 Enhanced State Persistence

\`\`\`typescript
interface PersistedSession {
  id: string
  version: number
  createdAt: Date
  lastActivityAt: Date
  expiresAt: Date
  
  // Conversation data
  messages: SerializedMessage[]
  currentStep: ConversationStep
  
  // Selections
  selectedBusiness: BusinessResult | null
  selectedService: ServiceOption | null
  selectedItems: ItemSelection[]
  selectedDate: string | null
  
  // Quote data
  quoteEstimate: QuoteEstimate | null
  additionalServices: string[]
  
  // Contact info (encrypted)
  contactInfo: EncryptedContactInfo | null
  
  // Progress tracking
  furthestStep: ConversationStep
  completionPercentage: number
  
  // Error tracking
  errors: ErrorLog[]
  recoveryAttempts: number
  
  // Analytics
  sessionDuration: number
  messageCount: number
  toolCallCount: number
}

class SessionPersistence {
  private readonly STORAGE_KEY = 'maya_session_v2'
  private readonly ENCRYPTION_KEY = 'user_specific_key' // Derived from session
  
  save(session: PersistedSession): void {
    const encrypted = this.encryptSensitiveData(session)
    const serialized = JSON.stringify(encrypted)
    
    // Save to multiple storage backends for redundancy
    localStorage.setItem(this.STORAGE_KEY, serialized)
    sessionStorage.setItem(this.STORAGE_KEY, serialized)
    
    // Also save to server for cross-device recovery
    this.saveToServer(session)
  }
  
  async load(): Promise<PersistedSession | null> {
    // Try localStorage first
    let data = localStorage.getItem(this.STORAGE_KEY)
    
    // Fall back to sessionStorage
    if (!data) {
      data = sessionStorage.getItem(this.STORAGE_KEY)
    }
    
    // Fall back to server
    if (!data) {
      data = await this.loadFromServer()
    }
    
    if (!data) return null
    
    const session = JSON.parse(data) as PersistedSession
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.clear()
      return null
    }
    
    return this.decryptSensitiveData(session)
  }
  
  private encryptSensitiveData(session: PersistedSession): PersistedSession {
    if (session.contactInfo) {
      session.contactInfo = encrypt(session.contactInfo, this.ENCRYPTION_KEY)
    }
    return session
  }
  
  private decryptSensitiveData(session: PersistedSession): PersistedSession {
    if (session.contactInfo) {
      session.contactInfo = decrypt(session.contactInfo, this.ENCRYPTION_KEY)
    }
    return session
  }
}
\`\`\`

#### 5.3.2 Session Recovery UI

\`\`\`typescript
const SessionRecoveryBanner = ({ 
  savedSession,
  onRestore,
  onStartFresh 
}: SessionRecoveryProps) => {
  const lastActivity = new Date(savedSession.lastActivityAt)
  const timeAgo = formatDistanceToNow(lastActivity, { addSuffix: true })
  
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">Continue where you left off?</h4>
          <p className="text-xs text-muted-foreground mt-1">
            You were getting a quote for {savedSession.selectedService?.name || 'a move'} {timeAgo}.
            {savedSession.quoteEstimate && (
              <span> Estimated: ${savedSession.quoteEstimate.estimatedTotal.toLocaleString()}</span>
            )}
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onRestore}>
              Continue
            </Button>
            <Button size="sm" variant="outline" onClick={onStartFresh}>
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
\`\`\`

### 5.4 Real-Time Monitoring & Alerting

#### 5.4.1 Conversation Health Metrics

\`\`\`typescript
interface ConversationHealth {
  sessionId: string
  timestamp: Date
  
  // Response metrics
  responseTime: number // ms
  responseRate: number // % of messages with responses
  
  // Error metrics
  errorCount: number
  lastErrorType: ErrorCategory | null
  recoverySuccessRate: number
  
  // User engagement
  userMessageCount: number
  averageMessageLength: number
  selectionsMade: number
  
  // Conversion funnel
  currentStep: ConversationStep
  stepsCompleted: number
  dropOffRisk: 'low' | 'medium' | 'high'
  
  // Quality indicators
  sentimentScore: number // -1 to 1
  frustrationIndicators: string[]
}

class ConversationMonitor {
  private metrics: ConversationHealth
  
  trackResponse(responseTimeMs: number) {
    this.metrics.responseTime = responseTimeMs
    this.updateResponseRate()
    this.checkHealthThresholds()
  }
  
  trackError(error: ErrorCategory) {
    this.metrics.errorCount++
    this.metrics.lastErrorType = error
    this.updateDropOffRisk()
    
    if (this.metrics.errorCount >= 3) {
      this.triggerAlert('high_error_count', this.metrics)
    }
  }
  
  private updateDropOffRisk() {
    const riskFactors = [
      this.metrics.errorCount > 2,
      this.metrics.responseTime > 8000,
      this.metrics.sentimentScore < -0.3,
      this.metrics.stepsCompleted < 2 && this.getSessionDuration() > 120000
    ]
    
    const riskScore = riskFactors.filter(Boolean).length
    
    this.metrics.dropOffRisk = 
      riskScore >= 3 ? 'high' :
      riskScore >= 1 ? 'medium' : 'low'
    
    if (this.metrics.dropOffRisk === 'high') {
      this.triggerProactiveIntervention()
    }
  }
  
  private triggerProactiveIntervention() {
    // Show escalation options proactively
    // Don't wait for user to ask
  }
}
\`\`\`

#### 5.4.2 Backend Alerting

\`\`\`typescript
// API route for logging conversation events
// POST /api/conversation-events

interface ConversationEvent {
  sessionId: string
  eventType: 'error' | 'timeout' | 'escalation' | 'completion' | 'abandonment'
  eventData: Record<string, unknown>
  timestamp: Date
}

// Alert thresholds
const ALERT_THRESHOLDS = {
  error_rate_1h: 0.1, // 10% error rate
  timeout_rate_1h: 0.15, // 15% timeout rate
  completion_rate_1h: 0.3, // Below 30% completion
  escalation_rate_1h: 0.2, // 20% escalation rate
}

// Slack/email alerts when thresholds exceeded
async function checkAlertThresholds() {
  const metrics = await getHourlyMetrics()
  
  for (const [metric, threshold] of Object.entries(ALERT_THRESHOLDS)) {
    if (metrics[metric] > threshold) {
      await sendAlert({
        severity: 'high',
        metric,
        currentValue: metrics[metric],
        threshold,
        message: `Maya conversation ${metric} exceeded threshold: ${metrics[metric]} > ${threshold}`
      })
    }
  }
}
\`\`\`

---

## 6. Implementation Plan

### Phase 1: Conversation Continuity (Week 1-2) - HIGHEST PRIORITY

**Goal:** Ensure Maya ALWAYS responds after every user action.

**Tasks:**
1. Implement ConversationWatchdog class
2. Add automatic follow-up messages on timeout
3. Update system prompt with strict response requirements
4. Add `_followUpRequired` to all tool responses
5. Implement state machine for conversation flow
6. Add client-side selection confirmation messages

**Deliverables:**
- Watchdog timer implementation
- Updated tool responses with follow-up requirements
- State machine implementation
- Selection handler updates

**Success Criteria:**
- 100% response rate for option selections
- No conversation dead-ends
- Automatic recovery within 10 seconds

### Phase 2: Error Handling & Guardrails (Week 2-3)

**Goal:** Implement comprehensive error handling with graceful degradation.

**Tasks:**
1. Implement error classification system
2. Build graceful degradation ladder
3. Create fallback response library
4. Implement human escalation triggers
5. Build escalation UI components
6. Add form-mode fallback

**Deliverables:**
- Error handler implementation
- Degradation system
- Escalation UI components
- Fallback responses

**Success Criteria:**
- All errors caught and handled
- Graceful degradation working
- Human escalation available when needed

### Phase 3: Expanded Item Selection (Week 3-4)

**Goal:** Implement detailed item selection for accurate quoting.

**Tasks:**
1. Design item category data structure
2. Build item category picker component
3. Build quantity estimator component
4. Implement `showItemSelector` tool
5. Implement `collectItemQuantities` tool
6. Update `calculateQuote` for item-based pricing
7. Update conversation flow to include item selection

**Deliverables:**
- Item picker UI components
- New tools for item selection
- Updated quote calculation
- Integration with conversation flow

**Success Criteria:**
- Users can specify detailed inventory
- Quote accuracy improved
- Smooth flow from service → items → quote

### Phase 4: Session Persistence & Monitoring (Week 4-5)

**Goal:** Implement robust session recovery and monitoring.

**Tasks:**
1. Enhance session persistence
2. Build session recovery UI
3. Implement conversation health monitoring
4. Set up backend alerting
5. Create monitoring dashboard
6. Add analytics events

**Deliverables:**
- Enhanced persistence system
- Recovery UI
- Monitoring system
- Alerting configuration

**Success Criteria:**
- Sessions recoverable after interruption
- Real-time monitoring working
- Alerts firing appropriately

### Phase 5: Testing & Optimization (Week 5-6)

**Goal:** Comprehensive testing and performance optimization.

**Tasks:**
1. Unit tests for all new components
2. Integration tests for conversation flows
3. Error simulation testing
4. Performance testing
5. A/B testing setup
6. Documentation

**Deliverables:**
- Test suite
- Performance benchmarks
- A/B test framework
- Documentation

**Success Criteria:**
- 90%+ test coverage
- Performance targets met
- A/B tests running

---

## 7. Success Criteria Summary

| Requirement | Metric | Target | Measurement |
|-------------|--------|--------|-------------|
| Response rate | % of actions with response | 100% | Automated tracking |
| Selection acknowledgment | % selections acknowledged | 100% | Automated tracking |
| Error recovery | % errors recovered | 95%+ | Error logs |
| Session recovery | % interrupted sessions resumed | 90%+ | Session tracking |
| Quote completion | % conversations reaching quote | 85%+ | Funnel analytics |
| Human escalation | % requiring human | <5% | Escalation tracking |
| User satisfaction | Post-chat rating | 4.5/5 | Survey |
| Quote accuracy | Estimate vs actual | 90%+ | Post-move comparison |

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI model inconsistency | High | High | Strict prompting, fallback responses |
| Network issues | Medium | Medium | Offline queuing, session recovery |
| User frustration | Medium | High | Proactive escalation, multiple channels |
| Data loss | Low | High | Multi-backend persistence |
| Performance degradation | Medium | Medium | Monitoring, auto-scaling |

---

## 9. Appendix

### A. Error Message Library

\`\`\`typescript
const ERROR_MESSAGES = {
  timeout: "I'm taking a moment to think. Let me try that again...",
  network: "I'm having trouble connecting. Your message is saved.",
  ai_error: "I hit a small snag. Let me try a different approach...",
  validation: "I didn't quite catch that. Could you rephrase?",
  payment: "There was an issue with the payment. Let's try again.",
  generic: "Something went wrong. I'm working on fixing it.",
  recovery_success: "I'm back! Where were we?",
  human_offer: "Would you prefer to speak with someone directly?",
}
\`\`\`

### B. Conversation Flow Diagram

\`\`\`
Welcome
    ↓
Business Lookup ←→ [Retry on failure]
    ↓
Business Confirm
    ↓
Service Select ←→ [Watchdog: auto-prompt on timeout]
    ↓
Item Select (NEW)
    ↓
Item Quantities (NEW)
    ↓
Locations
    ↓
Additional Services
    ↓
Quote Present
    ↓
Date Select
    ↓
Contact Collect
    ↓
Payment ←→ [Escalation on failure]
    ↓
Confirmation

[At any step]: Human Escalation Available
[On error]: Graceful Degradation Ladder
\`\`\`

### C. Monitoring Dashboard Metrics

- Real-time conversation count
- Response time (p50, p95, p99)
- Error rate by type
- Completion funnel
- Escalation rate
- User satisfaction trend
- Quote accuracy
- Revenue from completed bookings
