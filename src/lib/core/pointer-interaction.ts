import { Application, FederatedPointerEvent } from 'pixi.js';
import { Camera } from './camera';

const WHEEL_ZOOM_INTENSITY = 0.0015;
const MIN_WHEEL_FACTOR = 0.8;
const MAX_WHEEL_FACTOR = 1.25;

interface ActivePointer {
  x: number;
  y: number;
  type: string;
}

function distance(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: ActivePointer, b: ActivePointer): { x: number; y: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/**
 * PointerInteraction
 *
 * Owns drag-to-pan, wheel-to-zoom, touch pinch-zoom, and keeping the
 * stage's hit area in sync with the canvas size. This is the only place
 * in the engine that touches raw pointer/wheel/resize events.
 *
 * Desktop behavior is unchanged:
 * - pointer drag pans
 * - wheel zooms around the pointer
 *
 * Touch adds:
 * - one-finger drag pans
 * - two-finger pinch zooms around the pinch center and pans with the
 *   moving pinch center
 */
export class PointerInteraction {
  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private readonly activePointers = new Map<number, ActivePointer>();
  private pinchActive = false;
  private lastPinchDistance = 0;
  private lastPinchCenter = { x: 0, y: 0 };

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
    app.stage.on('pointercancel', this.onPointerUp);

    app.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Keep browser gestures confined to the surrounding page; the map
    // canvas itself is controlled by SpatialMapEngine.
    app.canvas.style.touchAction = 'none';
    app.canvas.style.userSelect = 'none';
    app.canvas.style.webkitUserSelect = 'none';

    app.renderer.on('resize', this.onResize);
  }

  detach(): void {
    const { app } = this;
    app.stage.off('pointerdown', this.onPointerDown);
    app.stage.off('globalpointermove', this.onPointerMove);
    app.stage.off('pointerup', this.onPointerUp);
    app.stage.off('pointerupoutside', this.onPointerUp);
    app.stage.off('pointercancel', this.onPointerUp);
    app.canvas.removeEventListener('wheel', this.onWheel);
    app.renderer.off('resize', this.onResize);

    this.activePointers.clear();
    this.isPanning = false;
    this.pinchActive = false;
  }

  private readonly onResize = (): void => {
    this.app.stage.hitArea = this.app.screen;
  };

  private readonly onPointerDown = (event: FederatedPointerEvent): void => {
    const pointer = {
      x: event.global.x,
      y: event.global.y,
      type: event.pointerType,
    };

    this.activePointers.set(event.pointerId, pointer);
    this.onUserInputStart();

    if (this.activePointers.size >= 2 && this.hasTouchLikePointers()) {
      const [first, second] = this.getTouchLikePointers();
      const center = midpoint(first, second);

      this.pinchActive = true;
      this.isPanning = false;
      this.lastPinchDistance = Math.max(1, distance(first, second));
      this.lastPinchCenter = center;
      this.app.stage.cursor = 'grabbing';
      return;
    }

    this.isPanning = true;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.app.stage.cursor = 'grabbing';
  };

  private readonly onPointerMove = (event: FederatedPointerEvent): void => {
    const active = this.activePointers.get(event.pointerId);
    if (active) {
      active.x = event.global.x;
      active.y = event.global.y;
      active.type = event.pointerType;
    }

    if (this.pinchActive && this.activePointers.size >= 2 && this.hasTouchLikePointers()) {
      const [first, second] = this.getTouchLikePointers();
      const nextDistance = Math.max(1, distance(first, second));
      const nextCenter = midpoint(first, second);

      const zoomFactor = nextDistance / this.lastPinchDistance;

      if (zoomFactor !== 1) {
        this.camera.zoomAt(nextCenter.x, nextCenter.y, zoomFactor);
      }

      this.camera.pan(
        nextCenter.x - this.lastPinchCenter.x,
        nextCenter.y - this.lastPinchCenter.y,
      );

      this.lastPinchDistance = nextDistance;
      this.lastPinchCenter = nextCenter;
      return;
    }

    if (!this.isPanning || this.activePointers.size !== 1) return;

    const dx = event.global.x - this.lastPointerX;
    const dy = event.global.y - this.lastPointerY;

    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.camera.pan(dx, dy);
  };

  private readonly onPointerUp = (event: FederatedPointerEvent): void => {
    this.activePointers.delete(event.pointerId);

    if (this.activePointers.size >= 2 && this.hasTouchLikePointers()) {
      const [first, second] = this.getTouchLikePointers();
      this.pinchActive = true;
      this.isPanning = false;
      this.lastPinchDistance = Math.max(1, distance(first, second));
      this.lastPinchCenter = midpoint(first, second);
      this.app.stage.cursor = 'grabbing';
      return;
    }

    if (this.activePointers.size === 1 && this.hasTouchLikePointers()) {
      const [remaining] = this.getTouchLikePointers();
      this.pinchActive = false;
      this.isPanning = true;
      this.lastPointerX = remaining.x;
      this.lastPointerY = remaining.y;
      this.app.stage.cursor = 'grabbing';
      return;
    }

    this.pinchActive = false;
    this.isPanning = false;
    this.app.stage.cursor = 'grab';
  };

  private hasTouchLikePointers(): boolean {
    return this.getTouchLikePointers().length >= 1;
  }

  private getTouchLikePointers(): ActivePointer[] {
    return [...this.activePointers.values()].filter(
      (pointer) => pointer.type === 'touch' || pointer.type === 'pen',
    );
  }

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
