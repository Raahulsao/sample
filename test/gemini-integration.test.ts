import { describe, it, expect } from 'vitest'
import { GeminiService, createGeminiService } from '@/lib/gemini'

describe('Gemini Integration Tests', () => {
  let service: GeminiService

  beforeAll(() => {
    // Create service with real API key from environment
    service = createGeminiService()
  })

  describe('Service Initialization', () => {
    it('should create service with valid configuration', () => {
      expect(service).toBeInstanceOf(GeminiService)
      
      const config = service.getConfig()
      expect(config.apiKey).toBeDefined()
      expect(config.models.text).toBe('gemini-1.5-flash')
      expect(config.models.vision).toBe('gemini-1.5-pro')
      expect(config.limits.maxTokens).toBe(4096)
      expect(config.features.streaming).toBe(true)
    })

    it('should validate API key successfully', async () => {
      const isValid = await service.validateApiKey()
      expect(isValid).toBe(true)
    }, 10000) // 10 second timeout for API call
  })

  describe('Text Generation', () => {
    it('should generate text response', async () => {
      const request = {
        prompt: 'Say hello in a friendly way',
        maxTokens: 50,
        temperature: 0.7,
      }

      const response = await service.generateText(request)

      expect(response).toBeDefined()
      expect(response.id).toMatch(/^gemini-\d+-[a-z0-9]+$/)
      expect(response.content).toBeDefined()
      expect(response.content.length).toBeGreaterThan(0)
      expect(response.type).toBe('text')
      expect(response.timestamp).toBeInstanceOf(Date)
      expect(response.metadata?.model).toBe('gemini-1.5-flash')
    }, 15000) // 15 second timeout for API call

    it('should handle streaming text generation', async () => {
      const request = {
        prompt: 'Count from 1 to 5',
        maxTokens: 100,
      }

      const chunks: string[] = []
      
      for await (const chunk of service.generateTextStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      const fullText = chunks.join('')
      expect(fullText.length).toBeGreaterThan(0)
    }, 15000) // 15 second timeout for API call
  })

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const originalConfig = service.getConfig()
      
      service.updateConfig({
        timeout: 45000,
        maxRetries: 5,
      })

      const updatedConfig = service.getConfig()
      expect(updatedConfig.timeout).toBe(45000)
      expect(updatedConfig.maxRetries).toBe(5)
      expect(updatedConfig.apiKey).toBe(originalConfig.apiKey) // Should remain unchanged
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid prompts', async () => {
      await expect(service.generateText({ prompt: '' }))
        .rejects.toThrow('Prompt is required and cannot be empty')
    })

    it('should handle invalid parameters', async () => {
      await expect(service.generateText({ 
        prompt: 'test', 
        temperature: 3 
      })).rejects.toThrow('Temperature must be between 0 and 2')
    })
  })
})