export interface GeoPolygon {
  type: 'Polygon';
  // coordinates format: array of rings, each ring is array of [longitude, latitude] pairs
  coordinates: number[][][];
}

export interface GeoLine {
  type: 'LineString';
  // coordinates format: array of [longitude, latitude] pairs
  coordinates: number[][];
}

export interface GeoFeature<G = GeoPolygon | GeoLine, P = Record<string, any>> {
  type: 'Feature';
  id?: string;
  properties: P;
  geometry: G;
}

export interface GeoFeatureCollection<G = GeoPolygon | GeoLine, P = Record<string, any>> {
  type: 'FeatureCollection';
  features: GeoFeature<G, P>[];
}
