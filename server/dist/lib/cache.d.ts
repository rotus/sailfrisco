import { LRUCache } from 'lru-cache';
export type CacheKey = string;
export declare const cache: LRUCache<string, any, unknown>;
export declare function buildKey(prefix: string, params: Record<string, unknown>): CacheKey;
//# sourceMappingURL=cache.d.ts.map