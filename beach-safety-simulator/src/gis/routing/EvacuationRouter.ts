import { BeachGIS } from '../models/BeachGIS';
import { EvacuationRouteGIS, AssemblyPointGIS } from '../models/EvacuationRouteGIS';
import { GeoPoint } from '../models/GeoPoint';
import { CoordinateSystem } from '../CoordinateSystem';

export interface EvacuationPlan {
  zoneId: string;
  recommendedRoute: EvacuationRouteGIS;
  destinationAssemblyPoint: AssemblyPointGIS;
  estimatedTransitTimeSeconds: number;
  alternateRoute?: EvacuationRouteGIS;
  warningNotice?: string;
}

export class EvacuationRouter {
  /**
   * Plan optimal evacuation path from a zone to the safest available assembly point
   */
  public planEvacuation(beach: BeachGIS, zoneId: string): EvacuationPlan | null {
    // Find candidate routes starting from or passing near this zone
    const candidateRoutes = beach.evacuationRoutes.filter(
      (r) => r.startZoneId === zoneId || r.name.toLowerCase().includes(zoneId.toLowerCase())
    );

    const openRoutes = candidateRoutes.filter((r) => r.status === 'OPEN' || r.status === 'RECOMMENDED');
    const primaryRoute = openRoutes[0] || beach.evacuationRoutes.find((r) => r.status !== 'BLOCKED');

    if (!primaryRoute) {
      return null;
    }

    const destination = beach.assemblyPoints.find((ap) => ap.id === primaryRoute.destinationId) || beach.assemblyPoints[0];
    const alternate = openRoutes.length > 1 ? openRoutes[1] : undefined;

    let warningNotice: string | undefined;
    if (primaryRoute.status === 'CONGESTED') {
      warningNotice = 'Heavy pedestrian congestion on primary egress corridor; crowd marshals dispatched.';
    }

    return {
      zoneId,
      recommendedRoute: primaryRoute,
      destinationAssemblyPoint: destination,
      estimatedTransitTimeSeconds: primaryRoute.estimatedTimeSeconds,
      alternateRoute: alternate,
      warningNotice,
    };
  }

  /**
   * Mark a route as blocked (e.g., due to coastal surge or debris) and trigger re-route
   */
  public toggleRouteBlockage(
    beach: BeachGIS,
    routeId: string,
    reason: string = 'High water / debris blockage'
  ): EvacuationRouteGIS | undefined {
    const route = beach.evacuationRoutes.find((r) => r.id === routeId);
    if (route) {
      if (route.status === 'BLOCKED') {
        route.status = 'OPEN';
        route.blockageReason = undefined;
      } else {
        route.status = 'BLOCKED';
        route.blockageReason = reason;
      }
    }
    return route;
  }
}
