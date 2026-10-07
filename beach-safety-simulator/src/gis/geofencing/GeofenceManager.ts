import { Geofence, GeofenceType, GeofenceRule } from '../models/Geofence';
import { BeachZoneGIS } from '../models/BeachZoneGIS';
import { DEFAULT_GEOFENCE_RULES } from './GeofenceRules';
import { GeoPolygon } from '../models/GeoPolygon';

export class GeofenceManager {
  private geofences: Map<string, Geofence> = new Map();

  /**
   * Initialize static geofences from beach zones
   */
  public initializeFromZones(zones: BeachZoneGIS[], currentTime: number): void {
    this.geofences.clear();

    zones.forEach((zone) => {
      let type: GeofenceType = 'SWIMMING';
      if (zone.type === 'RESTRICTED') type = 'RESTRICTED';
      else if (zone.type === 'HIGH_RISK') type = 'HIGH_RISK';
      else if (zone.type === 'ASSEMBLY') type = 'SAFE_ASSEMBLY';
      else if (zone.type === 'EMERGENCY') type = 'EVACUATION';

      const rules: GeofenceRule[] = DEFAULT_GEOFENCE_RULES[type] || [];

      const geofence: Geofence = {
        id: `GF-${zone.id}`,
        name: `${zone.name} Geofence`,
        type,
        geometry: zone.geometry,
        rules,
        active: zone.active,
        createdTime: currentTime,
        source: 'ZONE_MAP',
        color: zone.color,
      };

      this.geofences.set(geofence.id, geofence);
    });
  }

  /**
   * Add a dynamic AI-predicted hazard geofence
   */
  public addDynamicHazardGeofence(
    id: string,
    name: string,
    geometry: GeoPolygon,
    currentTime: number,
    durationSeconds: number = 900 // default 15 mins
  ): Geofence {
    const geofence: Geofence = {
      id,
      name,
      type: 'DYNAMIC_HAZARD',
      geometry,
      rules: DEFAULT_GEOFENCE_RULES.DYNAMIC_HAZARD,
      active: true,
      createdTime: currentTime,
      expiryTime: currentTime + durationSeconds,
      source: 'AI_FORECAST',
      color: '#f43f5e',
    };

    this.geofences.set(geofence.id, geofence);
    return geofence;
  }

  /**
   * Purge expired dynamic geofences
   */
  public cleanExpiredGeofences(currentTime: number): void {
    for (const [id, gf] of this.geofences.entries()) {
      if (gf.expiryTime && currentTime > gf.expiryTime) {
        this.geofences.delete(id);
      }
    }
  }

  public getAllGeofences(): Geofence[] {
    return Array.from(this.geofences.values());
  }

  public getActiveGeofences(): Geofence[] {
    return Array.from(this.geofences.values()).filter((gf) => gf.active);
  }

  public getGeofenceById(id: string): Geofence | undefined {
    return this.geofences.get(id);
  }

  public setGeofenceStatus(id: string, active: boolean): void {
    const gf = this.geofences.get(id);
    if (gf) gf.active = active;
  }

  public removeGeofence(id: string): boolean {
    return this.geofences.delete(id);
  }
}
