import { ReplayableIncidentDossier } from '../../impact-lab/replay/types';
import { ReplayRenderer } from '../../impact-lab/replay/ReplayRenderer';
import { ReplayController } from '../../impact-lab/replay/ReplayController';

/**
 * RescueMissionReplayRenderer.ts
 * 
 * TIDES Feature 2: Rescue Mission Replay Visualizer
 * 
 * Provides an optional, read-only replay visualization layer directly on the digital twin canvas:
 * - Scene 1: Distress detection marker at the victim's recorded coordinates
 * - Scene 2: Dispatch trajectory vector and kinematics along recorded breadcrumbs
 * - Scene 3: Recorded arrival, assistance and resolution milestones with unrecorded stage audit
 * - Replay-local clock with zero simulation engine mutation
 */

export class RescueMissionReplayRenderer {
  public static drawMissionReplay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    incident?: ReplayableIncidentDossier,
    waveOffset: number = 0,
    isSatelliteMode: boolean = false
  ): void {
    const controller = ReplayController.getInstance();
    if (incident && controller.getSelectedIncidentId() !== incident.incidentId) {
      controller.selectIncident(incident.incidentId);
    }

    ReplayRenderer.drawReplayOverlay(
      ctx,
      width,
      height,
      dynamicShorelineY,
      waveOffset,
      isSatelliteMode,
      controller
    );
  }
}
