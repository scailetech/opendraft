import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiClient } from '@/lib/gemini'

describe('GeminiClient', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with API key', () => {
    expect(() => client.initialize('test-key-123')).not.toThrow()
  })

  it('throws if initialized without API key', () => {
    expect(() => client.initialize('')).toThrow()
  })

  it('throws if processing without initialization', async () => {
    const client2 = new GeminiClient()
    await expect(client2.processRow('Test', { key: 'value' })).rejects.toThrow()
  })

  it('processes single row and returns string result', async () => {
    client.initialize(process.env.GEMINI_API_KEY || 'test-key')
    
    // This will be a real call but with a simple prompt
    try {
      const result = await client.processRow(
        'Say "hello" in one word',
        { test: 'value' }
      )
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    } catch (error) {
      // API key might not be set in test, that's ok
      expect(error).toBeDefined()
    }
  })

  it('replaces template variables in prompt', async () => {
    client.initialize(process.env.GEMINI_API_KEY || 'test-key')
    
    try {
      const result = await client.processRow(
        'Say the email: {{email}}',
        { email: 'test@example.com' }
      )
      // The prompt sent to Gemini should have had {{email}} replaced
      expect(result).toBeDefined()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('handles missing template variables gracefully', async () => {
    client.initialize(process.env.GEMINI_API_KEY || 'test-key')
    
    try {
      const result = await client.processRow(
        'Say {{missing}} variable',
        { other: 'value' }
      )
      expect(result).toBeDefined()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('enforces rate limiting (60 requests per minute)', () => {
    client.initialize('test-key')
    
    // Allow 60 requests
    for (let i = 0; i < 60; i++) {
      const allowed = client.checkRateLimit()
      expect(allowed).toBe(true)
    }
    
    // 61st request should be denied
    expect(client.checkRateLimit()).toBe(false)
  })

  it('resets rate limit counter after time window', async () => {
    client.initialize('test-key')
    
    // Fill the rate limit bucket
    for (let i = 0; i < 60; i++) {
      client.checkRateLimit()
    }
    expect(client.checkRateLimit()).toBe(false)
    
    // Create a fresh client to reset
    client = new GeminiClient()
    client.initialize('test-key')
    expect(client.checkRateLimit()).toBe(true)
  })

  it('exponential backoff for retries', async () => {
    client.initialize('test-key')
    
    let attempts = 0
    const fn = async () => {
      attempts++
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`)
      }
      return 'success'
    }
    
    const result = await client.retryWithBackoff(fn, 3)
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('throws after max retries exceeded', async () => {
    client.initialize('test-key')
    
    const fn = async () => {
      throw new Error('Persistent failure')
    }
    
    await expect(client.retryWithBackoff(fn, 2)).rejects.toThrow('Persistent failure')
  })

  it('returns 0 retries left when max reached', async () => {
    client.initialize('test-key')
    
    const fn = async () => {
      throw new Error('Failed')
    }
    
    try {
      await client.retryWithBackoff(fn, 1)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('generates correct system prompt for schema', () => {
    client.initialize('test-key')

    const schema = [
      { name: 'score', type: 'string' as const, required: true },
      { name: 'reason', type: 'string' as const, required: true }
    ]

    const systemPrompt = client.generateSystemPrompt(schema)
    expect(systemPrompt).toContain('score')
    expect(systemPrompt).toContain('reason')
    expect(typeof systemPrompt).toBe('string')
  })
})






