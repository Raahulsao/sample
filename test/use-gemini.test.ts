import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGemini, useGeminiText, useGeminiStream } from '@/hooks/use-gemini'
import type { GeminiResponse } from '@/lib/gemini'

// Mock tRPC client with proper structure
vi.mock('@/lib/trpc-client', () => ({
  trpc: {
    gemini: {
      generateText: {
        useMutation: vi.fn(),
      },
      generateTextWithRetry: {
        useMutation: vi.fn(),
      },
      generateTextStream: {
        useSubscription: vi.fn(),
      },
      generateTextStreamWithMetadata: {
        useMutation: vi.fn(),
      },
      generateImage: {
        useMutation: vi.fn(),
      },
      generateImageWithRetry: {
        useMutation: vi.fn(),
      },
      resetRateLimit: {
        useMutation: vi.fn(),
      },
      checkRateLimit: {
        useQuery: vi.fn(),
      },
      getQuotaUsage: {
        useQuery: vi.fn(),
      },
      getRateLimitStatus: {
        useQuery: vi.fn(),
      },
    },
  },
}))

// Import the mocked trpc
import { trpc } from '@/lib/trpc-client'

// Mock response data
const mockGeminiResponse: GeminiResponse = {
  id: 'test-response-1',
  content: 'This is a test response from Gemini',
  type: 'text',
  timestamp: new Date('2024-01-01T00:00:00Z'),
  metadata: {
    model: 'gemini-1.5-flash',
    tokens: 50,
    finishReason: 'STOP',
    isStreaming: false,
  },
}

describe('useGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    vi.mocked(trpc.gemini.generateText.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.generateTextWithRetry.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.generateTextStreamWithMetadata.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.generateTextStream.useSubscription).mockReturnValue({
      data: undefined,
      error: null,
      status: 'idle',
    } as any)
    
    vi.mocked(trpc.gemini.generateImage.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.generateImageWithRetry.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.resetRateLimit.useMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutate: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.checkRateLimit.useQuery).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      status: 'idle',
      refetch: vi.fn(),
      remove: vi.fn(),
      isRefetching: false,
      isStale: false,
      isFetching: false,
      isPending: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isLoadingError: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.getQuotaUsage.useQuery).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      status: 'idle',
      refetch: vi.fn(),
      remove: vi.fn(),
      isRefetching: false,
      isStale: false,
      isFetching: false,
      isPending: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isLoadingError: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      trpc: {} as any,
    } as any)
    
    vi.mocked(trpc.gemini.getRateLimitStatus.useQuery).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      status: 'idle',
      refetch: vi.fn(),
      remove: vi.fn(),
      isRefetching: false,
      isStale: false,
      isFetching: false,
      isPending: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isLoadingError: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      trpc: {} as any,
    } as any)
  })

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useGemini())

      expect(result.current.isGenerating).toBe(false)
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.streamingContent).toBe('')
      expect(result.current.lastResponse).toBe(null)
    })

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useGemini())

      expect(typeof result.current.generateText).toBe('function')
      expect(typeof result.current.generateTextStream).toBe('function')
      expect(typeof result.current.generateTextWithRetry).toBe('function')
      expect(typeof result.current.cancelStream).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('State Management', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useGemini())

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })

    it('should reset all state', () => {
      const { result } = renderHook(() => useGemini())

      act(() => {
        result.current.reset()
      })

      expect(result.current.isGenerating).toBe(false)
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.streamingContent).toBe('')
      expect(result.current.lastResponse).toBe(null)
    })

    it('should handle stream cancellation', () => {
      const { result } = renderHook(() => useGemini())

      act(() => {
        result.current.cancelStream()
      })

      expect(result.current.isStreaming).toBe(false)
      expect(result.current.isGenerating).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useGemini())

      expect(() => unmount()).not.toThrow()
    })
  })
})

describe('useGeminiText', () => {
  it('should provide simplified text generation interface', () => {
    const { result } = renderHook(() => useGeminiText())

    expect(typeof result.current.generateText).toBe('function')
    expect(typeof result.current.isGenerating).toBe('boolean')
    expect(result.current.error).toBe(null)
    expect(result.current.lastResponse).toBe(null)
    expect(typeof result.current.clearError).toBe('function')

    // Should not have streaming methods
    expect(result.current).not.toHaveProperty('generateTextStream')
    expect(result.current).not.toHaveProperty('isStreaming')
    expect(result.current).not.toHaveProperty('streamingContent')
  })
})

describe('useGeminiStream', () => {
  it('should provide simplified streaming interface', () => {
    const { result } = renderHook(() => useGeminiStream())

    expect(typeof result.current.generateTextStream).toBe('function')
    expect(typeof result.current.isStreaming).toBe('boolean')
    expect(typeof result.current.streamingContent).toBe('string')
    expect(typeof result.current.cancelStream).toBe('function')
    expect(result.current.error).toBe(null)
    expect(typeof result.current.clearError).toBe('function')

    // Should not have non-streaming methods
    expect(result.current).not.toHaveProperty('generateText')
    expect(result.current).not.toHaveProperty('isGenerating')
    expect(result.current).not.toHaveProperty('lastResponse')
  })
})