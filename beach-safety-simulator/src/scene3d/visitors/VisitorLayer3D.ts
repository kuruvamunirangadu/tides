import * as THREE from 'three';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { VisitorCharacter3D } from './VisitorCharacter3D';
import { VisitorCoordinateMapper } from './VisitorCoordinateMapper';
import { VisitorModelLoader } from './VisitorModelLoader';

/**
 * VisitorLayer3D.ts
 * 
 * Manages the population of 3D animated beach visitors:
 * - Synchronizes with the authoritative VisitorEngine simulation state
 * - Reuses persistent character instances by stable visitor ID
 * - Removes exited visitors cleanly with zero memory leaks
 * - High-performance batch updates targeting 60 FPS
 */
export class VisitorLayer3D {
  public readonly group: THREE.Group;
  private characters: Map<string, VisitorCharacter3D> = new Map();
  private coordinateMapper: VisitorCoordinateMapper;

  constructor() {
    this.group = new THREE.Group();
    this.coordinateMapper = new VisitorCoordinateMapper();
  }

  /**
   * Updates all active visitors in the scene
   */
  public update(
    delta: number,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): void {
    const activeIds = new Set<string>();

    // 1. Update or spawn active visitors
    for (let i = 0; i < visitors.length; i++) {
      const v = visitors[i];
      if (v.active === false || v.state === 'EXITED') continue;

      activeIds.add(v.id);

      let char = this.characters.get(v.id);
      if (!char) {
        char = new VisitorCharacter3D(v);
        this.characters.set(v.id, char);
        this.group.add(char.root);
      }

      const transform = this.coordinateMapper.map(v, beach, environment);
      char.update(delta, transform);
    }

    // 2. Remove departed visitors
    for (const [id, char] of this.characters.entries()) {
      if (!activeIds.has(id)) {
        char.dispose();
        this.coordinateMapper.removeVisitor(id);
        this.characters.delete(id);
      }
    }
  }

  /**
   * Get active count
   */
  public getCount(): number {
    return this.characters.size;
  }

  /**
   * Memory disposal
   */
  public dispose(): void {
    for (const char of this.characters.values()) {
      char.dispose();
    }
    this.characters.clear();
    this.coordinateMapper.clear();
    VisitorModelLoader.dispose();
  }
}

