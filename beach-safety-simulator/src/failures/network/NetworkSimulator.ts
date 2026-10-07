export type NetworkCondition =
  | 'NORMAL'
  | 'HIGH_LATENCY'
  | 'PACKET_LOSS'
  | 'DEGRADED'
  | 'DISCONNECTED';

export interface NetworkState {
  condition: NetworkCondition;
  latencyMs: number;
  packetLossRate: number; // 0.0 - 1.0
  connected: boolean;
  commandCenterConnected: boolean;
}

export class NetworkSimulator {
  private condition: NetworkCondition = 'NORMAL';

  public setCondition(cond: NetworkCondition): void {
    this.condition = cond;
  }

  public getCondition(): NetworkCondition {
    return this.condition;
  }

  public getNetworkState(): NetworkState {
    switch (this.condition) {
      case 'HIGH_LATENCY':
        return {
          condition: 'HIGH_LATENCY',
          latencyMs: 650,
          packetLossRate: 0.05,
          connected: true,
          commandCenterConnected: true,
        };
      case 'PACKET_LOSS':
        return {
          condition: 'PACKET_LOSS',
          latencyMs: 120,
          packetLossRate: 0.35,
          connected: true,
          commandCenterConnected: true,
        };
      case 'DEGRADED':
        return {
          condition: 'DEGRADED',
          latencyMs: 1200,
          packetLossRate: 0.45,
          connected: true,
          commandCenterConnected: false,
        };
      case 'DISCONNECTED':
        return {
          condition: 'DISCONNECTED',
          latencyMs: 9999,
          packetLossRate: 1.0,
          connected: false,
          commandCenterConnected: false,
        };
      case 'NORMAL':
      default:
        return {
          condition: 'NORMAL',
          latencyMs: 25,
          packetLossRate: 0.0,
          connected: true,
          commandCenterConnected: true,
        };
    }
  }

  public shouldDropPacket(): boolean {
    const state = this.getNetworkState();
    return Math.random() < state.packetLossRate;
  }
}
