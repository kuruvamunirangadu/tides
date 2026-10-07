import { BeachGIS, MedicalFacilityGIS, LifeguardStationGIS } from '../models/BeachGIS';
import { GeoPoint } from '../models/GeoPoint';
import { CoordinateSystem } from '../CoordinateSystem';

export interface EmergencyDispatchRoute {
  resourceType: 'AMBULANCE' | 'RESCUE_BOAT' | 'DRONE' | 'LIFEGUARD_SQUAD';
  originName: string;
  originLocation: GeoPoint;
  destinationLocation: GeoPoint;
  distanceMeters: number;
  estimatedArrivalSeconds: number;
  waypoints: GeoPoint[];
}

export class EmergencyRouter {
  /**
   * Calculate emergency vehicle route from nearest hospital/ambulance bay to beach incident
   */
  public routeAmbulance(
    beach: BeachGIS,
    incidentLocation: GeoPoint
  ): EmergencyDispatchRoute {
    // Find closest medical facility
    let nearestFacility = beach.infrastructure.medicalFacilities[0];
    let minDistance = Infinity;

    beach.infrastructure.medicalFacilities.forEach((facility) => {
      const dist = CoordinateSystem.haversineDistance(facility.location, incidentLocation);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFacility = facility;
      }
    });

    const distanceMeters = Math.round(minDistance);
    // Average urban ambulance speed ~ 40 km/h = 11 m/s
    const estimatedArrivalSeconds = Math.round(distanceMeters / 11) + 30; // +30s dispatch overhead

    // Generate waypoints
    const waypoints: GeoPoint[] = [
      nearestFacility.location,
      {
        latitude: (nearestFacility.location.latitude + incidentLocation.latitude) / 2,
        longitude: (nearestFacility.location.longitude + incidentLocation.longitude) / 2,
      },
      incidentLocation,
    ];

    return {
      resourceType: 'AMBULANCE',
      originName: nearestFacility.name,
      originLocation: nearestFacility.location,
      destinationLocation: incidentLocation,
      distanceMeters,
      estimatedArrivalSeconds,
      waypoints,
    };
  }

  /**
   * Route lifeguard squad from nearest tower
   */
  public routeLifeguard(
    beach: BeachGIS,
    incidentLocation: GeoPoint
  ): EmergencyDispatchRoute {
    let nearestTower = beach.infrastructure.lifeguardStations[0];
    let minDistance = Infinity;

    beach.infrastructure.lifeguardStations.forEach((tower) => {
      const dist = CoordinateSystem.haversineDistance(tower.location, incidentLocation);
      if (dist < minDistance) {
        minDistance = dist;
        nearestTower = tower;
      }
    });

    const distanceMeters = Math.round(minDistance);
    // Sprint / Surf swim speed ~ 3.5 m/s
    const estimatedArrivalSeconds = Math.max(10, Math.round(distanceMeters / 3.5));

    return {
      resourceType: 'LIFEGUARD_SQUAD',
      originName: nearestTower.name,
      originLocation: nearestTower.location,
      destinationLocation: incidentLocation,
      distanceMeters,
      estimatedArrivalSeconds,
      waypoints: [nearestTower.location, incidentLocation],
    };
  }
}
