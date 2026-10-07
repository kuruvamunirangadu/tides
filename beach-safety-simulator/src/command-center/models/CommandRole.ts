export type CommandRole =
  | 'SYSTEM_ADMIN'
  | 'COMMAND_OPERATOR'
  | 'BEACH_SUPERVISOR'
  | 'LIFEGUARD_COORDINATOR'
  | 'EMERGENCY_COORDINATOR'
  | 'ANALYST'
  | 'VIEW_ONLY';

export interface RolePermissions {
  canAcknowledge: boolean;
  canDispatchResources: boolean;
  canDeployDrones: boolean;
  canIssueWarnings: boolean;
  canCloseZones: boolean;
  canInitiateEvacuation: boolean;
  canEscalate: boolean;
  canResolve: boolean;
  canConfigurePolicies: boolean;
}

export const ROLE_PERMISSIONS: Record<CommandRole, RolePermissions> = {
  SYSTEM_ADMIN: {
    canAcknowledge: true,
    canDispatchResources: true,
    canDeployDrones: true,
    canIssueWarnings: true,
    canCloseZones: true,
    canInitiateEvacuation: true,
    canEscalate: true,
    canResolve: true,
    canConfigurePolicies: true,
  },
  COMMAND_OPERATOR: {
    canAcknowledge: true,
    canDispatchResources: true,
    canDeployDrones: true,
    canIssueWarnings: true,
    canCloseZones: true,
    canInitiateEvacuation: true,
    canEscalate: true,
    canResolve: true,
    canConfigurePolicies: false,
  },
  BEACH_SUPERVISOR: {
    canAcknowledge: true,
    canDispatchResources: true,
    canDeployDrones: true,
    canIssueWarnings: true,
    canCloseZones: true,
    canInitiateEvacuation: false,
    canEscalate: true,
    canResolve: true,
    canConfigurePolicies: false,
  },
  LIFEGUARD_COORDINATOR: {
    canAcknowledge: true,
    canDispatchResources: true,
    canDeployDrones: false,
    canIssueWarnings: true,
    canCloseZones: false,
    canInitiateEvacuation: false,
    canEscalate: true,
    canResolve: true,
    canConfigurePolicies: false,
  },
  EMERGENCY_COORDINATOR: {
    canAcknowledge: true,
    canDispatchResources: true,
    canDeployDrones: true,
    canIssueWarnings: true,
    canCloseZones: true,
    canInitiateEvacuation: true,
    canEscalate: true,
    canResolve: true,
    canConfigurePolicies: false,
  },
  ANALYST: {
    canAcknowledge: false,
    canDispatchResources: false,
    canDeployDrones: false,
    canIssueWarnings: false,
    canCloseZones: false,
    canInitiateEvacuation: false,
    canEscalate: false,
    canResolve: false,
    canConfigurePolicies: false,
  },
  VIEW_ONLY: {
    canAcknowledge: false,
    canDispatchResources: false,
    canDeployDrones: false,
    canIssueWarnings: false,
    canCloseZones: false,
    canInitiateEvacuation: false,
    canEscalate: false,
    canResolve: false,
    canConfigurePolicies: false,
  },
};
