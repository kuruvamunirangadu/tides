/**
 * DroneModelBuilder.ts
 * 
 * TIDES Drone Phase 2: Procedural 3D Drone Model Builder
 * 
 * Generates lightweight, role-differentiated 3D drone models for coastal safety:
 * - SURVEILLANCE: Aerodynamic quadcopter with 360° optical/thermal sensor gimbal
 * - RESCUE_ASSISTANCE: Heavy-lift hexacopter (6 radial arms) with dual buoyant drop pods
 * - MULTI_ROLE: Hybrid quadcopter with forward gimbal and under-slung winch lifeline
 * - Landing skids: Tubular carbon landing gear for natural ground clearance
 * - Shared geometries and materials for optimal 60 FPS multi-drone rendering
 * - Selection reticles and tactical illumination rings
 */

import * as THREE from 'three';
import { DroneRecord, DroneRole } from '../../drones/foundation/drone.types';

export interface BuiltDroneMeshComponents {
  rootGroup: THREE.Group;
  fuselageMesh: THREE.Mesh;
  rotorDiscs: THREE.Mesh[];
  strobeLight: THREE.PointLight;
  dropLine: THREE.Line;
  shadowDisc: THREE.Mesh;
  selectionReticle: THREE.Mesh;
  payloadMesh?: THREE.Mesh;
}

export class DroneModelBuilder {
  private static instance: DroneModelBuilder | null = null;

  // Shared reusable geometries
  private armGeometryQuad: THREE.CylinderGeometry;
  private armGeometryHex: THREE.CylinderGeometry;
  private motorGeometry: THREE.CylinderGeometry;
  private rotorDiscGeometry: THREE.CylinderGeometry;
  private skidRailGeometry: THREE.CylinderGeometry;
  private skidStrutGeometry: THREE.CylinderGeometry;
  private reticleGeometry: THREE.RingGeometry;

  // Shared materials
  private armMaterial: THREE.MeshStandardMaterial;
  private motorMaterial: THREE.MeshStandardMaterial;
  private rotorDiscMaterial: THREE.MeshBasicMaterial;
  private skidMaterial: THREE.MeshStandardMaterial;
  private reticleMaterial: THREE.MeshBasicMaterial;

  public static getInstance(): DroneModelBuilder {
    if (!DroneModelBuilder.instance) {
      DroneModelBuilder.instance = new DroneModelBuilder();
    }
    return DroneModelBuilder.instance;
  }

  constructor() {
    // Geometries
    this.armGeometryQuad = new THREE.CylinderGeometry(0.035, 0.035, 0.90, 8);
    this.armGeometryHex = new THREE.CylinderGeometry(0.040, 0.040, 0.85, 8);
    this.motorGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8);
    this.rotorDiscGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 16);
    this.skidRailGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1.20, 8);
    this.skidStrutGeometry = new THREE.CylinderGeometry(0.020, 0.020, 0.28, 6);
    this.reticleGeometry = new THREE.RingGeometry(1.2, 1.35, 32);
    this.reticleGeometry.rotateX(-Math.PI / 2);

    // Materials
    this.armMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Carbon weave
      roughness: 0.6,
      metalness: 0.4,
    });
    this.motorMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.rotorDiscMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    this.skidMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.5,
    });
    this.reticleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Constructs a complete, role-differentiated 3D drone model
   */
  public buildDroneModel(drone: DroneRecord): BuiltDroneMeshComponents {
    const rootGroup = new THREE.Group();
    rootGroup.name = `Drone_${drone.droneId}`;
    rootGroup.position.set(drone.position3D.x, drone.position3D.y, drone.position3D.z);

    // Metadata for interactive raycasting
    rootGroup.userData = {
      type: 'DRONE',
      id: drone.droneId,
      droneId: drone.droneId,
      callsign: drone.callsign,
      role: drone.role,
      status: drone.status,
    };

    let fuselageMesh: THREE.Mesh;
    let rotorDiscs: THREE.Mesh[] = [];
    let payloadMesh: THREE.Mesh | undefined;

    // 1. Role-specific airframe and appendages
    switch (drone.role) {
      case 'RESCUE_ASSISTANCE': {
        // Heavy-Lift Hexacopter with Flotation Drop Canisters
        const built = this.buildRescueHexacopter(rootGroup, drone);
        fuselageMesh = built.fuselage;
        rotorDiscs = built.rotors;
        payloadMesh = built.payload;
        break;
      }
      case 'SURVEILLANCE': {
        // Sleek Aerodynamic Quadcopter with Thermal/Optical Gimbal
        const built = this.buildSurveillanceQuadcopter(rootGroup, drone);
        fuselageMesh = built.fuselage;
        rotorDiscs = built.rotors;
        payloadMesh = built.payload;
        break;
      }
      case 'MULTI_ROLE':
      default: {
        // Dual-Payload Interceptor Quadcopter
        const built = this.buildMultiRoleQuadcopter(rootGroup, drone);
        fuselageMesh = built.fuselage;
        rotorDiscs = built.rotors;
        payloadMesh = built.payload;
        break;
      }
    }

    // 2. Tubular Carbon Landing Skids (Ground Clearance)
    this.addLandingSkids(rootGroup);

    // 3. Strobe Light (Port / Starboard / Central Strobe)
    const strobeLight = new THREE.PointLight(
      drone.role === 'RESCUE_ASSISTANCE' ? 0xf97316 : 0x22c55e,
      1.2,
      10
    );
    strobeLight.position.set(0, 0.28, 0);
    rootGroup.add(strobeLight);

    // 4. Ground/Sea Altitude Projection Drop-Line
    const lineMat = new THREE.LineDashedMaterial({
      color: drone.role === 'RESCUE_ASSISTANCE' ? 0xf97316 : 0x00e5ff,
      dashSize: 0.8,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.6,
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -drone.position3D.y, 0),
    ]);
    const dropLine = new THREE.Line(lineGeo, lineMat);
    dropLine.computeLineDistances();
    rootGroup.add(dropLine);

    // 5. Ground Shadow Disc
    const shadowGeo = new THREE.RingGeometry(0.15, 0.95, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: drone.role === 'RESCUE_ASSISTANCE' ? 0xd97706 : 0x0284c7,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.position.set(0, -drone.position3D.y + 0.05, 0);
    rootGroup.add(shadowDisc);

    // 6. Interactive Selection Reticle (Pulsing Halo)
    const reticleMesh = new THREE.Mesh(this.reticleGeometry, this.reticleMaterial.clone());
    reticleMesh.position.set(0, 0.05, 0);
    reticleMesh.visible = false;
    rootGroup.add(reticleMesh);

    return {
      rootGroup,
      fuselageMesh,
      rotorDiscs,
      strobeLight,
      dropLine,
      shadowDisc,
      selectionReticle: reticleMesh,
      payloadMesh,
    };
  }

  /**
   * SURVEILLANCE Quadcopter: Carbon-fiber fuselage with downward 360° sensor gimbal
   */
  private buildSurveillanceQuadcopter(
    parent: THREE.Group,
    drone: DroneRecord
  ): { fuselage: THREE.Mesh; rotors: THREE.Mesh[]; payload: THREE.Mesh } {
    // Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.20, 8);
    const fuseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Tactical carbon slate
      roughness: 0.35,
      metalness: 0.70,
    });
    const fuselage = new THREE.Mesh(fuseGeo, fuseMat);
    fuselage.castShadow = true;
    parent.add(fuselage);

    // Cyan tactical racing canopy
    const cowlGeo = new THREE.ConeGeometry(0.25, 0.35, 4);
    cowlGeo.rotateX(Math.PI / 2);
    const cowlMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan coastal stripe
      roughness: 0.2,
      metalness: 0.5,
    });
    const cowl = new THREE.Mesh(cowlGeo, cowlMat);
    cowl.position.set(0, 0.08, 0.20);
    fuselage.add(cowl);

    // Sensor Gimbal Pod (Thermal & 30x Optical)
    const gimbalGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const gimbalMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    const gimbal = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbal.position.set(0, -0.16, 0.18);
    fuselage.add(gimbal);

    // 4 Cross-arms at 45 degree angles
    const rotors: THREE.Mesh[] = [];
    const armDistance = 0.62;
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    angles.forEach((angle) => {
      const armMesh = new THREE.Mesh(this.armGeometryQuad, this.armMaterial);
      armMesh.position.set((Math.cos(angle) * armDistance) / 2, 0, (Math.sin(angle) * armDistance) / 2);
      armMesh.rotation.z = Math.PI / 2;
      armMesh.rotation.y = angle;
      parent.add(armMesh);

      const motorMesh = new THREE.Mesh(this.motorGeometry, this.motorMaterial);
      motorMesh.position.set(Math.cos(angle) * armDistance, 0.06, Math.sin(angle) * armDistance);
      parent.add(motorMesh);

      const discMesh = new THREE.Mesh(this.rotorDiscGeometry, this.rotorDiscMaterial);
      discMesh.position.set(Math.cos(angle) * armDistance, 0.14, Math.sin(angle) * armDistance);
      parent.add(discMesh);
      rotors.push(discMesh);
    });

    return { fuselage, rotors, payload: gimbal };
  }

  /**
   * RESCUE ASSISTANCE Heavy-Hexacopter: 6 radial arms with dual buoyant lifebuoy drop pods
   */
  private buildRescueHexacopter(
    parent: THREE.Group,
    drone: DroneRecord
  ): { fuselage: THREE.Mesh; rotors: THREE.Mesh[]; payload: THREE.Mesh } {
    // Hexagonal heavy-lift fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.25, 6);
    const fuseMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Marine Safety Orange
      roughness: 0.3,
      metalness: 0.5,
    });
    const fuselage = new THREE.Mesh(fuseGeo, fuseMat);
    fuselage.castShadow = true;
    parent.add(fuselage);

    // Yellow safety warning chevron on canopy
    const chevronGeo = new THREE.BoxGeometry(0.24, 0.05, 0.50);
    const chevronMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Bright yellow
      roughness: 0.3,
    });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.position.set(0, 0.14, 0);
    fuselage.add(chevron);

    // Dual Buoyant Lifebuoy Canisters (under-slung payload)
    const payloadGroup = new THREE.Group();
    payloadGroup.position.set(0, -0.22, 0);

    const podGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 12);
    podGeo.rotateX(Math.PI / 2);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
    });

    // Left Canister
    const leftPod = new THREE.Mesh(podGeo, podMat);
    leftPod.position.set(-0.20, 0, 0);
    payloadGroup.add(leftPod);

    // Right Canister
    const rightPod = new THREE.Mesh(podGeo, podMat);
    rightPod.position.set(0.20, 0, 0);
    payloadGroup.add(rightPod);

    // Forward Searchlight / Megaphone
    const lightGeo = new THREE.ConeGeometry(0.12, 0.22, 12);
    lightGeo.rotateX(-Math.PI / 2);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.8,
    });
    const searchlight = new THREE.Mesh(lightGeo, lightMat);
    searchlight.position.set(0, 0, 0.32);
    payloadGroup.add(searchlight);

    fuselage.add(payloadGroup);

    // 6 Radial arms at 60 degree increments (Hexacopter layout)
    const rotors: THREE.Mesh[] = [];
    const armDistance = 0.75;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;

      const armMesh = new THREE.Mesh(this.armGeometryHex, this.armMaterial);
      armMesh.position.set((Math.cos(angle) * armDistance) / 2, 0, (Math.sin(angle) * armDistance) / 2);
      armMesh.rotation.z = Math.PI / 2;
      armMesh.rotation.y = angle;
      parent.add(armMesh);

      const motorMesh = new THREE.Mesh(this.motorGeometry, this.motorMaterial);
      motorMesh.position.set(Math.cos(angle) * armDistance, 0.08, Math.sin(angle) * armDistance);
      parent.add(motorMesh);

      // Heavy lift rotor disc
      const hexDiscGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.02, 16);
      const discMesh = new THREE.Mesh(hexDiscGeo, this.rotorDiscMaterial);
      discMesh.position.set(Math.cos(angle) * armDistance, 0.16, Math.sin(angle) * armDistance);
      parent.add(discMesh);
      rotors.push(discMesh);
    }

    return { fuselage, rotors, payload: leftPod };
  }

  /**
   * MULTI_ROLE Interceptor Quadcopter: Cobalt Blue airframe with winch & forward optics
   */
  private buildMultiRoleQuadcopter(
    parent: THREE.Group,
    drone: DroneRecord
  ): { fuselage: THREE.Mesh; rotors: THREE.Mesh[]; payload: THREE.Mesh } {
    const fuseGeo = new THREE.CylinderGeometry(0.36, 0.46, 0.22, 8);
    const fuseMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Cobalt blue
      roughness: 0.3,
      metalness: 0.6,
    });
    const fuselage = new THREE.Mesh(fuseGeo, fuseMat);
    fuselage.castShadow = true;
    parent.add(fuselage);

    // Winch spool underneath
    const winchGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12);
    const winchMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const winch = new THREE.Mesh(winchGeo, winchMat);
    winch.position.set(0, -0.18, -0.05);
    winch.rotation.z = Math.PI / 2;
    fuselage.add(winch);

    // 4 Cross-arms
    const rotors: THREE.Mesh[] = [];
    const armDistance = 0.68;
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    angles.forEach((angle) => {
      const armMesh = new THREE.Mesh(this.armGeometryQuad, this.armMaterial);
      armMesh.position.set((Math.cos(angle) * armDistance) / 2, 0, (Math.sin(angle) * armDistance) / 2);
      armMesh.rotation.z = Math.PI / 2;
      armMesh.rotation.y = angle;
      parent.add(armMesh);

      const motorMesh = new THREE.Mesh(this.motorGeometry, this.motorMaterial);
      motorMesh.position.set(Math.cos(angle) * armDistance, 0.06, Math.sin(angle) * armDistance);
      parent.add(motorMesh);

      const discMesh = new THREE.Mesh(this.rotorDiscGeometry, this.rotorDiscMaterial);
      discMesh.position.set(Math.cos(angle) * armDistance, 0.14, Math.sin(angle) * armDistance);
      parent.add(discMesh);
      rotors.push(discMesh);
    });

    return { fuselage, rotors, payload: winch };
  }

  /**
   * Adds dual carbon-fiber landing skids with vertical struts for realistic landing clearance
   */
  private addLandingSkids(parent: THREE.Group): void {
    const skidGroup = new THREE.Group();
    skidGroup.position.set(0, -0.22, 0);

    // Left Rail
    const leftRail = new THREE.Mesh(this.skidRailGeometry, this.skidMaterial);
    leftRail.position.set(-0.35, -0.14, 0);
    leftRail.rotation.x = Math.PI / 2;
    skidGroup.add(leftRail);

    // Right Rail
    const rightRail = new THREE.Mesh(this.skidRailGeometry, this.skidMaterial);
    rightRail.position.set(0.35, -0.14, 0);
    rightRail.rotation.x = Math.PI / 2;
    skidGroup.add(rightRail);

    // 4 Vertical Struts
    const strutPositions = [
      { x: -0.32, z: 0.35 },
      { x: -0.32, z: -0.35 },
      { x: 0.32, z: 0.35 },
      { x: 0.32, z: -0.35 },
    ];

    strutPositions.forEach((pos) => {
      const strut = new THREE.Mesh(this.skidStrutGeometry, this.skidMaterial);
      strut.position.set(pos.x, -0.04, pos.z);
      strut.rotation.z = pos.x < 0 ? -0.18 : 0.18; // Slight splay outward for landing stability
      skidGroup.add(strut);
    });

    parent.add(skidGroup);
  }
}
