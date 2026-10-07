import { BeachManager } from './beaches/BeachManager';
import { GeofenceManager } from './geofencing/GeofenceManager';
import { GeofenceEngine, VisitorGeoState } from './geofencing/GeofenceEngine';
import { EvacuationRouter, EvacuationPlan } from './routing/EvacuationRouter';
import { EmergencyRouter, EmergencyDispatchRoute } from './routing/EmergencyRouter';
import { LayerManager } from './layers/LayerManager';
import { BeachGIS } from './models/BeachGIS';
import { CoordinateSystem } from './CoordinateSystem';
import { GeofenceBreachEvent } from './models/Geofence';
import { Visitor } from '../models/Visitor';
import { SimulationState } from '../models/Beach';

export class GISManager {
  private beachManager: BeachManager;
  private geofenceManager: GeofenceManager;
  private geofenceEngine: GeofenceEngine;
  private evacuationRouter: EvacuationRouter;
  private emergencyRouter: EmergencyRouter;
  private layerManager: LayerManager;

  constructor() {
    this.beachManager = new BeachManager();
    this.geofenceManager = new GeofenceManager();
    this.geofenceEngine = new GeofenceEngine(this.geofenceManager);
    this.evacuationRouter = new EvacuationRouter();
    this.emergencyRouter = new EmergencyRouter();
    this.layerManager = new LayerManager();

    // Initialize geofences for active beach
    this.initializeActiveBeachGeofences(0);
  }

  public initializeActiveBeachGeofences(currentTime: number): void {
    const activeBeach = this.beachManager.getSelectedBeach();
    this.geofenceManager.initializeFromZones(activeBeach.zones, currentTime);
  }

  public getBeachManager(): BeachManager {
    return this.beachManager;
  }

  public getGeofenceManager(): GeofenceManager {
    return this.geofenceManager;
  }

  public getGeofenceEngine(): GeofenceEngine {
    return this.geofenceEngine;
  }

  public getEvacuationRouter(): EvacuationRouter {
    return this.evacuationRouter;
  }

  public getEmergencyRouter(): EmergencyRouter {
    return this.emergencyRouter;
  }

  public getLayerManager(): LayerManager {
    return this.layerManager;
  }

  public getActiveBeach(): BeachGIS {
    return this.beachManager.getSelectedBeach();
  }

  public switchBeach(beachId: string, currentTime: number): BeachGIS | undefined {
    const beach = this.beachManager.selectBeach(beachId);
    if (beach) {
      this.geofenceEngine.reset();
      this.geofenceManager.initializeFromZones(beach.zones, currentTime);
    }
    return beach;
  }

  /**
   * Tick GIS system with current simulation visitors & AI forecasts
   */
  public tick(
    simState: SimulationState,
    currentTime: number,
    timeDisplay: string
  ): GeofenceBreachEvent[] {
    const activeBeach = this.beachManager.getSelectedBeach();

    // 1. Convert simulation local visitor (x, y) coordinates to real WGS84 GeoPoints
    const geoVisitors: VisitorGeoState[] = simState.visitors.map((v) => {
      // Map canvas 0..width, 0..height relative to center of beach
      const localX = v.position.x - simState.beach.width / 2;
      const localY = v.position.y - simState.beach.height / 2;
      const location = CoordinateSystem.localToGeo({ x: localX, y: localY }, activeBeach.center);
      return {
        id: v.id,
        location,
      };
    });

    // 2. Evaluate Geofence Triggers
    const events = this.geofenceEngine.evaluate(geoVisitors, currentTime, timeDisplay);

    return events;
  }

  /**
   * Plan evacuation from current zone
   */
  public planEvacuationForZone(zoneId: string): EvacuationPlan | null {
    return this.evacuationRouter.planEvacuation(this.getActiveBeach(), zoneId);
  }

  /**
   * Plan emergency ambulance route to coordinates
   */
  public planAmbulanceRoute(lat: number, lng: number): EmergencyDispatchRoute {
    return this.emergencyRouter.routeAmbulance(this.getActiveBeach(), { latitude: lat, longitude: lng });
  }
}
