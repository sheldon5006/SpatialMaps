import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import { Camera } from './camera';
import { TypedEmitter } from './event-emitter';
import {
  DEFAULT_STATUS_STYLES,
  FALLBACK_STATUS_STYLE,
  Space,
  StatusStyle,
  StatusStyleMap,
} from './types';

const WHEEL_ZOOM_INTENSITY = 0.0015;
const MIN_WHEEL_FACTOR = 0.8;
const MAX_WHEEL_FACTOR = 1.25;

const HOVER_STROKE_COLOR = 0xffffff;
const HOVER_STROKE_WIDTH = 2;
const SELECTED_STROKE_WIDTH = 3;

export interface SpatialMapEngineEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
}

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
  private readonly spaceData = new Map<string, Space>();
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  private hoveredId: string | null = null;
  private readonly selectedIds = new Set<string>();

  private readonly emitter = new TypedEmitter<SpatialMapEngineEvents>();

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

  on<K extends keyof SpatialMapEngineEvents>(
    event: K,
    listener: (payload: SpatialMapEngineEvents[K]) => void,
  ): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof SpatialMapEngineEvents>(
    event: K,
    listener: (payload: SpatialMapEngineEvents[K]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  /** Toggles a space's selection state. Selection is multi-select by default. */
  selectSpace(id: string, selected: boolean): void {
    if (selected === this.selectedIds.has(id)) return;
    if (selected) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
    this.repaint(id);
    this.emitter.emit('select', Array.from(this.selectedIds));
  }

  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    const previouslySelected = Array.from(this.selectedIds);
    this.selectedIds.clear();
    previouslySelected.forEach((id) => this.repaint(id));
    this.emitter.emit('select', []);
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
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;

    for (const space of spaces) {
      this.spaceData.set(space.id, space);
      const graphic = this.createSpaceGraphic(space);
      this.spaceGraphics.set(space.id, graphic);
      this.world.addChild(graphic);
    }
  }

  private createSpaceGraphic(space: Space): Graphics {
    const graphic = new Graphics();
    this.paintSpace(graphic, space);

    const { geometry } = space;
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

    graphic.on('pointerover', () => this.setHover(space.id));
    graphic.on('pointerout', () => this.setHover(null));
    graphic.on('pointertap', () => this.selectSpace(space.id, !this.selectedIds.has(space.id)));

    return graphic;
  }

  /** Redraws one space's fill/stroke using its current status + hover/selection state. */
  private paintSpace(graphic: Graphics, space: Space): void {
    const { geometry, properties } = space;
    const baseStyle =
      (properties.status && this.statusStyles[properties.status]) || FALLBACK_STATUS_STYLE;
    const style = this.applyInteractionState(space.id, baseStyle);

    graphic
      .clear()
      .rect(0, 0, geometry.width, geometry.height)
      .fill({ color: style.fill, alpha: style.fillAlpha ?? 1 });

    if (style.strokeWidth) {
      graphic.stroke({ color: style.stroke ?? style.fill, width: style.strokeWidth });
    }
  }

  /** Layers hover/selection accents on top of a space's base status style. */
  private applyInteractionState(id: string, base: StatusStyle): StatusStyle {
    const isSelected = this.selectedIds.has(id);
    const isHovered = this.hoveredId === id;

    if (isSelected) {
      const selectedStyle = this.statusStyles.selected ?? DEFAULT_STATUS_STYLES.selected;
      return {
        ...base,
        stroke: selectedStyle.fill,
        strokeWidth: SELECTED_STROKE_WIDTH,
      };
    }

    if (isHovered) {
      return {
        ...base,
        stroke: HOVER_STROKE_COLOR,
        strokeWidth: Math.max(base.strokeWidth ?? 1, HOVER_STROKE_WIDTH),
      };
    }

    return base;
  }

  private setHover(id: string | null): void {
    if (this.hoveredId === id) return;
    const previous = this.hoveredId;
    this.hoveredId = id;
    if (previous) this.repaint(previous);
    if (id) this.repaint(id);
    this.emitter.emit('hover', id);
  }

  private repaint(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    const space = this.spaceData.get(id);
    if (graphic && space) this.paintSpace(graphic, space);
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
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;
    this.world = null;
    this.camera = null;
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
