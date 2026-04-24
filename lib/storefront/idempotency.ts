type CachedResponse = {
  createdAt: number;
  data: unknown;
};

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, CachedResponse>();

export function getIdempotentResponse(key: string): unknown | null {
  const now = Date.now();
  const value = cache.get(key);
  if (!value) return null;
  if (now - value.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return value.data;
}

export function setIdempotentResponse(key: string, data: unknown): void {
  cache.set(key, { createdAt: Date.now(), data });
}
