import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiService } from '@/lib/gemini'

describe('Gemini Unit Tests', () => {
  const mockApiKey = 'test-api-key-123'

  describe('Configuration Validation', () => {
    it('should throw error when API key is missing', () => {
      expect(() => new GeminiService({})).toThrow('Gemini API key is required')
    })

    it('should merge configuration with defaults', () => {
      const customConfig = {
        apiKey: mockApiKey,
        timeout: 60000,
        maxRetries: 5,
      }
      
      const service = new GeminiService(customConfig)
      const config = service.getConfig()
      
      expect(config.timeout).toBe(60000)
      expect(config.maxRetries).toBe(5)
      expect(config.models.text).toBe('gemini-1.5-flash') // default value
      expect(config.features.streaming).toBe(true) // default value
    })
  })

  describe('Request Validation', () => {
    let service: GeminiService

    beforeEach(() => {
      service = new GeminiService({ apiKey: mockApiKey })
    })

    it('should validate text request parameters', async () => {
      // Empty prompt
      await expect(service.generateText({ prompt: '' }))
        .rejects.toThrow('Prompt is required and cannot be empty')

      // Long prompt
      const longPrompt = 'a'.repeat(4001)
      await expect(service.generateText({ prompt: longPrompt }))
        .rejects.toThrow('Prompt exceeds maximum length of 4000 characters')

      // Invalid temperature
      await expect(service.generateText({ prompt: 'test', temperature: 3 }))
        .rejects.toThrow('Temperature must be between 0 and 2')

      // Invalid topP
      await expect(service.generateText({ prompt: 'test', topP: 1.5 }))
        .rejects.toThrow('TopP must be between 0 and 1')

      // Invalid topK
      await expect(service.generateText({ prompt: 'test', topK: 0 }))
        .rejects.toThrow('TopK must be greater than 0')
    })

    it('should validate image request parameters', async () => {
      // Empty prompt
      await expect(service.generateImage({ prompt: '' }))
        .rejects.toThrow('Prompt is required and cannot be empty')

      // Long prompt
      const longPrompt = 'a'.repeat(1001)
      await expect(service.generateImage({ prompt: longPrompt }))
        .rejects.toThrow('Image prompt exceeds maximum length of 1000 characters')

      // Invalid size
      await expect(service.generateImage({ prompt: 'test', size: 'huge' as any }))
        .rejects.toThrow('Size must be one of: small, medium, large')
    })
  })

  describe('Factory Functions', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should throw error when no API key is found in environment', async () => {
      delete process.env.GEMINI_API_KEY
      delete process.env.NEXT_PUBLIC_GEMINI_API_KEY

      // Clear module cache to force re-evaluation
      vi.resetModules()
      const { createGeminiService } = await import('@/lib/gemini')
      expect(() => createGeminiService())
        .toThrow('GEMINI_API_KEY environment variable is required')
    })
  })
})