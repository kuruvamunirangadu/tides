export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number; // 0.0 - 100.0%
  entryCount: number;
  savedCalculations: number;
  savedComputeTimeMs: number;
  spatialHits: number;
  riskHits: number;
  hazardHits: number;
  snapshotHits: number;
}
