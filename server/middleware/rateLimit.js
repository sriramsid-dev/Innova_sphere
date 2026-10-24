/**
 * Innova Sphere — Simple in-memory rate limiter
 * 20 requests per minute per IP address (sliding window).
 * Replace with Redis/Upstash for production multi-instance deployments.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

// Map<ip, { count: number, windowStart: number }>
const store = new Map();

// Clean up stale entries every 5 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimitMiddleware(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return next();
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    res.set("Retry-After", "60");
    return res.status(429).json({
      error: "Too many requests. Please wait a moment before trying again.",
    });
  }

  return next();
}
