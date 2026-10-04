import { Application, Container, Graphics } from 'pixi.js';
import {
  DEFAULT_STATUS_STYLES,
  FALLBACK_STATUS_STYLE,
  Space,
  StatusStyleMap,
} from './types';

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
   *  The camera (step 1.4) will transform this container, not the stage. */
  private world: Container | null = null;

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
    // Fixed padding until the camera (pan/zoom/fit-to-view) lands in the
    // next step and takes over positioning the world container.
    this.world.position.set(60, 60);
    app.stage.addChild(this.world);
  }

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
    this.spaceGraphics.clear();
    this.world = null;
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
