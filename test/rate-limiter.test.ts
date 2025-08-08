import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RateLimiter, getGlobalRateLimiter, resetGlobalRateLimiter, createRateLimiterFromEnv } from '@/lib/rate-limiter'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      requestsPerMinute: 5,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      tokensPerMinute: 1000,
      tokensPerHour: 10000,
      tokensPerDay: 100000,
      burstLimit: 2,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limits', () => {
      const result = rateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(result.allowed).toBe(true)
      expect(result.message).toBe('Request allowed')
    })

    it('should deny requests when minute limit is exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkRateLimit({ requestTokens: 100 })
        expect(result.allowed).toBe(true)
      }

      // 6th request should be denied
      const result = rateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(result.allowed).toBe(false)
      expect(result.limitType).toBe('requests')
      expect(result.timeWindow).toBe('minute')
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should deny requests when token limit is exceeded', () => {
      const result = rateLimiter.checkRateLimit({ requestTokens: 1500 })
      expect(result.allowed).toBe(false)
      expect(result.limitType).toBe('tokens')
      expect(result.timeWindow).toBe('minute')
    })

    it('should track quota usage correctly', () => {
      rateLimiter.checkRateLimit({ requestTokens: 200 })
      rateLimiter.checkRateLimit({ requestTokens: 300 })

      const usage = rateLimiter.getQuotaUsage()
      expect(usage.requests.minute).toBe(2)
      expect(usage.tokens.minute).toBe(500)
    })
  })

  describe('Burst Limiting', () => {
    it('should allow high-priority requests via burst capacity', () => {
      // Fill up regular capacity
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRateLimit({ requestTokens: 100 })
      }

      // Regular request should be denied
      const regularResult = rateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(regularResult.allowed).toBe(false)

      // High-priority request should use burst capacity
      const burstResult = rateLimiter.checkRateLimit({ 
        requestTokens: 100, 
        priority: 'high' 
      })
      expect(burstResult.allowed).toBe(true)
      expect(burstResult.message).toBe('Request allowed via burst capacity')
    })

    it('should exhaust burst tokens', () => {
      // Fill up regular capacity
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRateLimit({ requestTokens: 100 })
      }

      // Use up burst capacity (2 tokens)
      for (let i = 0; i < 2; i++) {
        const result = rateLimiter.checkRateLimit({ 
          requestTokens: 100, 
          priority: 'high' 
        })
        expect(result.allowed).toBe(true)
      }

      // Next high-priority request should be denied
      const result = rateLimiter.checkRateLimit({ 
        requestTokens: 100, 
        priority: 'high' 
      })
      expect(result.allowed).toBe(false)
    })
  })

  describe('Time Window Management', () => {
    it('should reset counters after time window', () => {
      // Create a fresh rate limiter
      const testRateLimiter = new RateLimiter({
        requestsPerMinute: 5,
        requestsPerHour: 100,
        requestsPerDay: 1000,
        burstLimit: 2,
      })

      // Fill up minute limit
      for (let i = 0; i < 5; i++) {
        testRateLimiter.checkRateLimit({ requestTokens: 100 })
      }

      // Should be rate limited
      let result = testRateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(result.allowed).toBe(false)

      // Reset the rate limiter (simulating time passage)
      testRateLimiter.reset()

      // Should be allowed again
      result = testRateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(result.allowed).toBe(true)
    })

    it('should handle hour and day limits', () => {
      const rateLimiter = new RateLimiter({
        requestsPerMinute: 1000,
        requestsPerHour: 2,
        requestsPerDay: 1000,
        burstLimit: 0,
      })

      // Make 2 requests (hour limit)
      for (let i = 0; i < 2; i++) {
        const result = rateLimiter.checkRateLimit({ requestTokens: 100 })
        expect(result.allowed).toBe(true)
      }

      // 3rd request should be denied due to hour limit
      const result = rateLimiter.checkRateLimit({ requestTokens: 100 })
      expect(result.allowed).toBe(false)
      expect(result.timeWindow).toBe('hour')
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      rateLimiter.updateConfig({ requestsPerMinute: 10 })
      const config = rateLimiter.getConfig()
      expect(config.requestsPerMinute).toBe(10)
    })

    it('should reset all counters', () => {
      // Make some requests
      rateLimiter.checkRateLimit({ requestTokens: 100 })
      rateLimiter.checkRateLimit({ requestTokens: 200 })

      let usage = rateLimiter.getQuotaUsage()
      expect(usage.requests.minute).toBe(2)

      // Reset
      rateLimiter.reset()

      usage = rateLimiter.getQuotaUsage()
      expect(usage.requests.minute).toBe(0)
      expect(usage.tokens.minute).toBe(0)
    })
  })

  describe('Status and Monitoring', () => {
    it('should provide rate limit status', () => {
      // Create a fresh rate limiter to ensure clean state
      const testRateLimiter = new RateLimiter({
        requestsPerMinute: 5,
        requestsPerHour: 100,
        requestsPerDay: 1000,
        burstLimit: 2,
      })
      
      testRateLimiter.checkRateLimit({ requestTokens: 100 })
      
      const status = testRateLimiter.getStatus()
      expect(status.isLimited).toBe(false)
      expect(status.quotaUsage.requests.minute).toBe(1)
      expect(status.burstTokensAvailable).toBe(2)
    })

    it('should calculate time until next request', () => {
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRateLimit({ requestTokens: 100 })
      }

      const timeUntilNext = rateLimiter.getTimeUntilNextRequest()
      expect(timeUntilNext).toBeGreaterThan(0)
      expect(timeUntilNext).toBeLessThanOrEqual(60000) // Should be within 1 minute
    })

    it('should detect if currently rate limited', () => {
      expect(rateLimiter.isRateLimited()).toBe(false)

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRateLimit({ requestTokens: 100 })
      }

      expect(rateLimiter.isRateLimited()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero token requests', () => {
      const result = rateLimiter.checkRateLimit({ requestTokens: 0 })
      expect(result.allowed).toBe(true)
    })

    it('should handle very large token requests', () => {
      const result = rateLimiter.checkRateLimit({ requestTokens: 999999 })
      expect(result.allowed).toBe(false)
      expect(result.limitType).toBe('tokens')
    })

    it('should handle rapid successive requests', () => {
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(rateLimiter.checkRateLimit({ requestTokens: 100 }))
      }

      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(5) // Should only allow 5 requests
    })
  })
})

describe('Global Rate Limiter', () => {
  afterEach(() => {
    resetGlobalRateLimiter()
  })

  it('should create and reuse global instance', () => {
    const limiter1 = getGlobalRateLimiter()
    const limiter2 = getGlobalRateLimiter()
    expect(limiter1).toBe(limiter2)
  })

  it('should reset global instance', () => {
    const limiter1 = getGlobalRateLimiter()
    resetGlobalRateLimiter()
    const limiter2 = getGlobalRateLimiter()
    expect(limiter1).not.toBe(limiter2)
  })
})

describe('Environment Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create rate limiter from environment variables', () => {
    process.env.GEMINI_REQUESTS_PER_MINUTE = '30'
    process.env.GEMINI_REQUESTS_PER_HOUR = '500'
    process.env.GEMINI_TOKENS_PER_MINUTE = '15000'

    const rateLimiter = createRateLimiterFromEnv()
    const config = rateLimiter.getConfig()

    expect(config.requestsPerMinute).toBe(30)
    expect(config.requestsPerHour).toBe(500)
    expect(config.tokensPerMinute).toBe(15000)
  })

  it('should use default values when env vars are not set', () => {
    const rateLimiter = createRateLimiterFromEnv()
    const config = rateLimiter.getConfig()

    expect(config.requestsPerMinute).toBe(60)
    expect(config.requestsPerHour).toBe(1000)
    expect(config.requestsPerDay).toBe(10000)
  })
})

describe('Rate Limiter Integration', () => {
  it('should handle concurrent requests correctly', async () => {
    const rateLimiter = new RateLimiter({
      requestsPerMinute: 3,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstLimit: 1,
    })

    // Simulate concurrent requests
    const promises = Array.from({ length: 5 }, () => 
      Promise.resolve(rateLimiter.checkRateLimit({ requestTokens: 100 }))
    )

    const results = await Promise.all(promises)
    const allowedCount = results.filter(r => r.allowed).length
    
    // Should allow 3 regular requests (burst doesn't apply without high priority)
    expect(allowedCount).toBe(3)
  })

  it('should provide accurate retry timing', () => {
    const testRateLimiter = new RateLimiter({
      requestsPerMinute: 5,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstLimit: 2,
    })

    const mockNow = vi.spyOn(Date, 'now')
    const startTime = Date.now()
    mockNow.mockReturnValue(startTime)

    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      testRateLimiter.checkRateLimit({ requestTokens: 100 })
    }

    const result = testRateLimiter.checkRateLimit({ requestTokens: 100 })
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
    expect(result.retryAfter).toBeLessThanOrEqual(60000)

    mockNow.mockRestore()
  })
})