/**
 * Simple in-memory rate limiter for Vercel Serverless Functions.
 * Uses sliding window per IP. Resets on cold start (function spin-up).
 * For production scale: replace with @upstash/ratelimit + Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  ip: string,
  opts: RateLimitOptions
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = ip;

  let win = store.get(key);
  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + opts.windowMs };
    store.set(key, win);
  }

  win.count++;
  const remaining = Math.max(0, opts.maxRequests - win.count);
  const resetIn = Math.ceil((win.resetAt - now) / 1000);
  const allowed = win.count <= opts.maxRequests;

  // Periodic cleanup to avoid memory leak
  if (store.size > 10_000) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  return { allowed, remaining, resetIn };
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return 'unknown';
}
