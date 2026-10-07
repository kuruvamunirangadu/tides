import React from 'react';
import { LayerManager, GISLayerConfig } from '../layers/LayerManager';

interface LayerControlProps {
  layerManager: LayerManager;
  onLayerToggle: (layerId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layerManager,
  onLayerToggle,
  onEnableAll,
  onDisableAll,
}) => {
  const layers = layerManager.getAllLayers();

  const categories: Array<{ id: GISLayerConfig['category']; title: string }> = [
    { id: 'BASE', title: 'Base Map & Boundaries' },
    { id: 'SAFETY_ZONES', title: 'Zones & Geofences' },
    { id: 'HAZARDS', title: 'Hazards & Risk Heatmap' },
    { id: 'ASSETS', title: 'Visitors & Fleet Assets' },
    { id: 'INFRASTRUCTURE', title: 'Access & Evacuation' },
    { id: 'AI_PREDICTION', title: 'AI Predictive Contours' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 text-xs shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-xs">
          <span>🗺️</span> GIS Layer Control (14 Layers)
        </h3>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={onEnableAll}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors"
          >
            All On
          </button>
          <button
            onClick={onDisableAll}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
          >
            All Off
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {categories.map((cat) => {
          const catLayers = layers.filter((l) => l.category === cat.id);
          if (catLayers.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                {cat.title}
              </span>
              <div className="space-y-1">
                {catLayers.map((layer) => (
                  <label
                    key={layer.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => onLayerToggle(layer.id)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium">{layer.name}</span>
                    </div>
                    {layer.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/40 flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
