import { Application, Container } from 'pixi.js';
import { Camera } from './camera';
import { CameraTransitions, TransitionOptions } from './camera-transitions';
import { PointerInteraction } from './pointer-interaction';
import {
  MapMode,
  SelectionRule,
  SpaceRenderer,
  SpaceRendererEvents,
  VisualFilter,
} from './space-renderer';
import {
  SPATIAL_MAP_EXPORT_VERSION,
  Space,
  MapTheme,
  SpatialMapExport,
  StatusStyleMap,
} from './types';
import {
  DEFAULT_SPATIAL_MAP_SETTINGS,
  SpatialMapSettings,
  SpatialMapSettingsPatch,
} from './spatial-map-settings';

export type SpatialMapEngineEvents = SpaceRendererEvents;
export type { MapMode, SelectionRule, VisualFilter };

/**
 * SpatialMapEngine
 *
 * Framework-agnostic rendering engine. This file must never import from
 * @angular/* — it is the seed of the future @spatial-map/core package.
 *
 * It is deliberately a thin orchestrator: it owns the PixiJS Application
 * and wires together four focused collaborators, each independently
 * readable without the others:
 *
 *   PointerInteraction — raw pointer/wheel/resize events → Camera
 *   CameraTransitions  — flyTo/fitBounds/setZoom animations → Camera
 *   SpaceRenderer       — loaded spaces, painting, hover/select/drag state
 *   Camera (camera.ts)  — the world container's pan/zoom transform
 *
 * In edit mode, SpaceRenderer intercepts a space's pointerdown before it
 * reaches PointerInteraction (via stopPropagation), so dragging a space
 * never also pans the camera — no shared "what's happening" flag needed
 * between the two, the event system handles it.
 *
 * Everything below either sets this up (init/destroy) or forwards a
 * public method call to whichever collaborator owns that concern.
 */
export class SpatialMapEngine {
  private app: Application | null = null;
  private world: Container | null = null;

  private pointerInteraction: PointerInteraction | null = null;
  private transitions: CameraTransitions | null = null;
  private renderer: SpaceRenderer | null = null;
  private theme: MapTheme = DEFAULT_SPATIAL_MAP_SETTINGS.theme;
  private cameraLimits = {
    minZoom: DEFAULT_SPATIAL_MAP_SETTINGS.zoom.minZoom,
    maxZoom: DEFAULT_SPATIAL_MAP_SETTINGS.zoom.maxZoom,
  };
  private baseZoom = DEFAULT_SPATIAL_MAP_SETTINGS.zoom.baseZoom;
  private gridEnabled = DEFAULT_SPATIAL_MAP_SETTINGS.grid.enabled;
  private gridSize = DEFAULT_SPATIAL_MAP_SETTINGS.grid.size;

  private readonly onTick = (): void => {
    this.transitions?.tick();
    this.renderer?.setCameraZoom(this.transitions?.getZoom() ?? 1);
  };

  /**
   * Public camera API, matching the shape developers call it with:
   * map.camera.flyTo(id), map.camera.fitBounds(ids), map.camera.focus({ids}).
   */
  readonly camera = {
    flyTo: (id: string, options?: TransitionOptions) => this.transitions?.flyTo(id, options),
    fitBounds: (ids?: string[], options?: TransitionOptions) =>
      this.transitions?.fitBounds(ids, options),
    focus: (options: { ids: string[] } & TransitionOptions) =>
      this.transitions?.fitBounds(options.ids, options),
    setZoom: (zoom: number, options?: TransitionOptions) =>
      this.transitions?.setZoom(zoom, options),
    getZoom: () => this.transitions?.getZoom() ?? 1,
  };

  /**
   * Boots the PixiJS application into the given host element.
   * The host element should be an empty <div> sized by CSS (width/height: 100%).
   */
  async init(host: HTMLElement): Promise<void> {
    const app = new Application();

    await app.init({
      resizeTo: host,
      backgroundColor: this.theme === 'light' ? 0xf3f0e8 : 0x171b20,
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

    const cameraEngine = new Camera(this.world, this.cameraLimits);
    this.renderer = new SpaceRenderer(this.world, app.stage, () => cameraEngine.getState());
    this.renderer.setTheme(this.theme);
    this.transitions = new CameraTransitions(app, cameraEngine, (ids) =>
      this.renderer!.getSpaces(ids),
    );

    // User input always wins: dropping an in-flight transition the moment
    // a gesture starts means there's never a tug-of-war between flyTo and
    // drag — whichever the user is doing right now simply takes over.
    this.pointerInteraction = new PointerInteraction(app, cameraEngine, () =>
      this.transitions?.cancel(),
    );
    this.pointerInteraction.attach();

    app.ticker.add(this.onTick);
  }

  /** PixiJS's own rolling-average FPS — zero extra cost, it tracks this every frame regardless. */
  getFps(): number {
    return this.app?.ticker.FPS ?? 0;
  }

  // ---- Space data API — forwarded to SpaceRenderer ----

  setStatusStyles(styles: StatusStyleMap): void {
    this.renderer?.setStatusStyles(styles);
  }

  getSpaceCount(): number {
    return this.renderer?.getSpaceCount() ?? 0;
  }

  getSpace(id: string): Space | undefined {
    return this.renderer?.getSpace(id);
  }

  loadSpaces(spaces: Space[]): void {
    if (!this.renderer) throw new Error('SpatialMapEngine.loadSpaces called before init()');
    this.renderer.loadSpaces(spaces);
  }

  addSpace(space: Space): void {
    if (!this.renderer) throw new Error('SpatialMapEngine.addSpace called before init()');
    this.renderer.addSpace(space);
  }

  updateSpace(
    id: string,
    patch: {
      type?: Space['type'];
      geometry?: Partial<Space['geometry']>;
      properties?: Partial<Space['properties']>;
    },
  ): void {
    this.renderer?.updateSpace(id, patch);
  }

  removeSpace(id: string): void {
    this.renderer?.removeSpace(id);
  }

  /** Edit-mode "Bring to front" — moves a space above everything else that overlaps it. */
  bringToFront(id: string): void {
    this.renderer?.bringToFront(id);
  }

  /** Edit-mode "Send to back" — moves a space below everything else that overlaps it. */
  sendToBack(id: string): void {
    this.renderer?.sendToBack(id);
  }

  selectSpace(id: string, selected: boolean): void {
    this.renderer?.selectSpace(id, selected);
  }

  clearSelection(): void {
    this.renderer?.clearSelection();
  }

  /** Overrides which spaces can be selected — status/business rules are the
   *  only thing allowed to decide this, never a visual property like color. */
  setSelectionRule(rule: SelectionRule): void {
    this.renderer?.setSelectionRule(rule);
  }

  isSelectable(id: string): boolean {
    const space = this.renderer?.getSpace(id);
    return !!space && (this.renderer?.isSelectable(space) ?? false);
  }

  /** Keyboard/programmatic focus — shown as a visible focus indicator. */
  setFocused(id: string | null): void {
    this.renderer?.setFocused(id);
  }

  /** 'view' (hover/select/pan/zoom) or 'edit' (+ drag spaces to reposition them). */
  setMode(mode: MapMode): void {
    this.renderer?.setMode(mode);
  }

  getMode(): MapMode {
    return this.renderer?.getMode() ?? 'view';
  }

  setVisualFilter(filter: VisualFilter): void {
    this.renderer?.setVisualFilter(filter);
  }

  /** Changes the canvas background theme without affecting map data. */
  setTheme(theme: MapTheme): void {
    this.theme = theme;
    if (this.app) {
      this.app.renderer.background.color = theme === 'light' ? 0xf3f0e8 : 0x171b20;
    }
    this.renderer?.setTheme(theme);
  }

  /** Changes the camera zoom bounds. The current zoom is clamped immediately. */
  setZoomLimits(limits: { minZoom?: number; maxZoom?: number }): void {
    this.cameraLimits = {
      minZoom: Math.max(0.05, limits.minZoom ?? this.cameraLimits.minZoom),
      maxZoom: Math.max(
        Math.max(0.05, limits.minZoom ?? this.cameraLimits.minZoom),
        limits.maxZoom ?? this.cameraLimits.maxZoom,
      ),
    };
    this.transitions?.setZoomLimits(this.cameraLimits);
  }

  setGridEnabled(enabled: boolean): void {
    this.renderer?.setGridEnabled(enabled);
  }

  setGridSize(size: number): void {
    this.gridSize = Math.max(10, Math.min(500, Math.round(size)));
    this.renderer?.setGridSize(this.gridSize);
  }

  setSettings(settings: SpatialMapSettingsPatch): void {
    const nextZoom = {
      minZoom: settings.zoom?.minZoom ?? this.cameraLimits.minZoom,
      baseZoom: settings.zoom?.baseZoom ?? this.baseZoom,
      maxZoom: settings.zoom?.maxZoom ?? this.cameraLimits.maxZoom,
    };
    const safeMin = Math.max(0.05, Math.min(nextZoom.minZoom, nextZoom.maxZoom));
    const safeMax = Math.max(safeMin, nextZoom.maxZoom);
    this.baseZoom = Math.max(safeMin, Math.min(nextZoom.baseZoom, safeMax));
    this.setZoomLimits({ minZoom: safeMin, maxZoom: safeMax });

    if (settings.theme) this.setTheme(settings.theme);

    if (settings.grid) {
      this.gridEnabled = settings.grid.enabled;
      this.gridSize = Math.max(10, Math.min(500, Math.round(settings.grid.size)));
      this.renderer?.setGridEnabled(this.gridEnabled);
      this.renderer?.setGridSize(this.gridSize);
    }
  }

  getSettings(): SpatialMapSettings {
    return {
      theme: this.theme,
      zoom: {
        minZoom: this.cameraLimits.minZoom,
        baseZoom: this.baseZoom,
        maxZoom: this.cameraLimits.maxZoom,
      },
      grid: {
        enabled: this.gridEnabled,
        size: this.gridSize,
      },
    };
  }

  fitToMap(options?: TransitionOptions): void {
    this.transitions?.fitBounds(undefined, options);
  }

  on<K extends keyof SpatialMapEngineEvents>(
    event: K,
    listener: (payload: SpatialMapEngineEvents[K]) => void,
  ): void {
    this.renderer?.events.on(event, listener);
  }

  off<K extends keyof SpatialMapEngineEvents>(
    event: K,
    listener: (payload: SpatialMapEngineEvents[K]) => void,
  ): void {
    this.renderer?.events.off(event, listener);
  }

  // ---- Import/export ----

  /**
   * Serializes the currently loaded spaces. Deep-copies via JSON round-trip
   * so the caller can't mutate the engine's internal state through the
   * returned object — matches the "map is data, serializable" principle.
   */
  exportData(): SpatialMapExport {
    return JSON.parse(
      JSON.stringify({
        version: SPATIAL_MAP_EXPORT_VERSION,
        spaces: this.renderer?.getSpaces() ?? [],
      }),
    );
  }

  /** Loads spaces from a previously exported payload. */
  importData(data: SpatialMapExport): void {
    if (!data || !Array.isArray(data.spaces)) {
      throw new Error(
        'SpatialMapEngine.importData: invalid export data (expected { spaces: Space[] }).',
      );
    }
    if (data.version !== SPATIAL_MAP_EXPORT_VERSION) {
      console.warn(
        `SpatialMapEngine.importData: export version ${data.version} does not match the current version ${SPATIAL_MAP_EXPORT_VERSION}. Attempting to load anyway.`,
      );
    }
    this.loadSpaces(data.spaces);
  }

  destroy(): void {
    if (this.app) this.app.ticker.remove(this.onTick);
    this.pointerInteraction?.detach();
    this.renderer?.destroy();

    this.pointerInteraction = null;
    this.transitions = null;
    this.renderer = null;
    this.world = null;

    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
