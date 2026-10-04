import { Container } from 'pixi.js';

export interface CameraLimits {
  minZoom: number;
  maxZoom: number;
}

const DEFAULT_LIMITS: CameraLimits = { minZoom: 0.2, maxZoom: 4 };

/**
 * Owns the world container's pan/zoom transform. Pure math + PixiJS
 * container mutation — no DOM/event listening here, that stays in the
 * engine so Camera is easy to unit test later.
 */
export class Camera {
  private zoomValue = 1;
  private readonly limits: CameraLimits;

  constructor(private readonly world: Container, limits: Partial<CameraLimits> = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  get zoom(): number {
    return this.zoomValue;
  }

  /** Moves the world by a screen-space delta (e.g. pointer drag delta). */
  pan(dx: number, dy: number): void {
    this.world.position.x += dx;
    this.world.position.y += dy;
  }

  /**
   * Zooms by `factor` while keeping the world point currently under
   * (screenX, screenY) stationary on screen — the standard pointer-centered
   * zoom behavior every modern map/design tool uses.
   */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    const newZoom = this.clampZoom(this.zoomValue * factor);
    if (newZoom === this.zoomValue) return;

    const worldX = (screenX - this.world.position.x) / this.zoomValue;
    const worldY = (screenY - this.world.position.y) / this.zoomValue;

    this.zoomValue = newZoom;
    this.world.scale.set(this.zoomValue);

    this.world.position.x = screenX - worldX * this.zoomValue;
    this.world.position.y = screenY - worldY * this.zoomValue;
  }

  private clampZoom(z: number): number {
    return Math.min(this.limits.maxZoom, Math.max(this.limits.minZoom, z));
  }
}
