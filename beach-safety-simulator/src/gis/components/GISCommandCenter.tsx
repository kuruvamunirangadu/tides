import React, { useState } from 'react';
import { GISManager } from '../GISManager';
import { GISMap } from './GISMap';
import { LayerControl } from './LayerControl';
import { BeachSelector } from './BeachSelector';
import { GeofencePanel } from './GeofencePanel';
import { RoutePanel } from './RoutePanel';
import { SimulationState } from '../../models/Beach';
import { GeofenceBreachEvent } from '../models/Geofence';

interface GISCommandCenterProps {
  gisManager: GISManager;
  simulationState: SimulationState;
  onSelectBeach?: (beachId: string) => void;
}

export const GISCommandCenter: React.FC<GISCommandCenterProps> = ({
  gisManager,
  simulationState,
  onSelectBeach,
}) => {
  const [activeBeach, setActiveBeach] = useState(gisManager.getActiveBeach());
  const [recentBreaches, setRecentBreaches] = useState<GeofenceBreachEvent[]>(
    gisManager.getGeofenceEngine().getRecentEvents(20)
  );
  const [, setLayerUpdateCounter] = useState(0);

  const handleSelectBeach = (beachId: string) => {
    const newBeach = gisManager.switchBeach(beachId, simulationState.time);
    if (newBeach) {
      setActiveBeach(newBeach);
      setRecentBreaches([]);
      if (onSelectBeach) onSelectBeach(beachId);
    }
  };

  const handleLayerToggle = (layerId: string) => {
    gisManager.getLayerManager().toggleLayer(layerId);
    setLayerUpdateCounter((prev) => prev + 1);
  };

  const handleEnableAllLayers = () => {
    gisManager.getLayerManager().enableAll();
    setLayerUpdateCounter((prev) => prev + 1);
  };

  const handleDisableAllLayers = () => {
    gisManager.getLayerManager().disableAll();
    setLayerUpdateCounter((prev) => prev + 1);
  };

  const handleAcknowledgeBreach = (eventId: string) => {
    gisManager.getGeofenceEngine().acknowledgeEvent(eventId);
    setRecentBreaches([...gisManager.getGeofenceEngine().getRecentEvents(20)]);
  };

  const handleToggleRouteBlockage = (routeId: string) => {
    gisManager.getEvacuationRouter().toggleRouteBlockage(activeBeach, routeId);
    setLayerUpdateCounter((prev) => prev + 1);
  };

  const handleCalculateAmbulanceRoute = (lat: number, lng: number) => {
    return gisManager.planAmbulanceRoute(lat, lng);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Geospatial GIS & Geofencing Command Center
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                WGS84 Real-World Coastal Geometries
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Spatial multi-layer cartography, ray-casting geofence breach engine, and dynamic emergency evacuation routing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Active Coastal Perimeter: <strong className="text-cyan-400">{activeBeach.name}</strong>
          </div>
        </div>
      </div>

      {/* Main Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 cols): Beach Selector + Vector GIS Map + Route Panel */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <BeachSelector
            beaches={gisManager.getBeachManager().getAllBeaches()}
            selectedBeach={activeBeach}
            onSelectBeach={handleSelectBeach}
          />

          <GISMap
            beach={activeBeach}
            layerManager={gisManager.getLayerManager()}
            geofences={gisManager.getGeofenceManager().getAllGeofences()}
            visitors={simulationState.visitors}
            hazards={simulationState.hazards}
            riskOverview={simulationState.riskOverview}
            predictionState={simulationState.predictionState}
          />

          <RoutePanel
            beach={activeBeach}
            onToggleBlockage={handleToggleRouteBlockage}
            onCalculateAmbulanceRoute={handleCalculateAmbulanceRoute}
          />
        </div>

        {/* Right Column (4 cols): Layer Control + Geofence Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <LayerControl
            layerManager={gisManager.getLayerManager()}
            onLayerToggle={handleLayerToggle}
            onEnableAll={handleEnableAllLayers}
            onDisableAll={handleDisableAllLayers}
          />

          <GeofencePanel
            geofences={gisManager.getGeofenceManager().getAllGeofences()}
            recentBreaches={recentBreaches}
            onAcknowledge={handleAcknowledgeBreach}
          />
        </div>
      </div>
    </div>
  );
};
