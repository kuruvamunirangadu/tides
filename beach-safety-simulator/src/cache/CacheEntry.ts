export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  version: number;
  costMs?: number;
  hits: number;
}
