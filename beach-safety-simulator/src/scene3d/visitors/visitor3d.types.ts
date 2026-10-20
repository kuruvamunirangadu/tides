import * as THREE from 'three';

export type AnimationState3D = 'idle' | 'walk' | 'wade' | 'swim' | 'distress' | 'float';

export type CharacterRoleState3D = 'NORMAL' | 'CAUTION' | 'DISTRESS' | 'RESCUED';

export interface CharacterAppearance {
  skinTone: number;
  swimwearColor: number;
  hairColor: number;
  capColor: number;
  scale: number;
  gender: 'male' | 'female' | 'child';
}

export interface HumanoidJoints {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  leftCalf: THREE.Group;
  rightThigh: THREE.Group;
  rightCalf: THREE.Group;
}

export interface Visitor3DTransform {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  animationState: AnimationState3D;
  speed: number;
  inWater: boolean;
  waterDepth: number;
  distress: boolean;
  roleState?: CharacterRoleState3D;
  distressLevel?: number;
  visitorId?: string;
  visitorName?: string;
  isSelected?: boolean;
}

