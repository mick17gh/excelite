const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

type Entry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, Entry>();

export function takeRateLimitToken(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  return { allowed: true };
}
