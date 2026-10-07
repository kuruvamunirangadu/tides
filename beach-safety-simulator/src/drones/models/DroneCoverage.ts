import { GeoPolygon } from '../../gis/models/GeoPolygon';

export interface DroneCoverage {
  droneId: string;
  altitude: number;
  radiusMeters: number;
  canvasCoverage: {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    polygonPoints: Array<{ x: number; y: number }>;
  };
  geoPolygon?: GeoPolygon;
  confidence: number;
  timestamp: number;
}
