export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
}

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoCoordinatePair {
  lat: number;
  lng: number;
}
