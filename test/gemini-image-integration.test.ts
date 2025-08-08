import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '@/server/routers/app'
import { GeminiError } from '@/lib/gemini'
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
    checkRateLimit: vi.fn(),
    getQuotaUsage: vi.fn(),
    getRateLimitStatus: vi.fn(),
    resetRateLimit: vi.fn(),
  }

  return {
    getGeminiService: vi.fn(() => mockGeminiService),
    GeminiService: vi.fn(() => mockGeminiService),
    createGeminiService: vi.fn(() => mockGeminiService),
  }
})

describe('Gemini Image Generation Integration', () => {
  let mockGeminiService: any

  beforeEach(async () => {
    // Get the mocked service instance
    const { getGeminiService } = await import('@/lib/gemini')
    mockGeminiService = getGeminiService()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('Image Generation API Integration', () => {
    it('should successfully generate image through tRPC', async () => {
      const mockImageResponse = {
        id: 'img-test-123',
        content: 'https://example.com/generated-image.jpg',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 35,
          imageUrl: 'https://example.com/generated-image.jpg',
          size: 'medium',
          style: 'photorealistic',
          isStreaming: false,
          requestId: 'req-img-123',
        },
      }

      mockGeminiService.generateImage.mockResolvedValue(mockImageResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateImage({
        prompt: 'A beautiful sunset over mountains',
        size: 'medium',
        style: 'photorealistic',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockImageResponse)
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
        prompt: 'A beautiful sunset over mountains',
        size: 'medium',
        style: 'photorealistic',
      })
    })

    it('should handle image generation with retry', async () => {
      const mockImageResponse = {
        id: 'img-retry-456',
        content: 'Generated image after retry',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 28,
          size: 'large',
          requestId: 'req-retry-456',
        },
      }

      mockGeminiService.generateImageWithRetry.mockResolvedValue(mockImageResponse)

      const caller = appRouter.createCaller({})
      const result = await caller.gemini.generateImageWithRetry({
        prompt: 'Abstract art with vibrant colors',
        size: 'large',
        maxRetries: 5,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockImageResponse)
      expect(mockGeminiService.generateImageWithRetry).toHaveBeenCalledWith({
        prompt: 'Abstract art with vibrant colors',
        size: 'large',
        style: undefined,
      }, 5)
    })

    it('should validate image generation input', async () => {
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
          prompt: 'test image',
          size: 'invalid' as any
        })
      ).rejects.toThrow()
    })

    it('should handle image generation errors properly', async () => {
      const geminiError: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for image generation',
        userMessage: 'Too many image requests. Please wait 30 seconds and try again.',
        details: { 
          requestId: 'req-img-error',
          imageGeneration: true,
        },
        retryAfter: 30000,
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateImage.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateImage({ 
          prompt: 'Test error handling' 
        })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('TOO_MANY_REQUESTS')
        expect((error as TRPCError).message).toBe('Too many image requests. Please wait 30 seconds and try again.')
        expect((error as TRPCError).cause).toMatchObject({
          geminiErrorCode: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          retryable: true,
          retryAfter: 30000
        })
      }
    })

    it('should handle content filtering for images', async () => {
      const geminiError: GeminiError = {
        code: 'CONTENT_FILTERED',
        message: 'Image content was filtered',
        userMessage: 'Your image request was blocked by safety filters. Please try a different description.',
        details: { 
          requestId: 'req-filtered',
          contentType: 'image',
        },
        retryable: false,
        severity: 'low',
        timestamp: new Date(),
      }

      mockGeminiService.generateImage.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateImage({ 
          prompt: 'Inappropriate content request' 
        })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('BAD_REQUEST')
        expect((error as TRPCError).message).toBe('Your image request was blocked by safety filters. Please try a different description.')
      }
    })

    it('should handle different image sizes', async () => {
      const sizes = ['small', 'medium', 'large'] as const

      for (const size of sizes) {
        const mockResponse = {
          id: `img-${size}-test`,
          content: `Generated ${size} image`,
          type: 'image' as const,
          timestamp: new Date(),
          metadata: {
            model: 'gemini-1.5-pro',
            tokens: 20,
            size,
          },
        }

        mockGeminiService.generateImage.mockResolvedValue(mockResponse)

        const caller = appRouter.createCaller({})
        const result = await caller.gemini.generateImage({
          prompt: `A ${size} test image`,
          size,
        })

        expect(result.success).toBe(true)
        expect(result.data.metadata?.size).toBe(size)
        expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
          prompt: `A ${size} test image`,
          size,
          style: undefined,
        })
      }
    })

    it('should handle image generation with custom styles', async () => {
      const styles = [
        'photorealistic',
        'oil painting',
        'watercolor',
        'digital art',
        'sketch',
      ]

      for (const style of styles) {
        const mockResponse = {
          id: `img-style-${style.replace(' ', '-')}`,
          content: `Generated image in ${style} style`,
          type: 'image' as const,
          timestamp: new Date(),
          metadata: {
            model: 'gemini-1.5-pro',
            tokens: 25,
            style,
          },
        }

        mockGeminiService.generateImage.mockResolvedValue(mockResponse)

        const caller = appRouter.createCaller({})
        const result = await caller.gemini.generateImage({
          prompt: 'A landscape scene',
          style,
        })

        expect(result.success).toBe(true)
        expect(result.data.metadata?.style).toBe(style)
        expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
          prompt: 'A landscape scene',
          size: 'medium', // default
          style,
        })
      }
    })

    it('should handle network errors for image generation', async () => {
      const geminiError: GeminiError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed during image generation',
        userMessage: 'Connection problem while generating image. Please check your internet and try again.',
        details: { 
          requestId: 'req-network-error',
          operation: 'image_generation',
        },
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      }

      mockGeminiService.generateImage.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateImage({ 
          prompt: 'Test network error' 
        })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('Connection problem while generating image. Please check your internet and try again.')
      }
    })

    it('should handle service unavailable for image generation', async () => {
      const geminiError: GeminiError = {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Gemini image generation service is temporarily unavailable',
        userMessage: 'The image generation service is temporarily unavailable. Please try again in a few minutes.',
        details: { 
          requestId: 'req-service-unavailable',
          service: 'gemini-pro-vision',
        },
        retryable: true,
        severity: 'high',
        timestamp: new Date(),
      }

      mockGeminiService.generateImage.mockRejectedValue(geminiError)

      const caller = appRouter.createCaller({})
      
      try {
        await caller.gemini.generateImage({ 
          prompt: 'Test service unavailable' 
        })
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR')
        expect((error as TRPCError).message).toBe('The image generation service is temporarily unavailable. Please try again in a few minutes.')
      }
    })
  })

  describe('Image Generation Edge Cases', () => {
    it('should handle special characters in image prompts', async () => {
      const specialPrompts = [
        'Image with "quotes" and \'apostrophes\'',
        'Unicode characters: 世界 🌍 ✨',
        'Symbols: @#$%^&*()_+-=[]{}|;:,.<>?',
        'Newlines\nand\ttabs in prompt',
      ]

      for (const prompt of specialPrompts) {
        const mockResponse = {
          id: 'img-special-chars',
          content: 'Generated image with special characters',
          type: 'image' as const,
          timestamp: new Date(),
          metadata: {
            model: 'gemini-1.5-pro',
            tokens: 30,
          },
        }

        mockGeminiService.generateImage.mockResolvedValue(mockResponse)

        const caller = appRouter.createCaller({})
        const result = await caller.gemini.generateImage({ prompt })

        expect(result.success).toBe(true)
        expect(mockGeminiService.generateImage).toHaveBeenCalledWith({
          prompt,
          size: 'medium',
          style: undefined,
        })
      }
    })

    it('should handle boundary values for image prompts', async () => {
      const mockResponse = {
        id: 'img-boundary-test',
        content: 'Generated boundary test image',
        type: 'image' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-1.5-pro',
          tokens: 15,
        },
      }

      mockGeminiService.generateImage.mockResolvedValue(mockResponse)

      const caller = appRouter.createCaller({})

      // Test minimum length prompt
      await expect(
        caller.gemini.generateImage({
          prompt: 'a', // minimum length
          size: 'small',
        })
      ).resolves.toBeDefined()

      // Test maximum length prompt
      await expect(
        caller.gemini.generateImage({
          prompt: 'a'.repeat(1000), // maximum length
          size: 'large',
        })
      ).resolves.toBeDefined()
    })
  })
})