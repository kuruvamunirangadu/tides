/**
 * src/regional/components/RegionalCommandCenter.tsx
 * TIDES Milestone 10: Multi-Beach Command Center & Regional Coastal Monitoring.
 * Unified state-level operations center for coastal safety across Andhra Pradesh.
 */

import React, { useState, useMemo } from 'react';
import { BeachRegistry } from '../BeachRegistry';
import { RegionalRiskAggregator } from '../RegionalRiskAggregator';
import { RegionalIncidentAdapter } from '../RegionalIncidentAdapter';
import { RegionalResourceRegistry } from '../RegionalResourceRegistry';
import { RegionalMapSchematic } from './RegionalMapSchematic';
import { RegionalIncidentFeed } from './RegionalIncidentFeed';
import { RegionalRiskComparisonTable } from './RegionalRiskComparisonTable';
import { RegionalFleetOverview } from './RegionalFleetOverview';
import { RegionalCoordinationPanel } from './RegionalCoordinationPanel';
import { RegionalAnalyticsPanel } from './RegionalAnalyticsPanel';
import { BeachDetailModal } from './BeachDetailModal';
import { Phase5CoordinationService } from '../Phase5CoordinationService';
import { IntelligentSurveillanceService } from '../../drones/coverage/IntelligentSurveillanceService';
import {
  ShieldAlert,
  Globe,
  Radio,
  Ship,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface RegionalCommandCenterProps {
  onLaunchRushikondaSimulator?: () => void;
}

export const RegionalCommandCenter: React.FC<RegionalCommandCenterProps> = ({
  onLaunchRushikondaSimulator,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'MAP_OVERVIEW' | 'RISK_TABLE' | 'INCIDENTS' | 'FLEET' | 'COORDINATION' | 'ANALYTICS'>('MAP_OVERVIEW');
  const [selectedBeachId, setSelectedBeachId] = useState<string>('RUSHIKONDA');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const registry = BeachRegistry.getInstance();
  const riskAggregator = RegionalRiskAggregator.getInstance();
  const incidentAdapter = RegionalIncidentAdapter.getInstance();
  const resourceRegistry = RegionalResourceRegistry.getInstance();
  const phase5Service = new Phase5CoordinationService(registry, incidentAdapter, resourceRegistry);
  const surveillanceService = new IntelligentSurveillanceService();

  const kpis = registry.getSummaryKPIs();
  const beaches = useMemo(() => {
    return registry.getBeaches({
      status: statusFilter,
      district: districtFilter,
      search: searchQuery,
    });
  }, [statusFilter, districtFilter, searchQuery]);

  const observations = riskAggregator.getAllObservations();
  const incidents = incidentAdapter.getAllIncidents();
  const resources = resourceRegistry.getAllResources();

  const selectedBeach = registry.getBeach(selectedBeachId) || registry.getBeach('RUSHIKONDA')!;
  const selectedObservation = riskAggregator.getObservation(selectedBeachId);
  const operationalSnapshot = phase5Service.getSnapshot();
  const surveillanceSnapshot = surveillanceService.getSnapshot();

  const handleSelectBeach = (beachId: string) => {
    setSelectedBeachId(beachId);
    setIsDetailModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CAUTION':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'RESTRICTED':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'EVACUATION':
        return <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />;
      case 'OFFLINE':
        return <Radio className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Regional Operational Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Configured Sites</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">{kpis.totalConfiguredSites}</div>
          <div className="text-[9px] text-cyan-400 font-bold">1 Connected • 7 Demo</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Fresh Telemetry</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-300">{kpis.freshDataSitesCount}</div>
          <div className="text-[9px] text-slate-500">Live &lt; 60s ping</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Stale / Missing</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300">{kpis.staleOrMissingSitesCount}</div>
          <div className="text-[9px] text-slate-500">Uninstrumented/Demo</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Active Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-300">{kpis.activeIncidentsCount}</div>
          <div className="text-[9px] text-rose-400/80 font-bold">Regional Queue</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Available Assets</span>
            <Ship className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-300">
            {kpis.availableFleetResources} / {kpis.totalFleetResources}
          </div>
          <div className="text-[9px] text-emerald-400 font-bold">Fleet Standby</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Assigned Assets</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300">{kpis.assignedFleetResources}</div>
          <div className="text-[9px] text-slate-500">Active Missions</div>
        </div>
      </div>

      <div className="bg-slate-950/90 border border-cyan-500/20 rounded-2xl p-3 grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono">
        <div>
          <div className="text-[10px] uppercase font-bold text-cyan-300">Phase 5 Operations</div>
          <div className="mt-1 text-xs text-slate-300">{operationalSnapshot.prioritizedIncidents.length} active incidents · {operationalSnapshot.availableResources} eligible resources</div>
          <div className="text-[9px] text-slate-500">Recommendations are advisory and do not dispatch assets.</div>
        </div>
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          {operationalSnapshot.prioritizedIncidents.slice(0, 3).map((entry) => (
            <div key={entry.incident.incidentId} className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-[10px]">
              <span className="text-rose-300 font-bold">{entry.incident.severity}</span>{' '}
              <span className="text-white">{entry.incident.incidentId}</span>{' '}
              <span className="text-slate-500">{entry.incident.siteId}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-950/90 border border-emerald-500/20 rounded-2xl p-3 grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono">
        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-300">Phase 6 Surveillance</div>
          <div className="mt-1 text-xs text-slate-300">{surveillanceSnapshot.activeCameras} active cameras · {surveillanceSnapshot.gaps.length} coverage gaps</div>
          <div className="text-[9px] text-slate-500">{surveillanceSnapshot.simulatedDataNotice}</div>
        </div>
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          {surveillanceSnapshot.gaps.slice(0, 3).map((gap) => (
            <div key={gap.gapId} className="px-2.5 py-1.5 rounded-xl border border-amber-500/20 bg-slate-900/80 text-[10px]">
              <span className="text-amber-300 font-bold">{gap.severity}</span>{' '}
              <span className="text-white">{gap.zoneName}</span>{' '}
              <span className="text-slate-500">{gap.gapType}</span>
            </div>
          ))}
          <div className="px-2.5 py-1.5 rounded-xl border border-emerald-500/20 bg-slate-900/80 text-[10px] text-emerald-300">
            {surveillanceSnapshot.patrolPlan.allocations.length} patrol recommendations
          </div>
        </div>
      </div>

      {/* 2. Command Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'MAP_OVERVIEW', label: 'AP Coastal Map & Sites' },
              { id: 'RISK_TABLE', label: 'Oceanographic Risk Table' },
              { id: 'INCIDENTS', label: 'Regional Incidents' },
              { id: 'FLEET', label: 'Cross-Beach Fleet' },
              { id: 'COORDINATION', label: 'Mutual Aid Coordination' },
              { id: 'ANALYTICS', label: 'Regional Analytics & Sync' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectBeach('RUSHIKONDA')}
            className="px-3 py-1 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Rushikonda Digital Twin (Active)</span>
          </button>
        </div>
      </div>

      {/* 3. Main Panel Body */}
      {activeSubTab === 'MAP_OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column (7 cols): AP Coastline Map Schematic */}
          <div className="lg:col-span-7 space-y-4">
            <RegionalMapSchematic
              beaches={beaches}
              selectedBeachId={selectedBeachId}
              onSelectBeach={handleSelectBeach}
            />
          </div>

          {/* Right Column (5 cols): Searchable Beach Roster List */}
          <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Monitored Coastal Sectors</span>
              </h3>
              <span className="text-[10px] text-slate-400">{beaches.length} Sites Listed</span>
            </div>

            {/* Filter Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search beaches or districts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Operational Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CAUTION">CAUTION</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="EVACUATION">EVACUATION</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>

                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All AP Districts</option>
                  <option value="Visakhapatnam">Visakhapatnam</option>
                  <option value="Srikakulam">Srikakulam</option>
                  <option value="Krishna">Krishna</option>
                  <option value="Bapatla">Bapatla</option>
                  <option value="SPSR Nellore">SPSR Nellore</option>
                </select>
              </div>
            </div>

            {/* Beach List Items */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {beaches.map((b) => {
                const isSelected = b.beachId === selectedBeachId;
                const isRushikonda = b.beachId === 'RUSHIKONDA';

                return (
                  <div
                    key={b.beachId}
                    onClick={() => handleSelectBeach(b.beachId)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-white'
                        : isRushikonda
                        ? 'bg-slate-900 border-cyan-800/80 hover:border-cyan-600 text-slate-200'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(b.status)}
                        <span className="font-bold text-[11px] text-white">
                          {b.beachId === 'RUSHIKONDA' ? '★ ' + b.name : b.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 pl-5">
                        {b.district} • {b.coastSector}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold border ${
                          b.provenance === 'SIMULATED'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {b.provenance}
                      </span>
                      <div className="text-[9px] text-slate-500">
                        {b.activeIncidentsCount > 0 ? (
                          <span className="text-rose-400 font-bold">{b.activeIncidentsCount} Incidents</span>
                        ) : (
                          '0 Incidents'
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RISK COMPARISON TABLE */}
      {activeSubTab === 'RISK_TABLE' && (
        <RegionalRiskComparisonTable
          observations={observations}
          onSelectSite={handleSelectBeach}
        />
      )}

      {/* SUB-TAB 3: REGIONAL INCIDENTS */}
      {activeSubTab === 'INCIDENTS' && (
        <RegionalIncidentFeed
          incidents={incidents}
          onSelectSite={handleSelectBeach}
        />
      )}

      {/* SUB-TAB 4: FLEET-WIDE OVERVIEW */}
      {activeSubTab === 'FLEET' && (
        <RegionalFleetOverview
          resources={resources}
          onEvaluateTransfer={(resId, targetId) =>
            resourceRegistry.evaluateCrossBeachTransfer(resId, targetId)
          }
        />
      )}

      {/* SUB-TAB 5: MUTUAL AID COORDINATION */}
      {activeSubTab === 'COORDINATION' && (
        <RegionalCoordinationPanel />
      )}

      {/* SUB-TAB 6: REGIONAL ANALYTICS & SYNC */}
      {activeSubTab === 'ANALYTICS' && (
        <RegionalAnalyticsPanel />
      )}

      {/* Selected Beach Detail Modal / Drawer */}
      <BeachDetailModal
        beach={selectedBeach}
        riskObservation={selectedObservation}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onLaunchSimulator={onLaunchRushikondaSimulator}
      />
    </div>
  );
};

