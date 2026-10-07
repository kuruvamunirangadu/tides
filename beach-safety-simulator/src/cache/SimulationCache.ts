import { CacheEntry } from './CacheEntry';
import { CacheStats } from './CacheStats';

export class SimulationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private savedCalculations = 0;
  private savedComputeTimeMs = 0;
  private spatialHits = 0;
  private riskHits = 0;
  private hazardHits = 0;
  private snapshotHits = 0;

  // Maximum capacity limit to prevent uncontrolled memory bloat in long runs
  private readonly maxEntries: number;

  constructor(maxEntries: number = 2500) {
    this.maxEntries = maxEntries;
  }

  public set<T>(
    key: string,
    value: T,
    version: number,
    ttlMs?: number,
    costMs: number = 0.05
  ): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictStaleOrOldest();
    }

    const now = performance.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: ttlMs ? now + ttlMs : undefined,
      version,
      costMs,
      hits: 0,
    });
  }

  public get<T>(key: string, version: number, category?: 'spatial' | 'risk' | 'hazard' | 'snapshot'): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // 1. Version check: Invalidated automatically if engine version has incremented
    if (entry.version !== version) {
      this.cache.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    // 2. TTL expiration check
    if (entry.expiresAt && performance.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    // Cache hit!
    this.hits++;
    this.savedCalculations++;
    this.savedComputeTimeMs += entry.costMs || 0.05;
    entry.hits++;

    if (category === 'spatial') this.spatialHits++;
    else if (category === 'risk') this.riskHits++;
    else if (category === 'hazard') this.hazardHits++;
    else if (category === 'snapshot') this.snapshotHits++;

    return entry.value as T;
  }

  public getOrCompute<T>(
    key: string,
    version: number,
    computeFn: () => T,
    ttlMs?: number,
    category?: 'spatial' | 'risk' | 'hazard' | 'snapshot'
  ): T {
    const cached = this.get<T>(key, version, category);
    if (cached !== undefined) {
      return cached;
    }

    const t0 = performance.now();
    const result = computeFn();
    const computeDuration = performance.now() - t0;

    this.set(key, result, version, ttlMs, computeDuration);
    return result;
  }

  public invalidate(key: string): void {
    if (this.cache.delete(key)) {
      this.evictions++;
    }
  }

  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.evictions++;
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public cleanExpired(): void {
    const now = performance.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        this.evictions++;
      }
    }
  }

  private evictStaleOrOldest(): void {
    // Evict expired first
    this.cleanExpired();
    if (this.cache.size < this.maxEntries) return;

    // Evict least used 10%
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].hits - b[1].hits || a[1].createdAt - b[1].createdAt);
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.evictions++;
    }
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: Math.round(hitRate * 10) / 10,
      entryCount: this.cache.size,
      savedCalculations: this.savedCalculations,
      savedComputeTimeMs: Math.round(this.savedComputeTimeMs * 10) / 10,
      spatialHits: this.spatialHits,
      riskHits: this.riskHits,
      hazardHits: this.hazardHits,
      snapshotHits: this.snapshotHits,
    };
  }

  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.savedCalculations = 0;
    this.savedComputeTimeMs = 0;
    this.spatialHits = 0;
    this.riskHits = 0;
    this.hazardHits = 0;
    this.snapshotHits = 0;
  }
}
