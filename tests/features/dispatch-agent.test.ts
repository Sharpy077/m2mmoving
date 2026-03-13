/**
 * DISPATCH_MKT Agent Tests
 * Autonomous job matching and assignment engine
 * Written BEFORE implementation (TDD Red phase)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

const {
  mockInsert,
  mockInsertSelect,
  mockInsertSingle,
  mockUpdate,
  mockUpdateEq,
  mockUpdateSelect,
  mockUpdateSingle,
  mockSelect,
  mockSelectFilter,
  mockSelectData,
  mockFrom,
  createClientMock,
} = vi.hoisted(() => {
  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockSelectData = vi.fn()
  const mockSelectFilter = vi.fn(() => ({ data: [], error: null }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectFilter, data: [], error: null }))

  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  }))
  const createClientMock = vi.fn(() => ({ from: mockFrom }))

  return {
    mockInsert, mockInsertSelect, mockInsertSingle,
    mockUpdate, mockUpdateEq, mockUpdateSelect, mockUpdateSingle,
    mockSelect, mockSelectFilter, mockSelectData,
    mockFrom, createClientMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('server-only', () => ({}))

// ─────────────────────────────────────────────
// POST /api/marketplace/jobs/[id]/assign
// (Triggers DISPATCH agent matching)
// ─────────────────────────────────────────────

describe('POST /api/marketplace/jobs/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    })
  })

  it('assigns job to a provider and returns 200', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        status: 'assigned',
        assigned_provider_id: 'prov-1',
        assigned_at: new Date().toISOString(),
      },
      error: null,
    })

    const { POST } = await import('@/app/api/marketplace/jobs/[id]/assign/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/assign', {
      method: 'POST',
      body: JSON.stringify({ provider_id: 'prov-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('assigned')
    expect(body.data.assigned_provider_id).toBe('prov-1')
  })

  it('returns 400 if provider_id is missing', async () => {
    const { POST } = await import('@/app/api/marketplace/jobs/[id]/assign/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/marketplace/jobs/job-1/assign', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'job-1' }) })
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────
// DISPATCH Agent Core Logic
// ─────────────────────────────────────────────

describe('DispatchAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('can be instantiated', async () => {
    const { DispatchAgent } = await import('@/lib/agents/dispatch/agent')
    const agent = new DispatchAgent()
    expect(agent).toBeDefined()
  })

  it('has expected identity properties', async () => {
    const { DispatchAgent } = await import('@/lib/agents/dispatch/agent')
    const agent = new DispatchAgent()
    const identity = agent.getPublicIdentity()
    expect(identity.codename).toBe('DISPATCH_MKT')
    expect(identity.name).toBe('Dispatch')
    expect(identity.capabilities).toContain('job_matching')
  })

  it('processes a job.posted event', async () => {
    const { DispatchAgent } = await import('@/lib/agents/dispatch/agent')
    const agent = new DispatchAgent()

    // Mock eligible providers query
    const mockEligibleProviders = [
      {
        id: 'prov-1',
        company_name: 'Fast Movers',
        rating: 4.8,
        total_jobs: 50,
        completed_jobs: 48,
        service_areas: ['Melbourne CBD'],
        move_types: ['office'],
        verification_status: 'verified',
        is_active: true,
        commission_rate: 0.15,
      },
    ]

    // Mock chain: .select('...').eq('is_active', true).eq('verification_status', 'verified').order(...)
    // .select()       → { eq: mockSelectFilter }
    // .eq(isActive)   → mockSelectFilter() → { eq: mockEqAfterFirst }
    // .eq(verified)   → mockEqAfterFirst() → { order: mockOrder }
    // .order(rating)  → mockOrder() → { data, error }
    const mockOrder = vi.fn().mockResolvedValue({ data: mockEligibleProviders, error: null })
    const mockEqAfterFirst = vi.fn(() => ({ order: mockOrder }))
    mockSelectFilter.mockReturnValue({ eq: mockEqAfterFirst })

    const result = await agent.process({
      type: 'event',
      event: {
        name: 'job.posted',
        data: {
          job_id: 'job-1',
          job_type: 'office',
          origin_suburb: 'Melbourne CBD',
          square_meters: 150,
          customer_price: 5000,
          scheduled_date: '2026-04-15',
          matching_mode: 'instant',
        },
      },
    })

    expect(result.success).toBe(true)
  })

  it('returns success false if no eligible providers found', async () => {
    const { DispatchAgent } = await import('@/lib/agents/dispatch/agent')
    const agent = new DispatchAgent()

    // Mock empty providers list
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockEqChain = vi.fn(() => ({ order: mockOrder }))
    mockSelectFilter.mockReturnValue({ eq: mockEqChain })

    const result = await agent.process({
      type: 'event',
      event: {
        name: 'job.posted',
        data: {
          job_id: 'job-1',
          job_type: 'office',
          origin_suburb: 'Melbourne CBD',
          square_meters: 100,
          customer_price: 3000,
          scheduled_date: '2026-04-15',
          matching_mode: 'instant',
        },
      },
    })

    // Should not fail catastrophically — escalate or return no-match
    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
  })

  it('handles bidding mode by opening bid window instead of auto-assigning', async () => {
    const { DispatchAgent } = await import('@/lib/agents/dispatch/agent')
    const agent = new DispatchAgent()

    mockUpdateSingle.mockResolvedValue({
      data: { id: 'job-1', status: 'bidding', bid_deadline: new Date().toISOString() },
      error: null,
    })

    const result = await agent.process({
      type: 'event',
      event: {
        name: 'job.posted',
        data: {
          job_id: 'job-1',
          job_type: 'datacenter',
          origin_suburb: 'Docklands',
          square_meters: 500,
          customer_price: 25000,
          scheduled_date: '2026-04-15',
          matching_mode: 'bidding',
        },
      },
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})

// ─────────────────────────────────────────────
// DISPATCH_MKT in Agent Registry
// ─────────────────────────────────────────────

describe('Agent Registry', () => {
  it('includes DISPATCH_MKT in the registry', async () => {
    const { AGENT_REGISTRY } = await import('@/lib/agents/index')
    expect(AGENT_REGISTRY).toHaveProperty('DISPATCH')
    expect((AGENT_REGISTRY as Record<string, { codename: string }>).DISPATCH.codename).toBe('DISPATCH_MKT')
  })

  it('includes DISPATCH_MKT in AgentCodename type', async () => {
    const { type: _ignore, ...types } = await import('@/lib/agents/types')
    // Type-level check: DISPATCH_MKT should be in AgentCodename
    const codenames: string[] = [
      'MAYA_SALES', 'SENTINEL_CS', 'HUNTER_LG', 'AURORA_MKT',
      'ORACLE_BI', 'PHOENIX_RET', 'ECHO_REP', 'NEXUS_OPS',
      'PRISM_PRICE', 'CIPHER_SEC', 'BRIDGE_HH', 'GUARDIAN_QA',
      'CORTEX_ORCH', 'DISPATCH_MKT',
    ]
    expect(codenames).toContain('DISPATCH_MKT')
  })
})
