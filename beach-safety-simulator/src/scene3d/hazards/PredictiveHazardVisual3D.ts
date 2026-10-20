import * as THREE from 'three';
import { PredictionRecord } from '../../prediction/ForecastTypes';

/**
 * PredictiveHazardVisual3D.ts
 * 
 * 3D Visualization of Forecasted Hazard Expansion (Milestone 6):
 * - Displays translucent, visually distinct projected hazard boundaries
 * - Dashed outline envelope representing predicted lateral and seaward rip expansion
 * - Opacity and pulse modulated by predicted velocity (>1.5 m/s)
 * - Explicitly distinguished from measured live current
 */
export class PredictiveHazardVisual3D {
  public readonly group: THREE.Group;
  private projectedPlumeMesh: THREE.Mesh;
  private boundaryLine: THREE.LineSegments;
  private material: THREE.MeshBasicMaterial;
  private lineMaterial: THREE.LineDashedMaterial;

  private clock: number = 0;
  public visible: boolean = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PredictiveHazardLayer3D';

    // 1. Projected Plume Geometry (trapezoidal offshore corridor)
    // Centered around x=12 (central rip neck in 3D), extends from z=-5 to z=-65
    const shape = new THREE.Shape();
    shape.moveTo(-6, -5);
    shape.lineTo(6, -5);
    shape.lineTo(16, -65);
    shape.lineTo(-16, -65);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2); // Flat on ocean surface

    this.material = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber forecast hue
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.projectedPlumeMesh = new THREE.Mesh(geo, this.material);
    this.projectedPlumeMesh.position.set(12, 0.08, 0); // Slightly above water
    this.group.add(this.projectedPlumeMesh);

    // 2. Dashed Boundary Line
    const edges = new THREE.EdgesGeometry(geo);
    this.lineMaterial = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.boundaryLine = new THREE.LineSegments(edges, this.lineMaterial);
    this.boundaryLine.computeLineDistances();
    this.boundaryLine.position.set(12, 0.1, 0);
    this.group.add(this.boundaryLine);
  }

  /**
   * Per-frame animation update
   */
  public update(delta: number, forecast: PredictionRecord | null): void {
    if (!forecast || !this.visible) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.clock += delta;

    const isHazardProjected = forecast.predictedValue >= 1.5;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 2.5);

    // If rip is projected to intensify, widen and brighten projected plume
    const scaleX = isHazardProjected ? 1.0 + pulse * 0.15 : 0.8;
    this.projectedPlumeMesh.scale.set(scaleX, 1, 1);
    this.boundaryLine.scale.set(scaleX, 1, 1);

    this.material.opacity = isHazardProjected ? 0.22 + pulse * 0.08 : 0.12;
    this.material.color.setHex(isHazardProjected ? 0xf43f5e : 0xf59e0b);
  }

  public setVisible(show: boolean): void {
    this.visible = show;
    this.group.visible = show;
  }

  public dispose(): void {
    this.material.dispose();
    this.lineMaterial.dispose();
    this.projectedPlumeMesh.geometry.dispose();
    this.boundaryLine.geometry.dispose();
  }
}

