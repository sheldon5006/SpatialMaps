import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import { unionBounds } from './bounds';
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

const DEFAULT_TRANSITION_DURATION_MS = 500;
const FIT_BOUNDS_PADDING_PX = 80;
const FLY_TO_PADDING_PX = 160;

export interface SpatialMapEngineEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
}

export interface TransitionOptions {
  /** Transition length in ms. Defaults to 500. */
  duration?: number;
  /** Screen-space padding (px) kept clear around fitted content. */
  padding?: number;
}

interface CameraTransition {
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  elapsedMs: number;
  durationMs: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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

  /** Internal transform owner. The public `camera` property below is the
   *  developer-facing API surface (flyTo/fitBounds/focus/setZoom); this is
   *  the low-level pan/zoom math it's built on. */
  private cameraEngine: Camera | null = null;

  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private readonly spaceGraphics = new Map<string, Graphics>();
  private readonly spaceData = new Map<string, Space>();
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  private hoveredId: string | null = null;
  private readonly selectedIds = new Set<string>();

  private readonly emitter = new TypedEmitter<SpatialMapEngineEvents>();

  private transition: CameraTransition | null = null;
  private readonly onTick = (): void => this.updateTransition();

  /**
   * Public camera API, matching the shape developers call it with:
   * map.camera.flyTo(id), map.camera.fitBounds(ids), map.camera.focus({ids}).
   */
  readonly camera = {
    flyTo: (id: string, options?: TransitionOptions) => this.flyTo(id, options),
    fitBounds: (ids?: string[], options?: TransitionOptions) => this.fitBounds(ids, options),
    focus: (options: { ids: string[] } & TransitionOptions) =>
      this.fitBounds(options.ids, options),
    setZoom: (zoom: number, options?: TransitionOptions) => this.setZoom(zoom, options),
    getZoom: () => this.cameraEngine?.zoom ?? 1,
  };

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

    this.cameraEngine = new Camera(this.world);
    this.setupInteraction(app);
    app.ticker.add(this.onTick);
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

    // Don't rely on app.screen being mutated in place on resize — reassign
    // hitArea explicitly so empty-canvas drag/wheel keep working at the
    // new size even if that internal detail ever changes.
    app.renderer.on('resize', this.onResize);
  }

  private readonly onResize = (): void => {
    if (!this.app) return;
    this.app.stage.hitArea = this.app.screen;
  };

  private readonly onPointerDown = (event: FederatedPointerEvent): void => {
    // User input always wins: drop any in-flight camera transition instead
    // of fighting it, so there's never a tug-of-war between flyTo and drag.
    this.transition = null;
    this.isPanning = true;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    if (this.app) this.app.stage.cursor = 'grabbing';
  };

  private readonly onPointerMove = (event: FederatedPointerEvent): void => {
    if (!this.isPanning || !this.cameraEngine) return;
    const dx = event.global.x - this.lastPointerX;
    const dy = event.global.y - this.lastPointerY;
    this.lastPointerX = event.global.x;
    this.lastPointerY = event.global.y;
    this.cameraEngine.pan(dx, dy);
  };

  private readonly onPointerUp = (): void => {
    this.isPanning = false;
    if (this.app) this.app.stage.cursor = 'grab';
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.cameraEngine || !this.app) return;
    event.preventDefault();
    this.transition = null;

    const rect = this.app.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const rawFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_INTENSITY);
    const factor = Math.min(MAX_WHEEL_FACTOR, Math.max(MIN_WHEEL_FACTOR, rawFactor));

    this.cameraEngine.zoomAt(screenX, screenY, factor);
  };

  private updateTransition(): void {
    if (!this.transition || !this.cameraEngine || !this.app) return;

    this.transition.elapsedMs += this.app.ticker.deltaMS;
    const t = Math.min(1, this.transition.elapsedMs / this.transition.durationMs);
    const eased = easeOutCubic(t);

    this.cameraEngine.setTransform(
      lerp(this.transition.fromX, this.transition.toX, eased),
      lerp(this.transition.fromY, this.transition.toY, eased),
      lerp(this.transition.fromZoom, this.transition.toZoom, eased),
    );

    if (t >= 1) this.transition = null;
  }

  private animateTo(toX: number, toY: number, toZoom: number, duration: number): void {
    if (!this.cameraEngine) return;
    const from = this.cameraEngine.getState();
    this.transition = {
      fromX: from.x,
      fromY: from.y,
      fromZoom: from.zoom,
      toX,
      toY,
      toZoom: this.cameraEngine.clampZoom(toZoom),
      elapsedMs: 0,
      durationMs: duration,
    };
  }

  /** Fits the given spaces' combined bounds into view. Fits all loaded spaces if `ids` is omitted. */
  private fitBounds(ids?: string[], options?: TransitionOptions): void {
    if (!this.app || !this.cameraEngine) return;

    const spaces = (ids ?? Array.from(this.spaceData.keys()))
      .map((id) => this.spaceData.get(id))
      .filter((s): s is Space => !!s);

    const bounds = unionBounds(spaces);
    if (!bounds) return;

    const padding = options?.padding ?? FIT_BOUNDS_PADDING_PX;
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const availableWidth = Math.max(1, this.app.screen.width - padding * 2);
    const availableHeight = Math.max(1, this.app.screen.height - padding * 2);

    const targetZoom = this.cameraEngine.clampZoom(
      Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;

    this.animateTo(
      screenCenterX - centerX * targetZoom,
      screenCenterY - centerY * targetZoom,
      targetZoom,
      options?.duration ?? DEFAULT_TRANSITION_DURATION_MS,
    );
  }

  /** Flies to a single space. Like fitBounds, but with generous padding so one small space doesn't zoom in absurdly tight. */
  private flyTo(id: string, options?: TransitionOptions): void {
    this.fitBounds([id], { padding: FLY_TO_PADDING_PX, ...options });
  }

  /** Animates zoom only, keeping the point currently under screen-center fixed. */
  private setZoom(zoom: number, options?: TransitionOptions): void {
    if (!this.app || !this.cameraEngine) return;

    const current = this.cameraEngine.getState();
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;
    const worldCenterX = (screenCenterX - current.x) / current.zoom;
    const worldCenterY = (screenCenterY - current.y) / current.zoom;

    const targetZoom = this.cameraEngine.clampZoom(zoom);
    this.animateTo(
      screenCenterX - worldCenterX * targetZoom,
      screenCenterY - worldCenterY * targetZoom,
      targetZoom,
      options?.duration ?? DEFAULT_TRANSITION_DURATION_MS,
    );
  }

  /** Overrides the default fill/stroke used per status. */
  setStatusStyles(styles: StatusStyleMap): void {
    this.statusStyles = { ...DEFAULT_STATUS_STYLES, ...styles };
  }

  /** PixiJS's own rolling-average FPS — zero extra cost, it tracks this every frame regardless. */
  getFps(): number {
    return this.app?.ticker.FPS ?? 0;
  }

  /** Number of currently loaded spaces. */
  getSpaceCount(): number {
    return this.spaceData.size;
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
    this.transition = null;

    for (const space of spaces) {
      this.spaceData.set(space.id, space);
      const graphic = this.createSpaceGraphic(space);
      this.spaceGraphics.set(space.id, graphic);
      this.world.addChild(graphic);
    }
  }

  /** Adds one space. If `id` already exists, replaces it (with a dev warning — likely a caller bug). */
  addSpace(space: Space): void {
    if (!this.world) {
      throw new Error('SpatialMapEngine.addSpace called before init()');
    }

    if (this.spaceData.has(space.id)) {
      console.warn(
        `SpatialMapEngine.addSpace: a space with id "${space.id}" already exists and will be replaced. Use updateSpace() if that was intentional.`,
      );
      this.removeSpace(space.id);
    }

    this.spaceData.set(space.id, space);
    const graphic = this.createSpaceGraphic(space);
    this.spaceGraphics.set(space.id, graphic);
    this.world.addChild(graphic);
  }

  /** Merges `patch` into an existing space's geometry/properties and repaints/repositions it. */
  updateSpace(id: string, patch: { geometry?: Partial<Space['geometry']>; properties?: Partial<Space['properties']> }): void {
    const existing = this.spaceData.get(id);
    const graphic = this.spaceGraphics.get(id);
    if (!existing || !graphic) {
      console.warn(`SpatialMapEngine.updateSpace: no space with id "${id}" is loaded.`);
      return;
    }

    const merged: Space = {
      ...existing,
      geometry: { ...existing.geometry, ...patch.geometry },
      properties: { ...existing.properties, ...patch.properties },
    };
    this.spaceData.set(id, merged);

    this.paintSpace(graphic, merged);
    this.applyGeometry(graphic, merged.geometry);
  }

  /** Removes one space. Clears it from hover/selection state if applicable. */
  removeSpace(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    if (!graphic || !this.world) {
      console.warn(`SpatialMapEngine.removeSpace: no space with id "${id}" is loaded.`);
      return;
    }

    this.world.removeChild(graphic);
    graphic.destroy();
    this.spaceGraphics.delete(id);
    this.spaceData.delete(id);

    if (this.hoveredId === id) {
      this.hoveredId = null;
      this.emitter.emit('hover', null);
    }
    if (this.selectedIds.delete(id)) {
      this.emitter.emit('select', Array.from(this.selectedIds));
    }
  }

  private createSpaceGraphic(space: Space): Graphics {
    const graphic = new Graphics();
    this.paintSpace(graphic, space);
    this.applyGeometry(graphic, space.geometry);

    graphic.eventMode = 'static';
    graphic.cursor = 'pointer';
    graphic.label = space.id;

    graphic.on('pointerover', () => this.setHover(space.id));
    graphic.on('pointerout', () => this.setHover(null));
    graphic.on('pointertap', () => this.selectSpace(space.id, !this.selectedIds.has(space.id)));

    return graphic;
  }

  /** Positions/rotates a graphic from its geometry. Shared by create and updateSpace. */
  private applyGeometry(graphic: Graphics, geometry: Space['geometry']): void {
    // Position by center + pivot so rotation (when present) is around the
    // rectangle's own center rather than its top-left corner.
    graphic.pivot.set(geometry.width / 2, geometry.height / 2);
    graphic.position.set(geometry.x + geometry.width / 2, geometry.y + geometry.height / 2);
    graphic.rotation = ((geometry.rotation ?? 0) * Math.PI) / 180;
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
      this.app.ticker.remove(this.onTick);
      this.app.stage.off('pointerdown', this.onPointerDown);
      this.app.stage.off('globalpointermove', this.onPointerMove);
      this.app.stage.off('pointerup', this.onPointerUp);
      this.app.stage.off('pointerupoutside', this.onPointerUp);
      this.app.canvas.removeEventListener('wheel', this.onWheel);
      this.app.renderer.off('resize', this.onResize);
    }

    this.transition = null;
    this.spaceGraphics.clear();
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;
    this.world = null;
    this.cameraEngine = null;
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
