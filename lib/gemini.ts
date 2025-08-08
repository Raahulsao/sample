import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { RateLimiter, RateLimitConfig, getGlobalRateLimiter, createRateLimiterFromEnv } from './rate-limiter';

// Core configuration interface
export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  models: {
    text: string;
    vision: string;
  };
  limits: {
    maxTokens: number;
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  features: {
    streaming: boolean;
    imageGeneration: boolean;
  };
}

// Request interfaces
export interface GeminiTextRequest {
  prompt: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiImageRequest {
  prompt: string;
  size?: 'small' | 'medium' | 'large';
  style?: string;
}

// Response interfaces
export interface GeminiResponse {
  id: string;
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    imageUrl?: string;
    isStreaming?: boolean;
    finishReason?: string;
    promptTokens?: number;
    completionTokens?: number;
    temperature?: number;
    maxTokens?: number;
    requestId?: string;
    size?: string;
    style?: string;
  };
}

// Error interfaces
export interface GeminiError {
  code: 'API_KEY_INVALID' | 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'CONTENT_FILTERED' | 'UNKNOWN';
  message: string;
  userMessage: string; // User-friendly message
  details?: Record<string, any>;
  retryAfter?: number;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  requestId?: string;
}

// Gemini API specific types
export interface GeminiApiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiStreamChunk {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
}

// Default configuration
const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  timeout: 30000,
  maxRetries: 3,
  models: {
    text: 'gemini-1.5-flash',
    vision: 'gemini-1.5-pro',
  },
  limits: {
    maxTokens: 4096,
    requestsPerMinute: 60,
    requestsPerDay: 1000,
  },
  features: {
    streaming: true,
    imageGeneration: true,
  },
};

export class GeminiService {
  private config: GeminiConfig;
  private client: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;
  private rateLimiter: RateLimiter;

  constructor(config: Partial<GeminiConfig>) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Merge with defaults
    this.config = { ...DEFAULT_CONFIG, ...config } as GeminiConfig;
    
    // Initialize Google Generative AI client
    this.client = new GoogleGenerativeAI(this.config.apiKey);
    
    // Initialize models
    this.textModel = this.client.getGenerativeModel({ 
      model: this.config.models.text 
    });
    this.visionModel = this.client.getGenerativeModel({ 
      model: this.config.models.vision 
    });

    // Initialize rate limiter
    const rateLimitConfig: RateLimitConfig = {
      requestsPerMinute: this.config.limits.requestsPerMinute,
      requestsPerHour: this.config.limits.requestsPerMinute * 60,
      requestsPerDay: this.config.limits.requestsPerDay,
      tokensPerMinute: this.config.limits.maxTokens * this.config.limits.requestsPerMinute,
      tokensPerHour: this.config.limits.maxTokens * this.config.limits.requestsPerMinute * 60,
      tokensPerDay: this.config.limits.maxTokens * this.config.limits.requestsPerDay,
      burstLimit: Math.floor(this.config.limits.requestsPerMinute * 0.2),
    };
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const result = await this.textModel.generateContent('Test');
      return !!result.response;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize client if API key changed
    if (newConfig.apiKey) {
      this.client = new GoogleGenerativeAI(this.config.apiKey);
      this.textModel = this.client.getGenerativeModel({ 
        model: this.config.models.text 
      });
      this.visionModel = this.client.getGenerativeModel({ 
        model: this.config.models.vision 
      });
    }

    // Update rate limiter configuration if limits changed
    if (newConfig.limits) {
      const rateLimitConfig: RateLimitConfig = {
        requestsPerMinute: this.config.limits.requestsPerMinute,
        requestsPerHour: this.config.limits.requestsPerMinute * 60,
        requestsPerDay: this.config.limits.requestsPerDay,
        tokensPerMinute: this.config.limits.maxTokens * this.config.limits.requestsPerMinute,
        tokensPerHour: this.config.limits.maxTokens * this.config.limits.requestsPerMinute * 60,
        tokensPerDay: this.config.limits.maxTokens * this.config.limits.requestsPerDay,
        burstLimit: Math.floor(this.config.limits.requestsPerMinute * 0.2),
      };
      this.rateLimiter.updateConfig(rateLimitConfig);
    }
  }

  /**
   * Check rate limits before making a request
   */
  checkRateLimit(estimatedTokens?: number): { allowed: boolean; retryAfter?: number; message?: string } {
    const result = this.rateLimiter.checkRateLimit({
      requestTokens: estimatedTokens || this.estimateTokens(''),
      priority: 'normal'
    });

    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
      message: result.message
    };
  }

  /**
   * Get current quota usage
   */
  getQuotaUsage() {
    return this.rateLimiter.getQuotaUsage();
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  resetRateLimit(): void {
    this.rateLimiter.reset();
  }

  /**
   * Generate text using Gemini Pro with rate limiting
   */
  async generateText(request: GeminiTextRequest): Promise<GeminiResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.validateTextRequest(request);

      // Check rate limits before making the request
      const estimatedTokens = this.estimateTokens(request.prompt);
      const rateLimitCheck = this.rateLimiter.checkRateLimit({
        requestTokens: estimatedTokens,
        priority: 'normal'
      });

      if (!rateLimitCheck.allowed) {
        const error: GeminiError = {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.message || 'Rate limit exceeded',
          userMessage: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) + ' seconds' : 'a moment'} before trying again.`,
          details: {
            rateLimitInfo: rateLimitCheck,
            quotaUsage: rateLimitCheck.quotaUsage,
            requestId,
            estimatedTokens
          },
          retryAfter: rateLimitCheck.retryAfter,
          retryable: true,
          severity: 'medium',
          timestamp: new Date(),
        };
        throw error;
      }

      const transformedRequest = this.transformTextRequest(request);
      const result = await this.textModel.generateContent(transformedRequest);

      return this.transformTextResponse(result, request, requestId);
    } catch (error) {
      throw this.handleError(error, requestId);
    }
  }

  /**
   * Generate text with enhanced retry mechanism and exponential backoff
   */
  async generateTextWithRetry(request: GeminiTextRequest, maxRetries?: number): Promise<GeminiResponse> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    const requestId = this.generateRequestId();
    let lastError: GeminiError | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // For retry attempts, create a new request with the same ID for tracking
        const result = await this.generateTextInternal(request, requestId);
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`Request ${requestId} succeeded on attempt ${attempt}/${retries}`);
        }
        
        return result;
      } catch (error) {
        const geminiError = this.handleError(error, requestId);
        lastError = geminiError;
        
        // Log the attempt failure
        console.warn(`Request ${requestId} failed on attempt ${attempt}/${retries}:`, {
          code: geminiError.code,
          message: geminiError.message,
          retryable: geminiError.retryable,
          severity: geminiError.severity
        });
        
        // Don't retry for non-retryable errors
        if (!this.shouldRetry(geminiError)) {
          throw geminiError;
        }

        // Don't wait after the last attempt
        if (attempt < retries) {
          const delay = this.calculateRetryDelay(attempt, geminiError);
          console.log(`Request ${requestId} retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      // Enhance the error with retry information
      lastError.details = {
        ...lastError.details,
        retriesExhausted: true,
        totalAttempts: retries,
        finalAttempt: true
      };
      lastError.userMessage = `${lastError.userMessage} We tried ${retries} times but couldn't complete your request.`;
      throw lastError;
    }

    // This should never happen, but just in case
    throw this.handleError(new Error('All retry attempts failed'), requestId);
  }

  /**
   * Internal method for generating text (used by both direct and retry methods)
   */
  private async generateTextInternal(request: GeminiTextRequest, requestId: string): Promise<GeminiResponse> {
    this.validateTextRequest(request);

    // Check rate limits before making the request
    const estimatedTokens = this.estimateTokens(request.prompt);
    const rateLimitCheck = this.rateLimiter.checkRateLimit({
      requestTokens: estimatedTokens,
      priority: 'normal'
    });

    if (!rateLimitCheck.allowed) {
      const error: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: rateLimitCheck.message || 'Rate limit exceeded',
        userMessage: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) + ' seconds' : 'a moment'} before trying again.`,
        details: {
          rateLimitInfo: rateLimitCheck,
          quotaUsage: rateLimitCheck.quotaUsage,
          requestId,
          estimatedTokens
        },
        retryAfter: rateLimitCheck.retryAfter,
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      };
      throw error;
    }

    const transformedRequest = this.transformTextRequest(request);
    const result = await this.textModel.generateContent(transformedRequest);

    return this.transformTextResponse(result, request, requestId);
  }

  /**
   * Transform text request to Gemini API format
   */
  private transformTextRequest(request: GeminiTextRequest) {
    const generationConfig: GenerationConfig = {
      maxOutputTokens: request.maxTokens || this.config.limits.maxTokens,
      temperature: request.temperature,
      topP: request.topP,
      topK: request.topK,
    };

    return {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig,
    };
  }

  /**
   * Transform Gemini API response to standard format
   */
  private transformTextResponse(result: any, originalRequest: GeminiTextRequest, requestId?: string): GeminiResponse {
    const response = result.response;
    const text = response.text();

    return {
      id: this.generateId(),
      content: text,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        model: this.config.models.text,
        tokens: response.usageMetadata?.totalTokenCount,
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        finishReason: response.candidates?.[0]?.finishReason,
        temperature: originalRequest.temperature,
        maxTokens: originalRequest.maxTokens,
        isStreaming: false,
        requestId,
      },
    };
  }

  /**
   * Generate streaming text using Gemini Pro with rate limiting
   */
  async* generateTextStream(request: GeminiTextRequest): AsyncIterable<string> {
    const requestId = this.generateRequestId();
    
    try {
      this.validateTextRequest(request);

      // Check rate limits before making the request
      const estimatedTokens = this.estimateTokens(request.prompt);
      const rateLimitCheck = this.rateLimiter.checkRateLimit({
        requestTokens: estimatedTokens,
        priority: 'normal'
      });

      if (!rateLimitCheck.allowed) {
        const error: GeminiError = {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.message || 'Rate limit exceeded',
          userMessage: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) + ' seconds' : 'a moment'} before trying again.`,
          details: {
            rateLimitInfo: rateLimitCheck,
            quotaUsage: rateLimitCheck.quotaUsage,
            requestId,
            estimatedTokens
          },
          retryAfter: rateLimitCheck.retryAfter,
          retryable: true,
          severity: 'medium',
          timestamp: new Date(),
        };
        throw error;
      }

      const transformedRequest = this.transformTextRequest(request);
      const result = await this.textModel.generateContentStream(transformedRequest);

      for await (const chunk of result.stream) {
        const chunkText = this.transformStreamChunk(chunk);
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      throw this.handleError(error, requestId);
    }
  }

  /**
   * Generate streaming text with complete response metadata
   */
  async generateTextStreamWithMetadata(request: GeminiTextRequest): Promise<{
    stream: AsyncIterable<string>;
    metadata: Promise<GeminiResponse>;
  }> {
    const requestId = this.generateRequestId();
    
    try {
      this.validateTextRequest(request);

      const transformedRequest = this.transformTextRequest(request);
      const result = await this.textModel.generateContentStream(transformedRequest);

      let fullContent = '';
      let finalResponse: any = null;
      let metadataResolve: (value: GeminiResponse) => void;
      let metadataReject: (error: any) => void;

      const metadata = new Promise<GeminiResponse>((resolve, reject) => {
        metadataResolve = resolve;
        metadataReject = reject;
      });

      const stream = async function* (this: GeminiService) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = this.transformStreamChunk(chunk);
            if (chunkText) {
              fullContent += chunkText;
              yield chunkText;
            }
            finalResponse = chunk;
          }
          
          // Resolve metadata when streaming is complete
          metadataResolve({
            id: this.generateId(),
            content: fullContent,
            type: 'text',
            timestamp: new Date(),
            metadata: {
              model: this.config.models.text,
              tokens: finalResponse?.usageMetadata?.totalTokenCount,
              promptTokens: finalResponse?.usageMetadata?.promptTokenCount,
              completionTokens: finalResponse?.usageMetadata?.candidatesTokenCount,
              finishReason: finalResponse?.candidates?.[0]?.finishReason,
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              isStreaming: true,
              requestId,
            },
          });
        } catch (error) {
          const geminiError = this.handleError(error, requestId);
          metadataReject(geminiError);
          throw geminiError;
        }
      }.bind(this);

      return { stream: stream(), metadata };
    } catch (error) {
      throw this.handleError(error, requestId);
    }
  }

  /**
   * Transform stream chunk to text
   */
  private transformStreamChunk(chunk: any): string {
    try {
      return chunk.text() || '';
    } catch (error) {
      // Handle malformed chunks gracefully
      console.warn('Failed to extract text from stream chunk:', error);
      return '';
    }
  }

  /**
   * Generate image using Gemini Pro Vision with rate limiting
   */
  async generateImage(request: GeminiImageRequest): Promise<GeminiResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.validateImageRequest(request);

      // Check rate limits before making the request
      const estimatedTokens = this.estimateTokens(request.prompt);
      const rateLimitCheck = this.rateLimiter.checkRateLimit({
        requestTokens: estimatedTokens,
        priority: 'normal'
      });

      if (!rateLimitCheck.allowed) {
        const error: GeminiError = {
          code: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.message || 'Rate limit exceeded',
          userMessage: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) + ' seconds' : 'a moment'} before trying again.`,
          details: {
            rateLimitInfo: rateLimitCheck,
            quotaUsage: rateLimitCheck.quotaUsage,
            requestId,
            estimatedTokens
          },
          retryAfter: rateLimitCheck.retryAfter,
          retryable: true,
          severity: 'medium',
          timestamp: new Date(),
        };
        throw error;
      }

      const transformedRequest = this.transformImageRequest(request);
      const result = await this.visionModel.generateContent(transformedRequest);

      return this.transformImageResponse(result, request, requestId);
    } catch (error) {
      throw this.handleError(error, requestId);
    }
  }

  /**
   * Generate image with enhanced retry mechanism and exponential backoff
   */
  async generateImageWithRetry(request: GeminiImageRequest, maxRetries?: number): Promise<GeminiResponse> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    const requestId = this.generateRequestId();
    let lastError: GeminiError | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.generateImageInternal(request, requestId);
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`Image generation request ${requestId} succeeded on attempt ${attempt}/${retries}`);
        }
        
        return result;
      } catch (error) {
        const geminiError = this.handleError(error, requestId);
        lastError = geminiError;
        
        // Log the attempt failure
        console.warn(`Image generation request ${requestId} failed on attempt ${attempt}/${retries}:`, {
          code: geminiError.code,
          message: geminiError.message,
          retryable: geminiError.retryable,
          severity: geminiError.severity
        });
        
        // Don't retry for non-retryable errors
        if (!this.shouldRetry(geminiError)) {
          throw geminiError;
        }

        // Don't wait after the last attempt
        if (attempt < retries) {
          const delay = this.calculateRetryDelay(attempt, geminiError);
          console.log(`Image generation request ${requestId} retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      lastError.details = {
        ...lastError.details,
        retriesExhausted: true,
        totalAttempts: retries,
        finalAttempt: true
      };
      lastError.userMessage = `${lastError.userMessage} We tried ${retries} times but couldn't generate your image.`;
      throw lastError;
    }

    throw this.handleError(new Error('All retry attempts failed'), requestId);
  }

  /**
   * Internal method for generating images (used by both direct and retry methods)
   */
  private async generateImageInternal(request: GeminiImageRequest, requestId: string): Promise<GeminiResponse> {
    this.validateImageRequest(request);

    // Check rate limits before making the request
    const estimatedTokens = this.estimateTokens(request.prompt);
    const rateLimitCheck = this.rateLimiter.checkRateLimit({
      requestTokens: estimatedTokens,
      priority: 'normal'
    });

    if (!rateLimitCheck.allowed) {
      const error: GeminiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: rateLimitCheck.message || 'Rate limit exceeded',
        userMessage: `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) + ' seconds' : 'a moment'} before trying again.`,
        details: {
          rateLimitInfo: rateLimitCheck,
          quotaUsage: rateLimitCheck.quotaUsage,
          requestId,
          estimatedTokens
        },
        retryAfter: rateLimitCheck.retryAfter,
        retryable: true,
        severity: 'medium',
        timestamp: new Date(),
      };
      throw error;
    }

    const transformedRequest = this.transformImageRequest(request);
    const result = await this.visionModel.generateContent(transformedRequest);

    return this.transformImageResponse(result, request, requestId);
  }

  /**
   * Transform image request to Gemini API format
   */
  private transformImageRequest(request: GeminiImageRequest) {
    // Create a comprehensive prompt for image generation
    let enhancedPrompt = request.prompt;
    
    // Add size specifications if provided
    if (request.size) {
      const sizeMap = {
        small: '512x512',
        medium: '1024x1024',
        large: '1536x1536'
      };
      enhancedPrompt += ` Image should be ${sizeMap[request.size]} resolution.`;
    }
    
    // Add style specifications if provided
    if (request.style) {
      enhancedPrompt += ` Style: ${request.style}.`;
    }
    
    // Add general image generation instructions
    enhancedPrompt += ' Generate a high-quality, detailed image based on this description.';

    return {
      contents: [{ 
        role: 'user', 
        parts: [{ text: enhancedPrompt }] 
      }],
      generationConfig: {
        temperature: 0.7, // Slightly creative for image generation
        maxOutputTokens: 1024, // Reasonable limit for image descriptions
      },
    };
  }

  /**
   * Transform Gemini API response to standard image format
   */
  private transformImageResponse(result: any, originalRequest: GeminiImageRequest, requestId?: string): GeminiResponse {
    const response = result.response;
    const text = response.text();

    // For now, Gemini Pro Vision returns text descriptions rather than actual images
    // In a real implementation, you might need to integrate with an actual image generation service
    // or handle image URLs returned by the API
    
    // Extract potential image URL from response if present
    const imageUrlMatch = text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
    const imageUrl = imageUrlMatch ? imageUrlMatch[0] : null;

    return {
      id: this.generateId(),
      content: imageUrl || text, // Use image URL if available, otherwise use text description
      type: 'image',
      timestamp: new Date(),
      metadata: {
        model: this.config.models.vision,
        tokens: response.usageMetadata?.totalTokenCount,
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        finishReason: response.candidates?.[0]?.finishReason,
        imageUrl: imageUrl,
        size: originalRequest.size,
        style: originalRequest.style,
        isStreaming: false,
        requestId,
      },
    };
  }

  /**
   * Estimate token count for a given text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified estimation; actual tokenization may vary
    const baseTokens = Math.ceil(text.length / 4);
    
    // Add some buffer for system prompts and formatting
    const bufferTokens = Math.ceil(baseTokens * 0.1);
    
    return baseTokens + bufferTokens;
  }

  /**
   * Validate text generation request
   */
  private validateTextRequest(request: GeminiTextRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (request.prompt.length > 4000) {
      throw new Error('Prompt exceeds maximum length of 4000 characters');
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (request.topP !== undefined && (request.topP < 0 || request.topP > 1)) {
      throw new Error('TopP must be between 0 and 1');
    }

    if (request.topK !== undefined && request.topK < 1) {
      throw new Error('TopK must be greater than 0');
    }
  }

  /**
   * Validate image generation request
   */
  private validateImageRequest(request: GeminiImageRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (request.prompt.length > 1000) {
      throw new Error('Image prompt exceeds maximum length of 1000 characters');
    }

    if (request.size && !['small', 'medium', 'large'].includes(request.size)) {
      throw new Error('Size must be one of: small, medium, large');
    }
  }

  /**
   * Handle and classify errors with comprehensive detection and user-friendly messages
   */
  private handleError(error: unknown, requestId?: string): GeminiError {
    // If it's already a GeminiError, return it as-is
    if (this.isGeminiError(error)) {
      return error as GeminiError;
    }

    const timestamp = new Date();
    const baseDetails = {
      originalError: error instanceof Error ? error.message : String(error),
      timestamp: timestamp.toISOString(),
      requestId,
    };

    if (error instanceof Error) {
      // API Key errors
      if (this.isApiKeyError(error)) {
        return {
          code: 'API_KEY_INVALID',
          message: 'Invalid or missing API key. Please check your Gemini API configuration.',
          userMessage: 'There\'s an issue with the API configuration. Please contact support.',
          details: { 
            ...baseDetails,
            suggestion: 'Verify your GEMINI_API_KEY environment variable is set correctly.',
            errorType: 'authentication'
          },
          retryable: false,
          severity: 'critical',
          timestamp,
        };
      }

      // Rate limiting errors
      if (this.isRateLimitError(error)) {
        const retryAfter = this.extractRetryAfter(error);
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please wait before making another request.',
          userMessage: `Too many requests. Please wait ${retryAfter ? Math.ceil(retryAfter / 1000) + ' seconds' : 'a moment'} and try again.`,
          details: { 
            ...baseDetails,
            suggestion: 'Reduce request frequency or upgrade your API plan.',
            errorType: 'rate_limit',
            retryAfterMs: retryAfter
          },
          retryAfter,
          retryable: true,
          severity: 'medium',
          timestamp,
        };
      }

      // Quota exceeded errors
      if (this.isQuotaError(error)) {
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'API quota exceeded. Please check your usage limits.',
          userMessage: 'Daily usage limit reached. Please try again tomorrow or upgrade your plan.',
          details: { 
            ...baseDetails,
            suggestion: 'Check your API usage dashboard or upgrade your plan.',
            errorType: 'quota'
          },
          retryable: false,
          severity: 'high',
          timestamp,
        };
      }

      // Network errors
      if (this.isNetworkError(error)) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network connection error. Please check your internet connection.',
          userMessage: 'Connection problem. Please check your internet and try again.',
          details: { 
            ...baseDetails,
            suggestion: 'Check your internet connection and try again.',
            errorType: 'network'
          },
          retryable: true,
          severity: 'medium',
          timestamp,
        };
      }

      // Timeout errors
      if (this.isTimeoutError(error)) {
        return {
          code: 'TIMEOUT',
          message: 'Request timed out. The server took too long to respond.',
          userMessage: 'Request timed out. Please try again.',
          details: { 
            ...baseDetails,
            suggestion: 'Try again with a shorter prompt or check your connection.',
            errorType: 'timeout'
          },
          retryable: true,
          severity: 'medium',
          timestamp,
        };
      }

      // Service unavailable errors
      if (this.isServiceUnavailableError(error)) {
        return {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Gemini service is temporarily unavailable.',
          userMessage: 'The AI service is temporarily unavailable. Please try again in a few minutes.',
          details: { 
            ...baseDetails,
            suggestion: 'Wait a few minutes and try again.',
            errorType: 'service'
          },
          retryable: true,
          severity: 'high',
          timestamp,
        };
      }

      // Content filtering errors
      if (this.isContentFilteredError(error)) {
        return {
          code: 'CONTENT_FILTERED',
          message: 'Content was filtered due to safety policies.',
          userMessage: 'Your request was blocked by safety filters. Please try rephrasing your message.',
          details: { 
            ...baseDetails,
            suggestion: 'Rephrase your request to avoid potentially harmful content.',
            errorType: 'content_filter'
          },
          retryable: false,
          severity: 'low',
          timestamp,
        };
      }

      // Validation errors
      if (this.isValidationError(error)) {
        return {
          code: 'VALIDATION_ERROR',
          message: error.message,
          userMessage: this.getUserFriendlyValidationMessage(error.message),
          details: { 
            ...baseDetails,
            suggestion: 'Check your request parameters and try again.',
            errorType: 'validation'
          },
          retryable: false,
          severity: 'low',
          timestamp,
        };
      }
    }

    // Unknown errors
    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again.',
      details: { 
        ...baseDetails,
        suggestion: 'Please try again or contact support if the issue persists.',
        errorType: 'unknown'
      },
      retryable: true,
      severity: 'medium',
      timestamp,
    };
  }

  /**
   * Check if error is related to API key issues
   */
  private isApiKeyError(error: Error): boolean {
    const apiKeyPatterns = [
      /api key/i,
      /authentication/i,
      /unauthorized/i,
      /401/,
      /forbidden/i,
      /403/
    ];
    return apiKeyPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is related to rate limiting
   */
  private isRateLimitError(error: Error): boolean {
    const rateLimitPatterns = [
      /rate limit/i,
      /too many requests/i,
      /429/,
      /throttle/i,
      /requests per/i,
      /wait.*seconds/i,
      /wait.*before/i
    ];
    return rateLimitPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is related to quota exceeded
   */
  private isQuotaError(error: Error): boolean {
    const quotaPatterns = [
      /quota/i,
      /usage limit/i,
      /billing/i,
      /exceeded/i,
      /limit reached/i
    ];
    return quotaPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    const networkPatterns = [
      /network/i,
      /connection/i,
      /timeout/i,
      /dns/i,
      /enotfound/i,
      /econnrefused/i,
      /socket/i
    ];
    return networkPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(error: Error): boolean {
    const validationPatterns = [
      /prompt/i,
      /temperature/i,
      /topp/i,
      /topk/i,
      /invalid parameter/i,
      /validation/i,
      /required/i,
      /maximum length/i
    ];
    return validationPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is timeout-related
   */
  private isTimeoutError(error: Error): boolean {
    const timeoutPatterns = [
      /timeout/i,
      /timed out/i,
      /request timeout/i,
      /connection timeout/i,
      /etimedout/i,
      /socket hang up/i
    ];
    return timeoutPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is service unavailable
   */
  private isServiceUnavailableError(error: Error): boolean {
    const servicePatterns = [
      /service unavailable/i,
      /server unavailable/i,
      /503/,
      /502/,
      /bad gateway/i,
      /maintenance/i,
      /temporarily unavailable/i
    ];
    return servicePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is content filtering related
   */
  private isContentFilteredError(error: Error): boolean {
    const contentPatterns = [
      /content filtered/i,
      /safety/i,
      /blocked/i,
      /inappropriate/i,
      /policy violation/i,
      /harmful content/i,
      /finish_reason.*safety/i
    ];
    return contentPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get user-friendly validation error message
   */
  private getUserFriendlyValidationMessage(originalMessage: string): string {
    if (/prompt.*required/i.test(originalMessage)) {
      return 'Please enter a message to continue.';
    }
    if (/prompt.*length/i.test(originalMessage)) {
      return 'Your message is too long. Please shorten it and try again.';
    }
    if (/temperature/i.test(originalMessage)) {
      return 'Invalid creativity setting. Please use a value between 0 and 2.';
    }
    if (/topp/i.test(originalMessage)) {
      return 'Invalid focus setting. Please use a value between 0 and 1.';
    }
    if (/topk/i.test(originalMessage)) {
      return 'Invalid diversity setting. Please use a positive number.';
    }
    return 'Please check your input and try again.';
  }

  /**
   * Extract retry-after value from error message
   */
  private extractRetryAfter(error: Error): number | undefined {
    // Try different patterns for retry-after values
    const patterns = [
      /retry after (\d+)/i,
      /wait (\d+) seconds/i,
      /please wait (\d+)/i,
      /try again in (\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = error.message.match(pattern);
      if (match) {
        return parseInt(match[1]) * 1000; // Convert to milliseconds
      }
    }
    
    // Default retry after for rate limit errors
    if (this.isRateLimitError(error)) {
      return 60000; // 60 seconds default
    }
    
    return undefined;
  }

  /**
   * Check if error is already a GeminiError
   */
  private isGeminiError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries?: number): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const geminiError = this.handleError(error);
        
        // Don't retry for certain error types
        if (!this.shouldRetry(geminiError)) {
          throw geminiError;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw this.handleError(lastError);
  }

  /**
   * Determine if error should trigger a retry
   */
  private shouldRetry(error: GeminiError): boolean {
    // Use the retryable flag from the error object
    return error.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, error?: GeminiError): number {
    // If error specifies a retry-after time, use that
    if (error?.retryAfter) {
      return error.retryAfter;
    }

    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter (±10%) to prevent thundering herd problem
    const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;
    
    // Ensure final delay is within bounds
    const finalDelay = Math.max(Math.min(delayWithJitter, maxDelay), 500); // Min 500ms, Max 30s
    
    return Math.round(finalDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique ID for responses
   */
  private generateId(): string {
    return `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create Gemini service instance from environment variables
 */
export function createGeminiService(): GeminiService {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GeminiService({
    apiKey,
    // Override defaults with environment variables if present
    timeout: process.env.GEMINI_TIMEOUT ? parseInt(process.env.GEMINI_TIMEOUT) : undefined,
    maxRetries: process.env.GEMINI_MAX_RETRIES ? parseInt(process.env.GEMINI_MAX_RETRIES) : undefined,
  });
}

/**
 * Singleton instance for server-side usage
 */
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = createGeminiService();
  }
  return geminiServiceInstance;
}