import { Application, FederatedPointerEvent } from 'pixi.js';
import { Camera } from './camera';

const WHEEL_ZOOM_INTENSITY = 0.0015;
const MIN_WHEEL_FACTOR = 0.8;
const MAX_WHEEL_FACTOR = 1.25;

/**
 * PointerInteraction
 *
 * Owns drag-to-pan, wheel-to-zoom, and keeping the stage's hit area in
 * sync with the canvas size. This is the only place in the engine that
 * touches raw pointer/wheel/resize events — everything else talks to
 * the Camera through its pan()/zoomAt() API.
 *
 * `onUserInputStart` fires at the start of every pan/zoom gesture so the
 * engine can cancel an in-flight camera transition (flyTo/fitBounds) —
 * user input always wins, with no fight between the two.
 */
export class PointerInteraction {
  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(
    private readonly app: Application,
    private readonly camera: Camera,
    private readonly onUserInputStart: () => void,
  ) {}

  attach(): void {
    const { app } = this;
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.cursor = 'grab';

    app.stage.on('pointerdown', this.onPointerDown);
    app.stage.on('globalpointermove', this.onPointerMove);
    app.stage.on('pointerup', this.onPointerUp);
    app.stage.on('pointerupoutside', this.onPointerUp);

    app.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Don't rely on app.screen being mutated in place on resize — reassign
    // hitArea explicitly so empty-canvas drag/wheel keep working at the
    // new size even if that internal detail ever changes.
    app.renderer.on('resize', this.onResize);
  }

  detach(): void {
    const { app } = this;
    app.stage.off('pointerdown', this.onPointerDown);
    app.stage.off('globalpointermove', this.onPointerMove);
    app.stage.off('pointerup', this.onPointerUp);
    app.stage.off('pointerupoutside', this.onPointerUp);
    app.canvas.removeEventListener('wheel', this.onWheel);
    app.renderer.off('resize', this.onResize);
  }

  private readonly onResize = (): void => {
    this.app.stage.hitArea = this.app.screen;
  };

  private readonly onPointerDown = (event: FederatedPointerEvent): void => {
    this.onUserInputStart();
    this.isPanning = true;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.app.stage.cursor = 'grabbing';
  };

  private readonly onPointerMove = (event: FederatedPointerEvent): void => {
    if (!this.isPanning) return;
    const dx = event.global.x - this.lastPointerX;
    const dy = event.global.y - this.lastPointerY;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.camera.pan(dx, dy);
  };

  private readonly onPointerUp = (): void => {
    this.isPanning = false;
    this.app.stage.cursor = 'grab';
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.onUserInputStart();

    const rect = this.app.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const rawFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_INTENSITY);
    const factor = Math.min(MAX_WHEEL_FACTOR, Math.max(MIN_WHEEL_FACTOR, rawFactor));

    this.camera.zoomAt(screenX, screenY, factor);
  };
}
