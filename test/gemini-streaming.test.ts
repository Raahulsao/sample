import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiService } from '@/lib/gemini'

describe('Gemini Streaming Functionality', () => {
  let service: GeminiService
  const mockApiKey = 'test-streaming-key'

  beforeEach(() => {
    service = new GeminiService({ apiKey: mockApiKey })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Layer Streaming', () => {
    it('should handle streaming with proper chunk aggregation', async () => {
      const mockChunks = [
        { text: () => 'The ' },
        { text: () => 'quick ' },
        { text: () => 'brown ' },
        { text: () => 'fox ' },
        { text: () => 'jumps' },
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = {
        prompt: 'Tell me a story about a fox',
        temperature: 0.7,
        maxTokens: 50,
      }

      const chunks: string[] = []
      let fullContent = ''

      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
        fullContent += chunk
      }

      expect(chunks).toEqual(['The ', 'quick ', 'brown ', 'fox ', 'jumps'])
      expect(fullContent).toBe('The quick brown fox jumps')
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Tell me a story about a fox' }] }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
          topP: undefined,
          topK: undefined,
        },
      })
    })

    it('should handle streaming with metadata collection', async () => {
      const mockChunks = [
        { 
          text: () => 'Hello',
          usageMetadata: { totalTokenCount: 5 },
          candidates: [{ finishReason: null }]
        },
        { 
          text: () => ' world',
          usageMetadata: { totalTokenCount: 10, promptTokenCount: 3, candidatesTokenCount: 7 },
          candidates: [{ finishReason: 'STOP' }]
        },
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = {
        prompt: 'Say hello',
        temperature: 0.5,
        maxTokens: 20,
      }

      const { stream, metadata } = await service.generateTextStreamWithMetadata(request)

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const finalMetadata = await metadata

      expect(chunks).toEqual(['Hello', ' world'])
      expect(finalMetadata).toMatchObject({
        id: expect.stringMatching(/^gemini-\d+-[a-z0-9]+$/),
        content: 'Hello world',
        type: 'text',
        timestamp: expect.any(Date),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 10,
          promptTokens: 3,
          completionTokens: 7,
          finishReason: 'STOP',
          temperature: 0.5,
          maxTokens: 20,
          isStreaming: true,
        },
      })
    })

    it('should handle streaming errors with proper error classification', async () => {
      const streamingErrors = [
        { error: new Error('API key invalid'), expectedCode: 'API_KEY_INVALID' },
        { error: new Error('Rate limit exceeded'), expectedCode: 'RATE_LIMIT_EXCEEDED' },
        { error: new Error('Network timeout'), expectedCode: 'NETWORK_ERROR' },
        { error: new Error('Quota exceeded'), expectedCode: 'QUOTA_EXCEEDED' },
      ]

      for (const { error, expectedCode } of streamingErrors) {
        const mockGenerateContentStream = vi.fn().mockRejectedValue(error)

        ;(service as any).textModel = {
          generateContentStream: mockGenerateContentStream,
        }

        const request = { prompt: 'Test error handling' }

        await expect(async () => {
          for await (const chunk of service.generateTextStream(request)) {
            // Should not reach here
          }
        }).rejects.toMatchObject({
          code: expectedCode,
          message: expect.any(String),
          details: expect.objectContaining({
            originalError: error.message,
            timestamp: expect.any(String),
          }),
        })
      }
    })

    it('should handle streaming validation errors', async () => {
      // Test empty prompt
      await expect(async () => {
        for await (const chunk of service.generateTextStream({ prompt: '' })) {
          // Should not reach here
        }
      }).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Prompt is required and cannot be empty',
      })

      // Test invalid temperature
      await expect(async () => {
        for await (const chunk of service.generateTextStream({ 
          prompt: 'test', 
          temperature: 3 
        })) {
          // Should not reach here
        }
      }).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Temperature must be between 0 and 2',
      })
    })

    it('should handle empty streaming chunks', async () => {
      const mockChunks = [
        { text: () => 'Hello' },
        { text: () => '' }, // Empty chunk
        { text: () => ' world' },
        { text: () => null }, // Null chunk
        { text: () => '!' },
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test empty chunks' }
      const chunks: string[] = []

      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      // Should filter out empty/null chunks
      expect(chunks).toEqual(['Hello', ' world', '!'])
    })

    it('should handle malformed stream chunks gracefully', async () => {
      const mockChunks = [
        { text: () => 'Good chunk' },
        { text: () => { throw new Error('Malformed chunk') } },
        { text: () => 'Another good chunk' },
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test malformed chunks' }
      const chunks: string[] = []

      // Mock console.warn to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Good chunk', 'Another good chunk'])
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to extract text from stream chunk:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle concurrent streaming requests', async () => {
      const mockGenerateContentStream = vi.fn().mockImplementation(() => ({
        stream: (async function* () {
          yield { text: () => 'Response' }
        })(),
      }))

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const requests = [
        { prompt: 'Request 1' },
        { prompt: 'Request 2' },
        { prompt: 'Request 3' },
      ]

      const streamPromises = requests.map(async (request) => {
        const chunks: string[] = []
        for await (const chunk of service.generateTextStream(request)) {
          chunks.push(chunk)
        }
        return chunks
      })

      const results = await Promise.all(streamPromises)

      expect(results).toHaveLength(3)
      results.forEach(chunks => {
        expect(chunks).toEqual(['Response'])
      })
      expect(mockGenerateContentStream).toHaveBeenCalledTimes(3)
    })
  })

  describe('Stream Chunk Processing', () => {
    it('should process chunks with different text formats', async () => {
      const mockChunks = [
        { text: () => 'Normal text ' },
        { text: () => 'Text with\nnewlines\n' },
        { text: () => 'Unicode: 🚀 ✨ 🎉 ' },
        { text: () => 'Special chars: @#$%^&*() ' },
        { text: () => 'HTML: <div>content</div> ' },
        { text: () => 'JSON: {"key": "value"} ' },
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test different text formats' }
      const chunks: string[] = []

      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual([
        'Normal text ',
        'Text with\nnewlines\n',
        'Unicode: 🚀 ✨ 🎉 ',
        'Special chars: @#$%^&*() ',
        'HTML: <div>content</div> ',
        'JSON: {"key": "value"} ',
      ])
    })

    it('should handle chunks with varying sizes', async () => {
      const mockChunks = [
        { text: () => 'A' }, // Single character
        { text: () => 'Medium length chunk' }, // Medium
        { text: () => 'This is a very long chunk that contains a lot of text to test how the streaming handles larger pieces of content' }, // Long
        { text: () => '' }, // Empty
        { text: () => 'End' }, // Short
      ]

      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test varying chunk sizes' }
      const chunks: string[] = []

      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      // Empty chunks should be filtered out
      expect(chunks).toEqual([
        'A',
        'Medium length chunk',
        'This is a very long chunk that contains a lot of text to test how the streaming handles larger pieces of content',
        'End',
      ])
    })
  })
})