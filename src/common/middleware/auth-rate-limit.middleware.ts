import type { NextFunction, Request, Response } from 'express';

interface AuthRateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

export function createAuthRateLimitMiddleware(
  options: AuthRateLimitOptions,
): (req: Request, res: Response, next: NextFunction) => void {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, RateLimitState>();
  let lastCleanupAt = Date.now();

  const setRateLimitHeaders = (
    res: Response,
    remaining: number,
    retryAfterSeconds?: number,
  ): void => {
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(remaining, 0)));
    if (retryAfterSeconds !== undefined) {
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (now - lastCleanupAt >= windowMs) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
      lastCleanupAt = now;
    }
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      setRateLimitHeaders(res, maxRequests - 1);
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      setRateLimitHeaders(res, 0, retryAfterSeconds);
      res.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again later.',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    setRateLimitHeaders(res, maxRequests - current.count);
    next();
  };
}
