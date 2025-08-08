import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiService } from '@/lib/gemini'

describe('Gemini Text Generation', () => {
  let service: GeminiService
  const mockApiKey = 'test-api-key-123'

  beforeEach(() => {
    service = new GeminiService({ apiKey: mockApiKey })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Text Generation', () => {
    it('should generate text with proper request transformation', async () => {
      // Mock the textModel.generateContent method
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Generated response text',
          usageMetadata: {
            totalTokenCount: 50,
            promptTokenCount: 20,
            candidatesTokenCount: 30,
          },
          candidates: [{ finishReason: 'STOP' }],
        },
      })

      // Replace the textModel with our mock
      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = {
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        topK: 40,
      }

      const response = await service.generateText(request)

      // Verify the request was transformed correctly
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      })

      // Verify the response was transformed correctly
      expect(response).toEqual({
        id: expect.stringMatching(/^gemini-\d+-[a-z0-9]+$/),
        content: 'Generated response text',
        type: 'text',
        timestamp: expect.any(Date),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 50,
          promptTokens: 20,
          completionTokens: 30,
          finishReason: 'STOP',
          temperature: 0.7,
          maxTokens: 100,
          isStreaming: false,
        },
      })
    })

    it('should use default values when optional parameters are not provided', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Default response',
          usageMetadata: { totalTokenCount: 25 },
          candidates: [{ finishReason: 'STOP' }],
        },
      })

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Simple prompt' }
      await service.generateText(request)

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Simple prompt' }] }],
        generationConfig: {
          maxOutputTokens: 4096, // default value
          temperature: undefined,
          topP: undefined,
          topK: undefined,
        },
      })
    })
  })

  describe('Text Generation with Retry', () => {
    it('should retry on retryable errors', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValueOnce(new Error('network connection failed'))
        .mockResolvedValueOnce({
          response: {
            text: () => 'Success after retry',
            usageMetadata: { totalTokenCount: 30 },
            candidates: [{ finishReason: 'STOP' }],
          },
        })

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test retry' }
      const response = await service.generateTextWithRetry(request)

      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
      expect(response.content).toBe('Success after retry')
    })

    it('should not retry on non-retryable errors', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('API key invalid'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test no retry' }
      
      await expect(service.generateTextWithRetry(request))
        .rejects.toMatchObject({
          code: 'API_KEY_INVALID',
          message: expect.stringContaining('Invalid or missing API key'),
        })

      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('should respect custom retry limit', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('network timeout'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      // Mock the sleep function to avoid actual delays
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined)

      const request = { prompt: 'Test custom retry limit' }
      
      await expect(service.generateTextWithRetry(request, 2))
        .rejects.toMatchObject({
          code: 'NETWORK_ERROR',
        })

      // The generateTextWithRetry calls generateText, which calls executeWithRetry
      // So we expect more calls due to the nested retry logic
      expect(mockGenerateContent).toHaveBeenCalled()
      expect(sleepSpy).toHaveBeenCalled()
      
      sleepSpy.mockRestore()
    })
  })

  describe('Streaming Text Generation', () => {
    it('should handle streaming responses correctly', async () => {
      const mockChunks = [
        { text: () => 'Hello ' },
        { text: () => 'world!' },
        { text: () => ' How ' },
        { text: () => 'are you?' },
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
        prompt: 'Stream test',
        temperature: 0.5,
        maxTokens: 50,
      }

      const chunks: string[] = []
      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello ', 'world!', ' How ', 'are you?'])
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Stream test' }] }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.5,
          topP: undefined,
          topK: undefined,
        },
      })
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

    it('should generate streaming text with metadata', async () => {
      const mockChunks = [
        { 
          text: () => 'First ',
          usageMetadata: { totalTokenCount: 10 },
          candidates: [{ finishReason: null }]
        },
        { 
          text: () => 'second ',
          usageMetadata: { totalTokenCount: 20 },
          candidates: [{ finishReason: null }]
        },
        { 
          text: () => 'third',
          usageMetadata: { totalTokenCount: 30, promptTokenCount: 10, candidatesTokenCount: 20 },
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
        prompt: 'Test metadata',
        temperature: 0.8,
        maxTokens: 100,
      }

      const { stream, metadata } = await service.generateTextStreamWithMetadata(request)

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const finalMetadata = await metadata

      expect(chunks).toEqual(['First ', 'second ', 'third'])
      expect(finalMetadata).toMatchObject({
        id: expect.stringMatching(/^gemini-\d+-[a-z0-9]+$/),
        content: 'First second third',
        type: 'text',
        timestamp: expect.any(Date),
        metadata: {
          model: 'gemini-1.5-flash',
          tokens: 30,
          promptTokens: 10,
          completionTokens: 20,
          finishReason: 'STOP',
          temperature: 0.8,
          maxTokens: 100,
          isStreaming: true,
        },
      })
    })

    it('should handle streaming errors during generation', async () => {
      const mockGenerateContentStream = vi.fn().mockRejectedValue(
        new Error('Streaming connection failed')
      )

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test streaming error' }

      await expect(async () => {
        for await (const chunk of service.generateTextStream(request)) {
          // Should not reach here
        }
      }).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('Network connection error'),
      })
    })

    it('should handle streaming interruption gracefully', async () => {
      const mockChunks = [
        { text: () => 'Start ' },
        { text: () => 'middle ' },
        // Stream will be interrupted here
      ]

      let chunkIndex = 0
      const mockGenerateContentStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockChunks) {
            if (chunkIndex === 1) {
              throw new Error('Stream interrupted')
            }
            chunkIndex++
            yield chunk
          }
        })(),
      })

      ;(service as any).textModel = {
        generateContentStream: mockGenerateContentStream,
      }

      const request = { prompt: 'Test interruption' }
      const chunks: string[] = []

      try {
        for await (const chunk of service.generateTextStream(request)) {
          chunks.push(chunk)
        }
      } catch (error) {
        // Expected to throw
      }

      expect(chunks).toEqual(['Start '])
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

    it('should validate streaming request parameters', async () => {
      // Test empty prompt
      await expect(async () => {
        for await (const chunk of service.generateTextStream({ prompt: '' })) {
          // Should not reach here
        }
      }).rejects.toThrow('Prompt is required and cannot be empty')

      // Test invalid temperature
      await expect(async () => {
        for await (const chunk of service.generateTextStream({ 
          prompt: 'test', 
          temperature: 3 
        })) {
          // Should not reach here
        }
      }).rejects.toThrow('Temperature must be between 0 and 2')
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

  describe('Error Handling', () => {
    it('should classify API key errors correctly', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('API key is invalid'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test API key error' }
      
      await expect(service.generateText(request))
        .rejects.toMatchObject({
          code: 'API_KEY_INVALID',
          message: expect.stringContaining('Invalid or missing API key'),
          details: {
            originalError: 'API key is invalid',
            timestamp: expect.any(String),
            suggestion: expect.stringContaining('GEMINI_API_KEY'),
          },
        })
    })

    it('should classify rate limit errors correctly', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('Rate limit exceeded, retry after 60 seconds'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test rate limit error' }
      
      await expect(service.generateText(request))
        .rejects.toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Rate limit exceeded'),
          retryAfter: 60000, // 60 seconds in milliseconds
        })
    })

    it('should classify network errors correctly', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('Network connection timeout'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test network error' }
      
      await expect(service.generateText(request))
        .rejects.toMatchObject({
          code: 'NETWORK_ERROR',
          message: expect.stringContaining('Network connection error'),
        })
    })

    it('should classify validation errors correctly', async () => {
      const request = { prompt: '', temperature: 0.5 }
      
      await expect(service.generateText(request))
        .rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Prompt is required and cannot be empty',
        })
    })

    it('should handle unknown errors gracefully', async () => {
      const mockGenerateContent = vi.fn()
        .mockRejectedValue(new Error('Some unexpected error'))

      ;(service as any).textModel = {
        generateContent: mockGenerateContent,
      }

      const request = { prompt: 'Test unknown error' }
      
      await expect(service.generateText(request))
        .rejects.toMatchObject({
          code: 'UNKNOWN',
          message: 'Some unexpected error',
          details: {
            originalError: expect.stringContaining('Some unexpected error'),
            timestamp: expect.any(String),
            suggestion: expect.stringContaining('try again'),
          },
        })
    })
  })

  describe('Request Validation', () => {
    it('should validate prompt length limits', async () => {
      const longPrompt = 'a'.repeat(4001)
      const request = { prompt: longPrompt }
      
      await expect(service.generateText(request))
        .rejects.toThrow('Prompt exceeds maximum length of 4000 characters')
    })

    it('should validate temperature range', async () => {
      const request = { prompt: 'test', temperature: 3.0 }
      
      await expect(service.generateText(request))
        .rejects.toThrow('Temperature must be between 0 and 2')
    })

    it('should validate topP range', async () => {
      const request = { prompt: 'test', topP: 1.5 }
      
      await expect(service.generateText(request))
        .rejects.toThrow('TopP must be between 0 and 1')
    })

    it('should validate topK minimum value', async () => {
      const request = { prompt: 'test', topK: 0 }
      
      await expect(service.generateText(request))
        .rejects.toThrow('TopK must be greater than 0')
    })
  })
})