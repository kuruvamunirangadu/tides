import { EmergencyResourceType, ResourceCapability } from '../models/EmergencyResource';

export const RESOURCE_CAPABILITIES: Record<EmergencyResourceType, ResourceCapability> = {
  LIFEGUARD: {
    locate: true,
    warn: true,
    rescue: true,
    transport: false,
    medical: true, // basic CPR / first aid
    surveillance: true,
  },
  RESCUE_BOAT: {
    locate: true,
    warn: false,
    rescue: true,
    transport: true, // deep water extraction
    medical: false,
    surveillance: false,
  },
  DRONE: {
    locate: true,
    warn: true,
    rescue: false, // can drop flotation ring
    transport: false,
    medical: false,
    surveillance: true,
  },
  POLICE: {
    locate: true,
    warn: true,
    rescue: false,
    transport: true, // crowd control / perimeter
    medical: false,
    surveillance: true,
  },
  AMBULANCE: {
    locate: false,
    warn: false,
    rescue: false,
    transport: true,
    medical: true, // advanced trauma & hospital transfer
    surveillance: false,
  },
  PA_SYSTEM: {
    locate: false,
    warn: true,
    rescue: false,
    transport: false,
    medical: false,
    surveillance: false,
  },
  LED_WARNING_BOARD: {
    locate: false,
    warn: true,
    rescue: false,
    transport: false,
    medical: false,
    surveillance: false,
  },
  EMERGENCY_VEHICLE: {
    locate: false,
    warn: true,
    rescue: false,
    transport: true,
    medical: true,
    surveillance: false,
  },
};
