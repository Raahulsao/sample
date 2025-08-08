import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiService, GeminiError } from '@/lib/gemini'

describe('Gemini Error Handling', () => {
  const mockApiKey = 'test-api-key-123'
  let service: GeminiService

  beforeEach(() => {
    service = new GeminiService({ apiKey: mockApiKey })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Classification', () => {
    it('should classify API key errors correctly', async () => {
      const mockError = new Error('API key not valid. Please pass a valid API key.')
      
      // Mock the textModel to throw the error
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('API_KEY_INVALID')
        expect(geminiError.userMessage).toContain('API configuration')
        expect(geminiError.retryable).toBe(false)
        expect(geminiError.severity).toBe('critical')
        expect(geminiError.timestamp).toBeInstanceOf(Date)
      }
    })

    it('should classify rate limit errors correctly', async () => {
      const mockError = new Error('Rate limit exceeded. Please wait 60 seconds before making another request.')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('RATE_LIMIT_EXCEEDED')
        expect(geminiError.userMessage).toContain('Too many requests')
        expect(geminiError.retryable).toBe(true)
        expect(geminiError.severity).toBe('medium')
        expect(geminiError.retryAfter).toBe(60000) // 60 seconds in milliseconds
      }
    })

    it('should classify quota exceeded errors correctly', async () => {
      const mockError = new Error('API quota exceeded for this project')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('QUOTA_EXCEEDED')
        expect(geminiError.userMessage).toContain('usage limit')
        expect(geminiError.retryable).toBe(false)
        expect(geminiError.severity).toBe('high')
      }
    })

    it('should classify network errors correctly', async () => {
      const mockError = new Error('Network connection failed: ENOTFOUND')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('NETWORK_ERROR')
        expect(geminiError.userMessage).toContain('Connection problem')
        expect(geminiError.retryable).toBe(true)
        expect(geminiError.severity).toBe('medium')
      }
    })

    it('should classify timeout errors correctly', async () => {
      const mockError = new Error('Request timed out after 30000ms')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('TIMEOUT')
        expect(geminiError.userMessage).toContain('timed out')
        expect(geminiError.retryable).toBe(true)
        expect(geminiError.severity).toBe('medium')
      }
    })

    it('should classify service unavailable errors correctly', async () => {
      const mockError = new Error('Service temporarily unavailable (503)')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('SERVICE_UNAVAILABLE')
        expect(geminiError.userMessage).toContain('temporarily unavailable')
        expect(geminiError.retryable).toBe(true)
        expect(geminiError.severity).toBe('high')
      }
    })

    it('should classify content filtered errors correctly', async () => {
      const mockError = new Error('Content blocked due to safety policies')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('CONTENT_FILTERED')
        expect(geminiError.userMessage).toContain('safety filters')
        expect(geminiError.retryable).toBe(false)
        expect(geminiError.severity).toBe('low')
      }
    })

    it('should classify validation errors correctly', async () => {
      try {
        await service.generateText({ prompt: '' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('VALIDATION_ERROR')
        expect(geminiError.userMessage).toContain('enter a message')
        expect(geminiError.retryable).toBe(false)
        expect(geminiError.severity).toBe('low')
      }
    })

    it('should classify unknown errors correctly', async () => {
      const mockError = new Error('Some unexpected error occurred')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('UNKNOWN')
        expect(geminiError.userMessage).toContain('Something went wrong')
        expect(geminiError.retryable).toBe(true)
        expect(geminiError.severity).toBe('medium')
      }
    })
  })

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly messages for validation errors', () => {
      const testCases = [
        {
          original: 'Prompt is required and cannot be empty',
          expected: 'Please enter a message to continue.'
        },
        {
          original: 'Prompt exceeds maximum length of 4000 characters',
          expected: 'Your message is too long. Please shorten it and try again.'
        },
        {
          original: 'Temperature must be between 0 and 2',
          expected: 'Invalid creativity setting. Please use a value between 0 and 2.'
        },
        {
          original: 'TopP must be between 0 and 1',
          expected: 'Invalid focus setting. Please use a value between 0 and 1.'
        },
        {
          original: 'TopK must be greater than 0',
          expected: 'Invalid diversity setting. Please use a positive number.'
        }
      ]

      testCases.forEach(({ original, expected }) => {
        const result = (service as any).getUserFriendlyValidationMessage(original)
        expect(result).toBe(expected)
      })
    })

    it('should provide fallback message for unknown validation errors', () => {
      const result = (service as any).getUserFriendlyValidationMessage('Some unknown validation error')
      expect(result).toBe('Please check your input and try again.')
    })
  })

  describe('Retry Logic and Exponential Backoff', () => {
    it('should retry retryable errors with exponential backoff', async () => {
      const mockError = new Error('Network connection failed')
      let attemptCount = 0
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            throw mockError
          }
          return {
            response: {
              text: () => 'Success after retries',
              usageMetadata: { totalTokenCount: 10 }
            }
          }
        })
      })

      // Mock sleep to speed up tests
      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      const result = await service.generateTextWithRetry({ prompt: 'test' }, 3)
      
      expect(attemptCount).toBe(3)
      expect(result.content).toBe('Success after retries')
      expect((service as any).sleep).toHaveBeenCalledTimes(2) // 2 retries = 2 sleeps
    })

    it('should not retry non-retryable errors', async () => {
      const mockError = new Error('API key not valid')
      let attemptCount = 0
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          attemptCount++
          throw mockError
        })
      })

      try {
        await service.generateTextWithRetry({ prompt: 'test' }, 3)
      } catch (error) {
        expect(attemptCount).toBe(1) // Should not retry
        expect((error as GeminiError).code).toBe('API_KEY_INVALID')
      }
    })

    it('should calculate exponential backoff delays correctly', () => {
      // Mock Math.random to make tests deterministic
      const originalRandom = Math.random
      Math.random = vi.fn(() => 0.5) // Fixed jitter
      
      try {
        const delays = [
          (service as any).calculateRetryDelay(1),
          (service as any).calculateRetryDelay(2),
          (service as any).calculateRetryDelay(3),
          (service as any).calculateRetryDelay(4),
          (service as any).calculateRetryDelay(5),
          (service as any).calculateRetryDelay(10), // Should be capped at maxDelay
        ]

        // Check that delays increase exponentially (with fixed jitter)
        expect(delays[0]).toBeGreaterThanOrEqual(500) // Minimum delay
        expect(delays[1]).toBeGreaterThan(delays[0]) // Should increase
        expect(delays[2]).toBeGreaterThan(delays[1]) // Should increase
        expect(delays[3]).toBeGreaterThan(delays[2]) // Should increase
        
        // All delays should be capped at 30 seconds
        delays.forEach(delay => {
          expect(delay).toBeLessThanOrEqual(30000)
          expect(delay).toBeGreaterThanOrEqual(500)
        })
      } finally {
        Math.random = originalRandom
      }
    })

    it('should use retry-after value from error when available', () => {
      const error: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests',
        retryAfter: 5000,
        retryable: true,
        severity: 'medium',
        timestamp: new Date()
      }

      const delay = (service as any).calculateRetryDelay(1, error)
      expect(delay).toBe(5000)
    })

    it('should exhaust all retries and enhance final error', async () => {
      const mockError = new Error('Network connection failed')
      let attemptCount = 0
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          attemptCount++
          throw mockError
        })
      })

      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      try {
        await service.generateTextWithRetry({ prompt: 'test' }, 3)
      } catch (error) {
        const geminiError = error as GeminiError
        expect(attemptCount).toBe(3)
        expect(geminiError.details?.retriesExhausted).toBe(true)
        expect(geminiError.details?.totalAttempts).toBe(3)
        expect(geminiError.details?.finalAttempt).toBe(true)
        expect(geminiError.userMessage).toContain('We tried 3 times')
      }
    })
  })

  describe('Request ID Tracking', () => {
    it('should generate unique request IDs', () => {
      const id1 = (service as any).generateRequestId()
      const id2 = (service as any).generateRequestId()
      
      expect(id1).toMatch(/^req-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^req-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should include request ID in error details', async () => {
      const mockError = new Error('Test error')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(mockError)
      })

      try {
        await service.generateText({ prompt: 'test' })
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.details?.requestId).toMatch(/^req-\d+-[a-z0-9]+$/)
      }
    })

    it('should include request ID in response metadata', async () => {
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Test response',
            usageMetadata: { totalTokenCount: 10 }
          }
        })
      })

      const result = await service.generateText({ prompt: 'test' })
      expect(result.metadata?.requestId).toMatch(/^req-\d+-[a-z0-9]+$/)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from transient network errors', async () => {
      let attemptCount = 0
      const responses = [
        () => { throw new Error('Network connection failed') },
        () => { throw new Error('Connection timeout') },
        () => ({
          response: {
            text: () => 'Success after network recovery',
            usageMetadata: { totalTokenCount: 15 }
          }
        })
      ]
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          const response = responses[attemptCount]
          attemptCount++
          return response()
        })
      })

      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      const result = await service.generateTextWithRetry({ prompt: 'test' }, 3)
      
      expect(result.content).toBe('Success after network recovery')
      expect(attemptCount).toBe(3)
    })

    it('should handle mixed error types during retries', async () => {
      let attemptCount = 0
      const responses = [
        () => { throw new Error('Rate limit exceeded') },
        () => { throw new Error('Service temporarily unavailable') },
        () => { throw new Error('API key not valid') }, // Non-retryable
      ]
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          const response = responses[attemptCount]
          attemptCount++
          return response()
        })
      })

      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      try {
        await service.generateTextWithRetry({ prompt: 'test' }, 5)
      } catch (error) {
        const geminiError = error as GeminiError
        expect(attemptCount).toBe(3) // Should stop at non-retryable error
        expect(geminiError.code).toBe('API_KEY_INVALID')
      }
    })
  })

  describe('Streaming Error Handling', () => {
    it('should handle errors during streaming', async () => {
      const mockError = new Error('Some unexpected streaming error')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContentStream: vi.fn().mockRejectedValue(mockError)
      })

      try {
        const stream = service.generateTextStream({ prompt: 'test' })
        const iterator = stream[Symbol.asyncIterator]()
        await iterator.next()
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.code).toBe('UNKNOWN')
        expect(geminiError.details?.requestId).toBeDefined()
      }
    })

    it('should handle errors in streaming metadata', async () => {
      const mockError = new Error('Metadata processing failed')
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContentStream: vi.fn().mockResolvedValue({
          stream: (async function* () {
            yield { text: () => 'chunk1' }
            throw mockError
          })()
        })
      })

      try {
        const { stream, metadata } = await service.generateTextStreamWithMetadata({ prompt: 'test' })
        
        // Consume stream until error
        try {
          for await (const chunk of stream) {
            // This should eventually throw
          }
        } catch (streamError) {
          // Stream error should be caught here
          const geminiError = streamError as GeminiError
          expect(geminiError.details?.requestId).toBeDefined()
        }
        
        // Metadata promise should also reject
        try {
          await metadata
        } catch (metadataError) {
          const geminiError = metadataError as GeminiError
          expect(geminiError.details?.requestId).toBeDefined()
        }
      } catch (error) {
        const geminiError = error as GeminiError
        expect(geminiError.details?.requestId).toBeDefined()
      }
    })
  })

  describe('Error Logging and Monitoring', () => {
    it('should log retry attempts with proper context', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const mockError = new Error('Network error')
      let attemptCount = 0
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            throw mockError
          }
          return {
            response: {
              text: () => 'Success',
              usageMetadata: { totalTokenCount: 10 }
            }
          }
        })
      })

      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      await service.generateTextWithRetry({ prompt: 'test' }, 3)
      
      expect(consoleSpy).toHaveBeenCalledTimes(2) // 2 failed attempts
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed on attempt'),
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          retryable: true,
          severity: 'medium'
        })
      )

      consoleSpy.mockRestore()
    })

    it('should log successful retry with attempt count', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const mockError = new Error('Temporary error')
      let attemptCount = 0
      
      vi.spyOn(service as any, 'textModel', 'get').mockReturnValue({
        generateContent: vi.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 2) {
            throw mockError
          }
          return {
            response: {
              text: () => 'Success',
              usageMetadata: { totalTokenCount: 10 }
            }
          }
        })
      })

      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      await service.generateTextWithRetry({ prompt: 'test' }, 3)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('succeeded on attempt 2/3')
      )

      consoleSpy.mockRestore()
    })
  })
})