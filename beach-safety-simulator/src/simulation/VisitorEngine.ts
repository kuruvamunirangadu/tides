// beach-safety-simulator/src/simulation/VisitorEngine.ts

export interface EscapePath {
  originX: number;
  originY: number;
  intermediateX: number;
  intermediateY: number;
  finalTargetX: number;
  finalTargetY: number;
  escapeMode: 'LATERAL_TRAVERSE' | 'DIRECT_SHORE_RUN';
}

/**
 * Calculates optimal survival vector:
 * If caught inside a rip current channel (high seaward drag / deep trench),
 * the agent must swim laterally (parallel to shore) towards shallow sandbars,
 * then swim inward to the dry berm.
 */
export function calculateEscapePath(
  agentX: number,
  agentY: number,
  ripCorridors: Array<{ x_min: number; x_max: number }>,
  waterDepth: number
): EscapePath {
  // Check if agent is inside an active rip channel corridor
  const trappedCorridor = ripCorridors.find(
    (c) => agentX >= c.x_min - 5 && agentX <= c.x_max + 5
  );

  if (trappedCorridor && waterDepth > 1.0) {
    // Determine closest lateral exit boundary (left or right)
    const distToLeft = Math.abs(agentX - trappedCorridor.x_min);
    const distToRight = Math.abs(agentX - trappedCorridor.x_max);
    
    const exitX = distToLeft < distToRight 
      ? trappedCorridor.x_min - 15 
      : trappedCorridor.x_max + 15;

    return {
      originX: agentX,
      originY: agentY,
      intermediateX: exitX,
      intermediateY: agentY, // Parallel to beach
      finalTargetX: exitX,
      finalTargetY: 0,       // Dry shoreline berm
      escapeMode: 'LATERAL_TRAVERSE'
    };
  }

  // Wading on flat shore or outside rip: Direct return to safety line
  return {
    originX: agentX,
    originY: agentY,
    intermediateX: agentX,
    intermediateY: 0,
    finalTargetX: agentX,
    finalTargetY: 0,
    escapeMode: 'DIRECT_SHORE_RUN'
  };
}

export { VisitorEngine } from '../visitors/VisitorEngine';

