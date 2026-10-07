export interface GISLayerConfig {
  id: string;
  name: string;
  category: 'BASE' | 'SAFETY_ZONES' | 'HAZARDS' | 'ASSETS' | 'INFRASTRUCTURE' | 'AI_PREDICTION';
  visible: boolean;
  color?: string;
  description: string;
}

export const DEFAULT_GIS_LAYERS: GISLayerConfig[] = [
  { id: 'layer-base', name: 'Layer 1 — Satellite / Base Map', category: 'BASE', visible: true, description: 'High-contrast topographic base map' },
  { id: 'layer-boundary', name: 'Layer 2 — Beach Boundary', category: 'BASE', visible: true, color: '#f59e0b', description: 'Administrative coastal cadastral boundary' },
  { id: 'layer-shoreline', name: 'Layer 3 — Shoreline Vector', category: 'BASE', visible: true, color: '#38bdf8', description: 'Mean high-water shoreline vector' },
  { id: 'layer-zones', name: 'Layer 4 — Safety & Swimming Zones', category: 'SAFETY_ZONES', visible: true, color: '#06b6d4', description: 'Patrolled swimming & public leisure zones' },
  { id: 'layer-restricted', name: 'Layer 5 — Geofenced Restricted Zones', category: 'SAFETY_ZONES', visible: true, color: '#ef4444', description: 'Rocky shelf & underwater hazard geofences' },
  { id: 'layer-hazards', name: 'Layer 6 — Spatial Hazards & Rips', category: 'HAZARDS', visible: true, color: '#dc2626', description: 'Active rip current vectors & shorebreak dumping' },
  { id: 'layer-risk-heat', name: 'Layer 7 — 4-Pillar Risk Heatmap', category: 'HAZARDS', visible: true, color: '#f97316', description: 'Spatial interpolation of H x E x V x R risk scores' },
  { id: 'layer-visitors', name: 'Layer 8 — Live Visitor GPS Dots', category: 'ASSETS', visible: true, color: '#22c55e', description: 'Geolocated visitors & kinematic states' },
  { id: 'layer-lifeguards', name: 'Layer 9 — Lifeguard Towers & Fleet', category: 'ASSETS', visible: true, color: '#3b82f6', description: 'Station towers, jet skis, and rescue water craft' },
  { id: 'layer-cctv', name: 'Layer 10 — CCTV Cameras & FOV Cones', category: 'ASSETS', visible: true, color: '#06b6d4', description: 'Optical surveillance coverage polygons' },
  { id: 'layer-emergency-points', name: 'Layer 11 — Emergency Points & AEDs', category: 'INFRASTRUCTURE', visible: true, color: '#eab308', description: 'First aid posts, AED pillars, drone pads' },
  { id: 'layer-access-roads', name: 'Layer 12 — Access Points & Roads', category: 'INFRASTRUCTURE', visible: true, color: '#94a3b8', description: 'Promenade pedestrian gates & ambulance ramps' },
  { id: 'layer-evac-routes', name: 'Layer 13 — Evacuation & Assembly Points', category: 'INFRASTRUCTURE', visible: true, color: '#10b981', description: 'Dynamic egress network & muster zones' },
  { id: 'layer-prediction', name: 'Layer 14 — AI Predictive Geofences', category: 'AI_PREDICTION', visible: true, color: '#a855f7', description: 'Forward projected +15m/+30m hazard contours' },
];

export class LayerManager {
  private layers: Map<string, GISLayerConfig> = new Map();

  constructor(initialLayers: GISLayerConfig[] = DEFAULT_GIS_LAYERS) {
    initialLayers.forEach((l) => {
      this.layers.set(l.id, { ...l });
    });
  }

  public getAllLayers(): GISLayerConfig[] {
    return Array.from(this.layers.values());
  }

  public isLayerVisible(layerId: string): boolean {
    return this.layers.get(layerId)?.visible ?? false;
  }

  public toggleLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      return layer.visible;
    }
    return false;
  }

  public setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.visible = visible;
    }
  }

  public enableAll(): void {
    this.layers.forEach((l) => (l.visible = true));
  }

  public disableAll(): void {
    this.layers.forEach((l) => (l.visible = false));
  }
}
