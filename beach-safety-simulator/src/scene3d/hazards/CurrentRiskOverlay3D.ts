import * as THREE from 'three';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { BeachRiskOverview } from '../../models/Risk';
import { BeachTerrain } from '../BeachTerrain';

const RISK_COLORS: Record<string, number> = {
  LOW: 0x22c55e,
  MODERATE: 0xf59e0b,
  HIGH: 0xf97316,
  CRITICAL: 0xef4444,
};

export class CurrentRiskOverlay3D {
  public readonly group: THREE.Group;

  private readonly zoneMeshes = new Map<string, THREE.Mesh>();
  private readonly zoneLabels = new Map<string, THREE.Sprite>();
  private visible = true;

  public constructor(beach: Beach) {
    this.group = new THREE.Group();
    this.group.name = 'CurrentRiskOverlay3D';

    for (const zone of beach.zones) {
      const centerX2d = zone.x + zone.width / 2;
      const centerX3d = (centerX2d / Math.max(1, beach.width) - 0.5) * 200;
      const width3d = (zone.width / Math.max(1, beach.width)) * 200;
      const shoreZ = BeachTerrain.getShorelineZ(centerX3d);
      const geometry = new THREE.PlaneGeometry(Math.max(4, width3d), 26);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({
        color: RISK_COLORS.LOW,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(centerX3d, 0.32, shoreZ - 13);
      mesh.name = `CurrentRiskZone-${zone.id}`;
      this.zoneMeshes.set(zone.id, mesh);
      this.group.add(mesh);

      const label = this.createLabel(zone.name);
      label.position.set(centerX3d, 1.2, shoreZ - 13);
      this.zoneLabels.set(zone.id, label);
      this.group.add(label);
    }
  }

  public update(beach: Beach, riskOverview: BeachRiskOverview | null | undefined, _environment: Environment, _visitors: Visitor[]): void {
    const impacts = riskOverview?.currentImpact?.zoneImpacts;
    for (const zone of beach.zones) {
      const mesh = this.zoneMeshes.get(zone.id);
      const label = this.zoneLabels.get(zone.id);
      const impact = impacts?.[zone.id];
      if (!mesh || !label) continue;

      const material = mesh.material as THREE.MeshBasicMaterial;
      const color = impact ? RISK_COLORS[impact.category] : RISK_COLORS.LOW;
      material.color.setHex(color);
      material.opacity = impact?.affected ? 0.12 + (impact.influenceScore / 100) * 0.2 : 0;
      label.visible = Boolean(impact?.affected);
      if (impact?.affected) {
        this.updateLabel(label, `${zone.name} | ${impact.category} | ${impact.visitorIds.length} swimmers`);
      }
    }
    this.group.visible = this.visible;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const mesh of this.zoneMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const label of this.zoneLabels.values()) {
      const material = label.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
    }
    this.zoneMeshes.clear();
    this.zoneLabels.clear();
    this.group.clear();
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.font = 'bold 22px sans-serif';
      context.fillStyle = 'rgba(15, 23, 42, 0.88)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#f8fafc';
      context.fillText(text, 12, 40);
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }));
    sprite.scale.set(18, 2.25, 1);
    return sprite;
  }

  private updateLabel(sprite: THREE.Sprite, text: string): void {
    const material = sprite.material as THREE.SpriteMaterial;
    const canvas = material.map?.image as HTMLCanvasElement | undefined;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(15, 23, 42, 0.88)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 22px sans-serif';
    context.fillStyle = '#f8fafc';
    context.fillText(text, 12, 40);
    material.map!.needsUpdate = true;
  }
}