import { LRUCache } from 'lru-cache';

export type CacheKey = string;

const ttlMs = Number(process.env.CACHE_TTL_MS ?? 1000 * 60); // default 1 minute
const maxItems = Number(process.env.CACHE_MAX_ITEMS ?? 500);

export const cache = new LRUCache<CacheKey, any>({
  max: maxItems,
  ttl: ttlMs,
});

export function buildKey(prefix: string, params: Record<string, unknown>): CacheKey {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${prefix}?${sorted}`;
}


