/**
 * Rate Limiter and Quota Management for Gemini API
 * 
 * This module provides client-side rate limiting and quota tracking
 * to prevent API abuse and provide user feedback when limits are exceeded.
 */

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute?: number;
  tokensPerHour?: number;
  tokensPerDay?: number;
  burstLimit?: number; // Allow short bursts above the rate limit
}

export interface QuotaUsage {
  requests: {
    minute: number;
    hour: number;
    day: number;
  };
  tokens: {
    minute: number;
    hour: number;
    day: number;
  };
  lastReset: {
    minute: Date;
    hour: Date;
    day: Date;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // milliseconds to wait before next request
  quotaUsage: QuotaUsage;
  limitType?: 'requests' | 'tokens';
  timeWindow?: 'minute' | 'hour' | 'day';
  message?: string;
}

export interface RateLimitOptions {
  requestTokens?: number; // Estimated tokens for this request
  priority?: 'low' | 'normal' | 'high'; // Request priority
  bypassBurst?: boolean; // Whether to bypass burst limits
}

/**
 * Client-side rate limiter with sliding window and token bucket algorithms
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private usage: QuotaUsage;
  private requestHistory: Array<{ timestamp: Date; tokens: number }> = [];
  private burstTokens: number = 0;
  private lastBurstReset: Date = new Date();

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.usage = this.initializeUsage();
    this.burstTokens = config.burstLimit || Math.floor(config.requestsPerMinute * 0.5);
  }

  /**
   * Check if a request is allowed under current rate limits
   */
  checkRateLimit(options: RateLimitOptions = {}): RateLimitResult {
    const now = new Date();
    const tokens = options.requestTokens || 1;

    // Clean up old entries and reset counters
    this.cleanupHistory(now);
    this.resetCountersIfNeeded(now);

    // Check burst limits first (for high-priority requests)
    if (options.priority === 'high' && !options.bypassBurst) {
      if (this.burstTokens > 0) {
        this.burstTokens--;
        this.recordRequest(now, tokens);
        return {
          allowed: true,
          quotaUsage: { ...this.usage },
          message: 'Request allowed via burst capacity'
        };
      }
    }

    // Check rate limits in order of strictness (minute -> hour -> day)
    const minuteCheck = this.checkMinuteLimit(tokens);
    if (!minuteCheck.allowed) {
      return minuteCheck;
    }

    const hourCheck = this.checkHourLimit(tokens);
    if (!hourCheck.allowed) {
      return hourCheck;
    }

    const dayCheck = this.checkDayLimit(tokens);
    if (!dayCheck.allowed) {
      return dayCheck;
    }

    // All checks passed - record the request
    this.recordRequest(now, tokens);
    this.replenishBurstTokens(now);

    return {
      allowed: true,
      quotaUsage: { ...this.usage },
      message: 'Request allowed'
    };
  }

  /**
   * Get current quota usage statistics
   */
  getQuotaUsage(): QuotaUsage {
    const now = new Date();
    this.cleanupHistory(now);
    this.resetCountersIfNeeded(now);
    return { ...this.usage };
  }

  /**
   * Get time until next request is allowed (without recording a request)
   */
  getTimeUntilNextRequest(): number {
    const now = new Date();
    this.cleanupHistory(now);
    this.resetCountersIfNeeded(now);
    
    // Check minute limit
    if (this.usage.requests.minute >= this.config.requestsPerMinute) {
      const nextMinute = new Date(this.usage.lastReset.minute.getTime() + 60000);
      return Math.max(nextMinute.getTime() - now.getTime(), 0);
    }
    
    // Check hour limit
    if (this.usage.requests.hour >= this.config.requestsPerHour) {
      const nextHour = new Date(this.usage.lastReset.hour.getTime() + 3600000);
      return Math.max(nextHour.getTime() - now.getTime(), 0);
    }
    
    // Check day limit
    if (this.usage.requests.day >= this.config.requestsPerDay) {
      const nextDay = new Date(this.usage.lastReset.day.getTime() + 86400000);
      return Math.max(nextDay.getTime() - now.getTime(), 0);
    }
    
    return 0;
  }

  /**
   * Reset all counters (useful for testing or manual reset)
   */
  reset(): void {
    this.usage = this.initializeUsage();
    this.requestHistory = [];
    this.burstTokens = this.config.burstLimit || Math.floor(this.config.requestsPerMinute * 0.5);
    this.lastBurstReset = new Date();
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Adjust burst tokens if burst limit changed
    if (newConfig.burstLimit !== undefined) {
      this.burstTokens = Math.min(this.burstTokens, newConfig.burstLimit);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Check if we're currently rate limited (without recording a request)
   */
  isRateLimited(): boolean {
    const now = new Date();
    this.cleanupHistory(now);
    this.resetCountersIfNeeded(now);
    
    // Check limits without recording a request
    const minuteExceeded = this.usage.requests.minute >= this.config.requestsPerMinute;
    const hourExceeded = this.usage.requests.hour >= this.config.requestsPerHour;
    const dayExceeded = this.usage.requests.day >= this.config.requestsPerDay;
    
    return minuteExceeded || hourExceeded || dayExceeded;
  }

  /**
   * Get rate limit status summary
   */
  getStatus(): {
    isLimited: boolean;
    nextAvailableTime: Date;
    quotaUsage: QuotaUsage;
    burstTokensAvailable: number;
  } {
    const now = new Date();
    const isLimited = this.isRateLimited();
    const retryAfter = this.getTimeUntilNextRequest();
    
    return {
      isLimited,
      nextAvailableTime: new Date(now.getTime() + retryAfter),
      quotaUsage: this.getQuotaUsage(),
      burstTokensAvailable: this.burstTokens,
    };
  }

  // Private methods

  private initializeUsage(): QuotaUsage {
    const now = new Date();
    return {
      requests: { minute: 0, hour: 0, day: 0 },
      tokens: { minute: 0, hour: 0, day: 0 },
      lastReset: { minute: now, hour: now, day: now },
    };
  }

  private checkMinuteLimit(tokens: number): RateLimitResult {
    const requestsExceeded = this.usage.requests.minute >= this.config.requestsPerMinute;
    const tokensExceeded = this.config.tokensPerMinute && 
      this.usage.tokens.minute + tokens > this.config.tokensPerMinute;

    if (requestsExceeded || tokensExceeded) {
      const nextMinute = new Date(this.usage.lastReset.minute.getTime() + 60000);
      const retryAfter = nextMinute.getTime() - Date.now();

      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 0),
        quotaUsage: { ...this.usage },
        limitType: requestsExceeded ? 'requests' : 'tokens',
        timeWindow: 'minute',
        message: `Rate limit exceeded: ${requestsExceeded ? 'requests' : 'tokens'} per minute limit reached`
      };
    }

    return { allowed: true, quotaUsage: { ...this.usage } };
  }

  private checkHourLimit(tokens: number): RateLimitResult {
    const requestsExceeded = this.usage.requests.hour >= this.config.requestsPerHour;
    const tokensExceeded = this.config.tokensPerHour && 
      this.usage.tokens.hour + tokens > this.config.tokensPerHour;

    if (requestsExceeded || tokensExceeded) {
      const nextHour = new Date(this.usage.lastReset.hour.getTime() + 3600000);
      const retryAfter = nextHour.getTime() - Date.now();

      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 0),
        quotaUsage: { ...this.usage },
        limitType: requestsExceeded ? 'requests' : 'tokens',
        timeWindow: 'hour',
        message: `Rate limit exceeded: ${requestsExceeded ? 'requests' : 'tokens'} per hour limit reached`
      };
    }

    return { allowed: true, quotaUsage: { ...this.usage } };
  }

  private checkDayLimit(tokens: number): RateLimitResult {
    const requestsExceeded = this.usage.requests.day >= this.config.requestsPerDay;
    const tokensExceeded = this.config.tokensPerDay && 
      this.usage.tokens.day + tokens > this.config.tokensPerDay;

    if (requestsExceeded || tokensExceeded) {
      const nextDay = new Date(this.usage.lastReset.day.getTime() + 86400000);
      const retryAfter = nextDay.getTime() - Date.now();

      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 0),
        quotaUsage: { ...this.usage },
        limitType: requestsExceeded ? 'requests' : 'tokens',
        timeWindow: 'day',
        message: `Rate limit exceeded: ${requestsExceeded ? 'requests' : 'tokens'} per day limit reached`
      };
    }

    return { allowed: true, quotaUsage: { ...this.usage } };
  }

  private recordRequest(timestamp: Date, tokens: number): void {
    // Add to history for sliding window
    this.requestHistory.push({ timestamp, tokens });

    // Update counters
    this.usage.requests.minute++;
    this.usage.requests.hour++;
    this.usage.requests.day++;

    this.usage.tokens.minute += tokens;
    this.usage.tokens.hour += tokens;
    this.usage.tokens.day += tokens;
  }

  private cleanupHistory(now: Date): void {
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Remove entries older than 1 minute (we only need recent history for sliding window)
    this.requestHistory = this.requestHistory.filter(
      entry => entry.timestamp > oneMinuteAgo
    );
  }

  private resetCountersIfNeeded(now: Date): void {
    // Reset minute counter
    if (now.getTime() - this.usage.lastReset.minute.getTime() >= 60000) {
      this.usage.requests.minute = 0;
      this.usage.tokens.minute = 0;
      this.usage.lastReset.minute = now;
    }

    // Reset hour counter
    if (now.getTime() - this.usage.lastReset.hour.getTime() >= 3600000) {
      this.usage.requests.hour = 0;
      this.usage.tokens.hour = 0;
      this.usage.lastReset.hour = now;
    }

    // Reset day counter
    if (now.getTime() - this.usage.lastReset.day.getTime() >= 86400000) {
      this.usage.requests.day = 0;
      this.usage.tokens.day = 0;
      this.usage.lastReset.day = now;
    }
  }

  private replenishBurstTokens(now: Date): void {
    const timeSinceLastReset = now.getTime() - this.lastBurstReset.getTime();
    const maxBurstTokens = this.config.burstLimit || Math.floor(this.config.requestsPerMinute * 0.5);
    
    // Replenish burst tokens every 10 seconds
    if (timeSinceLastReset >= 10000) {
      const tokensToAdd = Math.floor(timeSinceLastReset / 10000);
      this.burstTokens = Math.min(this.burstTokens + tokensToAdd, maxBurstTokens);
      this.lastBurstReset = now;
    }
  }
}

/**
 * Global rate limiter instance for Gemini API
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get or create the global rate limiter instance
 */
export function getGlobalRateLimiter(config?: RateLimitConfig): RateLimiter {
  if (!globalRateLimiter) {
    const defaultConfig: RateLimitConfig = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      tokensPerMinute: 32000,
      tokensPerHour: 500000,
      tokensPerDay: 2000000,
      burstLimit: 10,
    };

    globalRateLimiter = new RateLimiter(config || defaultConfig);
  }

  return globalRateLimiter;
}

/**
 * Reset the global rate limiter (useful for testing)
 */
export function resetGlobalRateLimiter(): void {
  globalRateLimiter = null;
}

/**
 * Create a rate limiter with environment-based configuration
 */
export function createRateLimiterFromEnv(): RateLimiter {
  const config: RateLimitConfig = {
    requestsPerMinute: parseInt(process.env.GEMINI_REQUESTS_PER_MINUTE || '60'),
    requestsPerHour: parseInt(process.env.GEMINI_REQUESTS_PER_HOUR || '1000'),
    requestsPerDay: parseInt(process.env.GEMINI_REQUESTS_PER_DAY || '10000'),
    tokensPerMinute: parseInt(process.env.GEMINI_TOKENS_PER_MINUTE || '32000'),
    tokensPerHour: parseInt(process.env.GEMINI_TOKENS_PER_HOUR || '500000'),
    tokensPerDay: parseInt(process.env.GEMINI_TOKENS_PER_DAY || '2000000'),
    burstLimit: parseInt(process.env.GEMINI_BURST_LIMIT || '10'),
  };

  return new RateLimiter(config);
}