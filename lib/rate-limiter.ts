/**
 * Rolling Window Rate Limiter for Gemini API
 * Guarantees that no more than GEMINI_RPM_LIMIT requests fire within any 60-second sliding window.
 */

class RollingRateLimiter {
  private timestamps: number[] = [];
  private readonly rpmLimit: number;
  private readonly windowMs: number = 60_000;
  private backoffUntil: number = 0;

  constructor() {
    const envLimit = process.env.GEMINI_RPM_LIMIT;
    this.rpmLimit = envLimit && !isNaN(parseInt(envLimit, 10)) ? parseInt(envLimit, 10) : 15;
  }

  /**
   * Cleans timestamps older than the 60-second window
   */
  private cleanup(now: number) {
    const cutoff = now - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > cutoff);
  }

  /**
   * Waits until a rate limit slot becomes available within the rolling window.
   * Returns the time spent waiting in milliseconds.
   */
  async acquire(): Promise<number> {
    const startWait = Date.now();

    while (true) {
      const now = Date.now();

      // Check if exponential backoff is active (from previous 429)
      if (now < this.backoffUntil) {
        const backoffWait = this.backoffUntil - now;
        await new Promise((resolve) => setTimeout(resolve, backoffWait));
        continue;
      }

      this.cleanup(now);

      if (this.timestamps.length < this.rpmLimit) {
        // Slot available! Record timestamp and proceed
        this.timestamps.push(now);
        return Date.now() - startWait;
      }

      // Slot unavailable: wait until the oldest request leaves the 60s window
      const oldest = this.timestamps[0];
      const waitTime = Math.max(oldest + this.windowMs - now + 150, 200); // 150ms buffer
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Applies exponential backoff with jitter on 429 rate limit errors
   */
  reportRateLimited(retryCount: number = 1) {
    const baseDelay = Math.min(5000 * Math.pow(2, retryCount - 1), 45000);
    const jitter = Math.random() * 2000;
    const totalBackoff = baseDelay + jitter;
    this.backoffUntil = Math.max(this.backoffUntil, Date.now() + totalBackoff);
    return totalBackoff;
  }

  /**
   * Returns current rolling window metrics
   */
  getStatus() {
    this.cleanup(Date.now());
    return {
      activeInWindow: this.timestamps.length,
      rpmLimit: this.rpmLimit,
      isBackingOff: Date.now() < this.backoffUntil,
      backoffRemainingMs: Math.max(0, this.backoffUntil - Date.now()),
    };
  }
}

// Global singleton for server runtime
const globalForLimiter = globalThis as unknown as {
  geminiRateLimiter?: RollingRateLimiter;
};

export const rateLimiter = globalForLimiter.geminiRateLimiter ?? new RollingRateLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalForLimiter.geminiRateLimiter = rateLimiter;
}
