/**
 * Production-ready in-memory sliding-window rate limiter.
 *
 * NOTE ON DISTRIBUTED DEPLOYMENTS:
 * In a multi-instance or serverless environment (e.g. Vercel Serverless without shared memory),
 * this in-memory store limits requests per instance. For globally synchronized distributed
 * rate limiting across multiple serverless regions, a shared store such as Redis
 * (e.g. Upstash Redis with @upstash/ratelimit) should be configured.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class MemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up entries older than 2 minutes to prevent memory leaks
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        const twoMinutesAgo = now - 120_000;

        for (const [key, record] of this.store.entries()) {
          record.timestamps = record.timestamps.filter((t) => t > twoMinutesAgo);
          if (record.timestamps.length === 0) {
            this.store.delete(key);
          }
        }
      }, 60_000);

      // Don't keep Node process alive just for cleanup interval
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === "function") {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Checks if a request should be rate-limited.
   *
   * @param key Unique key for the client (e.g. `userId:route` or `ip:route`)
   * @param limit Maximum allowed requests within the window
   * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
   */
  public check(
    key: string,
    limit: number,
    windowMs = 60_000
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the active window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= limit) {
      // Calculate when the oldest request in the window expires
      const oldest = record.timestamps[0];
      const resetTime = oldest + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: limit - record.timestamps.length,
      retryAfterSeconds: 0,
    };
  }
}

// Global singleton rate limiter instance
const rateLimiterInstance = new MemoryRateLimiter();

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
) {
  return rateLimiterInstance.check(key, limit, windowMs);
}

/**
 * Extracts a client identifier from request headers or authenticated user ID.
 */
export function getClientIdentifier(request: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const clientIp = forwarded.split(",")[0].trim();
    if (clientIp) return `ip:${clientIp}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;

  return "anonymous:default";
}
