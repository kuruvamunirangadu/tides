import { SimulationState, ScenarioMeta } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || 'ws://127.0.0.1:8000';

export async function fetchSimulationState(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/api/simulation/state`);
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioMeta[]> {
  const res = await fetch(`${API_BASE}/api/simulation/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function postSimulationControl(action: string) {
  const res = await fetch(`${API_BASE}/api/simulation/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

export async function postSetSpeed(speed: number) {
  const res = await fetch(`${API_BASE}/api/simulation/set-speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  });
  return res.json();
}

export async function postLoadScenario(scenario_id: string, seed?: number) {
  const res = await fetch(`${API_BASE}/api/simulation/load-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id, seed }),
  });
  return res.json();
}

export async function postInjectEvent(type: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}/api/simulation/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...params }),
  });
  return res.json();
}

export async function fetchRecordings() {
  const res = await fetch(`${API_BASE}/api/simulation/recordings`);
  if (!res.ok) throw new Error('Failed to fetch recordings');
  return res.json();
}

export function subscribeSimulationWS(onStateUpdate: (state: SimulationState) => void) {
  let ws: WebSocket | null = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/simulation`);
      
      ws.onmessage = (event) => {
        try {
          const state: SimulationState = JSON.parse(event.data);
          onStateUpdate(state);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        if (!isClosed) {
          setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    } catch {
      setTimeout(connect, 2000);
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (ws) ws.close();
  };
}
