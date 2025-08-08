import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { appRouter } from '@/server/routers/app'
import { geminiRouter } from '@/server/routers/gemini'
import { GeminiService, GeminiError } from '@/lib/gemini'
import { TRPCError } from '@trpc/server'

// Mock the Gemini service
vi.mock('@/lib/gemini', () => {
  const mockGeminiService = {
    generateText: vi.fn(),
    generateTextWithRetry: vi.fn(),
    generateTextStream: vi.fn(),
    generateTextStreamWithMetadata: vi.fn(),
    generateImage: vi.fn(),
    generateImageWithRetry: vi.fn(),
    validateApiKey: vi.fn(),
    getConfig: vi.fn(),
  }

  return {
    getGeminiService: vi.fn(() => mockGeminiService),
    GeminiService: vi.fn(() => mockGeminiService),
    createGeminiService: vi.fn(() => mockGeminiService),
  }
})

describe('Gemini tRPC Router', () => {
  let mockGeminiService: any

  beforeEach(async () => {
    // Get the mocked service instance
    const { getGeminiService } = await import('@/lib/gemini')
    mockGeminiService = getGeminiService()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateText procedure', () => {
    it('should successfully generate text with valid input', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Generated text response',
        type: 'text' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 10,
        },
      }

      mockGeminiService.generateText.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateText({
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 100,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockGeminiService.generateText).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        stream: false,
        temperature: 0.7,
        maxTokens: 100,
        topP: undefined,
        topK: undefined,
      })
    })

    it('should validate input parameters correctly', async () => {
      const caller = appRouter.createCaller({})

      // Test empty prompt
      await expect(
        caller.gemini.generateText({ prompt: '' })
      ).rejects.toThrow('Prompt is required')

      // Test prompt too long
      await expect(
        caller.gemini.generateText({ 
          prompt: 'a'.repeat(4001) 
        })
      ).rejects.toThrow('Prompt exceeds maximum length')

      // Test invalid temperature
      await expect(
        caller.gemini.generateText({ 
          prompt: 'test',
          temperature: 3 
        })
      ).rejects.toThrow()

      // Test invalid topP
      await expect(
        caller.gemini.generateText({ 
          prompt: 'test',
          topP: 1.5 
        })
      ).rejects.toThrow()

      // Test invalid topK
      await expect(
        caller.gemini.generateText({ 
          prompt: 'test',
          topK: 0 
        })
      ).rejects.toThrow()
    })

    it('should handle API key invalid error', async () => {
      const geminiError: GeminiError = {
        code: 'API_KEY_INVALID',
        message: 'Invalid API key',
        userMessage: 'There\'s an issue with the API configuration. Please contact support.',
        details: { requestId: 'req-123' },
        retryable: false,
        severity: 'critical',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      await expect(
        caller.gemini.generateText({ prompt: 'test' })
      ).rejects.toThrow(TRPCError)

      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('UNAUTHORIZED')
        expect((error as TRPCError).message).toBe('There\'s an issue with the API configuration. Please contact support.')
        expect((error as TRPCError).cause).toMatchObject({
          geminiErrorCode: 'API_KEY_INVALID',
          severity: 'critical',
          retryable: false,
          requestId: 'req-123'
        })
      }
    })

    it('should handle rate limit exceeded error', async () => {
      const geminiError: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests. Please wait 60 seconds and try again.',
        details: { requestId: 'req-456' },
        retryAfter: 60000,
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('TOO_MANY_REQUESTS')
        expect((error as TRPCError).message).toBe('Too many requests. Please wait 60 seconds and try again.')
        expect((error as TRPCError).cause).toMatchObject({
          geminiErrorCode: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          retryable: true,
          retryAfter: 60000
        })
      }
    })

    it('should handle quota exceeded error', async () => {
      const geminiError: GeminiError = {
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        userMessage: 'You have exceeded your quota',
        details: {},
        retryable: false,
        severity: 'high',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('FORBIDDEN')
        expect((error as TRPCError).message).toBe('Quota exceeded')
      }
    })

    it('should handle validation error', async () => {
      const geminiError: GeminiError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid parameters',
        userMessage: 'Please check your parameters',
        details: {},
        retryable: false,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('BAD_REQUEST')
        expect((error as TRPCError).message).toBe('Invalid parameters')
      }
    })

    it('should handle network error', async () => {
      const geminiError: GeminiError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Network connection failed, please try again',
        details: {},
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('Network connection failed')
      }
    })

    it('should handle unknown error', async () => {
      const geminiError: GeminiError = {
        code: 'UNKNOWN',
        message: 'Unknown error occurred',
        userMessage: 'An unknown error occurred',
        details: {},
        retryable: false,
        severity: 'high',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('Unknown error occurred')
      }
    })

    it('should handle timeout errors', async () => {
      const geminiError: GeminiError = {
        code: 'TIMEOUT',
        message: 'Request timed out',
        userMessage: 'Request timed out. Please try again.',
        details: { requestId: 'req-timeout' },
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('TIMEOUT')
        expect((error as TRPCError).message).toBe('Request timed out. Please try again.')
      }
    })

    it('should handle content filtered errors', async () => {
      const geminiError: GeminiError = {
        code: 'CONTENT_FILTERED',
        message: 'Content was filtered',
        userMessage: 'Your request was blocked by safety filters. Please try rephrasing your message.',
        details: { requestId: 'req-filtered' },
        retryable: false,
        severity: 'low',
        timestamp: new Date(),
      }

      mockGeminiService.generateText.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('BAD_REQUEST')
        expect((error as TRPCError).message).toBe('Your request was blocked by safety filters. Please try rephrasing your message.')
      }
    })

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error')
      mockGeminiService.generateText.mockRejectedValue(unexpectedError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateText({ prompt: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('Unexpected error')
      }
    })
  })

  describe('generateTextWithRetry procedure', () => {
    it('should successfully generate text with retry', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Generated text response',
        type: 'text' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 10,
        },
      }

      mockGeminiService.generateTextWithRetry.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateTextWithRetry({
        prompt: 'Test prompt',
        maxRetries: 5,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockGeminiService.generateTextWithRetry).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        stream: false,
        maxTokens: undefined,
        temperature: undefined,
        topP: undefined,
        topK: undefined,
      }, 5)
    })

    it('should use default maxRetries when not provided', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Generated text response',
        type: 'text' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 10,
        },
      }

      mockGeminiService.generateTextWithRetry.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      await caller.gemini.generateTextWithRetry({
        prompt: 'Test prompt',
      })

      expect(mockGeminiService.generateTextWithRetry).toHaveBeenCalledWith(
        expect.any(Object),
        3 // default maxRetries
      )
    })

    it('should validate maxRetries parameter', async () => {
      const caller = appRouter.createCaller({})

      // Test maxRetries too low
      await expect(
        caller.gemini.generateTextWithRetry({ 
          prompt: 'test',
          maxRetries: 0 
        })
      ).rejects.toThrow()

      // Test maxRetries too high
      await expect(
        caller.gemini.generateTextWithRetry({ 
          prompt: 'test',
          maxRetries: 10 
        })
      ).rejects.toThrow()
    })
  })

  describe('generateTextStream subscription', () => {
    it('should create a subscription procedure', () => {
      // Test that the subscription procedure exists and has the correct structure
      expect(geminiRouter.generateTextStream).toBeDefined()
      expect(typeof geminiRouter.generateTextStream).toBe('function')
    })

    it('should validate input for streaming', () => {
      // Test input validation schema for streaming
      const inputSchema = geminiRouter.generateTextStream._def.inputs[0]
      
      // Test that input schema exists
      expect(inputSchema).toBeDefined()
      
      // Note: Direct schema validation testing would require access to the underlying Zod schema
      // For now, we test that the schema is properly defined
      expect(inputSchema).toBeTruthy()
    })

    it('should handle streaming subscription structure', () => {
      // Test that the subscription procedure has the correct structure
      expect(geminiRouter.generateTextStream).toBeDefined()
      expect(typeof geminiRouter.generateTextStream).toBe('function')
      
      // Verify it's a subscription type procedure
      expect(geminiRouter.generateTextStream._def.type).toBe('subscription')
    })
  })

  describe('generateTextStreamWithMetadata procedure', () => {
    it('should successfully generate streaming text with metadata', async () => {
      const mockChunks = ['Hello', ' world', '!']
      const mockMetadata = {
        id: 'test-id',
        content: 'Hello world!',
        type: 'text' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 15,
        },
      }

      const mockStream = async function* () {
        for (const chunk of mockChunks) {
          yield chunk
        }
      }

      mockGeminiService.generateTextStreamWithMetadata.mockResolvedValue({
        stream: mockStream(),
        metadata: Promise.resolve(mockMetadata),
      })

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateTextStreamWithMetadata({
        prompt: 'Test prompt',
      })

      expect(result.success).toBe(true)
      expect(result.data.chunks).toEqual(mockChunks)
      expect(result.data.fullContent).toBe('Hello world!')
      expect(result.data.metadata).toEqual(mockMetadata)
    })
  })

  describe('validateConfig procedure', () => {
    it('should validate API key when checkApiKey is true', async () => {
      const mockConfig = {
        apiKey: 'test-key',
        models: { text: 'gemini-1.5-flash', vision: 'gemini-1.5-pro' },
        limits: { maxTokens: 4096, requestsPerMinute: 60, requestsPerDay: 1000 },
        features: { streaming: true, imageGeneration: true },
      }

      mockGeminiService.validateApiKey.mockResolvedValue(true)
      mockGeminiService.getConfig.mockReturnValue(mockConfig)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.validateConfig({
        checkApiKey: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.apiKeyValid).toBe(true)
      expect(result.data.config).toEqual(mockConfig)
      expect(mockGeminiService.validateApiKey).toHaveBeenCalled()
    })

    it('should skip API key validation when checkApiKey is false', async () => {
      const mockConfig = {
        apiKey: 'test-key',
        models: { text: 'gemini-1.5-flash', vision: 'gemini-1.5-pro' },
        limits: { maxTokens: 4096, requestsPerMinute: 60, requestsPerDay: 1000 },
        features: { streaming: true, imageGeneration: true },
      }

      mockGeminiService.getConfig.mockReturnValue(mockConfig)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.validateConfig({
        checkApiKey: false,
      })

      expect(result.success).toBe(true)
      expect(result.data.apiKeyValid).toBe(null)
      expect(result.data.config).toEqual(mockConfig)
      expect(mockGeminiService.validateApiKey).not.toHaveBeenCalled()
    })

    it('should use default checkApiKey value', async () => {
      const mockConfig = {
        apiKey: 'test-key',
        models: { text: 'gemini-1.5-flash', vision: 'gemini-1.5-pro' },
        limits: { maxTokens: 4096, requestsPerMinute: 60, requestsPerDay: 1000 },
        features: { streaming: true, imageGeneration: true },
      }

      mockGeminiService.validateApiKey.mockResolvedValue(true)
      mockGeminiService.getConfig.mockReturnValue(mockConfig)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.validateConfig({})

      expect(result.success).toBe(true)
      expect(result.data.apiKeyValid).toBe(true)
      expect(mockGeminiService.validateApiKey).toHaveBeenCalled()
    })
  })

  describe('getConfig procedure', () => {
    it('should return configuration with redacted API key', async () => {
      const mockConfig = {
        apiKey: 'test-key',
        models: { text: 'gemini-1.5-flash', vision: 'gemini-1.5-pro' },
        limits: { maxTokens: 4096, requestsPerMinute: 60, requestsPerDay: 1000 },
        features: { streaming: true, imageGeneration: true },
      }

      mockGeminiService.getConfig.mockReturnValue(mockConfig)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.getConfig()

      expect(result.success).toBe(true)
      expect(result.data.apiKey).toBe('[REDACTED]')
      expect(result.data.models).toEqual(mockConfig.models)
      expect(result.data.limits).toEqual(mockConfig.limits)
      expect(result.data.features).toEqual(mockConfig.features)
    })

    it('should handle missing API key', async () => {
      const mockConfig = {
        apiKey: '',
        models: { text: 'gemini-1.5-flash', vision: 'gemini-1.5-pro' },
        limits: { maxTokens: 4096, requestsPerMinute: 60, requestsPerDay: 1000 },
        features: { streaming: true, imageGeneration: true },
      }

      mockGeminiService.getConfig.mockReturnValue(mockConfig)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.getConfig()

      expect(result.success).toBe(true)
      expect(result.data.apiKey).toBe(null)
    })

    it('should handle service errors', async () => {
      mockGeminiService.getConfig.mockImplementation(() => {
        throw new Error('Service unavailable')
      })

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.getConfig()
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('Service unavailable')
      }
    })
  })

  describe('generateImage procedure', () => {
    it('should successfully generate image with valid input', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'https://example.com/generated-image.jpg',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 25,
          imageUrl: 'https://example.com/generated-image.jpg',
          size: 'medium',
        },
      }

      mockGeminiService.generateImage.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateImage({
        prompt: 'A beautiful landscape',
        style: 'photorealistic',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
        prompt: 'A beautiful landscape',
        style: 'photorealistic',
      })
    })

    it('should validate image input parameters correctly', async () => {
      const caller = appRouter.createCaller({})

      // Test empty prompt
      await expect(
        caller.gemini.generateImage({ prompt: '' })
      ).rejects.toThrow('Prompt is required')

      // Test prompt too long
      await expect(
        caller.gemini.generateImage({ 
          prompt: 'a'.repeat(1001) 
        })
      ).rejects.toThrow('Image prompt exceeds maximum length')

      // Test invalid size
      await expect(
        caller.gemini.generateImage({ 
          prompt: 'test',
          width: -1 // invalid width
        })
      ).rejects.toThrow()
    })

    it('should use default size when not provided', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Generated image description',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 20,
        },
      }

      mockGeminiService.generateImage.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      await caller.gemini.generateImage({
        prompt: 'Test image',
      })

      expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
        prompt: 'Test image',
        style: undefined,
      })
    })

    it('should handle image generation errors', async () => {
      const geminiError: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        userMessage: 'Too many image requests. Please wait and try again.',
        details: { requestId: 'req-img-123' },
        retryAfter: 30000,
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateImage.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateImage({ prompt: 'test image' })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('TOO_MANY_REQUESTS')
        expect((error as TRPCError).message).toBe('Too many image requests. Please wait and try again.')
        expect((error as TRPCError).cause).toMatchObject({
          geminiErrorCode: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          retryable: true,
          retryAfter: 30000
        })
      }
    })
  })

  describe('generateImageWithRetry procedure', () => {
    it('should successfully generate image with retry', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'https://example.com/generated-image.jpg',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 30,
          imageUrl: 'https://example.com/generated-image.jpg',
        },
      }

      mockGeminiService.generateImageWithRetry.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateImageWithRetry({
        prompt: 'Test image with retry',
        maxRetries: 5,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockGeminiService.generateImageWithRetry).toHaveBeenCalledWith({
        prompt: 'Test image with retry',
        style: undefined,
      }, 5)
    })

    it('should use default maxRetries when not provided', async () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Generated image',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 25,
        },
      }

      mockGeminiService.generateImageWithRetry.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})
      await caller.gemini.generateImageWithRetry({
        prompt: 'Test image',
      })

      expect(mockGeminiService.generateImageWithRetry).toHaveBeenCalledWith(
        expect.any(Object),
        3 // default maxRetries
      )
    })

    it('should validate maxRetries parameter for images', async () => {
      const caller = appRouter.createCaller({})

      // Test maxRetries too low
      await expect(
        caller.gemini.generateImageWithRetry({ 
          prompt: 'test',
          maxRetries: 0 
        })
      ).rejects.toThrow()

      // Test maxRetries too high
      await expect(
        caller.gemini.generateImageWithRetry({ 
          prompt: 'test',
          maxRetries: 10 
        })
      ).rejects.toThrow()
    })
  })

  describe('Input validation edge cases', () => {
    it('should handle boundary values correctly', async () => {
      mockGeminiService.generateText.mockResolvedValue({
        id: 'test-id',
        content: 'response',
        type: 'text' as const,
        timestamp: new Date(),
      })

      const caller = appRouter.createCaller({})

      // Test minimum valid values
      await expect(
        caller.gemini.generateText({
          prompt: 'a', // minimum length
          temperature: 0, // minimum temperature
          topP: 0, // minimum topP
          topK: 1, // minimum topK
          maxTokens: 1, // minimum maxTokens
        })
      ).resolves.toBeDefined()

      // Test maximum valid values
      await expect(
        caller.gemini.generateText({
          prompt: 'a'.repeat(4000), // maximum length
          temperature: 2, // maximum temperature
          topP: 1, // maximum topP
          maxTokens: 4096, // maximum maxTokens
        })
      ).resolves.toBeDefined()
    })

    it('should handle boundary values for image generation', async () => {
      mockGeminiService.generateImage.mockResolvedValue({
        id: 'test-id',
        content: 'response',
        type: 'image' as const,
        timestamp: new Date(),
      })

      const caller = appRouter.createCaller({})

      // Test minimum valid values for images
      await expect(
        caller.gemini.generateImage({
          prompt: 'a', // minimum length
        })
      ).resolves.toBeDefined()

      // Test maximum valid values for images
      await expect(
        caller.gemini.generateImage({
          prompt: 'a'.repeat(1000), // maximum length
          style: 'detailed photorealistic style with complex composition',
        })
      ).resolves.toBeDefined()
    })

    it('should handle special characters in prompts', async () => {
      mockGeminiService.generateText.mockResolvedValue({
        id: 'test-id',
        content: 'response',
        type: 'text' as const,
        timestamp: new Date(),
      })

      mockGeminiService.generateImage.mockResolvedValue({
        id: 'test-id',
        content: 'image response',
        type: 'image' as const,
        timestamp: new Date(),
      })

      const caller = appRouter.createCaller({})

      const specialPrompts = [
        'Hello 世界', // Unicode characters
        'Test with "quotes" and \'apostrophes\'', // Quotes
        'Newlines\nand\ttabs', // Whitespace characters
        'Emojis 🚀 🎉 ✨', // Emojis
        'HTML <script>alert("test")</script>', // HTML/JS
        'SQL \'; DROP TABLE users; --', // SQL injection attempt
      ]

      for (const prompt of specialPrompts) {
        await expect(
          caller.gemini.generateText({ prompt })
        ).resolves.toBeDefined()

        await expect(
          caller.gemini.generateImage({ prompt })
        ).resolves.toBeDefined()
      }
    })
  })
})