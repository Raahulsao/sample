// Hugging Face Image Generation Service
export interface HuggingFaceConfig {
  apiToken: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
}

export interface ImageGenerationResponse {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
  metadata?: {
    model: string;
    width: number;
    height: number;
    inferenceSteps: number;
    guidanceScale: number;
  };
}

export interface HuggingFaceError {
  code: 'API_TOKEN_INVALID' | 'RATE_LIMIT_EXCEEDED' | 'MODEL_LOADING' | 'NETWORK_ERROR' | 'CONTENT_FILTERED' | 'UNKNOWN';
  message: string;
  userMessage: string;
  retryAfter?: number;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

const DEFAULT_CONFIG: Partial<HuggingFaceConfig> = {
  model: 'stabilityai/stable-diffusion-2-1',
  timeout: 60000, // 60 seconds for image generation
  maxRetries: 3,
};

export class HuggingFaceService {
  private config: HuggingFaceConfig;

  constructor(config: Partial<HuggingFaceConfig>) {
    if (!config.apiToken) {
      throw new Error('Hugging Face API token is required');
    }

    this.config = { ...DEFAULT_CONFIG, ...config } as HuggingFaceConfig;
  }

  /**
   * Generate image using Hugging Face Inference API
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.validateRequest(request);

      const response = await this.makeRequest(request);
      
      if (!response.ok) {
        throw await this.handleApiError(response);
      }

      const blob = await response.blob();
      const imageUrl = await this.blobToDataUrl(blob);

      return {
        id: requestId,
        imageUrl,
        prompt: request.prompt,
        timestamp: new Date(),
        metadata: {
          model: this.config.model!,
          width: request.width || 512,
          height: request.height || 512,
          inferenceSteps: request.numInferenceSteps || 20,
          guidanceScale: request.guidanceScale || 7.5,
        },
      };
    } catch (error) {
      throw this.handleError(error, requestId);
    }
  }

  /**
   * Generate image with retry mechanism
   */
  async generateImageWithRetry(request: ImageGenerationRequest, maxRetries?: number): Promise<ImageGenerationResponse> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    let lastError: HuggingFaceError | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.generateImage(request);
        
        if (attempt > 1) {
          console.log(`Image generation succeeded on attempt ${attempt}/${retries}`);
        }
        
        return result;
      } catch (error) {
        const hfError = this.handleError(error);
        lastError = hfError;
        
        console.warn(`Image generation failed on attempt ${attempt}/${retries}:`, {
          code: hfError.code,
          message: hfError.message,
          retryable: hfError.retryable,
        });
        
        if (!hfError.retryable || attempt === retries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.sleep(delay);
      }
    }

    if (lastError) {
      lastError.userMessage = `${lastError.userMessage} We tried ${retries} times but couldn't generate your image.`;
      throw lastError;
    }

    throw this.handleError(new Error('All retry attempts failed'));
  }

  /**
   * Make HTTP request to Hugging Face API
   */
  private async makeRequest(request: ImageGenerationRequest): Promise<Response> {
    const url = `https://api-inference.huggingface.co/models/${this.config.model}`;
    
    const payload = {
      inputs: request.prompt,
      parameters: {
        negative_prompt: request.negativePrompt,
        width: request.width || 512,
        height: request.height || 512,
        num_inference_steps: request.numInferenceSteps || 20,
        guidance_scale: request.guidanceScale || 7.5,
      },
      options: {
        wait_for_model: true,
      },
    };

    console.log('Hugging Face API Request:', {
      url,
      prompt: request.prompt,
      model: this.config.model,
      tokenPrefix: this.config.apiToken.substring(0, 5) + '...',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      console.log('Hugging Face API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.error('Hugging Face API Request Error:', error);
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle API errors from Hugging Face
   */
  private async handleApiError(response: Response): Promise<HuggingFaceError> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // If we can't parse JSON, use status text
      errorData = { error: response.statusText };
    }

    const timestamp = new Date();

    switch (response.status) {
      case 401:
        return {
          code: 'API_TOKEN_INVALID',
          message: 'Invalid Hugging Face API token',
          userMessage: 'Invalid Hugging Face API token. Please check your token in .env.local',
          retryable: false,
          severity: 'critical',
          timestamp,
        };

      case 403:
        return {
          code: 'API_TOKEN_INVALID',
          message: 'Insufficient permissions for Hugging Face API token',
          userMessage: 'Your Hugging Face token needs "Write" permissions. Please create a new token with Write access.',
          retryable: false,
          severity: 'critical',
          timestamp,
        };

      case 429:
        const retryAfter = parseInt(response.headers.get('retry-after') || '60') * 1000;
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          userMessage: `Too many requests. Please wait ${Math.ceil(retryAfter / 1000)} seconds and try again.`,
          retryAfter,
          retryable: true,
          severity: 'medium',
          timestamp,
        };

      case 503:
        return {
          code: 'MODEL_LOADING',
          message: 'Model is loading',
          userMessage: 'The AI model is starting up. Please wait a moment and try again.',
          retryAfter: 20000, // 20 seconds
          retryable: true,
          severity: 'low',
          timestamp,
        };

      default:
        return {
          code: 'UNKNOWN',
          message: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          userMessage: 'Something went wrong while generating your image. Please try again.',
          retryable: response.status >= 500,
          severity: 'medium',
          timestamp,
        };
    }
  }

  /**
   * Handle general errors
   */
  private handleError(error: unknown, requestId?: string): HuggingFaceError {
    if (this.isHuggingFaceError(error)) {
      return error as HuggingFaceError;
    }

    const timestamp = new Date();

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          code: 'NETWORK_ERROR',
          message: 'Request timeout',
          userMessage: 'Image generation is taking too long. Please try again with a simpler prompt.',
          retryable: true,
          severity: 'medium',
          timestamp,
        };
      }

      if (error.message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error',
          userMessage: 'Unable to connect to the image generation service. Please check your internet connection.',
          retryable: true,
          severity: 'medium',
          timestamp,
        };
      }
    }

    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'An unexpected error occurred while generating your image. Please try again.',
      retryable: true,
      severity: 'medium',
      timestamp,
    };
  }

  /**
   * Validate image generation request
   */
  private validateRequest(request: ImageGenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (request.prompt.length > 1000) {
      throw new Error('Prompt exceeds maximum length of 1000 characters');
    }

    if (request.width && (request.width < 64 || request.width > 1024)) {
      throw new Error('Width must be between 64 and 1024 pixels');
    }

    if (request.height && (request.height < 64 || request.height > 1024)) {
      throw new Error('Height must be between 64 and 1024 pixels');
    }

    if (request.numInferenceSteps && (request.numInferenceSteps < 1 || request.numInferenceSteps > 50)) {
      throw new Error('Number of inference steps must be between 1 and 50');
    }

    if (request.guidanceScale && (request.guidanceScale < 1 || request.guidanceScale > 20)) {
      throw new Error('Guidance scale must be between 1 and 20');
    }
  }

  /**
   * Convert blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if error is a HuggingFaceError
   */
  private isHuggingFaceError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && 'userMessage' in error;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `hf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): HuggingFaceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HuggingFaceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
let huggingFaceService: HuggingFaceService | null = null;

export function getHuggingFaceService(): HuggingFaceService {
  if (!huggingFaceService) {
    const apiToken = process.env.HUGGINGFACE_API_TOKEN;
    
    if (!apiToken || apiToken.trim() === '' || apiToken === 'your_huggingface_token_here') {
      throw new Error('Hugging Face API token is not configured. Please add HUGGINGFACE_API_TOKEN to your .env.local file. See HUGGINGFACE_SETUP.md for instructions.');
    }

    const config = {
      apiToken,
      model: process.env.HUGGINGFACE_IMAGE_MODEL || 'stabilityai/stable-diffusion-2-1',
      timeout: parseInt(process.env.HUGGINGFACE_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.HUGGINGFACE_MAX_RETRIES || '3'),
    };

    try {
      huggingFaceService = new HuggingFaceService(config);
    } catch (error) {
      throw new Error(`Failed to initialize Hugging Face service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return huggingFaceService;
}