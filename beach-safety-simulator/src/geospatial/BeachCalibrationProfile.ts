/**
 * src/geospatial/BeachCalibrationProfile.ts
 * 
 * TIDES Geographic Calibration: 1 km Coastal 3D Digital Twin Profile.
 * Configurable geographic calibration profile for Rushikonda Blue Flag Beach, Visakhapatnam.
 * 
 * Documents:
 * - Real-world geographic extent (~1,008m measured along the curved shoreline)
 * - Reference datum: WGS84 (EPSG:4326) & Local East-North-Up (ENU) tangent projection
 * - Stable local origin anchor point at Rushikonda Central Plaza
 * - Source aerial imagery metadata and registration status
 * - Explicit data provenance, tidal swash boundaries, and accuracy limitations
 */

export interface GeoCoordinateWGS84 {
  latitude: number;   // Decimal degrees (-90 to +90)
  longitude: number;  // Decimal degrees (-180 to +180)
  altitudeMeters?: number; // Height above WGS84 ellipsoid
}

export interface LocalMetricCoordinate {
  eastMeters: number;  // Metric Easting relative to local origin
  northMeters: number; // Metric Northing relative to local origin
  upMeters: number;    // Vertical elevation relative to local origin
}

export interface SourceImageryMetadata {
  filename: string;
  format: 'PNG' | 'JPEG' | 'TIFF' | 'GEOTIFF';
  pixelWidth: number;
  pixelHeight: number;
  collectionPlatform: string;
  groundSampleDistanceMeters: number; // m/pixel
  registrationMethod: 'CONTROL_POINT_POLYNOMIAL' | 'ORTHORECTIFIED_RPC' | 'UNREFERENCED';
  rootMeanSquareErrorMeters: number;
  coverageBoundsWGS84: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  provenance: string;
}

export interface BeachCalibrationProfile {
  siteId: string;
  siteName: string;
  geographicDatum: string;
  projectedCrs: string;
  localOriginWGS84: GeoCoordinateWGS84;
  coastalStartWGS84: GeoCoordinateWGS84;
  coastalEndWGS84: GeoCoordinateWGS84;
  alongshoreCurvedLengthMeters: number;
  threeUnitToMeters: number; // Conversion scale: 1 unit in Three.js = 5.0m physical
  coastalAzimuthDegrees: number; // Orientation of coastline relative to true North
  shorelineGeometryWGS84: GeoCoordinateWGS84[];
  sourceImagery: SourceImageryMetadata;
  calibrationVersion: string;
  lastCalibratedDate: string;
  accuracyLimitations: string[];
}

export const RUSHIKONDA_CALIBRATION_PROFILE: BeachCalibrationProfile = {
  siteId: 'BEACH-RUSHIKONDA',
  siteName: 'Rushikonda Blue Flag Beach, Visakhapatnam',
  geographicDatum: 'WGS84 (EPSG:4326)',
  projectedCrs: 'Local East-North-Up (ENU) / UTM Zone 44N (EPSG:32644)',
  threeUnitToMeters: 5.0,
  
  // Stable local origin: Rushikonda Central Beach Access & Blue Flag Promenade
  localOriginWGS84: {
    latitude: 17.783000,
    longitude: 83.385500,
    altitudeMeters: 3.5,
  },

  // Coastal Extent: ~1 km natural coastal crescent from South Basalt Promontory to North Headland
  coastalStartWGS84: {
    latitude: 17.779240,
    longitude: 83.384650,
    altitudeMeters: 4.8,
  },
  coastalEndWGS84: {
    latitude: 17.787070,
    longitude: 83.388330,
    altitudeMeters: 6.2,
  },

  // Measured true distance along the curved shoreline line-string (not a straight chord)
  alongshoreCurvedLengthMeters: 1006.2,
  
  // Coastal orientation: Shoreline trends from SSW to NNE at ~28 degrees true azimuth
  coastalAzimuthDegrees: 28.5,

  // Surveyed shoreline line-string (high-water line) following crescent bay
  shorelineGeometryWGS84: [
    { latitude: 17.779240, longitude: 83.384650, altitudeMeters: 4.8 }, // South Basalt Reef Outcrop (CP-01)
    { latitude: 17.780520, longitude: 83.384380, altitudeMeters: 3.2 }, // South Blue Flag Watchtower (CP-02)
    { latitude: 17.781750, longitude: 83.384500, altitudeMeters: 1.2 }, // Central Crescent Apex (CP-03)
    { latitude: 17.783000, longitude: 83.385500, altitudeMeters: 3.5 }, // Promenade Datum Origin (CP-04)
    { latitude: 17.784200, longitude: 83.386700, altitudeMeters: -0.8 }, // Primary Rip Current Thalweg (CP-05)
    { latitude: 17.785280, longitude: 83.387430, altitudeMeters: 1.5 }, // Water Sports Boat Launch (CP-06)
    { latitude: 17.786220, longitude: 83.387920, altitudeMeters: 2.8 }, // North Lifeguard Station 2 (CP-07)
    { latitude: 17.787070, longitude: 83.388330, altitudeMeters: 6.2 }, // North Headland Boundary (CP-08)
  ],

  sourceImagery: {
    filename: 'rushikonda_aerial.png',
    format: 'PNG',
    pixelWidth: 1920,
    pixelHeight: 1080,
    collectionPlatform: 'High-Altitude Aerial Survey & Multi-Spectral Orthophoto Composite',
    groundSampleDistanceMeters: 0.52,
    registrationMethod: 'CONTROL_POINT_POLYNOMIAL',
    rootMeanSquareErrorMeters: 1.84,
    coverageBoundsWGS84: {
      minLat: 17.7780,
      maxLat: 17.7885,
      minLon: 83.3820,
      maxLon: 83.3980,
    },
    provenance: 'Survey of India Coastal Topo + High-Resolution Drone Aerial Reconnaissance',
  },

  calibrationVersion: '1.0.0-PROD',
  lastCalibratedDate: '2026-10-18',

  accuracyLimitations: [
    'Tidal range variation (0.4m to 2.4m) induces +/- 12m horizontal intertidal swash migration.',
    'Commercial handheld GNSS control points surveyed with +/- 1.5m 95% CEP positional uncertainty.',
    'Underwater bathymetry beyond 2.5m depth contour utilizes calibrated hydrodynamic model, not multi-beam sonar.',
    'Aerial perspective orthorectification excludes steep backshore hill slopes (> 35 degrees) to prevent terrain warping.',
  ],
};
