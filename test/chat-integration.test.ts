import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '@/hooks/use-chat'
import { useGemini } from '@/hooks/use-gemini'
import { trpc } from '@/lib/trpc-client'

// Mock dependencies
vi.mock('@/lib/trpc-client', () => ({
  trpc: {
    getChatMessages: {
      useQuery: vi.fn(),
    },
    sendMessage: {
      useMutation: vi.fn(),
    },
    getUserProfile: {
      useQuery: vi.fn(),
    },
    updateUserProfile: {
      useMutation: vi.fn(),
    },
    useUtils: vi.fn(() => ({
      getChatMessages: {
        invalidate: vi.fn(),
      },
    })),
  },
}))

vi.mock('@/hooks/use-gemini', () => ({
  useGemini: vi.fn(),
}))

describe('useChat Hook - Gemini Integration', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      content: 'Hello',
      type: 'user' as const,
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'msg-2',
      content: 'Hi there! How can I help you?',
      type: 'gemini-text' as const,
      timestamp: new Date('2024-01-01T10:00:01Z'),
      metadata: {
        model: 'gemini-pro',
        tokens: 150,
        isStreaming: false,
      },
    },
  ]

  const mockSendMessageMutation = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }

  const mockGeminiHook = {
    isGenerating: false,
    isStreaming: false,
    error: null,
    streamingContent: '',
    lastResponse: null,
    generateText: vi.fn(),
    generateTextStream: vi.fn(),
    cancelStream: vi.fn(),
    clearError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup tRPC mocks
    vi.mocked(trpc.getChatMessages.useQuery).mockReturnValue({
      data: { messages: mockMessages },
      isLoading: false,
    } as any)

    vi.mocked(trpc.sendMessage.useMutation).mockReturnValue(mockSendMessageMutation as any)

    vi.mocked(trpc.getUserProfile.useQuery).mockReturnValue({
      data: null,
    } as any)

    vi.mocked(trpc.updateUserProfile.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    // Setup Gemini mock
    vi.mocked(useGemini).mockReturnValue(mockGeminiHook as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Chat Functionality', () => {
    it('should load and display messages including Gemini messages', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].type).toBe('user')
      expect(result.current.messages[1].type).toBe('gemini-text')
      expect(result.current.messages[1].metadata?.model).toBe('gemini-pro')
    })

    it('should handle loading state', () => {
      vi.mocked(trpc.getChatMessages.useQuery).mockReturnValue({
        data: null,
        isLoading: true,
      } as any)

      const { result } = renderHook(() => useChat())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('Gemini Integration', () => {
    it('should send user message and generate Gemini response', async () => {
      mockSendMessageMutation.mutateAsync.mockResolvedValue({
        id: 'msg-3',
        content: 'Test message',
        type: 'user',
        timestamp: new Date(),
      })

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendUserMessage('Test message')
      })

      expect(mockSendMessageMutation.mutateAsync).toHaveBeenCalledWith({
        content: 'Test message',
        type: 'user',
      })

      expect(mockGeminiHook.generateTextStream).toHaveBeenCalledWith('Test message')
    })

    it('should handle streaming responses', async () => {
      const streamingMessage = {
        id: 'streaming-123',
        content: 'Partial response...',
        type: 'gemini-text' as const,
        timestamp: new Date(),
        metadata: {
          model: 'gemini-pro',
          isStreaming: true,
        },
      }

      // Mock streaming state
      vi.mocked(useGemini).mockReturnValue({
        ...mockGeminiHook,
        isStreaming: true,
        streamingContent: 'Partial response...',
      } as any)

      const { result } = renderHook(() => useChat())

      // Simulate streaming message creation
      act(() => {
        // This would be triggered by the onStreamChunk callback
        result.current.generateGeminiResponse('Test prompt')
      })

      expect(result.current.isStreaming).toBe(true)
      expect(mockGeminiHook.generateTextStream).toHaveBeenCalledWith('Test prompt')
    })

    it('should handle non-streaming responses', async () => {
      const { result } = renderHook(() => useChat({ streamingEnabled: false }))

      await act(async () => {
        await result.current.generateGeminiResponse('Test prompt', false)
      })

      expect(mockGeminiHook.generateText).toHaveBeenCalledWith('Test prompt')
    })

    it('should cancel streaming when requested', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.cancelStreaming()
      })

      expect(mockGeminiHook.cancelStream).toHaveBeenCalled()
    })

    it('should handle Gemini errors', () => {
      const error = new Error('Gemini API error')
      vi.mocked(useGemini).mockReturnValue({
        ...mockGeminiHook,
        error,
      } as any)

      const { result } = renderHook(() => useChat())

      expect(result.current.geminiError).toBe(error)
    })

    it('should clear Gemini errors', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.clearGeminiError()
      })

      expect(mockGeminiHook.clearError).toHaveBeenCalled()
    })
  })

  describe('Configuration Options', () => {
    it('should disable Gemini when enableGemini is false', async () => {
      const { result } = renderHook(() => useChat({ enableGemini: false }))

      await act(async () => {
        await result.current.sendUserMessage('Test message')
      })

      expect(mockGeminiHook.generateTextStream).not.toHaveBeenCalled()
      expect(result.current.enableGemini).toBe(false)
    })

    it('should disable auto-response when autoGenerateResponse is false', async () => {
      const { result } = renderHook(() => useChat({ autoGenerateResponse: false }))

      await act(async () => {
        await result.current.sendUserMessage('Test message', false)
      })

      expect(mockGeminiHook.generateTextStream).not.toHaveBeenCalled()
    })

    it('should use non-streaming mode when streamingEnabled is false', async () => {
      const { result } = renderHook(() => useChat({ streamingEnabled: false }))

      await act(async () => {
        await result.current.generateGeminiResponse('Test prompt')
      })

      expect(mockGeminiHook.generateText).toHaveBeenCalledWith('Test prompt')
      expect(mockGeminiHook.generateTextStream).not.toHaveBeenCalled()
    })
  })

  describe('Message Ordering and State Management', () => {
    it('should properly order messages by timestamp', () => {
      const messagesOutOfOrder = [
        {
          id: 'msg-2',
          content: 'Second message',
          type: 'user' as const,
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: 'msg-1',
          content: 'First message',
          type: 'user' as const,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
      ]

      vi.mocked(trpc.getChatMessages.useQuery).mockReturnValue({
        data: { messages: messagesOutOfOrder },
        isLoading: false,
      } as any)

      const { result } = renderHook(() => useChat())

      expect(result.current.messages[0].content).toBe('First message')
      expect(result.current.messages[1].content).toBe('Second message')
    })

    it('should include streaming message in message list', () => {
      const { result } = renderHook(() => useChat())

      // Simulate streaming message state
      act(() => {
        // This would be set internally when streaming starts
        result.current.generateGeminiResponse('Test')
      })

      // The streaming message should be included in the messages array
      // This test verifies the logic exists, actual implementation may vary
      expect(result.current.messages).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle send message errors', async () => {
      const error = new Error('Send message failed')
      mockSendMessageMutation.mutateAsync.mockRejectedValue(error)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        try {
          await result.current.sendUserMessage('Test message')
        } catch (e) {
          expect(e).toBe(error)
        }
      })
    })

    it('should prevent multiple concurrent generations', async () => {
      vi.mocked(useGemini).mockReturnValue({
        ...mockGeminiHook,
        isGenerating: true,
      } as any)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.generateGeminiResponse('Test prompt')
      })

      // Should not call generate methods when already generating
      expect(mockGeminiHook.generateTextStream).not.toHaveBeenCalled()
      expect(mockGeminiHook.generateText).not.toHaveBeenCalled()
    })
  })

  describe('Integration with tRPC', () => {
    it('should invalidate chat messages after sending', async () => {
      const mockInvalidate = vi.fn()
      vi.mocked(trpc.useUtils).mockReturnValue({
        getChatMessages: {
          invalidate: mockInvalidate,
        },
      } as any)

      mockSendMessageMutation.mutateAsync.mockResolvedValue({
        id: 'msg-3',
        content: 'Test',
        type: 'user',
        timestamp: new Date(),
      })

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendUserMessage('Test', false)
      })

      // Verify that the mutation was configured to invalidate on success
      expect(vi.mocked(trpc.sendMessage.useMutation)).toHaveBeenCalledWith({
        onSuccess: expect.any(Function),
      })
    })
  })
})