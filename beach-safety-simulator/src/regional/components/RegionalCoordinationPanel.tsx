/**
 * src/regional/components/RegionalCoordinationPanel.tsx
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Interactive cross-site assistance and mutual-aid coordination interface.
 * Features:
 * - Request creation with automated transit time and range feasibility check.
 * - Multi-stage approval lifecycle: REQUESTED -> ACKNOWLEDGED -> ACCEPTED / DECLINED -> COMPLETED.
 * - Strict Non-Negotiable Principle: Mutual aid records operational agreements only;
 *   never automatically dispatches physical assets without local operator authorization.
 */

import React, { useState } from 'react';
import { RegionalCoordinationManager } from '../RegionalCoordinationManager';
import { BeachRegistry } from '../BeachRegistry';
import {
  CrossSiteAssistanceRequest,
  AssistanceResourceType,
  AssistanceUrgency,
  AssistanceRequestStatus,
} from '../types';
import {
  Handshake,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plane,
  Ship,
  LifeBuoy,
  Shield,
  ArrowRight,
  Info,
  Check,
  X,
} from 'lucide-react';

export const RegionalCoordinationPanel: React.FC = () => {
  const coordMgr = RegionalCoordinationManager.getInstance();
  const beachReg = BeachRegistry.getInstance();

  const [requests, setRequests] = useState<CrossSiteAssistanceRequest[]>(coordMgr.getRequests());
  const [selectedReqSite, setSelectedReqSite] = useState<string>('BHEEMILI');
  const [selectedRecSite, setSelectedRecSite] = useState<string>('RUSHIKONDA');
  const [selectedResourceType, setSelectedResourceType] = useState<AssistanceResourceType>('SURVEILLANCE_DRONE');
  const [selectedUrgency, setSelectedUrgency] = useState<AssistanceUrgency>('URGENT');
  const [incidentId, setIncidentId] = useState<string>('INC-BHM-01');
  const [rationale, setRationale] = useState<string>('Local response craft engaged; request UAV thermal sweep over northern rocky headland.');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const beaches = beachReg.getBeaches();

  // Transit estimation
  const transit = coordMgr.evaluateTransit(selectedRecSite, selectedReqSite, selectedResourceType);

  const refreshList = () => {
    setRequests(coordMgr.getRequests(statusFilter !== 'ALL' ? { status: statusFilter as AssistanceRequestStatus } : undefined));
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = coordMgr.createAssistanceRequest({
      requestingSiteId: selectedReqSite,
      receivingSiteId: selectedRecSite,
      incidentId,
      resourceType: selectedResourceType,
      urgency: selectedUrgency,
      rationale,
      operatorId: 'OP-REGIONAL-HUB',
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to submit assistance request.');
    } else {
      refreshList();
    }
  };

  const handleAcknowledge = (requestId: string) => {
    coordMgr.acknowledgeRequest(requestId, 'OP-LOCAL-RECEIVER', 'Acknowledged by local station lead.');
    refreshList();
  };

  const handleAccept = (requestId: string) => {
    coordMgr.acceptRequest(requestId, 'OP-LOCAL-RECEIVER', 'Mutual aid approved. Local crew preparing launch.');
    refreshList();
  };

  const handleDecline = (requestId: string) => {
    coordMgr.declineRequest(requestId, 'OP-LOCAL-RECEIVER', 'Declined: Resource presently deployed to active inshore rescue.');
    refreshList();
  };

  const handleComplete = (requestId: string) => {
    coordMgr.completeRequest(requestId, 'OP-REGIONAL-HUB', 'Mutual aid mission concluded.');
    refreshList();
  };

  const getStatusBadge = (status: AssistanceRequestStatus) => {
    switch (status) {
      case 'REQUESTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">REQUESTED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">ACKNOWLEDGED</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">ACCEPTED</span>;
      case 'DECLINED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">DECLINED</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700">CANCELLED</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Policy Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-bold">Cross-Site Mutual Aid Coordination Policy</strong>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Mutual aid requests record operational agreements and evaluate transit feasibility. Physical asset mobilization requires explicit confirmation by the supplying beach operator. Local site autonomy is strictly preserved.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left (5 cols): Create Request Form */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Handshake className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Request Inter-Beach Assistance</h4>
          </div>

          <form onSubmit={handleCreateRequest} className="space-y-3 text-[11px]">
            {formError && (
              <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px]">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Requesting Beach (Origin of Need)</label>
                <select
                  value={selectedReqSite}
                  onChange={(e) => setSelectedReqSite(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  {beaches.map((b) => (
                    <option key={b.beachId} value={b.beachId}>{b.name.split(',')[0]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Supplying Beach (Assisting Site)</label>
                <select
                  value={selectedRecSite}
                  onChange={(e) => setSelectedRecSite(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  {beaches.map((b) => (
                    <option key={b.beachId} value={b.beachId}>{b.name.split(',')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Resource Type</label>
                <select
                  value={selectedResourceType}
                  onChange={(e) => setSelectedResourceType(e.target.value as AssistanceResourceType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SURVEILLANCE_DRONE">Surveillance UAV (Thermal/Cam)</option>
                  <option value="RESCUE_BOAT">Fast Response Rescue Boat</option>
                  <option value="PARAMEDIC_TEAM">Mobile Paramedic Unit</option>
                  <option value="LIFEGUARD">Lifeguard Squad</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Urgency Level</label>
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value as AssistanceUrgency)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="URGENT">URGENT (Imminent Risk)</option>
                  <option value="HIGH">HIGH (Escalating Incident)</option>
                  <option value="ROUTINE">ROUTINE (Precautionary Staging)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Incident ID Reference</label>
              <input
                type="text"
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value)}
                placeholder="e.g. INC-BHM-01"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Operational Rationale</label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={2}
                placeholder="Reason assistance is requested..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Live Transit & Feasibility Assessment */}
            <div className={`p-2.5 rounded-xl border text-[10px] space-y-1 ${
              transit.feasible
                ? 'bg-slate-900 border-slate-700 text-slate-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>Inter-Site Distance: {transit.distanceKm} km</span>
                <span>Est. Transit: ~{transit.estimatedTransitTimeMinutes} min</span>
              </div>
              <p className="text-[9px] text-slate-400">{transit.transitAdvisory}</p>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Mutual Aid Request</span>
            </button>
          </form>
        </div>

        {/* Right (7 cols): Requests Feed & Workflow */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active & Historical Assistance Requests</h4>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setRequests(coordMgr.getRequests(e.target.value !== 'ALL' ? { status: e.target.value as AssistanceRequestStatus } : undefined));
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-300"
            >
              <option value="ALL">All States</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="DECLINED">DECLINED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No cross-site assistance requests recorded.
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.requestId} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{req.requestId}</span>
                      {getStatusBadge(req.status)}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        req.urgency === 'URGENT' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {req.urgency}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(req.requestedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Flow description */}
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <span>{req.receivingSiteName.split(',')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>{req.requestingSiteName.split(',')[0]}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({req.resourceType})</span>
                  </div>

                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500">Ref {req.incidentId}:</span> {req.rationale}
                  </p>

                  {/* Action Bar for Operators */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
                    <div className="text-slate-500">
                      Audit Steps: {req.auditTrail.length} recorded
                    </div>

                    <div className="flex items-center gap-1.5">
                      {req.status === 'REQUESTED' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(req.requestId)}
                            className="px-2 py-1 rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 font-bold cursor-pointer"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleAccept(req.requestId)}
                            className="px-2 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold cursor-pointer"
                          >
                            Accept & Authorize
                          </button>
                          <button
                            onClick={() => handleDecline(req.requestId)}
                            className="px-2 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {req.status === 'ACKNOWLEDGED' && (
                        <>
                          <button
                            onClick={() => handleAccept(req.requestId)}
                            className="px-2 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold cursor-pointer"
                          >
                            Accept & Authorize
                          </button>
                          <button
                            onClick={() => handleDecline(req.requestId)}
                            className="px-2 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {req.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleComplete(req.requestId)}
                          className="px-2 py-1 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold cursor-pointer"
                        >
                          Complete Mission
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

