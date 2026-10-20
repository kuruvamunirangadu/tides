/**
 * src/regional/RegionalAccessController.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Role-Based Access Control (RBAC) service governing multi-site viewing, incident triage,
 * and cross-site assistance requests.
 * 
 * Roles:
 * - LOCAL_OPERATOR: Strictly scoped to their assigned beach. Cannot view or mutate other beaches.
 * - REGIONAL_OPERATOR: Regional visibility, cross-site assistance requests, and tracking.
 * - ADMINISTRATOR: Full system access, site registration, deactivation, and auditing.
 */

import { UserSecurityContext, UserRole } from './types';

export interface AccessAuditLogEntry {
  timestamp: number;
  userId: string;
  role: UserRole;
  action: string;
  targetSiteId: string;
  allowed: boolean;
  reason: string;
}

export class RegionalAccessController {
  private static instance: RegionalAccessController | null = null;
  private auditLog: AccessAuditLogEntry[] = [];

  public static getInstance(): RegionalAccessController {
    if (!RegionalAccessController.instance) {
      RegionalAccessController.instance = new RegionalAccessController();
    }
    return RegionalAccessController.instance;
  }

  public resetAuditLog(): void {
    this.auditLog = [];
  }

  public getAccessAuditLog(): AccessAuditLogEntry[] {
    return [...this.auditLog];
  }

  /**
   * Verifies if a user has permission to view a specific beach site's data.
   */
  public canViewSite(context: UserSecurityContext, siteId: string): boolean {
    const norm = siteId.toUpperCase();

    if (context.role === 'ADMINISTRATOR') {
      this.recordAudit(context, 'VIEW_SITE', norm, true, 'Administrator full visibility granted.');
      return true;
    }

    if (context.role === 'REGIONAL_OPERATOR') {
      const allowed = context.permittedSiteIds.includes('ALL') || context.permittedSiteIds.map((s) => s.toUpperCase()).includes(norm);
      this.recordAudit(context, 'VIEW_SITE', norm, allowed, allowed ? 'Regional operator permitted site view.' : 'Site not in regional operator permitted list.');
      return allowed;
    }

    if (context.role === 'LOCAL_OPERATOR') {
      const allowed = context.assignedSiteId?.toUpperCase() === norm;
      this.recordAudit(
        context,
        'VIEW_SITE',
        norm,
        allowed,
        allowed ? 'Local operator assigned site view.' : `Local operator restricted from viewing external site ${norm}.`
      );
      return allowed;
    }

    this.recordAudit(context, 'VIEW_SITE', norm, false, 'Unrecognized user role.');
    return false;
  }

  /**
   * Verifies if a user can manage or modify incidents at a specific site.
   */
  public canManageIncident(context: UserSecurityContext, siteId: string): boolean {
    const norm = siteId.toUpperCase();

    if (context.role === 'ADMINISTRATOR') {
      this.recordAudit(context, 'MANAGE_INCIDENT', norm, true, 'Admin incident override permitted.');
      return true;
    }

    if (context.role === 'LOCAL_OPERATOR') {
      const allowed = context.assignedSiteId?.toUpperCase() === norm;
      this.recordAudit(
        context,
        'MANAGE_INCIDENT',
        norm,
        allowed,
        allowed ? 'Local operator incident triage authorized.' : 'Cannot manage incidents for unassigned beach.'
      );
      return allowed;
    }

    if (context.role === 'REGIONAL_OPERATOR') {
      // Regional operators can request assistance but cannot directly close or override local incidents
      this.recordAudit(context, 'MANAGE_INCIDENT', norm, false, 'Regional operators cannot directly mutate local incident records without local authority.');
      return false;
    }

    return false;
  }

  /**
   * Verifies if a user can initiate a cross-site assistance request.
   */
  public canRequestAssistance(context: UserSecurityContext, requestingSiteId: string): boolean {
    const norm = requestingSiteId.toUpperCase();

    if (context.role === 'ADMINISTRATOR') {
      this.recordAudit(context, 'REQUEST_ASSISTANCE', norm, true, 'Admin assistance request permitted.');
      return true;
    }

    if (context.role === 'REGIONAL_OPERATOR') {
      this.recordAudit(context, 'REQUEST_ASSISTANCE', norm, true, 'Regional operator mutual aid request authorized.');
      return true;
    }

    if (context.role === 'LOCAL_OPERATOR') {
      const allowed = context.assignedSiteId?.toUpperCase() === norm;
      this.recordAudit(
        context,
        'REQUEST_ASSISTANCE',
        norm,
        allowed,
        allowed ? 'Local operator assistance request for own site permitted.' : 'Local operator cannot request assistance for other sites.'
      );
      return allowed;
    }

    return false;
  }

  /**
   * Verifies if a user can authorize or accept assistance dispatching from a receiving site.
   * Requires either the receiving site's local operator or an administrator.
   */
  public canAuthorizeAssistance(context: UserSecurityContext, receivingSiteId: string): boolean {
    const norm = receivingSiteId.toUpperCase();

    if (context.role === 'ADMINISTRATOR') {
      this.recordAudit(context, 'AUTHORIZE_ASSISTANCE', norm, true, 'Admin assistance authorization.');
      return true;
    }

    if (context.role === 'LOCAL_OPERATOR') {
      const allowed = context.assignedSiteId?.toUpperCase() === norm;
      this.recordAudit(
        context,
        'AUTHORIZE_ASSISTANCE',
        norm,
        allowed,
        allowed ? 'Local receiving site operator authorization granted.' : 'Cannot authorize assistance on behalf of foreign site.'
      );
      return allowed;
    }

    // Regional operator cannot unilaterally commit another beach's physical resources
    this.recordAudit(context, 'AUTHORIZE_ASSISTANCE', norm, false, 'Regional operator cannot commit local resources without local operator authorization.');
    return false;
  }

  /**
   * Verifies if a user can register, update, or deactivate sites in the coastal registry.
   */
  public canManageSites(context: UserSecurityContext): boolean {
    const allowed = context.role === 'ADMINISTRATOR';
    this.recordAudit(context, 'MANAGE_SITES', 'GLOBAL', allowed, allowed ? 'Site management granted to admin.' : 'Site management restricted to administrators.');
    return allowed;
  }

  private recordAudit(
    context: UserSecurityContext,
    action: string,
    targetSiteId: string,
    allowed: boolean,
    reason: string
  ): void {
    this.auditLog.push({
      timestamp: Date.now(),
      userId: context.userId,
      role: context.role,
      action,
      targetSiteId,
      allowed,
      reason,
    });
  }
}

