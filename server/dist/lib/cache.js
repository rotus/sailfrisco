import { LRUCache } from 'lru-cache';
const ttlMs = Number(process.env.CACHE_TTL_MS ?? 1000 * 60); // default 1 minute
const maxItems = Number(process.env.CACHE_MAX_ITEMS ?? 500);
export const cache = new LRUCache({
    max: maxItems,
    ttl: ttlMs,
});
export function buildKey(prefix, params) {
    const sorted = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
    return `${prefix}?${sorted}`;
}
//# sourceMappingURL=cache.js.map