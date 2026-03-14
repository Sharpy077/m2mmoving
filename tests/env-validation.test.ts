import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock server-only to avoid import errors in test environment
vi.mock('server-only', () => ({}))

describe('lib/env – lazy validation', () => {
  const VALID_ENV = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    OPENAI_API_KEY: 'sk-test-openai-key',
    STRIPE_SECRET_KEY: 'sk_test_stripe',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_stripe',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Reset module cache so each test gets a fresh import
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('can be imported without throwing (lazy validation)', async () => {
    // Simulate build environment — no server-side env vars
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET

    // Import should NOT throw — validation is deferred
    const module = await import('@/lib/env')
    expect(module.env).toBeDefined()
  })

  it('returns valid env values when all vars are present', async () => {
    Object.assign(process.env, VALID_ENV)

    const { env } = await import('@/lib/env')
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_stripe')
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
  })

  it('throws descriptive error when accessing env with missing required vars', async () => {
    // Clear all required vars
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    const { env } = await import('@/lib/env')

    // Accessing a property should trigger validation and throw
    expect(() => env.STRIPE_SECRET_KEY).toThrow('Missing or invalid environment variables')
  })

  it('includes specific variable names in error message', async () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.STRIPE_SECRET_KEY
    // Set the rest so only these two are missing
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'

    const { env } = await import('@/lib/env')

    expect(() => env.OPENAI_API_KEY).toThrow('OPENAI_API_KEY')
    // Note: both missing vars appear in the same error
  })
})
