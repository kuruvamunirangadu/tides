/**
 * DroneVirtualFeedManager.ts
 * 
 * TIDES Drone Phase 5: Simulated Camera Virtual Feed Renderer
 * 
 * Renders the actual Three.js coastal safety scene from the perspective of
 * any selected drone camera using a dedicated virtual perspective camera:
 * - Decoupled from the main simulation camera (OrbitControls unaffected)
 * - Synchronizes with drone 3D position, heading, and gimbal pitch
 * - Renders to an offscreen WebGLRenderTarget (480x270 @ 25 FPS) and mirrors to an HTML5 canvas
 * - Renders explicit tactical "NO SIGNAL" / "CAMERA FAULTED" screens when camera is offline
 * - Zero memory leaks: disposes render targets and textures cleanly
 */

import * as THREE from 'three';
import { DroneCameraRegistry } from '../../drones/camera/DroneCameraRegistry';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DroneCameraRecord } from '../../drones/camera/droneCamera.types';
import { DroneVisionManager } from '../../drones/vision/DroneVisionManager';

export class DroneVirtualFeedManager {
  private static instance: DroneVirtualFeedManager | null = null;

  private cameraRegistry: DroneCameraRegistry;
  private droneRegistry: DroneRegistry;

  public virtualCamera: THREE.PerspectiveCamera;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private pixelBuffer: Uint8Array | null = null;
  private targetCanvas: HTMLCanvasElement | null = null;
  private targetCanvasCtx: CanvasRenderingContext2D | null = null;

  private selectedDroneId: string = 'DRONE-01';
  private isFeedActive: boolean = false;
  private lastRenderTimeMs: number = 0;
  private readonly RENDER_INTERVAL_MS: number = 33; // ~30 FPS throttle

  public static getInstance(): DroneVirtualFeedManager {
    if (!DroneVirtualFeedManager.instance) {
      DroneVirtualFeedManager.instance = new DroneVirtualFeedManager();
    }
    return DroneVirtualFeedManager.instance;
  }

  constructor() {
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();

    // Dedicated virtual camera (16:9 aspect ratio)
    this.virtualCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.5, 800);
    this.virtualCamera.name = 'DroneVirtualFeedCamera';
  }

  public setSelectedDrone(droneId: string): void {
    this.selectedDroneId = droneId;
  }

  public getSelectedDroneId(): string {
    return this.selectedDroneId;
  }

  /**
   * Synchronizes the virtual perspective camera transform (position, orientation, FOV)
   * with the target drone's 3D position and camera gimbal orientation.
   */
  public syncVirtualCamera(droneId: string = this.selectedDroneId): boolean {
    const drone = this.droneRegistry.getDrone(droneId);
    const cameraRecord = this.cameraRegistry.getCameraByDroneId(droneId);
    if (!drone || !cameraRecord) return false;

    const alt = Math.max(0.1, drone.position3D.y);
    this.virtualCamera.position.set(drone.position3D.x, alt - 0.15, drone.position3D.z);

    const effectiveFov = cameraRecord.fieldOfViewDegrees / cameraRecord.opticalZoomLevel;
    this.virtualCamera.fov = effectiveFov;
    this.virtualCamera.updateProjectionMatrix();

    const totalHeadingDeg = drone.headingDegrees + cameraRecord.gimbal.yawDegrees;
    const headingRad = THREE.MathUtils.degToRad(-totalHeadingDeg);
    const pitchRad = THREE.MathUtils.degToRad(cameraRecord.gimbal.pitchDegrees);
    const euler = new THREE.Euler(pitchRad, headingRad, 0, 'YXZ');
    this.virtualCamera.quaternion.setFromEuler(euler);
    return true;
  }

  public setFeedActive(active: boolean): void {
    this.isFeedActive = active;
  }

  public getIsFeedActive(): boolean {
    return this.isFeedActive;
  }

  /**
   * Binds an HTML5 canvas element from the React UI to receive the live simulated feed
   */
  public attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.targetCanvas = canvas;
    if (canvas) {
      this.targetCanvasCtx = canvas.getContext('2d');
      const w = canvas.width || 480;
      const h = canvas.height || 270;
      this.initRenderTarget(w, h);
    } else {
      this.targetCanvasCtx = null;
    }
  }

  private initRenderTarget(width: number, height: number): void {
    if (this.renderTarget && (this.renderTarget.width !== width || this.renderTarget.height !== height)) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }

    if (!this.renderTarget) {
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
      this.pixelBuffer = new Uint8Array(width * height * 4);
    }
  }

  /**
   * Main per-frame render hook called from BeachScene3D render loop
   */
  public renderFeed(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    clockMs: number = performance.now()
  ): void {
    if (!this.isFeedActive || !this.targetCanvas || !this.targetCanvasCtx) {
      return;
    }

    // Rate-limit rendering to ~30 FPS to preserve primary scene performance
    if (clockMs - this.lastRenderTimeMs < this.RENDER_INTERVAL_MS) {
      return;
    }
    this.lastRenderTimeMs = clockMs;

    const drone = this.droneRegistry.getDrone(this.selectedDroneId);
    const cameraRecord = this.cameraRegistry.getCameraByDroneId(this.selectedDroneId);

    // 1. If camera or drone is offline/faulted, render procedural tactical diagnostic
    if (!drone || !cameraRecord || cameraRecord.status !== 'ACTIVE') {
      this.renderOfflineScreen(cameraRecord);
      return;
    }

    const w = this.targetCanvas.width;
    const h = this.targetCanvas.height;
    this.initRenderTarget(w, h);

    if (!this.renderTarget || !this.pixelBuffer) return;

    // 2. Synchronize Virtual Camera Transform with Drone Airframe & Gimbal
    this.virtualCamera.aspect = w / h;
    this.syncVirtualCamera(this.selectedDroneId);

    // 3. Render Scene to Offscreen Render Target
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.virtualCamera);
    renderer.setRenderTarget(prevTarget);

    // 4. Transfer Render Target to 2D UI Canvas
    renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      w,
      h,
      this.pixelBuffer
    );

    // WebGL flips Y relative to Canvas 2D; invert rows into ImageData
    const imgData = this.targetCanvasCtx.createImageData(w, h);
    const data = imgData.data;
    const rowBytes = w * 4;

    for (let y = 0; y < h; y++) {
      const srcOffset = (h - 1 - y) * rowBytes;
      const dstOffset = y * rowBytes;
      data.set(this.pixelBuffer.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
    }

    this.targetCanvasCtx.putImageData(imgData, 0, 0);

    // 5. Draw Tactical HUD Crosshairs & OSD on Canvas
    this.renderOSDOverlay(this.targetCanvasCtx, drone, cameraRecord, w, h);

    // 6. Draw AI Computer Vision Bounding Boxes & Tracking IDs (Phase 6)
    this.renderCVOverlays(this.targetCanvasCtx, cameraRecord.cameraId, w, h);
  }

  /**
   * Renders AI person detection bounding boxes and tracking IDs (Phase 6)
   */
  private renderCVOverlays(
    ctx: CanvasRenderingContext2D,
    cameraId: string,
    w: number,
    h: number
  ): void {
    const visionManager = DroneVisionManager.getInstance();
    if (!visionManager.getIsOverlayEnabled()) return;

    const tracks = visionManager.getActiveTracks().filter((t) => t.cameraId === cameraId);
    if (tracks.length === 0) return;

    ctx.save();

    for (const track of tracks) {
      const bx = track.bbox.xMin * w;
      const by = track.bbox.yMin * h;
      const bw = track.bbox.width * w;
      const bh = track.bbox.height * h;

      // Color scheme based on track state: Emerald for CONFIRMED, Cyan for TENTATIVE, Amber for STALE
      let strokeColor = '#10b981'; // Emerald
      if (track.state === 'TENTATIVE') strokeColor = '#06b6d4'; // Cyan
      else if (track.state === 'STALE') strokeColor = '#f59e0b'; // Amber

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      if (track.state === 'STALE') {
        ctx.setLineDash([4, 3]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw bounding box rectangle
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accent brackets
      const corner = Math.min(6, bw * 0.25, bh * 0.25);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Top left
      ctx.moveTo(bx, by + corner); ctx.lineTo(bx, by); ctx.lineTo(bx + corner, by);
      // Top right
      ctx.moveTo(bx + bw - corner, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + corner);
      // Bottom left
      ctx.moveTo(bx, by + bh - corner); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + corner, by + bh);
      // Bottom right
      ctx.moveTo(bx + bw - corner, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - corner);
      ctx.stroke();

      // Label Pill Tag above box
      const label = `[${track.trackId}] PERSON ${Math.round(track.confidence * 100)}%`;
      ctx.font = 'bold 9px monospace';
      const textW = ctx.measureText(label).width;
      const tagH = 13;
      const tagY = Math.max(0, by - tagH - 2);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(bx, tagY, textW + 8, tagH);

      ctx.fillStyle = strokeColor;
      ctx.fillText(label, bx + 4, tagY + 10);
    }

    ctx.restore();
  }

  /**
   * Renders tactical HUD crosshairs, pitch ladder, and telemetry OSD over the virtual feed
   */
  private renderOSDOverlay(
    ctx: CanvasRenderingContext2D,
    drone: any,
    cam: DroneCameraRecord,
    w: number,
    h: number
  ): void {
    ctx.save();

    // Tactical crosshairs
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // Center reticle
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    // Crosshair ticks
    ctx.moveTo(cx - 28, cy);
    ctx.lineTo(cx - 16, cy);
    ctx.moveTo(cx + 16, cy);
    ctx.lineTo(cx + 28, cy);
    ctx.moveTo(cx, cy - 28);
    ctx.lineTo(cx, cy - 16);
    ctx.moveTo(cx, cy + 16);
    ctx.lineTo(cx, cy + 28);
    ctx.stroke();

    // Corner brackets
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    const bLen = 18;
    const pad = 12;

    ctx.beginPath();
    // Top Left
    ctx.moveTo(pad, pad + bLen);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + bLen, pad);
    // Top Right
    ctx.moveTo(w - pad - bLen, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + bLen);
    // Bottom Left
    ctx.moveTo(pad, h - pad - bLen);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(pad + bLen, h - pad);
    // Bottom Right
    ctx.moveTo(w - pad - bLen, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(w - pad, h - pad - bLen);
    ctx.stroke();

    // Top OSD Banner
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`CAM: ${cam.cameraId} [${cam.role}]`, pad + 6, pad + 14);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`PITCH: ${cam.gimbal.pitchDegrees.toFixed(0)}° | ZOOM: ${cam.opticalZoomLevel.toFixed(1)}x`, pad + 6, pad + 28);

    // Bottom OSD Telemetry
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`ALT: ${drone.position3D.y.toFixed(1)}m AGL | HDG: ${drone.headingDegrees}° | SPD: ${drone.speedMps.toFixed(1)}m/s`, pad + 6, h - pad - 6);

    ctx.restore();
  }

  /**
   * Renders an explicit diagnostic screen when the camera is not actively streaming
   */
  private renderOfflineScreen(cam?: DroneCameraRecord): void {
    if (!this.targetCanvas || !this.targetCanvasCtx) return;

    const ctx = this.targetCanvasCtx;
    const w = this.targetCanvas.width;
    const h = this.targetCanvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Diagonal warning stripes
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 4;
    for (let x = -h; x < w + h; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    const statusText = cam ? `CAMERA STATUS: ${cam.status}` : 'CAMERA NOT CONFIGURED';
    ctx.fillText(statusText, w / 2, h / 2 - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Optical downlink inactive or drone grounded on pad.', w / 2, h / 2 + 14);
    ctx.textAlign = 'left';
  }

  public dispose(): void {
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
    this.pixelBuffer = null;
    this.targetCanvas = null;
    this.targetCanvasCtx = null;
  }
}
