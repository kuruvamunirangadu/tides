export class CacheKeys {
  public static spatialNearbyHazards(visitorId: string, spatialVersion: number): string {
    return `spatial:hazards:${visitorId}:v${spatialVersion}`;
  }

  public static spatialGridCell(gridX: number, gridY: number, spatialVersion: number): string {
    return `spatial:grid:${gridX}_${gridY}:v${spatialVersion}`;
  }

  public static zoneContainment(visitorId: string, zoneVersion: number): string {
    return `zone:contain:${visitorId}:v${zoneVersion}`;
  }

  public static hazardDetection(envVersion: number, visitorCount: number): string {
    return `hazards:detect:env_${envVersion}:pop_${visitorCount}`;
  }

  public static zoneRisk(zoneId: string, envVersion: number, exposureVersion: number, resourceVersion: number): string {
    return `risk:zone:${zoneId}:e${envVersion}:x${exposureVersion}:r${resourceVersion}`;
  }

  public static overallRisk(envVersion: number, hazardVersion: number, exposureVersion: number): string {
    return `risk:overall:e${envVersion}:h${hazardVersion}:x${exposureVersion}`;
  }

  public static exposureIndex(zoneId: string, visitorVersion: number): string {
    return `exposure:zone:${zoneId}:v${visitorVersion}`;
  }

  public static renderSnapshot(snapshotVersion: number): string {
    return `render:snapshot:v${snapshotVersion}`;
  }

  public static crowdStats(visitorVersion: number): string {
    return `stats:crowd:v${visitorVersion}`;
  }
}
