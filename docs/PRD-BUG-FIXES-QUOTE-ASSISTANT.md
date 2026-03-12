# PRD: Quote Assistant Bug Fixes & Error Handling

## Document Version
- **Version**: 1.0
- **Date**: December 11, 2025
- **Author**: v0 AI Assistant

---

## Executive Summary

This PRD addresses critical bugs affecting the Quote Assistant (Maya) conversation flow that are causing customer-facing errors and potential loss of leads. The issues include:

1. **Multiple Supabase GoTrueClient Instances** - Creating undefined behavior and potential auth issues
2. **AI SDK useChat State Error** - "Cannot read properties of undefined (reading 'state')" breaking the chat
3. **Inconsistent sendMessage API Usage** - Mixed usage of `{ text }` and `{ role, content }` formats

---

## Problem Statement

### Issue 1: Multiple GoTrueClient Instances

**Symptoms:**
\`\`\`
GoTrueClient@sb-...:1 Multiple GoTrueClient instances detected in the same browser context.
It is not an error, but this should be avoided as it may produce undefined behavior.
\`\`\`

**Root Cause:**
- `lib/conversation/human-escalation.ts` creates its own Supabase client using `createBrowserClient()` directly instead of using the singleton from `lib/supabase/client.ts`
- Multiple components and services are creating their own Supabase instances
- The existing singleton pattern in `lib/supabase/client.ts` is not being consistently used

**Impact:**
- Potential race conditions in authentication state
- Memory leaks from multiple WebSocket connections
- Undefined behavior with concurrent operations

### Issue 2: AI SDK useChat State Error

**Symptoms:**
\`\`\`
TypeError: Cannot read properties of undefined (reading 'state')
    at Z.makeRequest (ai.mjs)
    at async sendMessage (ai.mjs)
\`\`\`

**Root Cause:**
- Using `DefaultChatTransport` incorrectly with AI SDK v5
- The `transport` configuration may be causing internal state management issues
- Possible version mismatch or incorrect initialization pattern

**Impact:**
- Complete failure of chat functionality
- Users unable to get quotes
- 100% conversion loss when error occurs

### Issue 3: Inconsistent sendMessage API Usage

**Symptoms:**
- Some calls use `sendMessage({ text: "..." })`
- Other calls use `sendMessage({ role: "user", content: "..." })`

**Root Cause:**
- Mixed AI SDK version patterns in the codebase
- Incomplete migration from one API format to another

**Impact:**
- Unpredictable behavior
- Some messages may fail silently

---

## Solution Architecture

### Solution 1: Supabase Singleton Enforcement

**Approach:**
1. Update `lib/supabase/client.ts` with enhanced singleton pattern
2. Update `lib/conversation/human-escalation.ts` to import the singleton
3. Audit all Supabase client usages and consolidate

**Implementation:**

\`\`\`typescript
// lib/supabase/client.ts - Enhanced singleton with global window storage
import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_CLIENT_KEY = Symbol.for("__SUPABASE_BROWSER_CLIENT__")

type GlobalWithSupabase = typeof globalThis & {
  [key: symbol]: SupabaseClient | undefined
}

export function createClient(): SupabaseClient {
  const globalRef = globalThis as GlobalWithSupabase
  
  // Check global singleton first
  if (globalRef[SUPABASE_CLIENT_KEY]) {
    return globalRef[SUPABASE_CLIENT_KEY]
  }
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
    }
  )
  
  globalRef[SUPABASE_CLIENT_KEY] = client
  return client
}

// Export for direct import
export const supabaseClient = createClient()
\`\`\`

### Solution 2: AI SDK useChat Fix

**Approach:**
1. Remove `DefaultChatTransport` and use simple `api` parameter
2. Standardize on the correct message format for AI SDK v5
3. Add defensive checks and error boundaries

**Implementation:**

\`\`\`typescript
// components/quote-assistant.tsx - Fixed useChat configuration
const { messages, sendMessage, status, error } = useChat({
  api: "/api/quote-assistant",
  id: conversationId,
  onError: (err) => {
    console.error("[QuoteAssistant] Chat error:", err)
    // ... error handling
  },
  onFinish: () => {
    // ... cleanup
  },
})
\`\`\`

### Solution 3: Standardized sendMessage Format

**Approach:**
1. Audit all `sendMessage` calls
2. Standardize on `{ text: string }` format (AI SDK v5 standard)
3. Create a wrapper function for consistency

**Implementation:**

\`\`\`typescript
// Wrapper function for consistent message sending
const sendUserMessage = useCallback(
  async (text: string) => {
    if (!text.trim() || isLoading) return
    
    try {
      await sendMessage({ text })
    } catch (error) {
      console.error("[QuoteAssistant] Failed to send message:", error)
      handleErrorWithRetry(error as Error, text)
    }
  },
  [sendMessage, isLoading, handleErrorWithRetry]
)
\`\`\`

---

## Detailed Implementation Plan

### Phase 1: Supabase Client Consolidation (Priority: High)

#### Task 1.1: Update Supabase Client Singleton
**File:** `lib/supabase/client.ts`

- Add Symbol-based global key for cross-module singleton
- Add SSR-safe checks
- Export both function and pre-created instance

#### Task 1.2: Update Human Escalation Service
**File:** `lib/conversation/human-escalation.ts`

- Remove direct `createBrowserClient` import
- Import singleton from `lib/supabase/client.ts`
- Update `getSupabase()` method to use singleton

#### Task 1.3: Audit All Supabase Usages
**Files to audit:**
- `lib/agents/db.ts` - Uses own singleton (server-side, OK)
- `lib/conversation/session-recovery.ts` - Check usage
- `lib/conversation/analytics.ts` - Check usage
- Any component files using Supabase directly

### Phase 2: AI SDK useChat Fix (Priority: Critical)

#### Task 2.1: Remove DefaultChatTransport
**File:** `components/quote-assistant.tsx`

- Remove `DefaultChatTransport` import
- Use simple `api` parameter instead
- Test thoroughly

#### Task 2.2: Standardize Message Format
**File:** `components/quote-assistant.tsx`

Replace all `sendMessage` calls:

| Current Pattern | Corrected Pattern |
|-----------------|-------------------|
| `sendMessage({ role: "user", content: text })` | `sendMessage({ text })` |
| `sendMessage({ text: "..." })` | Keep as-is |

**Lines to update:**
- Line 558: `sendMessage({ role: "user", content: "..." })` → `sendMessage({ text: "..." })`
- Line 574: `sendMessage({ role: "user", content: inputValue })` → `sendMessage({ text: inputValue })`
- Line 629: `sendMessage({ role: "user", content: messageText })` → `sendMessage({ text: messageText })`
- Line 644: `sendMessage({ role: "user", content: messageText })` → `sendMessage({ text: messageText })`
- Line 665: `sendMessage({ role: "user", content: messageText })` → `sendMessage({ text: messageText })`
- Line 677: `sendMessage({ role: "user", content: prompt })` → `sendMessage({ text: prompt })`
- Line 713: `sendMessage({ role: "user", content: "..." })` → `sendMessage({ text: "..." })`
- Line 1030: `sendMessage({ role: "user", content: transcript })` → `sendMessage({ text: transcript })`

#### Task 2.3: Add Error Boundary
**File:** `components/quote-assistant.tsx`

- Wrap chat in error boundary
- Add fallback UI for catastrophic failures
- Include "Call us directly" option

### Phase 3: Enhanced Error Handling (Priority: High)

#### Task 3.1: Add Try-Catch Wrappers
**File:** `components/quote-assistant.tsx`

\`\`\`typescript
const safeSendMessage = useCallback(
  async (text: string) => {
    try {
      updateActivity()
      await sendMessage({ text })
    } catch (error) {
      console.error("[QuoteAssistant] Send failed:", error)
      
      // Increment error count
      setConversationContext(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }))
      
      // Show user-friendly error
      setHasError(true)
      setErrorMessage("I'm having trouble processing that. Please try again.")
      
      // Check for escalation
      if (conversationContext.errorCount >= 2) {
        await triggerEscalation("multiple_errors")
      }
    }
  },
  [sendMessage, conversationContext.errorCount]
)
\`\`\`

#### Task 3.2: Add Initialization Guard
**File:** `components/quote-assistant.tsx`

\`\`\`typescript
// Add initialization state
const [isInitialized, setIsInitialized] = useState(false)

useEffect(() => {
  // Delay initial message until hook is fully initialized
  const timer = setTimeout(() => {
    setIsInitialized(true)
  }, 100)
  return () => clearTimeout(timer)
}, [])

// Guard sendMessage calls
useEffect(() => {
  if (!isInitialized || !isOpen || hasStarted) return
  // ... send initial message
}, [isInitialized, isOpen, hasStarted])
\`\`\`

#### Task 3.3: Add Connection Health Check
**File:** `components/quote-assistant.tsx`

\`\`\`typescript
// Periodic health check
useEffect(() => {
  const healthCheck = setInterval(async () => {
    try {
      const response = await fetch("/api/quote-assistant/health")
      if (!response.ok) {
        setConnectionStatus("degraded")
      } else {
        setConnectionStatus("healthy")
      }
    } catch {
      setConnectionStatus("disconnected")
    }
  }, 30000) // Every 30 seconds
  
  return () => clearInterval(healthCheck)
}, [])
\`\`\`

---

## Testing Requirements

### Unit Tests

1. **Supabase Singleton Test**
   - Verify only one client instance is created
   - Verify same instance returned across multiple imports
   - Verify works correctly with SSR

2. **sendMessage Format Test**
   - Verify all message formats are standardized
   - Verify messages are sent successfully
   - Verify error handling works correctly

### Integration Tests

1. **Chat Flow Test**
   - Start conversation
   - Send messages
   - Verify responses received
   - Test error recovery

2. **Error Boundary Test**
   - Simulate AI SDK failure
   - Verify fallback UI appears
   - Verify escalation option works

### E2E Tests

1. **Happy Path**
   - Complete quote flow from start to finish
   - Verify no console errors

2. **Error Recovery**
   - Simulate network failure
   - Verify graceful degradation
   - Verify conversation can resume

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Chat initialization success rate | ~70% | 99%+ |
| GoTrueClient warnings | 8+ per session | 0 |
| Console errors during chat | Multiple | 0 |
| Conversation completion rate | Unknown | Track baseline |

---

## Rollback Plan

If issues persist after deployment:

1. Revert to previous stable version
2. Enable fallback mode (direct phone/form only)
3. Add prominent "Call Us" CTA
4. Monitor error rates

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/supabase/client.ts` | Enhanced singleton pattern |
| `lib/conversation/human-escalation.ts` | Use singleton import |
| `components/quote-assistant.tsx` | Fix useChat, standardize sendMessage |
| `lib/conversation/session-recovery.ts` | Use singleton import |
| `lib/conversation/analytics.ts` | Use singleton import |

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Supabase Consolidation | 1 day | None |
| Phase 2: AI SDK Fix | 1 day | None |
| Phase 3: Error Handling | 1 day | Phase 1, 2 |
| Testing | 1 day | All phases |
| **Total** | **4 days** | |

---

## Appendix: Error Reference

### Error: Multiple GoTrueClient instances
\`\`\`
GoTrueClient@sb-zoierkyeynxbylrcdrgp-auth-token:1 (2.87.1) 
Multiple GoTrueClient instances detected in the same browser context.
\`\`\`

### Error: Cannot read 'state' property
\`\`\`
TypeError: Cannot read properties of undefined (reading 'state')
    at Z.makeRequest (ai.mjs)
    at async sendMessage (ai.mjs)
\`\`\`

### Related AI SDK Documentation
- useChat hook: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
- Message format: `{ text: string }` for AI SDK v5
- API parameter: Simple string endpoint, not DefaultChatTransport
