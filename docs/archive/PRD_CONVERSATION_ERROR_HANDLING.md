# PRD: Conversation Error Handling & Continuity

**Product:** M&M Commercial Moving - AI Quote Assistant (Maya)  
**Feature:** Robust Error Handling & Conversation Continuity  
**Priority:** P0 (Critical)  
**Status:** Planning  
**Date:** December 2024

---

## 1. Executive Summary

### Problem Statement

The AI Quote Assistant (Maya) currently experiences critical failures in conversation flow:

1. **Initial Conversation Failure**: Maya often fails to respond to the first user message, leaving users waiting with no feedback
2. **Option Selection Silence**: When users select options (service types, business confirmations, dates), Maya frequently doesn't acknowledge or respond
3. **Conversation Breaks**: Errors cause conversations to stop completely without recovery mechanisms
4. **No Response Detection**: System doesn't detect when Maya fails to respond, leading to poor UX
5. **Silent Failures**: API errors occur without user-visible feedback or automatic recovery

### Impact

- **User Experience**: Users abandon conversations due to perceived system failure
- **Lead Loss**: Failed conversations result in lost potential bookings
- **Brand Perception**: Broken conversations damage trust in the technology-forward brand
- **Revenue Impact**: Estimated 30-40% of conversations fail before quote generation

### Solution Overview

Implement comprehensive error handling, response monitoring, automatic retry mechanisms, and fallback strategies to ensure conversations never break and Maya always responds.

---

## 2. Goals & Success Metrics

### Primary Goals

1. **100% Response Rate**: Maya must respond to every user message within 10 seconds
2. **Zero Silent Failures**: All errors must be detected and handled gracefully
3. **Automatic Recovery**: Failed requests automatically retry without user intervention
4. **Conversation Continuity**: Conversations never break - always recoverable state
5. **Initial Message Success**: First message always receives a response

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Initial Response Rate | ~60% | 100% | % of conversations with first response |
| Option Selection Response Rate | ~65% | 100% | % of option selections acknowledged |
| Conversation Completion Rate | ~40% | 85%+ | % of conversations reaching quote |
| Average Error Recovery Time | N/A | <3s | Time to recover from error |
| User-Reported "No Response" Issues | High | <1% | Support tickets |

---

## 3. Requirements

### 3.1 Response Monitoring & Detection

#### 3.1.1 Response Timeout Detection

**Requirement**: System must detect when Maya fails to respond within expected timeframe.

**Acceptance Criteria**:
- Monitor time between user message and assistant response
- Set timeout threshold: 10 seconds for normal responses, 15 seconds for tool-heavy responses
- Trigger recovery mechanism when timeout exceeded
- Log timeout events for monitoring

**Implementation**:
\`\`\`typescript
interface ResponseMonitor {
  startTimer(messageId: string, timeoutMs: number): void
  cancelTimer(messageId: string): void
  onTimeout(callback: (messageId: string) => void): void
}
\`\`\`

#### 3.1.2 Initial Message Handling

**Requirement**: First message in conversation must be handled with special care.

**Acceptance Criteria**:
- Detect first message in conversation session
- Use extended timeout (15 seconds) for initial message
- Pre-warm API connection if possible
- Provide immediate user feedback ("Maya is connecting...")
- Automatic retry with exponential backoff if initial message fails

**Implementation**:
- Add `isInitialMessage` flag to conversation state
- Special handling in API route for first message
- Pre-flight health check before sending initial message

### 3.2 Error Handling & Recovery

#### 3.2.1 Error Classification

**Requirement**: Classify errors by type to apply appropriate recovery strategies.

**Error Types**:
1. **Network Errors**: Connection failures, timeouts, DNS issues
   - Recovery: Automatic retry with exponential backoff (3 attempts)
   - Fallback: Show offline message, offer phone callback

2. **API Errors**: 500, 502, 503, 504 responses
   - Recovery: Retry with backoff, use cached response if available
   - Fallback: Queue message for later, show "temporarily unavailable"

3. **Rate Limiting**: 429 responses
   - Recovery: Exponential backoff, queue request
   - Fallback: Show "high traffic" message, offer callback

4. **Model Errors**: AI model failures, token limits
   - Recovery: Retry with simplified prompt, reduce context
   - Fallback: Escalate to human agent, save conversation state

5. **Stream Errors**: Streaming response interruptions
   - Recovery: Reconnect stream, resume from last token
   - Fallback: Request full response, show partial content

**Acceptance Criteria**:
- All errors classified within 100ms
- Appropriate recovery strategy applied automatically
- User sees clear, actionable error message
- Conversation state preserved for recovery

#### 3.2.2 Automatic Retry Mechanism

**Requirement**: Failed requests automatically retry without user intervention.

**Retry Strategy**:
- **Network Errors**: 3 retries with exponential backoff (1s, 2s, 4s)
- **API Errors**: 2 retries with exponential backoff (2s, 5s)
- **Rate Limits**: 3 retries with exponential backoff (5s, 15s, 30s)
- **Stream Errors**: Immediate retry, then exponential backoff

**Acceptance Criteria**:
- Retries happen automatically in background
- User sees "Retrying..." indicator during retries
- Maximum retry attempts not exceeded
- Success metrics tracked per retry attempt

**Implementation**:
\`\`\`typescript
interface RetryConfig {
  maxAttempts: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  initialDelay: number
  maxDelay: number
}

class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T>
}
\`\`\`

#### 3.2.3 Fallback Responses

**Requirement**: When all retries fail, provide meaningful fallback responses.

**Fallback Strategies**:

1. **Cached Response**: Use last successful similar response
   - Trigger: Network failure after retries
   - Example: "I'm having connection issues, but based on your last message..."

2. **Simplified Prompt**: Retry with reduced context
   - Trigger: Model errors, token limits
   - Example: Retry with last 3 messages instead of full history

3. **Human Escalation**: Offer callback or email
   - Trigger: Persistent failures after all retries
   - Example: "I'm experiencing technical difficulties. Would you like me to have someone call you?"

4. **Offline Mode**: Queue messages for later
   - Trigger: Complete network failure
   - Example: "You're offline. Your messages will be sent when connection is restored."

**Acceptance Criteria**:
- Fallback always provides next action for user
- Conversation state preserved for later recovery
- User never left without guidance
- Fallback messages are contextually appropriate

### 3.3 Conversation State Management

#### 3.3.1 State Persistence

**Requirement**: Conversation state must be preserved across errors and page refreshes.

**State to Persist**:
- All messages (user and assistant)
- Current conversation step (business, service, details, quote, etc.)
- Selected options (business, service type, date)
- Form data (contact info, quote details)
- Error state and retry attempts

**Acceptance Criteria**:
- State saved to localStorage/sessionStorage
- State recovered on page refresh
- State cleared only on successful completion or explicit reset
- State includes timestamp for expiration (24 hours)

**Implementation**:
\`\`\`typescript
interface ConversationState {
  id: string
  messages: Message[]
  step: ConversationStep
  selectedOptions: SelectedOptions
  formData: FormData
  errorState?: ErrorState
  lastUpdated: Date
}

class ConversationPersistence {
  save(state: ConversationState): void
  load(conversationId: string): ConversationState | null
  clear(conversationId: string): void
}
\`\`\`

#### 3.3.2 State Recovery

**Requirement**: After error recovery, conversation resumes from last known good state.

**Recovery Process**:
1. Detect error occurred
2. Save current state before error
3. Attempt recovery (retry, fallback)
4. On success, merge recovered state with saved state
5. Continue conversation from merged state

**Acceptance Criteria**:
- No duplicate messages after recovery
- User selections preserved
- Conversation flow continues naturally
- User doesn't need to repeat information

### 3.4 Option Selection Handling

#### 3.4.1 Selection Acknowledgment

**Requirement**: Every option selection must receive immediate acknowledgment and response.

**Selection Types**:
- Business selection (from lookup results)
- Service type selection (from picker)
- Date selection (from calendar)
- Initial prompt selection

**Acknowledgment Flow**:
1. User selects option → Immediate UI feedback ("Selected: Office Relocation")
2. Message sent to API → Show "Sending..." indicator
3. API processes → Show "Maya is responding..."
4. Response received → Display response, update UI state
5. If timeout → Trigger retry, show "Reconnecting..."

**Acceptance Criteria**:
- Visual feedback within 100ms of selection
- Message sent within 500ms
- Response received within 10 seconds
- If no response, automatic retry triggered
- User never left wondering if selection registered

#### 3.4.2 Selection Retry Logic

**Requirement**: Failed option selections automatically retry with context preservation.

**Retry Process**:
1. Selection made → Save selection to state
2. Message send fails → Retry with same selection
3. Retry fails → Use fallback acknowledgment
4. All retries fail → Show error, offer manual continuation

**Acceptance Criteria**:
- Selection state preserved even if message fails
- Retry includes full context of selection
- Maximum 3 retry attempts per selection
- User can manually retry if auto-retry fails

### 3.5 API Route Enhancements

#### 3.5.1 Request Validation

**Requirement**: Validate all incoming requests before processing.

**Validation Checks**:
- Message format correctness
- Conversation ID validity
- Message history completeness
- Rate limiting compliance
- Authentication (if required)

**Acceptance Criteria**:
- Invalid requests rejected with clear error messages
- Valid requests proceed without delay
- Validation errors logged for monitoring
- User receives actionable error message

#### 3.5.2 Response Guarantees

**Requirement**: API must always return a valid response, even on errors.

**Response Types**:
1. **Success Response**: Normal streaming text response
2. **Error Response**: Error message in stream format
3. **Fallback Response**: Cached or simplified response
4. **Retry Response**: Indication that retry is needed

**Acceptance Criteria**:
- Every request receives HTTP 200 with valid stream
- Error responses are in same format as success
- Client can parse all response types
- No unhandled exceptions reach client

**Implementation**:
\`\`\`typescript
async function POST(req: Request): Promise<Response> {
  try {
    // Normal processing
    return streamText(...).toTextStreamResponse()
  } catch (error) {
    // Always return valid stream response
    return createErrorStreamResponse(error)
  }
}
\`\`\`

#### 3.5.3 Health Checks

**Requirement**: API must expose health check endpoint for monitoring.

**Health Check Endpoints**:
- `GET /api/quote-assistant/health` - Basic health
- `GET /api/quote-assistant/health/detailed` - Detailed status

**Health Check Response**:
\`\`\`json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "openai": "healthy",
    "database": "healthy",
    "rateLimit": "healthy"
  },
  "timestamp": "2024-12-01T12:00:00Z"
}
\`\`\`

**Acceptance Criteria**:
- Health check responds in <100ms
- Status accurately reflects system state
- Used by client for pre-flight checks
- Monitored by external systems

### 3.6 User Experience Enhancements

#### 3.6.1 Loading States

**Requirement**: Clear loading indicators for all async operations.

**Loading States**:
- **Connecting**: Initial connection attempt
- **Sending**: Message being sent
- **Maya Typing**: Response being generated
- **Processing**: Tool execution in progress
- **Retrying**: Automatic retry in progress

**Acceptance Criteria**:
- Loading state shown within 200ms
- State accurately reflects current operation
- User understands what's happening
- Loading doesn't block UI interactions unnecessarily

#### 3.6.2 Error Messages

**Requirement**: Error messages must be user-friendly and actionable.

**Error Message Guidelines**:
- Use plain language, avoid technical jargon
- Explain what happened in user terms
- Provide next steps or alternatives
- Include retry option when applicable
- Offer escalation path (phone, email)

**Example Messages**:
- ❌ "Error 500: Internal server error"
- ✅ "I'm having trouble connecting right now. Let me try again..."
- ✅ "Connection issue detected. Your message is saved and will be sent automatically when I reconnect."
- ✅ "I'm experiencing technical difficulties. Would you prefer to continue via phone? Call 03 8820 1801"

**Acceptance Criteria**:
- All error messages reviewed for clarity
- Messages tested with non-technical users
- Consistent tone and style
- Actionable next steps always provided

#### 3.6.3 Recovery UI

**Requirement**: UI must clearly show recovery state and options.

**Recovery UI Elements**:
- Retry button (if auto-retry fails)
- "Continue conversation" button (after error recovery)
- "Start over" option (if recovery impossible)
- Phone callback option (always available)
- Progress indicator (showing recovery steps)

**Acceptance Criteria**:
- Recovery options always visible during errors
- User can manually trigger recovery
- Recovery state clearly communicated
- No dead ends - always a path forward

---

## 4. Technical Architecture

### 4.1 Component Architecture

\`\`\`
QuoteAssistant Component
├── ConversationManager
│   ├── MessageQueue (handles message sending with retries)
│   ├── ResponseMonitor (monitors response times)
│   └── StateManager (persists and recovers state)
├── ErrorHandler
│   ├── ErrorClassifier (classifies error types)
│   ├── RetryManager (handles retry logic)
│   └── FallbackProvider (provides fallback responses)
└── UI Components
    ├── LoadingStates (various loading indicators)
    ├── ErrorDisplay (error messages and recovery)
    └── RecoveryOptions (retry, callback, etc.)
\`\`\`

### 4.2 API Architecture

\`\`\`
/api/quote-assistant
├── POST / (main chat endpoint)
│   ├── RequestValidator
│   ├── ConversationLoader (loads persisted state)
│   ├── StreamHandler (handles streaming responses)
│   ├── ErrorHandler (catches and handles errors)
│   └── ResponseFormatter (formats all responses)
├── GET /health (health check)
└── GET /conversation/:id (load conversation state)
\`\`\`

### 4.3 Data Flow

\`\`\`
User Action
  ↓
UI Component (immediate feedback)
  ↓
MessageQueue (queues with retry logic)
  ↓
API Request (with timeout)
  ↓
ResponseMonitor (tracks response)
  ↓
Success → Update UI
  ↓
Error → ErrorHandler
  ↓
RetryManager → Retry or Fallback
  ↓
StateManager → Persist state
\`\`\`

### 4.4 Error Flow

\`\`\`
Error Detected
  ↓
ErrorClassifier → Classify error type
  ↓
RetryManager → Determine retry strategy
  ↓
Execute Retry (with backoff)
  ↓
Success? → Continue conversation
  ↓
Failure? → FallbackProvider
  ↓
Fallback Response → User
  ↓
StateManager → Save for recovery
\`\`\`

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Implement core error detection and basic retry logic.

**Tasks**:
1. Implement ResponseMonitor component
2. Add timeout detection for responses
3. Implement basic retry mechanism (3 attempts, exponential backoff)
4. Add error classification system
5. Update API route with error handling wrapper

**Deliverables**:
- ResponseMonitor class
- RetryHandler utility
- Error classification types
- Updated API route with error handling

**Success Criteria**:
- Timeouts detected within 10 seconds
- Retries execute automatically
- Errors classified correctly

### Phase 2: State Management (Week 2)

**Goal**: Implement conversation state persistence and recovery.

**Tasks**:
1. Create ConversationState interface
2. Implement ConversationPersistence class
3. Add state saving on every message
4. Implement state recovery on error
5. Add state expiration (24 hours)

**Deliverables**:
- ConversationState types
- ConversationPersistence implementation
- State recovery logic
- localStorage/sessionStorage integration

**Success Criteria**:
- State persists across page refreshes
- State recovers after errors
- No duplicate messages after recovery

### Phase 3: Option Selection (Week 2-3)

**Goal**: Ensure option selections always receive responses.

**Tasks**:
1. Enhance option selection handlers
2. Add immediate UI feedback
3. Implement selection-specific retry logic
4. Add fallback acknowledgments
5. Test all selection types

**Deliverables**:
- Updated selection handlers
- Selection retry logic
- Fallback acknowledgments
- Comprehensive tests

**Success Criteria**:
- 100% of selections receive responses
- Retries work for all selection types
- User feedback always provided

### Phase 4: Initial Message Handling (Week 3)

**Goal**: Fix initial conversation failures.

**Tasks**:
1. Add initial message detection
2. Implement pre-flight health check
3. Add extended timeout for initial message
4. Create initial message retry strategy
5. Add connection warming mechanism

**Deliverables**:
- Initial message handler
- Health check integration
- Connection warming
- Initial message tests

**Success Criteria**:
- 100% initial message response rate
- Health check prevents failures
- Connection warming reduces latency

### Phase 5: Fallbacks & UX (Week 4)

**Goal**: Implement comprehensive fallbacks and improve UX.

**Tasks**:
1. Implement all fallback strategies
2. Create user-friendly error messages
3. Add recovery UI components
4. Implement offline mode
5. Add phone callback integration

**Deliverables**:
- FallbackProvider implementation
- Error message library
- Recovery UI components
- Offline mode handler
- Callback integration

**Success Criteria**:
- All errors have fallbacks
- Error messages are user-friendly
- Recovery UI is intuitive
- Offline mode works correctly

### Phase 6: Testing & Monitoring (Week 4-5)

**Goal**: Comprehensive testing and monitoring setup.

**Tasks**:
1. Write unit tests for all components
2. Write integration tests for error scenarios
3. Set up error monitoring (Sentry, etc.)
4. Create error dashboards
5. Load testing for error scenarios

**Deliverables**:
- Test suite (90%+ coverage)
- Monitoring setup
- Error dashboards
- Load test results
- Documentation

**Success Criteria**:
- All tests passing
- Monitoring captures all errors
- Dashboards show key metrics
- Load tests pass

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Components to Test**:
- ResponseMonitor
- RetryHandler
- ErrorClassifier
- ConversationPersistence
- FallbackProvider

**Test Cases**:
- Timeout detection accuracy
- Retry logic correctness
- Error classification accuracy
- State persistence/recovery
- Fallback selection logic

### 6.2 Integration Tests

**Scenarios to Test**:
1. Initial message failure → Recovery
2. Option selection failure → Retry → Success
3. Network error → Retry → Fallback
4. API error → Retry → Success
5. Stream interruption → Resume
6. Page refresh → State recovery
7. Multiple rapid selections → Queue handling

### 6.3 Error Simulation Tests

**Errors to Simulate**:
- Network disconnection
- API 500 errors
- API 429 rate limits
- Stream interruptions
- Timeout scenarios
- Invalid responses

### 6.4 User Acceptance Testing

**Test Scenarios**:
1. Non-technical user encounters error
2. User selects option, no response
3. User sends initial message, no response
4. User refreshes page mid-conversation
5. User loses internet connection

**Success Criteria**:
- Users can always continue conversation
- Errors don't confuse users
- Recovery is intuitive
- No conversation data lost

---

## 7. Monitoring & Metrics

### 7.1 Key Metrics

**Response Metrics**:
- Initial response rate
- Average response time
- Response timeout rate
- Option selection response rate

**Error Metrics**:
- Error rate by type
- Retry success rate
- Fallback usage rate
- Recovery time

**Conversation Metrics**:
- Conversation completion rate
- Drop-off rate by step
- Error recovery rate
- User-reported issues

### 7.2 Monitoring Tools

**Tools to Implement**:
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Custom dashboards (Grafana/DataDog)
- User session replay (LogRocket)

**Alerts to Set Up**:
- Error rate > 5%
- Response timeout rate > 2%
- Initial message failure rate > 1%
- Retry failure rate > 10%

### 7.3 Logging

**Events to Log**:
- All errors with full context
- Retry attempts and outcomes
- Timeout events
- Fallback activations
- State save/load operations
- User recovery actions

**Log Format**:
\`\`\`json
{
  "timestamp": "2024-12-01T12:00:00Z",
  "event": "error" | "retry" | "timeout" | "fallback",
  "conversationId": "uuid",
  "errorType": "network" | "api" | "model" | "stream",
  "retryAttempt": 1,
  "context": {...}
}
\`\`\`

---

## 8. Success Criteria

### Must Have (P0)

- ✅ 100% initial message response rate
- ✅ 100% option selection acknowledgment rate
- ✅ Automatic retry for all error types
- ✅ Conversation state persistence
- ✅ User-friendly error messages
- ✅ Zero silent failures

### Should Have (P1)

- ⚠️ Health check endpoint
- ⚠️ Offline mode support
- ⚠️ Phone callback integration
- ⚠️ Error monitoring dashboard
- ⚠️ Comprehensive test coverage

### Nice to Have (P2)

- 💡 Predictive error prevention
- 💡 Advanced fallback strategies
- 💡 User preference for retry behavior
- 💡 A/B testing for error messages
- 💡 Machine learning for error prediction

---

## 9. Risks & Mitigations

### Risk 1: Retry Loops

**Risk**: Infinite retry loops consuming resources.

**Mitigation**:
- Maximum retry attempts enforced
- Exponential backoff prevents rapid retries
- Circuit breaker pattern for persistent failures
- Monitoring alerts for retry loops

### Risk 2: State Corruption

**Risk**: Corrupted state causes conversation issues.

**Mitigation**:
- State validation on load
- State versioning for migration
- Fallback to clean state if corruption detected
- Regular state cleanup (expiration)

### Risk 3: Performance Impact

**Risk**: Error handling adds latency.

**Mitigation**:
- Async error handling where possible
- Minimal overhead for success path
- Efficient state persistence
- Performance monitoring

### Risk 4: User Confusion

**Risk**: Too many retries/errors confuse users.

**Mitigation**:
- Clear, simple error messages
- Limit retry attempts visible to user
- Quick escalation to human support
- User testing for clarity

---

## 10. Dependencies

### External Dependencies

- Vercel AI SDK (for streaming)
- OpenAI API (for AI responses)
- localStorage/sessionStorage (for state)
- Error monitoring service (Sentry)

### Internal Dependencies

- Quote Assistant component refactoring
- API route enhancements
- State management utilities
- Error handling utilities

---

## 11. Open Questions

1. **State Storage**: Should we use localStorage, sessionStorage, or backend storage?
   - Recommendation: localStorage for persistence, backend for critical state

2. **Retry Limits**: What's the optimal number of retries?
   - Recommendation: 3 retries with exponential backoff

3. **Timeout Duration**: Should timeouts vary by operation type?
   - Recommendation: Yes - 10s normal, 15s initial, 20s tool-heavy

4. **Fallback Priority**: Which fallback should be tried first?
   - Recommendation: Retry → Cached → Simplified → Human escalation

5. **Monitoring**: Real-time or batch monitoring?
   - Recommendation: Real-time for critical errors, batch for metrics

---

## 12. Appendix

### A. Error Code Reference

| Code | Type | Retry Strategy | Fallback |
|------|------|---------------|----------|
| NETWORK_ERROR | Network | 3 retries, exp backoff | Offline mode |
| API_500 | Server | 2 retries, exp backoff | Cached response |
| API_429 | Rate Limit | 3 retries, long backoff | Queue message |
| MODEL_ERROR | AI Model | 1 retry, simplified | Human escalation |
| STREAM_ERROR | Stream | Immediate retry | Full response |
| TIMEOUT | Timeout | 2 retries | Fallback response |

### B. State Schema

\`\`\`typescript
interface ConversationState {
  id: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  step: 'business' | 'service' | 'details' | 'quote' | 'date' | 'contact' | 'payment'
  selectedOptions: {
    business?: BusinessResult
    service?: ServiceOption
    date?: string
  }
  formData: {
    contactInfo?: ContactInfo
    quote?: QuoteEstimate
  }
  errorState?: {
    lastError: Error
    retryCount: number
    lastRetryTime: Date
  }
  createdAt: Date
  lastUpdated: Date
  expiresAt: Date
}
\`\`\`

### C. Retry Configuration

\`\`\`typescript
const RETRY_CONFIGS = {
  network: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    initialDelay: 1000,
    maxDelay: 8000
  },
  api: {
    maxAttempts: 2,
    backoffStrategy: 'exponential',
    initialDelay: 2000,
    maxDelay: 10000
  },
  rateLimit: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    initialDelay: 5000,
    maxDelay: 30000
  }
}
\`\`\`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-01 | AI Assistant | Initial PRD creation |

---

**Status**: Ready for Review  
**Next Steps**: 
1. Review PRD with team
2. Prioritize phases
3. Assign implementation tasks
4. Begin Phase 1 implementation
