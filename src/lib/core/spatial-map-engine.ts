import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import { Camera } from './camera';
import {
  DEFAULT_STATUS_STYLES,
  FALLBACK_STATUS_STYLE,
  Space,
  StatusStyleMap,
} from './types';

const WHEEL_ZOOM_INTENSITY = 0.0015;
const MIN_WHEEL_FACTOR = 0.8;
const MAX_WHEEL_FACTOR = 1.25;

/**
 * SpatialMapEngine
 *
 * Framework-agnostic rendering engine. Owns the PixiJS Application and the
 * render loop. This file must never import from @angular/* — it is the
 * seed of the future @spatial-map/core package.
 */
export class SpatialMapEngine {
  private app: Application | null = null;

  /** Everything spatial (spaces, future background layers) lives in here.
   *  The camera transforms this container, not the stage. */
  private world: Container | null = null;
  private camera: Camera | null = null;

  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private readonly spaceGraphics = new Map<string, Graphics>();
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  /**
   * Boots the PixiJS application into the given host element.
   * The host element should be an empty <div> sized by CSS (width/height: 100%).
   */
  async init(host: HTMLElement): Promise<void> {
    const app = new Application();

    await app.init({
      resizeTo: host,
      backgroundColor: 0x1a1d23,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    host.appendChild(app.canvas);
    this.app = app;

    this.world = new Container();
    // Fixed starting offset so the first-loaded spaces aren't flush
    // against the corner. The camera moves the world from here on.
    this.world.position.set(60, 60);
    app.stage.addChild(this.world);

    this.camera = new Camera(this.world);
    this.setupInteraction(app);
  }

  private setupInteraction(app: Application): void {
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.cursor = 'grab';

    app.stage.on('pointerdown', this.onPointerDown);
    app.stage.on('globalpointermove', this.onPointerMove);
    app.stage.on('pointerup', this.onPointerUp);
    app.stage.on('pointerupoutside', this.onPointerUp);

    app.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private readonly onPointerDown = (event: FederatedPointerEvent): void => {
    this.isPanning = true;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    if (this.app) this.app.stage.cursor = 'grabbing';
  };

  private readonly onPointerMove = (event: FederatedPointerEvent): void => {
    if (!this.isPanning || !this.camera) return;
    const dx = event.global.x - this.lastPointerX;
    const dy = event.global.y - this.lastPointerY;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.camera.pan(dx, dy);
  };

  private readonly onPointerUp = (): void => {
    this.isPanning = false;
    if (this.app) this.app.stage.cursor = 'grab';
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.camera || !this.app) return;
    event.preventDefault();

    const rect = this.app.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const rawFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_INTENSITY);
    const factor = Math.min(MAX_WHEEL_FACTOR, Math.max(MIN_WHEEL_FACTOR, rawFactor));

    this.camera.zoomAt(screenX, screenY, factor);
  };

  /** Overrides the default fill/stroke used per status. */
  setStatusStyles(styles: StatusStyleMap): void {
    this.statusStyles = { ...DEFAULT_STATUS_STYLES, ...styles };
  }

  /**
   * Replaces the full set of rendered spaces. Later this will diff instead
   * of clear-and-rebuild, but a naive implementation is the right size for
   * proving the data model now.
   */
  loadSpaces(spaces: Space[]): void {
    if (!this.world) {
      throw new Error('SpatialMapEngine.loadSpaces called before init()');
    }

    this.world.removeChildren();
    this.spaceGraphics.clear();

    for (const space of spaces) {
      const graphic = this.createSpaceGraphic(space);
      this.spaceGraphics.set(space.id, graphic);
      this.world.addChild(graphic);
    }
  }

  private createSpaceGraphic(space: Space): Graphics {
    const { geometry, properties } = space;
    const style =
      (properties.status && this.statusStyles[properties.status]) ||
      FALLBACK_STATUS_STYLE;

    const graphic = new Graphics()
      .rect(0, 0, geometry.width, geometry.height)
      .fill({ color: style.fill, alpha: style.fillAlpha ?? 1 });

    if (style.strokeWidth) {
      graphic.stroke({ color: style.stroke ?? style.fill, width: style.strokeWidth });
    }

    // Position by center + pivot so rotation (when present) is around the
    // rectangle's own center rather than its top-left corner.
    graphic.pivot.set(geometry.width / 2, geometry.height / 2);
    graphic.position.set(
      geometry.x + geometry.width / 2,
      geometry.y + geometry.height / 2,
    );
    graphic.rotation = ((geometry.rotation ?? 0) * Math.PI) / 180;
    graphic.eventMode = 'static';
    graphic.cursor = 'pointer';
    graphic.label = space.id;

    return graphic;
  }

  destroy(): void {
    if (this.app) {
      this.app.stage.off('pointerdown', this.onPointerDown);
      this.app.stage.off('globalpointermove', this.onPointerMove);
      this.app.stage.off('pointerup', this.onPointerUp);
      this.app.stage.off('pointerupoutside', this.onPointerUp);
      this.app.canvas.removeEventListener('wheel', this.onWheel);
    }

    this.spaceGraphics.clear();
    this.world = null;
    this.camera = null;
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
