import * as THREE from 'three';
import { CameraMode, CameraTargetInfo } from './camera.types';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { VisitorCoordinateMapper } from '../visitors/VisitorCoordinateMapper';
import { RescueCoordinator } from '../rescue/RescueCoordinator';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';

/**
 * FollowTargetController.ts
 * 
 * Computes smooth, jitter-free camera target positions and look-at vectors
 * for moving objects in the 3D beach environment.
 * Gracefully detects missing or unavailable targets and supplies safe fallbacks.
 */
export class FollowTargetController {
  private mapper: VisitorCoordinateMapper = new VisitorCoordinateMapper();

  /**
   * Resolves target camera position and look-at point for a given camera mode
   */
  public resolveTarget(
    mode: CameraMode,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): CameraTargetInfo {
    switch (mode) {
      case 'OVERVIEW':
        return {
          position: new THREE.Vector3(0, 55, 95),
          lookAt: new THREE.Vector3(0, 3, -10),
          name: 'Beach Overview',
          available: true,
        };

      case 'FOLLOW_SWIMMER': {
        const ripSim = RipCurrentSimulator.getInstance();
        const coordinator = RescueCoordinator.getInstance();

        // 1. Try to find the distressed bather or target swimmer
        const targetId =
          coordinator.activeMission?.visitorId ||
          ripSim.targetVisitorId ||
          visitors.find((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING')?.id ||
          visitors.find((v) => v.state === 'SWIMMING')?.id;

        const swimmer = visitors.find((v) => v.id === targetId && v.active);

        if (!swimmer) {
          return {
            position: new THREE.Vector3(0, 55, 95),
            lookAt: new THREE.Vector3(0, 3, -10),
            name: 'No Active Swimmer',
            available: false,
            unavailableReason: 'No swimmer is currently in the water or distress channel.',
          };
        }

        const transform = this.mapper.map(swimmer, beach, environment);
        const swimmerPos = new THREE.Vector3(transform.x, transform.y, transform.z);

        // Smooth follow camera: positioned offset back and slightly above
        const camPos = new THREE.Vector3(
          swimmerPos.x + 8,
          swimmerPos.y + 11,
          swimmerPos.z + 18
        );

        return {
          position: camPos,
          lookAt: new THREE.Vector3(swimmerPos.x, swimmerPos.y + 0.4, swimmerPos.z),
          name: `Swimmer #${swimmer.id.slice(-4)} (${swimmer.state})`,
          available: true,
        };
      }

      case 'RESCUE_BOAT': {
        const coordinator = RescueCoordinator.getInstance();
        const boat = coordinator.registry.getResource('RB-01');

        if (!boat) {
          return {
            position: new THREE.Vector3(0, 55, 95),
            lookAt: new THREE.Vector3(0, 3, -10),
            name: 'Rescue Boat RB-01',
            available: false,
            unavailableReason: 'Rescue Boat RB-01 not found in registry.',
          };
        }

        const boatPos = new THREE.Vector3(boat.currentX, boat.currentY, boat.currentZ);
        const rotY = boat.rotationY || 0;

        // Dynamic stern-quarter chase camera following boat heading
        const followDistance = 16.0;
        const followHeight = 6.5;
        const offsetX = -Math.sin(rotY) * followDistance;
        const offsetZ = -Math.cos(rotY) * followDistance;

        const camPos = new THREE.Vector3(
          boatPos.x + offsetX,
          boatPos.y + followHeight,
          boatPos.z + offsetZ
        );

        return {
          position: camPos,
          lookAt: new THREE.Vector3(boatPos.x, boatPos.y + 1.2, boatPos.z),
          name: `Rescue Boat RB-01 (${boat.status})`,
          available: true,
        };
      }

      case 'LIFEGUARD': {
        const coordinator = RescueCoordinator.getInstance();
        const resources = coordinator.registry.getResources();
        // Pick an active lifeguard or LG-01 by default
        const lg =
          resources.find((r) => r.type === 'LIFEGUARD' && r.status !== 'AVAILABLE') ||
          resources.find((r) => r.id === 'LG-01') ||
          resources.find((r) => r.type === 'LIFEGUARD');

        if (!lg) {
          return {
            position: new THREE.Vector3(0, 55, 95),
            lookAt: new THREE.Vector3(0, 3, -10),
            name: 'Lifeguard Squad',
            available: false,
            unavailableReason: 'No lifeguard resources configured in registry.',
          };
        }

        const lgPos = new THREE.Vector3(lg.currentX, lg.currentY, lg.currentZ);
        const camPos = new THREE.Vector3(lgPos.x + 4, lgPos.y + 6, lgPos.z + 14);

        return {
          position: camPos,
          lookAt: new THREE.Vector3(lgPos.x, lgPos.y + 1.2, lgPos.z),
          name: `${lg.name} (${lg.status})`,
          available: true,
        };
      }

      case 'INCIDENT_FOCUS': {
        const ripSim = RipCurrentSimulator.getInstance();
        const coordinator = RescueCoordinator.getInstance();
        const incident = ripSim.getActiveIncident();

        if (!incident) {
          return {
            position: new THREE.Vector3(0, 55, 95),
            lookAt: new THREE.Vector3(0, 3, -10),
            name: 'No Active Incident',
            available: false,
            unavailableReason: 'No active swimmer distress or rescue incident in progress.',
          };
        }

        const incidentPos = new THREE.Vector3(
          incident.position3D.x,
          incident.position3D.y,
          incident.position3D.z
        );

        // If a responder is dispatched, frame the midpoint between the boat and the victim
        let lookAtTarget = incidentPos;
        const resId = coordinator.activeMission?.assignedResourceId;
        if (resId) {
          const res = coordinator.registry.getResource(resId);
          if (res) {
            const resPos = new THREE.Vector3(res.currentX, res.currentY, res.currentZ);
            lookAtTarget = new THREE.Vector3().addVectors(incidentPos, resPos).multiplyScalar(0.5);
          }
        }

        const camPos = new THREE.Vector3(
          lookAtTarget.x + 12,
          lookAtTarget.y + 22,
          lookAtTarget.z + 32
        );

        return {
          position: camPos,
          lookAt: lookAtTarget,
          name: `Incident #${incident.incidentId} Framing`,
          available: true,
        };
      }

      default:
        return {
          position: new THREE.Vector3(0, 55, 95),
          lookAt: new THREE.Vector3(0, 3, -10),
          name: 'Beach Overview',
          available: true,
        };
    }
  }
}

