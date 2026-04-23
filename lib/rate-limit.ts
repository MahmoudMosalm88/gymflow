// Simple in-memory sliding window rate limiter
// Stores IP addresses and their request timestamps

// Map of IP -> array of timestamps (in milliseconds)
const requestStore = new Map<string, number[]>();

// Track last cleanup time to avoid cleanup on every request
let lastCleanup = Date.now();

/**
 * Checks if a request from the given IP should be allowed based on rate limits.
 *
 * @param ip - The IP address of the requester
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and retry-after time in ms
 */
export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();

  // Lazy cleanup: remove old entries every 60 seconds
  if (now - lastCleanup > 60000) {
    cleanup(now, windowMs * 2); // Clean entries older than 2x window
    lastCleanup = now;
  }

  // Get existing timestamps for this IP
  const timestamps = requestStore.get(ip) || [];

  // Remove timestamps outside the current window
  const windowStart = now - windowMs;
  const recentTimestamps = timestamps.filter(ts => ts > windowStart);

  // Check if limit exceeded
  if (recentTimestamps.length >= limit) {
    // Calculate when the oldest request in window will expire
    const oldestInWindow = recentTimestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;

    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  // Allow request and record timestamp
  recentTimestamps.push(now);
  requestStore.set(ip, recentTimestamps);

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Removes entries older than the specified age from the store
 */
function cleanup(now: number, maxAgeMs: number) {
  const cutoff = now - maxAgeMs;

  for (const [ip, timestamps] of requestStore.entries()) {
    const recentTimestamps = timestamps.filter(ts => ts > cutoff);

    if (recentTimestamps.length === 0) {
      // No recent requests, remove IP entirely
      requestStore.delete(ip);
    } else {
      // Update with filtered timestamps
      requestStore.set(ip, recentTimestamps);
    }
  }
}
