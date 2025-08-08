import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGemini } from '@/hooks/use-gemini'
import { TRPCError } from '@trpc/server'

// Create mock functions
const mockMutateAsync = vi.fn()
const mockUseMutation = vi.fn()

// Mock tRPC client
vi.mock('@/lib/trpc-client', () => ({
  trpc: {
    gemini: {
      generateText: {
        useMutation: () => mockUseMutation(),
      },
      generateTextWithRetry: {
        useMutation: () => mockUseMutation(),
      },
      generateTextStreamWithMetadata: {
        useMutation: () => mockUseMutation(),
      },
      generateImage: {
        useMutation: () => mockUseMutation(),
      },
      generateImageWithRetry: {
        useMutation: () => mockUseMutation(),
      },
      resetRateLimit: {
        useMutation: () => mockUseMutation(),
      },
      checkRateLimit: {
        useQuery: () => ({
          data: undefined,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: false,
          status: 'idle',
        }),
      },
      getQuotaUsage: {
        useQuery: () => ({
          data: undefined,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: false,
          status: 'idle',
        }),
      },
      getRateLimitStatus: {
        useQuery: () => ({
          data: undefined,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: false,
          status: 'idle',
        }),
      },
      generateTextStream: {
        useSubscription: () => ({
          data: undefined,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: false,
          status: 'idle',
        }),
      },
    },
  },
}))

describe('useGemini Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
    })
  })

  describe('Enhanced Error Information', () => {
    it('should extract enhanced error information from tRPC error', async () => {
      const mockError = new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please wait 60 seconds and try again.',
        cause: {
          geminiErrorCode: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          retryable: true,
          requestId: 'req-123',
          timestamp: new Date(),
          retryAfter: 60000,
        },
      })

      let capturedError: Error | null = null
      const onError = vi.fn((error: Error) => {
        capturedError = error
      })

      // Mock the mutation to call onError with the enhanced error
      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue({
          message: mockError.message,
          data: { cause: mockError.cause },
        }),
        ...options,
      }))

      const { result } = renderHook(() => useGemini({ onError }))

      await act(async () => {
        await result.current.generateText('test prompt')
      })

      expect(onError).toHaveBeenCalled()
      expect(capturedError).toBeDefined()
      expect((capturedError as any)?.message).toBe('Too many requests. Please wait 60 seconds and try again.')
      expect((capturedError as any)?.code).toBe('RATE_LIMIT_EXCEEDED')
      expect((capturedError as any)?.severity).toBe('medium')
      expect((capturedError as any)?.retryable).toBe(true)
      expect((capturedError as any)?.requestId).toBe('req-123')
    })

    it('should handle retry exhaustion information', async () => {
      const mockError = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Network connection error. We tried 3 times but couldn\'t complete your request.',
        cause: {
          geminiErrorCode: 'NETWORK_ERROR',
          severity: 'medium',
          retryable: true,
          requestId: 'req-456',
          retriesExhausted: true,
          totalAttempts: 3,
          timestamp: new Date(),
        },
      })

      let capturedError: Error | null = null
      const onError = vi.fn((error: Error) => {
        capturedError = error
      })

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue({
          message: mockError.message,
          data: { cause: mockError.cause },
        }),
        ...options,
      }))

      const { result } = renderHook(() => useGemini({ onError }))

      await act(async () => {
        await result.current.generateTextWithRetry('test prompt')
      })

      expect(onError).toHaveBeenCalled()
      expect(capturedError).toBeDefined()
      expect((capturedError as any)?.retriesExhausted).toBe(true)
      expect((capturedError as any)?.totalAttempts).toBe(3)
      expect((capturedError as any)?.message).toContain('We tried 3 times')
    })

    it('should handle errors without enhanced cause information', async () => {
      const mockError = {
        message: 'Simple error message',
        data: null,
      }

      let capturedError: Error | null = null
      const onError = vi.fn((error: Error) => {
        capturedError = error
      })

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini({ onError }))

      await act(async () => {
        await result.current.generateText('test prompt')
      })

      expect(onError).toHaveBeenCalled()
      expect(capturedError).toBeDefined()
      expect((capturedError as any)?.message).toBe('Simple error message')
      expect((capturedError as any)?.code).toBeUndefined()
      expect((capturedError as any)?.severity).toBeUndefined()
    })
  })

  describe('Error State Management', () => {
    it('should set error state correctly for different error types', async () => {
      const mockError = {
        message: 'Your request was blocked by safety filters. Please try rephrasing your message.',
        data: {
          cause: {
            geminiErrorCode: 'CONTENT_FILTERED',
            severity: 'low',
            retryable: false,
            requestId: 'req-filtered',
          },
        },
      }

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      await act(async () => {
        await result.current.generateText('inappropriate content')
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toContain('safety filters')
      expect(result.current.isGenerating).toBe(false)
      expect((result.current.error as any)?.code).toBe('CONTENT_FILTERED')
      expect((result.current.error as any)?.retryable).toBe(false)
    })

    it('should clear error state on successful request', async () => {
      const mockError = {
        message: 'Network error',
        data: {
          cause: {
            geminiErrorCode: 'NETWORK_ERROR',
            severity: 'medium',
            retryable: true,
          },
        },
      }

      const mockSuccess = {
        success: true,
        data: {
          id: 'response-1',
          content: 'Success response',
          type: 'text' as const,
          timestamp: new Date(),
        },
      }

      let callCount = 0
      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.reject(mockError)
          }
          options.onSuccess?.(mockSuccess)
          return Promise.resolve(mockSuccess)
        }),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      // First call should fail
      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeDefined()

      // Second call should succeed and clear error
      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeNull()
      expect(result.current.lastResponse).toBeDefined()
    })
  })

  describe('Streaming Error Handling', () => {
    it('should handle streaming errors with enhanced information', async () => {
      const mockError = {
        message: 'Streaming connection failed',
        data: {
          cause: {
            geminiErrorCode: 'NETWORK_ERROR',
            severity: 'medium',
            retryable: true,
            requestId: 'req-stream-123',
          },
        },
      }

      let capturedError: Error | null = null
      const onError = vi.fn((error: Error) => {
        capturedError = error
      })

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini({ onError }))

      await act(async () => {
        await result.current.generateTextStream('test prompt')
      })

      expect(result.current.isStreaming).toBe(false)
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.error).toBeDefined()
      expect((result.current.error as any)?.requestId).toBe('req-stream-123')
      expect(onError).toHaveBeenCalled()
    })

    it('should stop streaming on error', async () => {
      const mockError = {
        message: 'Stream interrupted',
        data: {
          cause: {
            geminiErrorCode: 'TIMEOUT',
            severity: 'medium',
            retryable: true,
          },
        },
      }

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      await act(async () => {
        await result.current.generateTextStream('test prompt')
      })

      expect(result.current.isStreaming).toBe(false)
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.streamingContent).toBe('')
    })
  })

  describe('Error Recovery', () => {
    it('should allow retry after retryable error', async () => {
      const mockRetryableError = {
        message: 'Too many requests. Please wait a moment and try again.',
        data: {
          cause: {
            geminiErrorCode: 'RATE_LIMIT_EXCEEDED',
            severity: 'medium',
            retryable: true,
            retryAfter: 1000,
          },
        },
      }

      const mockSuccess = {
        success: true,
        data: {
          id: 'response-1',
          content: 'Success after retry',
          type: 'text' as const,
          timestamp: new Date(),
        },
      }

      let callCount = 0
      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.reject(mockRetryableError)
          }
          options.onSuccess?.(mockSuccess)
          return Promise.resolve(mockSuccess)
        }),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      // First call should fail with retryable error
      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any)?.retryable).toBe(true)

      // Clear error and retry
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()

      // Second call should succeed
      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeNull()
      expect(result.current.lastResponse?.content).toBe('Success after retry')
    })

    it('should not suggest retry for non-retryable errors', async () => {
      const mockNonRetryableError = {
        message: 'There\'s an issue with the API configuration. Please contact support.',
        data: {
          cause: {
            geminiErrorCode: 'API_KEY_INVALID',
            severity: 'critical',
            retryable: false,
          },
        },
      }

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockNonRetryableError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any)?.retryable).toBe(false)
      expect((result.current.error as any)?.code).toBe('API_KEY_INVALID')
    })
  })

  describe('Error Context and Debugging', () => {
    it('should preserve request ID for error tracking', async () => {
      const requestId = 'req-debug-123'
      const mockError = {
        message: 'Debug error',
        data: {
          cause: {
            geminiErrorCode: 'UNKNOWN',
            severity: 'medium',
            retryable: true,
            requestId,
            timestamp: new Date(),
          },
        },
      }

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any)?.requestId).toBe(requestId)
    })

    it('should preserve timestamp for error analysis', async () => {
      const timestamp = new Date('2024-01-01T12:00:00Z')
      const mockError = {
        message: 'Timestamped error',
        data: {
          cause: {
            geminiErrorCode: 'NETWORK_ERROR',
            severity: 'medium',
            retryable: true,
            timestamp,
          },
        },
      }

      mockUseMutation.mockImplementation((options: any) => ({
        mutateAsync: mockMutateAsync.mockRejectedValue(mockError),
        ...options,
      }))

      const { result } = renderHook(() => useGemini())

      await act(async () => {
        await result.current.generateText('test')
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any)?.timestamp).toEqual(timestamp)
    })
  })
})