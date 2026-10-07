import { FailureEvent, DegradationLevel } from '../types/FailureTypes';

export interface FallbackStrategy {
  activeLevel: DegradationLevel;
  primaryFailures: string[];
  fallbackActions: string[];
  explanation: string;
}

export class FallbackEngine {
  public static evaluateDegradation(
    activeFailures: FailureEvent[],
    availableLifeguards: number,
    availableDrones: number
  ): FallbackStrategy {
    const hasNetworkOffline = activeFailures.some((f) => f.type === 'NETWORK_FAILURE' && f.active);
    const hasDroneFail = activeFailures.some((f) => f.type === 'DRONE_FAILURE' && f.active);
    const hasSensorFail = activeFailures.some(
      (f) => (f.type === 'SENSOR_FAILURE' || f.type === 'CAMERA_FAILURE') && f.active
    );
    const hasLifeguardFail = activeFailures.some((f) => f.type === 'LIFEGUARD_UNAVAILABLE' && f.active);

    const failureNames = activeFailures.map((f) => f.name);
    const fallbacks: string[] = [];
    let activeLevel: DegradationLevel = 'FULL_CAPABILITY';
    let explanation = 'All sensory and operational assets running at nominal baseline.';

    if (availableLifeguards === 0 && hasDroneFail) {
      activeLevel = 'ESCALATED';
      fallbacks.push('Trigger Automated Coast Guard & Marine Police Priority Escalation');
      fallbacks.push('Activate Maximum Siren & Acoustic PA Evacuation');
      fallbacks.push('Set LED Matrix Boards to FLASHING DANGER');
      explanation = 'CRITICAL ASSET EXHAUSTION: No lifeguards or UAVs operational. Escalated to external Coast Guard.';
    } else if (hasNetworkOffline) {
      activeLevel = 'FAILSAFE';
      fallbacks.push('Switch to Autonomous Local Lifeguard Tower Standalone Mode');
      fallbacks.push('Deploy Local Visual Flags and Manual Horns');
      explanation = 'NETWORK OUTAGE: System operating in autonomous failsafe mode with local tower dispatch.';
    } else if (hasDroneFail || hasLifeguardFail || availableLifeguards <= 1) {
      activeLevel = 'LIMITED';
      if (hasDroneFail) fallbacks.push('Replaced UAV aerial tracking with rapid Jet Boat sea intercept & Lifeguard binoculars');
      if (hasLifeguardFail) fallbacks.push('Pre-armed UAV Flotation Drop to buy critical time for backup responders');
      fallbacks.push('Activated Localized PA Evacuation in Affected Sector');
      explanation = 'LIMITED ASSETS: Fallback assets dynamically rerouted to compensate for unavailable units.';
    } else if (hasSensorFail) {
      activeLevel = 'DEGRADED';
      fallbacks.push('Synthesizing missing sensor data using historical ocean model & secondary telemetry');
      fallbacks.push('Increased manual patrol observation frequency on tower lookouts');
      explanation = 'DEGRADED TELEMETRY: Operating on secondary sensor fusion and historical ocean models.';
    }

    return {
      activeLevel,
      primaryFailures: failureNames,
      fallbackActions: fallbacks,
      explanation,
    };
  }
}
