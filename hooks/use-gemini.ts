'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import type { GeminiResponse } from '@/lib/gemini'
import type { QuotaUsage } from '@/lib/rate-limiter'

// Helper function to safely extract error cause
function extractErrorCause(error: any) {
  if (error.data && typeof error.data === 'object' && 'cause' in error.data && error.data.cause) {
    return error.data.cause as any
  }
  return null
}

// Hook options interface
export interface UseGeminiOptions {
  onSuccess?: (response: GeminiResponse) => void
  onError?: (error: Error) => void
  onStreamChunk?: (chunk: string) => void
  onStreamComplete?: (fullContent: string) => void
  autoRetry?: boolean
  maxRetries?: number
}

// Text generation request options
export interface GeminiTextOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
}

// Image generation request options
export interface GeminiImageOptions {
  negativePrompt?: string
  width?: number
  height?: number
  numInferenceSteps?: number
  guidanceScale?: number
}

// Rate limit state interface
export interface RateLimitState {
  isRateLimited: boolean
  retryAfter?: number
  quotaUsage?: QuotaUsage
  nextAvailableTime?: Date
  message?: string
}

// Hook state interface
export interface UseGeminiState {
  isGenerating: boolean
  isStreaming: boolean
  error: Error | null
  streamingContent: string
  lastResponse: GeminiResponse | null
  rateLimit: RateLimitState
}

// Hook return interface
export interface UseGeminiReturn extends UseGeminiState {
  generateText: (prompt: string, options?: GeminiTextOptions) => Promise<void>
  generateTextStream: (prompt: string, options?: GeminiTextOptions) => Promise<void>
  generateTextWithRetry: (prompt: string, options?: GeminiTextOptions & { maxRetries?: number }) => Promise<void>
  generateImage: (prompt: string, options?: GeminiImageOptions) => Promise<void>
  generateImageWithRetry: (prompt: string, options?: GeminiImageOptions & { maxRetries?: number }) => Promise<void>
  cancelStream: () => void
  clearError: () => void
  reset: () => void
  checkRateLimit: (estimatedTokens?: number) => Promise<void>
  getQuotaUsage: () => Promise<void>
  getRateLimitStatus: () => Promise<void>
  resetRateLimit: () => Promise<void>
}

export function useGemini(options: UseGeminiOptions = {}): UseGeminiReturn {
  // State management
  const [state, setState] = useState<UseGeminiState>({
    isGenerating: false,
    isStreaming: false,
    error: null,
    streamingContent: '',
    lastResponse: null,
    rateLimit: {
      isRateLimited: false,
    },
  })

  // Refs for managing streaming and cancellation
  const streamingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // tRPC mutations and subscriptions
  const generateTextMutation = trpc.gemini.generateText.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Convert timestamp string to Date if needed
        const responseData = {
          ...result.data,
          timestamp: typeof result.data.timestamp === 'string' 
            ? new Date(result.data.timestamp) 
            : result.data.timestamp
        }
        setState(prev => ({
          ...prev,
          isGenerating: false,
          lastResponse: responseData,
          error: null,
        }))
        options.onSuccess?.(responseData)
      }
    },
    onError: (error) => {
      // Create enhanced error object with additional context
      const errorObj = new Error(error.message)
      
      // Add additional error properties if available from tRPC error cause
      const cause = extractErrorCause(error)
      if (cause) {
        Object.assign(errorObj, {
          code: cause.geminiErrorCode,
          severity: cause.severity,
          retryable: cause.retryable,
          requestId: cause.requestId,
          timestamp: cause.timestamp,
        })
      }
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
    },
  })

  const generateTextWithRetryMutation = trpc.gemini.generateTextWithRetry.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Convert timestamp string to Date if needed
        const responseData = {
          ...result.data,
          timestamp: typeof result.data.timestamp === 'string' 
            ? new Date(result.data.timestamp) 
            : result.data.timestamp
        }
        setState(prev => ({
          ...prev,
          isGenerating: false,
          lastResponse: responseData,
          error: null,
        }))
        options.onSuccess?.(responseData)
      }
    },
    onError: (error) => {
      // Create enhanced error object with additional context
      const errorObj = new Error(error.message)
      
      // Add additional error properties if available from tRPC error cause
      const cause = extractErrorCause(error)
      if (cause) {
        Object.assign(errorObj, {
          code: cause.geminiErrorCode,
          severity: cause.severity,
          retryable: cause.retryable,
          requestId: cause.requestId,
          timestamp: cause.timestamp,
          retriesExhausted: cause.retriesExhausted,
          totalAttempts: cause.totalAttempts,
        })
      }
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
    },
  })

  const generateTextStreamWithMetadataMutation = trpc.gemini.generateTextStreamWithMetadata.useMutation({
    onError: (error) => {
      // Create enhanced error object with additional context
      const errorObj = new Error(error.message)
      
      // Add additional error properties if available from tRPC error cause
      const cause = extractErrorCause(error)
      if (cause) {
        Object.assign(errorObj, {
          code: cause.geminiErrorCode,
          severity: cause.severity,
          retryable: cause.retryable,
          requestId: cause.requestId,
          timestamp: cause.timestamp,
        })
      }
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
      streamingRef.current = false
    },
  })

  const generateImageMutation = trpc.gemini.generateImage.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        const responseData: GeminiResponse = {
          ...result.data,
          content: (result.data as any).imageUrl || (result.data as any).content || '',
          type: 'image' as const,
          timestamp: typeof result.data.timestamp === 'string' 
            ? new Date(result.data.timestamp) 
            : result.data.timestamp
        }
        setState(prev => ({
          ...prev,
          isGenerating: false,
          lastResponse: responseData,
          error: null,
        }))
        options.onSuccess?.(responseData)
      }
    },
    onError: (error) => {
      const errorObj = new Error(error.message)
      
      const cause = extractErrorCause(error)
      if (cause) {
        Object.assign(errorObj, {
          code: cause.huggingFaceErrorCode,
          severity: cause.severity,
          retryable: cause.retryable,
          timestamp: cause.timestamp,
        })
      }
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
    },
  })

  const generateImageWithRetryMutation = trpc.gemini.generateImageWithRetry.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        const responseData: GeminiResponse = {
          ...result.data,
          content: (result.data as any).imageUrl || (result.data as any).content || '',
          type: 'image' as const,
          timestamp: typeof result.data.timestamp === 'string' 
            ? new Date(result.data.timestamp) 
            : result.data.timestamp
        }
        setState(prev => ({
          ...prev,
          isGenerating: false,
          lastResponse: responseData,
          error: null,
        }))
        options.onSuccess?.(responseData)
      }
    },
    onError: (error) => {
      const errorObj = new Error(error.message)
      
      const cause = extractErrorCause(error)
      if (cause) {
        Object.assign(errorObj, {
          code: cause.huggingFaceErrorCode,
          severity: cause.severity,
          retryable: cause.retryable,
          timestamp: cause.timestamp,
        })
      }
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
    },
  })

  // Rate limiting queries
  const checkRateLimitQuery = trpc.gemini.checkRateLimit.useQuery(
    { estimatedTokens: 1 },
    { enabled: false }
  )

  const getQuotaUsageQuery = trpc.gemini.getQuotaUsage.useQuery(
    undefined,
    { enabled: false }
  )

  const getRateLimitStatusQuery = trpc.gemini.getRateLimitStatus.useQuery(
    undefined,
    { enabled: false }
  )

  const resetRateLimitMutation = trpc.gemini.resetRateLimit.useMutation()

  // Check rate limit
  const checkRateLimit = useCallback(async (estimatedTokens?: number) => {
    try {
      const result = await checkRateLimitQuery.refetch()
      
      if (result.data?.success && result.data.data) {
        setState(prev => ({
          ...prev,
          rateLimit: {
            isRateLimited: !result.data.data.allowed,
            retryAfter: result.data.data.retryAfter,
            message: result.data.data.message,
          },
        }))
      }
    } catch (error) {
      console.error('Failed to check rate limit:', error)
    }
  }, [checkRateLimitQuery])

  // Generate text (non-streaming)
  const generateText = useCallback(async (prompt: string, textOptions: GeminiTextOptions = {}) => {
    if (state.isGenerating) {
      console.warn('Text generation already in progress')
      return
    }

    // Check rate limit before proceeding
    const estimatedTokens = Math.ceil(prompt.length / 4) + (textOptions.maxTokens || 100)
    await checkRateLimit(estimatedTokens)
    
    if (state.rateLimit.isRateLimited) {
      const error = new Error(state.rateLimit.message || 'Rate limit exceeded')
      setState(prev => ({
        ...prev,
        error,
      }))
      options.onError?.(error)
      return
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      streamingContent: '',
      lastResponse: null,
    }))

    try {
      await generateTextMutation.mutateAsync({
        prompt,
        stream: false,
        maxTokens: textOptions.maxTokens,
        temperature: textOptions.temperature,
        topP: textOptions.topP,
        topK: textOptions.topK,
      })
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error('Text generation failed:', error)
    }
  }, [state.isGenerating, state.rateLimit.isRateLimited, state.rateLimit.message, generateTextMutation, checkRateLimit, options])

  // Generate text with retry
  const generateTextWithRetry = useCallback(async (
    prompt: string, 
    textOptions: GeminiTextOptions & { maxRetries?: number } = {}
  ) => {
    if (state.isGenerating) {
      console.warn('Text generation already in progress')
      return
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      streamingContent: '',
      lastResponse: null,
    }))

    try {
      await generateTextWithRetryMutation.mutateAsync({
        prompt,
        stream: false,
        maxTokens: textOptions.maxTokens,
        temperature: textOptions.temperature,
        topP: textOptions.topP,
        topK: textOptions.topK,
        maxRetries: textOptions.maxRetries || options.maxRetries || 3,
      })
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error('Text generation with retry failed:', error)
    }
  }, [state.isGenerating, generateTextWithRetryMutation, options.maxRetries])

  // Generate streaming text
  const generateTextStream = useCallback(async (prompt: string, textOptions: GeminiTextOptions = {}) => {
    if (state.isGenerating || state.isStreaming) {
      console.warn('Text generation already in progress')
      return
    }

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    streamingRef.current = true

    setState(prev => ({
      ...prev,
      isGenerating: true,
      isStreaming: true,
      error: null,
      streamingContent: '',
      lastResponse: null,
    }))

    try {
      // Use the generateTextStreamWithMetadata mutation for streaming
      const result = await generateTextStreamWithMetadataMutation.mutateAsync({
        prompt,
        maxTokens: textOptions.maxTokens,
        temperature: textOptions.temperature,
        topP: textOptions.topP,
        topK: textOptions.topK,
      })

      if (result.success && result.data && streamingRef.current) {
        // Simulate streaming by yielding chunks progressively
        const chunks = result.data.chunks
        let currentIndex = 0
        let accumulatedContent = ''

        const streamChunks = () => {
          if (currentIndex < chunks.length && streamingRef.current) {
            const chunk = chunks[currentIndex]
            accumulatedContent += chunk
            
            setState(prev => ({
              ...prev,
              streamingContent: accumulatedContent,
            }))
            
            options.onStreamChunk?.(chunk)
            currentIndex++
            
            // Continue streaming with a small delay
            setTimeout(streamChunks, 50)
          } else {
            // Streaming complete
            setState(prev => ({
              ...prev,
              isStreaming: false,
              isGenerating: false,
              lastResponse: {
                id: result.data?.metadata?.id || `stream-${Date.now()}`,
                content: result.data?.fullContent || accumulatedContent,
                type: 'text' as const,
                timestamp: new Date(),
                metadata: {
                  ...result.data?.metadata,
                  isStreaming: true,
                },
              },
            }))
            
            options.onStreamComplete?.(result.data?.fullContent || accumulatedContent)
            streamingRef.current = false
          }
        }

        streamChunks()
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Streaming text generation failed')
      setState(prev => ({
        ...prev,
        isStreaming: false,
        isGenerating: false,
        error: errorObj,
      }))
      options.onError?.(errorObj)
      streamingRef.current = false
      console.error('Streaming text generation failed:', error)
    }
  }, [state.isGenerating, state.isStreaming, options, generateTextStreamWithMetadataMutation])

  // Generate image
  const generateImage = useCallback(async (prompt: string, imageOptions: GeminiImageOptions = {}) => {
    if (state.isGenerating) {
      console.warn('Generation already in progress')
      return
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      streamingContent: '',
      lastResponse: null,
    }))

    try {
      await generateImageMutation.mutateAsync({
        prompt,
        negativePrompt: imageOptions.negativePrompt,
        width: imageOptions.width || 512,
        height: imageOptions.height || 512,
        numInferenceSteps: imageOptions.numInferenceSteps || 20,
        guidanceScale: imageOptions.guidanceScale || 7.5,
      })
    } catch (error) {
      console.error('Image generation failed:', error)
    }
  }, [state.isGenerating, generateImageMutation])

  // Generate image with retry
  const generateImageWithRetry = useCallback(async (
    prompt: string, 
    imageOptions: GeminiImageOptions & { maxRetries?: number } = {}
  ) => {
    if (state.isGenerating) {
      console.warn('Generation already in progress')
      return
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      streamingContent: '',
      lastResponse: null,
    }))

    try {
      await generateImageWithRetryMutation.mutateAsync({
        prompt,
        negativePrompt: imageOptions.negativePrompt,
        width: imageOptions.width || 512,
        height: imageOptions.height || 512,
        numInferenceSteps: imageOptions.numInferenceSteps || 20,
        guidanceScale: imageOptions.guidanceScale || 7.5,
        maxRetries: imageOptions.maxRetries || options.maxRetries || 3,
      })
    } catch (error) {
      console.error('Image generation with retry failed:', error)
    }
  }, [state.isGenerating, generateImageWithRetryMutation, options.maxRetries])

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    streamingRef.current = false
    
    setState(prev => ({
      ...prev,
      isStreaming: false,
      isGenerating: false,
    }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])



  // Get quota usage
  const getQuotaUsage = useCallback(async () => {
    try {
      const result = await getQuotaUsageQuery.refetch()
      
      if (result.data?.success && result.data.data) {
        setState(prev => ({
          ...prev,
          rateLimit: {
            ...prev.rateLimit,
            quotaUsage: {
              ...result.data.data,
              lastReset: {
                minute: new Date(result.data.data.lastReset.minute),
                hour: new Date(result.data.data.lastReset.hour),
                day: new Date(result.data.data.lastReset.day),
              }
            },
          },
        }))
      }
    } catch (error) {
      console.error('Failed to get quota usage:', error)
    }
  }, [getQuotaUsageQuery])

  // Get rate limit status
  const getRateLimitStatus = useCallback(async () => {
    try {
      const result = await getRateLimitStatusQuery.refetch()
      
      if (result.data?.success && result.data.data) {
        setState(prev => ({
          ...prev,
          rateLimit: {
            isRateLimited: result.data.data.isLimited,
            nextAvailableTime: new Date(result.data.data.nextAvailableTime),
            quotaUsage: {
              ...result.data.data.quotaUsage,
              lastReset: {
                minute: new Date(result.data.data.quotaUsage.lastReset.minute),
                hour: new Date(result.data.data.quotaUsage.lastReset.hour),
                day: new Date(result.data.data.quotaUsage.lastReset.day),
              }
            },
          },
        }))
      }
    } catch (error) {
      console.error('Failed to get rate limit status:', error)
    }
  }, [getRateLimitStatusQuery])

  // Reset rate limiter
  const resetRateLimit = useCallback(async () => {
    try {
      await resetRateLimitMutation.mutateAsync()
      setState(prev => ({
        ...prev,
        rateLimit: {
          isRateLimited: false,
        },
      }))
    } catch (error) {
      console.error('Failed to reset rate limiter:', error)
    }
  }, [resetRateLimitMutation])

  // Reset hook state
  const reset = useCallback(() => {
    cancelStream()
    setState({
      isGenerating: false,
      isStreaming: false,
      error: null,
      streamingContent: '',
      lastResponse: null,
      rateLimit: {
        isRateLimited: false,
      },
    })
  }, [cancelStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      streamingRef.current = false
    }
  }, [])

  return {
    ...state,
    generateText,
    generateTextStream,
    generateTextWithRetry,
    generateImage,
    generateImageWithRetry,
    cancelStream,
    clearError,
    reset,
    checkRateLimit,
    getQuotaUsage,
    getRateLimitStatus,
    resetRateLimit,
  }
}

// Convenience hook for simple text generation
export function useGeminiText(options: UseGeminiOptions = {}) {
  const gemini = useGemini(options)
  
  return {
    generateText: gemini.generateText,
    isGenerating: gemini.isGenerating,
    error: gemini.error,
    lastResponse: gemini.lastResponse,
    clearError: gemini.clearError,
  }
}

// Convenience hook for streaming text generation
export function useGeminiStream(options: UseGeminiOptions = {}) {
  const gemini = useGemini(options)
  
  return {
    generateTextStream: gemini.generateTextStream,
    isStreaming: gemini.isStreaming,
    streamingContent: gemini.streamingContent,
    cancelStream: gemini.cancelStream,
    error: gemini.error,
    clearError: gemini.clearError,
  }
}