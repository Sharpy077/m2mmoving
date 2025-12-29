# PRD: Claude AI Migration for Maya & All Agents

## Overview
Migrate all AI agents from OpenAI GPT-4o to Anthropic Claude via Vercel AI Gateway.

## Objectives
1. Switch all agents to use `anthropic/claude-sonnet-4` model
2. Ensure end-to-end conversation flow works after service selection
3. Implement proper error handling and guardrails
4. Guide users through complete booking flow

## Technical Changes

### Model Configuration
- **Old**: `openai/gpt-4o-mini` or `gpt-4o`
- **New**: `anthropic/claude-sonnet-4`
- **API Key**: Vercel AI Gateway key (vck_*) - No additional env vars needed

### Files to Update

#### 1. API Routes
- `app/api/quote-assistant/route.ts` - Main chat endpoint
- `app/api/quote-assistant/health/route.ts` - Health check

#### 2. Agent Base Configuration
- `lib/agents/base-agent.ts` - Default model config

#### 3. Individual Agents (11 total)
- `lib/agents/maya/agent.ts`
- `lib/agents/aurora/agent.ts`
- `lib/agents/bridge/agent.ts`
- `lib/agents/cipher/agent.ts`
- `lib/agents/cortex/orchestrator.ts`
- `lib/agents/echo/agent.ts`
- `lib/agents/guardian/agent.ts`
- `lib/agents/hunter/agent.ts`
- `lib/agents/nexus/agent.ts`
- `lib/agents/oracle/agent.ts`
- `lib/agents/phoenix/agent.ts`
- `lib/agents/prism/agent.ts`
- `lib/agents/sentinel/agent.ts`

## Conversation Flow Requirements

### 1. Service Selection → Response
When user selects a service (e.g., "Office Relocation"):
- Maya MUST respond with a greeting and first question
- Ask about move timeline/date
- Keep conversation flowing

### 2. Guided Conversation Steps
1. **Service Type** → Confirm and ask about timeline
2. **Timeline** → Ask about locations (from/to)
3. **Locations** → Ask about size/inventory
4. **Size** → Ask about special requirements
5. **Requirements** → Present quote estimate
6. **Quote** → Collect contact info
7. **Contact** → Confirm booking

### 3. Error Handling
- Timeout: "I'm having a moment. Let me try that again..."
- API Error: "Let me connect you with our team directly."
- Invalid Input: Gently redirect to valid options

### 4. Guardrails
- Never provide exact pricing without full details
- Always offer human handoff option
- Validate inputs before proceeding
- Keep responses concise (2-3 sentences max)

## System Prompt for Maya

\`\`\`
You are Maya, a friendly and professional AI assistant for M&M Commercial Moving.
Your goal is to help customers get accurate quotes for their commercial moves.

CONVERSATION FLOW:
1. When a customer selects a service type, confirm it and ask about their preferred move date/timeline
2. After timeline, ask about origin and destination addresses
3. After locations, ask about the size (sqm or number of workstations)
4. After size, ask about any special requirements (fragile items, after-hours, etc.)
5. Present a preliminary quote estimate
6. Collect contact information to finalize the booking

GUIDELINES:
- Keep responses brief and conversational (2-3 sentences)
- Always ask ONE question at a time
- Use Australian English spellings
- Be warm but professional
- If unsure, offer to connect with a human team member
\`\`\`

## Success Metrics
- Response rate: 100% (every user message gets a response)
- Conversation completion: >60% reach quote stage
- Error rate: <1%
- Average response time: <2s
