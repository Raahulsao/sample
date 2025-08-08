import { z } from 'zod'
import { router, publicProcedure } from '@/lib/trpc'
import { getGeminiService, GeminiError } from '@/lib/gemini'
import { getHuggingFaceService, HuggingFaceError } from '@/lib/huggingface'
import { TRPCError } from '@trpc/server'

// Input validation schemas
const textGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt exceeds maximum length of 4000 characters'),
  stream: z.boolean().default(false),
  maxTokens: z.number().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).optional(),
})

const imageGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Image prompt exceeds maximum length of 1000 characters'),
  negativePrompt: z.string().optional(),
  width: z.number().min(64).max(1024).default(512),
  height: z.number().min(64).max(1024).default(512),
  numInferenceSteps: z.number().min(1).max(50).default(20),
  guidanceScale: z.number().min(1).max(20).default(7.5),
  size: z.string().optional(),
  style: z.string().optional(),
})

const configValidationSchema = z.object({
  checkApiKey: z.boolean().default(true),
})

// Transform Gemini errors to tRPC errors with enhanced error information
function transformGeminiError(error: GeminiError): TRPCError {
  // Map Gemini error codes to tRPC error codes
  const errorCodeMap: Record<GeminiError['code'], TRPCError['code']> = {
    'API_KEY_INVALID': 'UNAUTHORIZED',
    'RATE_LIMIT_EXCEEDED': 'TOO_MANY_REQUESTS',
    'QUOTA_EXCEEDED': 'FORBIDDEN',
    'VALIDATION_ERROR': 'BAD_REQUEST',
    'NETWORK_ERROR': 'INTERNAL_SERVER_ERROR',
    'TIMEOUT': 'TIMEOUT',
    'SERVICE_UNAVAILABLE': 'INTERNAL_SERVER_ERROR',
    'CONTENT_FILTERED': 'BAD_REQUEST',
    'UNKNOWN': 'INTERNAL_SERVER_ERROR',
  }

  const trpcCode = errorCodeMap[error.code] || 'INTERNAL_SERVER_ERROR'

  return new TRPCError({
    code: trpcCode,
    message: error.userMessage, // Use user-friendly message for client
    cause: {
      ...error,
      // Include additional context for debugging
      geminiErrorCode: error.code,
      severity: error.severity,
      retryable: error.retryable,
      timestamp: error.timestamp,
      requestId: error.details?.requestId,
    },
  })
}

// Transform Hugging Face errors to tRPC errors
function transformHuggingFaceError(error: HuggingFaceError): TRPCError {
  const errorCodeMap: Record<HuggingFaceError['code'], TRPCError['code']> = {
    'API_TOKEN_INVALID': 'UNAUTHORIZED',
    'RATE_LIMIT_EXCEEDED': 'TOO_MANY_REQUESTS',
    'MODEL_LOADING': 'INTERNAL_SERVER_ERROR',
    'NETWORK_ERROR': 'INTERNAL_SERVER_ERROR',
    'CONTENT_FILTERED': 'BAD_REQUEST',
    'UNKNOWN': 'INTERNAL_SERVER_ERROR',
  }

  const trpcCode = errorCodeMap[error.code] || 'INTERNAL_SERVER_ERROR'

  return new TRPCError({
    code: trpcCode,
    message: error.userMessage,
    cause: {
      ...error,
      huggingFaceErrorCode: error.code,
      severity: error.severity,
      retryable: error.retryable,
      timestamp: error.timestamp,
    },
  })
}

export const geminiRouter = router({
  // Generate text using Gemini Pro
  generateText: publicProcedure
    .input(textGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        const response = await geminiService.generateText({
          prompt: input.prompt,
          stream: input.stream,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
        })
        
        return {
          success: true,
          data: response,
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformGeminiError(error as GeminiError)
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          cause: error,
        })
      }
    }),

  // Generate text with retry mechanism
  generateTextWithRetry: publicProcedure
    .input(textGenerationInputSchema.extend({
      maxRetries: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        const response = await geminiService.generateTextWithRetry({
          prompt: input.prompt,
          stream: input.stream,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
        }, input.maxRetries)
        
        return {
          success: true,
          data: response,
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformGeminiError(error as GeminiError)
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          cause: error,
        })
      }
    }),

  // Generate streaming text using Gemini Pro
  generateTextStream: publicProcedure
    .input(textGenerationInputSchema.omit({ stream: true }))
    .subscription(async function* ({ input }) {
      try {
        const geminiService = getGeminiService()
        const stream = geminiService.generateTextStream({
          prompt: input.prompt,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
        })

        for await (const chunk of stream) {
          yield {
            type: 'chunk' as const,
            data: chunk,
            timestamp: new Date(),
          }
        }

        yield {
          type: 'complete' as const,
          data: null,
          timestamp: new Date(),
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          const trpcError = transformGeminiError(error as GeminiError)
          yield {
            type: 'error' as const,
            data: {
              code: trpcError.code,
              message: trpcError.message,
            },
            timestamp: new Date(),
          }
          return
        }
        
        // Handle unexpected errors
        yield {
          type: 'error' as const,
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
          },
          timestamp: new Date(),
        }
      }
    }),

  // Generate streaming text with metadata
  generateTextStreamWithMetadata: publicProcedure
    .input(textGenerationInputSchema.omit({ stream: true }))
    .mutation(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        const { stream, metadata } = await geminiService.generateTextStreamWithMetadata({
          prompt: input.prompt,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
        })

        // Convert async iterable to array for easier handling
        const chunks: string[] = []
        for await (const chunk of stream) {
          chunks.push(chunk)
        }

        const finalMetadata = await metadata

        return {
          success: true,
          data: {
            chunks,
            metadata: finalMetadata,
            fullContent: chunks.join(''),
          },
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformGeminiError(error as GeminiError)
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          cause: error,
        })
      }
    }),

  // Validate Gemini configuration
  validateConfig: publicProcedure
    .input(configValidationSchema)
    .query(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        
        if (input.checkApiKey) {
          const isValid = await geminiService.validateApiKey()
          return {
            success: true,
            data: {
              apiKeyValid: isValid,
              config: geminiService.getConfig(),
              timestamp: new Date(),
            },
          }
        }

        return {
          success: true,
          data: {
            apiKeyValid: null,
            config: geminiService.getConfig(),
            timestamp: new Date(),
          },
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformGeminiError(error as GeminiError)
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          cause: error,
        })
      }
    }),

  // Get Gemini service configuration
  getConfig: publicProcedure
    .query(async () => {
      try {
        const geminiService = getGeminiService()
        const config = geminiService.getConfig()
        
        // Remove sensitive information from config
        const safeConfig = {
          ...config,
          apiKey: config.apiKey ? '[REDACTED]' : null,
        }
        
        return {
          success: true,
          data: safeConfig,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get configuration',
          cause: error,
        })
      }
    }),

  // Check rate limit status
  checkRateLimit: publicProcedure
    .input(z.object({
      estimatedTokens: z.number().min(1).optional(),
    }))
    .query(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        const rateLimitCheck = geminiService.checkRateLimit(input.estimatedTokens)
        
        return {
          success: true,
          data: rateLimitCheck,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check rate limit',
          cause: error,
        })
      }
    }),

  // Get quota usage statistics
  getQuotaUsage: publicProcedure
    .query(async () => {
      try {
        const geminiService = getGeminiService()
        const quotaUsage = geminiService.getQuotaUsage()
        
        return {
          success: true,
          data: quotaUsage,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get quota usage',
          cause: error,
        })
      }
    }),

  // Get rate limit status
  getRateLimitStatus: publicProcedure
    .query(async () => {
      try {
        const geminiService = getGeminiService()
        const status = geminiService.getRateLimitStatus()
        
        return {
          success: true,
          data: status,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get rate limit status',
          cause: error,
        })
      }
    }),

  // Generate image using Gemini Pro Vision
  generateImage: publicProcedure
    .input(imageGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const geminiService = getGeminiService()
        const response = await geminiService.generateImage({
          prompt: input.prompt,
          size: input.size as 'small' | 'medium' | 'large' | undefined,
          style: input.style,
        })
        
        return {
          success: true,
          data: response,
        }
      } catch (error) {
        // Handle Gemini-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformGeminiError(error as GeminiError)
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          cause: error,
        })
      }
    }),

  // Generate image using Hugging Face
  generateImageHF: publicProcedure
    .input(imageGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const huggingFaceService = getHuggingFaceService()
        const response = await huggingFaceService.generateImage({
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          width: input.width,
          height: input.height,
          numInferenceSteps: input.numInferenceSteps,
          guidanceScale: input.guidanceScale,
        })
        
        return {
          success: true,
          data: response,
        }
      } catch (error) {
        console.error('Image generation error:', error);
        
        // Handle Hugging Face-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformHuggingFaceError(error as HuggingFaceError)
        }
        
        // Handle configuration errors
        if (error instanceof Error && error.message.includes('API token')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error.message,
            cause: error,
          })
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Something went wrong while generating your image. Please try again.',
          cause: error,
        })
      }
    }),

  // Generate image with retry mechanism
  generateImageWithRetry: publicProcedure
    .input(imageGenerationInputSchema.extend({
      maxRetries: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ input }) => {
      try {
        const huggingFaceService = getHuggingFaceService()
        const response = await huggingFaceService.generateImageWithRetry({
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          width: input.width,
          height: input.height,
          numInferenceSteps: input.numInferenceSteps,
          guidanceScale: input.guidanceScale,
        }, input.maxRetries)
        
        return {
          success: true,
          data: response,
        }
      } catch (error) {
        console.error('Image generation with retry error:', error);
        
        // Handle Hugging Face-specific errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw transformHuggingFaceError(error as HuggingFaceError)
        }
        
        // Handle configuration errors
        if (error instanceof Error && error.message.includes('API token')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error.message,
            cause: error,
          })
        }
        
        // Handle unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Something went wrong while generating your image. Please try again.',
          cause: error,
        })
      }
    }),

  // Test Hugging Face configuration
  testHuggingFaceConfig: publicProcedure
    .query(async () => {
      try {
        const huggingFaceService = getHuggingFaceService()
        const config = huggingFaceService.getConfig()
        
        return {
          success: true,
          data: {
            configured: true,
            model: config.model,
            hasToken: !!config.apiToken && config.apiToken !== 'your_huggingface_token_here',
            tokenPrefix: config.apiToken ? config.apiToken.substring(0, 5) + '...' : 'Not set',
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }),

  // Reset rate limiter (useful for testing)
  resetRateLimit: publicProcedure
    .mutation(async () => {
      try {
        const geminiService = getGeminiService()
        geminiService.resetRateLimit()
        
        return {
          success: true,
          data: { message: 'Rate limiter reset successfully' },
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reset rate limiter',
          cause: error,
        })
      }
    }),
})

export type GeminiRouter = typeof geminiRouter