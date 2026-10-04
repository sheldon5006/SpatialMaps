import {
  BlurFilter,
  Circle,
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import { TypedEmitter } from './event-emitter';
import {
  DEFAULT_STATUS_STYLES,
  FALLBACK_STATUS_STYLE,
  Space,
  SpacePropKind,
  SpaceStatus,
  StatusStyle,
  StatusStyleMap,
} from './types';

const HOVER_STROKE_COLOR = 0xffffff;
const HOVER_STROKE_WIDTH = 2;
const SELECTED_STROKE_WIDTH = 3;

const CHECK_BADGE_RADIUS = 8;
const CHECK_BADGE_MARGIN = 6;
const CHECK_COLOR = 0xffffff;

const HANDLE_OFFSET = 26;
const HANDLE_RADIUS = 6;
/** The clickable area is larger than the visual dot — easier to grab with
 *  a mouse, and necessary at all for touch/trackpad input. */
const HANDLE_HIT_RADIUS = 14;
const HANDLE_COLOR = 0xffffff;
const HANDLE_LINE_COLOR = 0xffffff;

const LABEL_COLOR = 0xffffff;
const LABEL_OUTLINE_COLOR = 0x000000;
/** Below this, a box is too small for its name to read cleanly — hide it
 *  rather than render illegible text. */
const LABEL_MIN_WIDTH = 28;
const LABEL_MIN_HEIGHT = 20;

/**
 * Filter-only recede effect.
 *
 * IMPORTANT: selecting a booth does NOT trigger this effect. The effect is
 * driven exclusively by an explicit visual filter (status or "selected").
 * Matching booths stay crisp; non-matching booths get a subtle frosted-glass
 * treatment with only a small amount of blur so the map remains readable.
 */
/**
 * Liquid-glass treatment used ONLY on booths receded by an active visual
 * filter. This is intentionally vector-based: no blur filter, no backdrop
 * blur, and no status mutation. The layered translucent body/rims/highlights
 * create a light-catching "liquid" surface while the booth underneath stays
 * recognizable.
 */
const FILTER_GLASS_TINT_COLOR = 0xeaf4ff;
const FILTER_GLASS_TINT_ALPHA = 0.10;
const FILTER_GLASS_BODY_COLOR = 0xffffff;
const FILTER_GLASS_BODY_ALPHA = 0.045;
const FILTER_GLASS_RIM_COLOR = 0xffffff;
const FILTER_GLASS_RIM_ALPHA = 0.72;
const FILTER_GLASS_INNER_RIM_ALPHA = 0.30;
const FILTER_GLASS_DARK_RIM_COLOR = 0x8ea5bf;
const FILTER_GLASS_DARK_RIM_ALPHA = 0.22;
const FILTER_GLASS_SPECULAR_ALPHA = 0.62;

/** Very light content blur used only on booths receded by an active filter. */
const FILTER_CONTENT_BLUR = 0.9;

/** Selection gets a slight lift — a small scale-up reads as "raised toward
 *  you", reinforcing the highlight beyond just the outline color. */
const SELECTED_SCALE = 1.04;

export interface CameraSnapshot {
  x: number;
  y: number;
  zoom: number;
}

/**
 * 'view': hover + select + pan/zoom (the search/rental viewer experience).
 * 'edit': spaces can be dragged to move, and the selected space gets a
 * draggable rotation handle. Hover/select still work the same as 'view'.
 */
export type MapMode = 'view' | 'edit';

/** Visual filter for the glass/blur overlay. 'all' shows everything crisp. */
export type VisualFilter =
  | { type: 'all' }
  | { type: 'status'; status: SpaceStatus }
  | { type: 'selected' };

/** Decides whether a space can be added to the user's selection. Status is
 *  business truth; this is the only thing allowed to gate selection — the
 *  UI must never infer selectability from color or any other visual cue.
 *  Override via engine.setSelectionRule() for real status/business rules;
 *  the default is a reasonable placeholder (available/reserved only). */
export type SelectionRule = (space: Space) => boolean;

const DEFAULT_SELECTION_RULE: SelectionRule = (space) => {
  if (space.type !== 'booth') return false;
  const status = space.properties.status;
  return status === 'available' || status === 'reserved';
};

export interface SpaceRendererEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
  /** A previously selected space was removed from the selection because it
   *  stopped being selectable (e.g. a status update made it unavailable) —
   *  not because the user deselected it. Lets a host app notify the user. */
  selectioninvalidated: string[];
  focus: string | null;
  modechange: MapMode;
  /** Fires once, when a move or rotate drag in edit mode ends — not on every pointermove. */
  spacetransform: { id: string; geometry: Space['geometry'] };
  /** Fires whenever the loaded space set changes shape (load/add/remove) —
   *  lets a host UI (e.g. a selection tray or accessible proxy list) keep
   *  its own mirror of the data in sync without polling. */
  spaceschange: Space[];
}

/**
 * One space's PixiJS presence. `node` is the interactive, positioned
 * Container — pointer events, pivot/position/rotation all live on it.
 * `shape` (the status-colored rect), `image` (optional) and `handle`
 * (rotation grip) are its children, each purely a visual layer.
 * PixiJS v8 deprecates adding children directly to a Graphics instance,
 * so the rect is drawn by a Graphics but never parents anything itself —
 * the plain Container is what attachments hang off of.
 */
type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

interface SpaceNode {
  node: Container;
  shape: Graphics;
  handle: Graphics;
  resizeHandles: Record<ResizeCorner, Graphics>;
  label: Text;
  /** Liquid-glass overlay drawn over a space when an active filter recedes it. */
  glass: Graphics;
  /** Small corner badge shown only while selected. */
  checkBadge: Graphics;
  image?: { sprite: Sprite; url: string };
}

/**
 * SpaceRenderer
 *
 * Owns the loaded spaces (both their data and their PixiJS nodes), the
 * hover/selection/drag/rotate interaction state, and everything about
 * painting a space: status color or image fill, hover outline, selection
 * outline, the rotation handle. This is the engine's data layer —
 * addSpace/updateSpace/removeSpace/loadSpaces all live here, alongside
 * the pointer handlers that drive hover/select/drag/rotate.
 *
 * It does not know about the camera's pan/zoom transitions or app-level
 * setup — it only needs a `world` container to add/remove nodes from, a
 * `stage` to listen for drag-continuation events on (the same pattern
 * PointerInteraction uses for panning), and a camera-state getter so
 * drag/rotate math converts screen space to world space correctly at
 * any pan/zoom.
 */
export class SpaceRenderer {
  private readonly spaceNodes = new Map<string, SpaceNode>();
  private readonly spaceData = new Map<string, Space>();
  private readonly contentBlurFilter = new BlurFilter({
    strength: FILTER_CONTENT_BLUR,
    quality: 2,
  });
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  private hoveredId: string | null = null;
  private focusedId: string | null = null;
  private readonly selectedIds = new Set<string>();
  private selectionRule: SelectionRule = DEFAULT_SELECTION_RULE;

  private mode: MapMode = 'view';
  private visualFilter: VisualFilter = { type: 'all' };

  private draggingId: string | null = null;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartGeomX = 0;
  private dragStartGeomY = 0;

  private rotatingId: string | null = null;
  private rotateCenterX = 0;
  private rotateCenterY = 0;

  private resizingId: string | null = null;
  private resizingCorner: ResizeCorner | null = null;
  private resizeStartGeometry: Space['geometry'] | null = null;

  readonly events = new TypedEmitter<SpaceRendererEvents>();

  constructor(
    private readonly world: Container,
    private readonly stage: Container,
    private readonly getCamera: () => CameraSnapshot,
  ) {
    // Drag continuation: like PointerInteraction's panning, these use the
    // "global" variants so a move/rotate keeps tracking the pointer even
    // once it moves outside the dragged shape's own bounds.
    this.stage.on('globalpointermove', this.onDragMove);
    this.stage.on('pointerup', this.onDragEnd);
    this.stage.on('pointerupoutside', this.onDragEnd);
  }

  /** Switches between the view (hover/select/pan/zoom) and edit (+ drag/rotate) experiences. */
  setMode(mode: MapMode): void {
    if (this.mode === mode) return;
    this.cancelDrag();
    this.mode = mode;

    // Editor mode allows selecting any booth. When returning to view mode,
    // revalidate those editor-only selections against the real selection rule.
    if (mode === 'view') {
      const invalidated: string[] = [];
      for (const id of Array.from(this.selectedIds)) {
        const space = this.spaceData.get(id);
        if (!space || !this.isSelectable(space)) {
          this.selectedIds.delete(id);
          invalidated.push(id);
        }
      }

      if (invalidated.length > 0) {
        invalidated.forEach((id) => this.repaint(id));
        this.events.emit('select', Array.from(this.selectedIds));
        this.events.emit('selectioninvalidated', invalidated);
      }
    }

    this.spaceData.forEach((space, id) => this.updateCursor(id, space));
    // The rotation handle only shows for a selected space in edit mode,
    // so entering/leaving edit mode needs to repaint whatever is selected.
    this.selectedIds.forEach((id) => this.repaint(id));
    this.updateFocusEffect();
    this.events.emit('modechange', mode);
  }

  /** Edit mode is always "move"; view mode is "pointer" for selectable
   *  spaces and the browser default for ones the SelectionRule rejects —
   *  a non-selectable space should never look clickable. */
  private updateCursor(id: string, space: Space): void {
    const entry = this.spaceNodes.get(id);
    if (!entry) return;
    const cursor =
      this.mode === 'edit' ? 'move' : this.isSelectable(space) ? 'pointer' : 'default';
    // shape is the actual hit target (node itself has no hitArea), so its
    // own cursor is what Pixi displays — kept in sync with node's.
    entry.node.cursor = cursor;
    entry.shape.cursor = cursor;
  }

  getMode(): MapMode {
    return this.mode;
  }

  setVisualFilter(filter: VisualFilter): void {
    this.visualFilter = filter;
    this.updateFocusEffect();
  }

  /** Overrides the default fill/stroke used per status. */
  setStatusStyles(styles: StatusStyleMap): void {
    this.statusStyles = { ...DEFAULT_STATUS_STYLES, ...styles };
  }

  /** Overrides which spaces can be selected — status/business truth is the
   *  only thing allowed to decide this, never a visual property. */
  setSelectionRule(rule: SelectionRule): void {
    this.selectionRule = rule;
    this.spaceData.forEach((space, id) => this.updateCursor(id, space));
  }

  isSelectable(space: Space): boolean {
    return this.selectionRule(space);
  }

  /** Keyboard/programmatic focus — visually treated like hover (a visible
   *  focus indicator), independent of whether the pointer is involved. */
  setFocused(id: string | null): void {
    if (this.focusedId === id) return;
    const previous = this.focusedId;
    this.focusedId = id;
    if (previous) this.repaint(previous);
    if (id) this.repaint(id);
    this.events.emit('focus', id);
  }

  getSpaceCount(): number {
    return this.spaceData.size;
  }

  getSpace(id: string): Space | undefined {
    return this.spaceData.get(id);
  }

  /** Resolves spaces by id, or all loaded spaces if `ids` is omitted. Used by camera.fitBounds(). */
  getSpaces(ids?: string[]): Space[] {
    return (ids ?? Array.from(this.spaceData.keys()))
      .map((id) => this.spaceData.get(id))
      .filter((s): s is Space => !!s);
  }

  /**
   * Replaces the full set of rendered spaces. Later this will diff instead
   * of clear-and-rebuild, but a naive implementation is the right size for
   * proving the data model now.
   */
  loadSpaces(spaces: Space[]): void {
    this.cancelDrag();
    this.world.removeChildren();
    this.spaceNodes.clear();
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;

    for (const space of spaces) {
      this.spaceData.set(space.id, space);
      const entry = this.createSpaceNode(space);
      this.spaceNodes.set(space.id, entry);
      this.world.addChild(entry.node);
    }

    this.updateFocusEffect();
    this.events.emit('spaceschange', Array.from(this.spaceData.values()));
  }

  /** Adds one space. If `id` already exists, replaces it (with a dev warning — likely a caller bug). */
  addSpace(space: Space): void {
    if (this.spaceData.has(space.id)) {
      console.warn(
        `SpatialMapEngine.addSpace: a space with id "${space.id}" already exists and will be replaced. Use updateSpace() if that was intentional.`,
      );
      this.removeSpace(space.id);
    }

    this.spaceData.set(space.id, space);
    const entry = this.createSpaceNode(space);
    this.spaceNodes.set(space.id, entry);
    this.world.addChild(entry.node);
    this.updateFocusEffect(); // a newly added space should be dimmed too if a focus is active
    this.events.emit('spaceschange', Array.from(this.spaceData.values()));
  }

  /** Merges `patch` into an existing space's geometry/properties and repaints/repositions it. */
  updateSpace(
    id: string,
    patch: { geometry?: Partial<Space['geometry']>; properties?: Partial<Space['properties']> },
  ): void {
    const existing = this.spaceData.get(id);
    const entry = this.spaceNodes.get(id);
    if (!existing || !entry) {
      console.warn(`SpatialMapEngine.updateSpace: no space with id "${id}" is loaded.`);
      return;
    }

    const merged: Space = {
      ...existing,
      geometry: { ...existing.geometry, ...patch.geometry },
      properties: { ...existing.properties, ...patch.properties },
    };
    this.spaceData.set(id, merged);

    this.paintSpace(entry, merged);
    this.applyGeometry(entry, merged.geometry);
    this.updateCursor(id, merged);

    // A status/data change can make a previously selected space invalid
    // (e.g. a backend update marks it sold) — the UI must never keep
    // showing a selection the business rules no longer allow.
    if (this.mode !== 'edit' && this.selectedIds.has(id) && !this.isSelectable(merged)) {
      this.selectedIds.delete(id);
      this.repaint(id);
      this.updateFocusEffect();
      this.events.emit('select', Array.from(this.selectedIds));
      this.events.emit('selectioninvalidated', [id]);
    }

    this.updateFocusEffect();
    this.events.emit('spaceschange', Array.from(this.spaceData.values()));
  }

  /** Removes one space. Clears it from hover/selection/drag/rotate state if applicable. */
  removeSpace(id: string): void {
    const entry = this.spaceNodes.get(id);
    if (!entry) {
      console.warn(`SpatialMapEngine.removeSpace: no space with id "${id}" is loaded.`);
      return;
    }

    if (this.draggingId === id || this.rotatingId === id) this.cancelDrag();
    this.world.removeChild(entry.node);
    entry.node.destroy({ children: true });
    this.spaceNodes.delete(id);
    this.spaceData.delete(id);

    if (this.hoveredId === id) {
      this.hoveredId = null;
      this.events.emit('hover', null);
    }
    if (this.focusedId === id) this.focusedId = null;
    if (this.selectedIds.delete(id)) {
      this.events.emit('select', Array.from(this.selectedIds));
    }
    this.events.emit('spaceschange', Array.from(this.spaceData.values()));
  }

  /**
   * Toggles a space's selection state.
   *
   * View mode:
   *   - multi-select is allowed
   *   - the real SelectionRule gates selection
   *
   * Edit mode:
   *   - any booth may be selected, regardless of status
   *   - exactly ONE booth may be selected at a time
   *
   * This keeps editor interactions deterministic while preserving the
   * public/view multi-selection behaviour.
   */
  selectSpace(id: string, selected: boolean): void {
    const alreadySelected = this.selectedIds.has(id);
    if (selected === alreadySelected) return;

    if (!selected) {
      this.selectedIds.delete(id);
      this.repaint(id);
      this.updateFocusEffect();
      this.events.emit('select', Array.from(this.selectedIds));
      return;
    }

    const space = this.spaceData.get(id);
    if (!space) return;

    // Editor users can select any booth, regardless of business status.
    if (this.mode === 'edit') {
      const previouslySelected = Array.from(this.selectedIds).filter((selectedId) => selectedId !== id);
      this.selectedIds.clear();
      this.selectedIds.add(id);

      // Repaint the old selection so its selection ring/badge disappears.
      previouslySelected.forEach((selectedId) => this.repaint(selectedId));
      this.repaint(id);
      this.updateFocusEffect();
      this.events.emit('select', Array.from(this.selectedIds));
      return;
    }

    // View mode keeps the real business-selection rule and supports
    // multiple selected booths.
    if (!this.isSelectable(space)) return;

    this.selectedIds.add(id);
    this.repaint(id);
    this.updateFocusEffect();
    this.events.emit('select', Array.from(this.selectedIds));
  }

  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    const previouslySelected = Array.from(this.selectedIds);
    this.selectedIds.clear();
    previouslySelected.forEach((id) => this.repaint(id));
    this.updateFocusEffect();
    this.events.emit('select', []);
  }

  /** Moves a space to render above everything else (edit mode: "Bring to front"). */
  bringToFront(id: string): void {
    const entry = this.spaceNodes.get(id);
    if (!entry) return;
    this.world.setChildIndex(entry.node, this.world.children.length - 1);
    this.syncSpaceDataOrderToWorld();
  }

  /** Moves a space to render below everything else (edit mode: "Send to back"). */
  sendToBack(id: string): void {
    const entry = this.spaceNodes.get(id);
    if (!entry) return;
    this.world.setChildIndex(entry.node, 0);
    this.syncSpaceDataOrderToWorld();
  }

  /** Keeps spaceData's iteration order matching the actual render order, so
   *  exportData()/getSpaces() reflect a bringToFront/sendToBack the same way
   *  a reload of that data would reproduce visually. */
  private syncSpaceDataOrderToWorld(): void {
    const reordered = new Map<string, Space>();
    for (const child of this.world.children) {
      const id = child.label;
      const space = id ? this.spaceData.get(id) : undefined;
      if (space) reordered.set(id!, space);
    }
    this.spaceData.clear();
    reordered.forEach((space, id) => this.spaceData.set(id, space));
  }

  /**
   * Recedes spaces that don't match the current visual filter under a
   * liquid-glass overlay. Selection itself never drives this.
   *
   * "All" means every booth remains completely crisp. An explicit status
   * filter or "selected" filter controls which booths receive the overlay.
   */
  private updateFocusEffect(): void {
    this.spaceNodes.forEach((entry, id) => {
      const isSelected = this.selectedIds.has(id);
      const recede = this.shouldRecede(id);

      // Keep the liquid-glass overlay crisp, while the booth's own content
      // (including its name) recedes softly behind it.
      this.applyContentFocus(entry, recede);
      entry.node.alpha = 1;
      entry.node.scale.set(isSelected ? SELECTED_SCALE : 1);
      entry.glass.visible = recede;
    });
  }

  private shouldRecede(id: string): boolean {
    if (this.visualFilter.type === 'all') return false;

    const space = this.spaceData.get(id);
    if (!space) return false;

    // Infrastructure and props are background/context elements, so they
    // always recede under any active filter. "All" remains fully crisp.
    if (space.type !== 'booth') return true;

    if (this.visualFilter.type === 'selected') return !this.selectedIds.has(id);
    return space.properties.status !== this.visualFilter.status;
  }

  destroy(): void {
    this.stage.off('globalpointermove', this.onDragMove);
    this.stage.off('pointerup', this.onDragEnd);
    this.stage.off('pointerupoutside', this.onDragEnd);

    this.cancelDrag();
    this.resizingId = null;
    this.resizingCorner = null;
    this.resizeStartGeometry = null;
    this.spaceNodes.clear();
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;
    this.focusedId = null;
  }

  private createSpaceNode(space: Space): SpaceNode {
    const node = new Container();
    // Explicit z-order prevents async image loading or the glass overlay from
    // ever covering booth names/selection affordances.
    node.sortableChildren = true;

    const shape = new Graphics();
    shape.zIndex = 0;
    // The shape provides its own hit area from its drawn rect — the node
    // deliberately has NO explicit hitArea of its own. Setting one would
    // make Pixi treat it as the only hit region for the whole subtree,
    // which would make the handle (positioned outside that rect, above
    // the shape) permanently unreachable by hit-testing.
    shape.eventMode = 'static';
    node.addChild(shape);

    const label = new Text({
      text: '',
      style: {
        fontSize: 12,
        fill: LABEL_COLOR,
        stroke: { color: LABEL_OUTLINE_COLOR, width: 3 },
        align: 'center',
      },
    });
    label.eventMode = 'none';
    label.anchor.set(0.5);
    label.zIndex = 10;
    node.addChild(label);

    // Liquid-glass overlay shown only when an active visual filter recedes
    // this space. Its z-index is intentionally below the booth label so the
    // booth name is never covered.
    const glass = new Graphics();
    glass.eventMode = 'none';
    glass.visible = false;
    glass.zIndex = 5;
    node.addChild(glass);

    // Selected-state badge — a small check mark, visible regardless of the
    // booth's own fill color (status must stay distinguishable by more
    // than color alone, and so must selection).
    const checkBadge = new Graphics();
    checkBadge.eventMode = 'none';
    checkBadge.visible = false;
    checkBadge.zIndex = 20;
    node.addChild(checkBadge);

    const handle = new Graphics();
    handle.eventMode = 'none';
    handle.zIndex = 30;
    handle.hitArea = new Circle(0, 0, HANDLE_HIT_RADIUS);
    handle.visible = false;
    handle.cursor = 'grab';
    handle.on('pointerdown', (event) => this.onHandlePointerDown(space.id, event));
    node.addChild(handle);

    const resizeHandles = {} as Record<ResizeCorner, Graphics>;
    const corners: ResizeCorner[] = ['nw', 'ne', 'se', 'sw'];
    for (const corner of corners) {
      const resizeHandle = new Graphics();
      resizeHandle.eventMode = 'none';
      resizeHandle.zIndex = 40;
      resizeHandle.hitArea = new Circle(0, 0, 9);
      resizeHandle.visible = false;
      resizeHandle.cursor = this.resizeCursor(corner);
      resizeHandle.on('pointerdown', (event) =>
        this.onResizeHandlePointerDown(space.id, corner, event),
      );
      resizeHandles[corner] = resizeHandle;
      node.addChild(resizeHandle);
    }

    const entry: SpaceNode = {
      node,
      shape,
      handle,
      resizeHandles,
      label,
      glass,
      checkBadge,
    };

    node.eventMode = 'static';
    node.label = space.id;

    node.on('pointerover', () => this.setHover(space.id));
    node.on('pointerout', () => this.setHover(null));
    node.on('pointertap', () => this.selectSpace(space.id, !this.selectedIds.has(space.id)));
    node.on('pointerdown', (event) => this.onSpacePointerDown(space.id, event));

    this.paintSpace(entry, space);
    this.applyGeometry(entry, space.geometry);
    // Not using updateCursor(id, ...) here — it looks the entry up via
    // spaceNodes, which the caller only populates after this returns.
    const cursor = this.mode === 'edit' ? 'move' : this.isSelectable(space) ? 'pointer' : 'default';
    node.cursor = cursor;
    shape.cursor = cursor;

    return entry;
  }

  private resizeCursor(corner: ResizeCorner): string {
    return corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize';
  }

  private drawResizeHandles(
    handles: Record<ResizeCorner, Graphics>,
    geometry: Space['geometry'],
  ): void {
    const corners: Record<ResizeCorner, { x: number; y: number }> = {
      nw: { x: 0, y: 0 },
      ne: { x: geometry.width, y: 0 },
      se: { x: geometry.width, y: geometry.height },
      sw: { x: 0, y: geometry.height },
    };

    for (const [corner, handle] of Object.entries(handles) as [
      ResizeCorner,
      Graphics,
    ][]) {
      const { x, y } = corners[corner];
      handle.position.set(x, y);
      handle.clear().roundRect(-5, -5, 10, 10, 2).fill({ color: 0xffffff, alpha: 0.96 });
      handle.stroke({ color: 0x3a7afe, width: 1.25, alpha: 0.95 });
    }
  }

  private readonly onResizeHandlePointerDown = (
    id: string,
    corner: ResizeCorner,
    event: FederatedPointerEvent,
  ): void => {
    if (this.mode !== 'edit') return;

    const space = this.spaceData.get(id);
    if (!space) return;

    event.stopPropagation();

    this.resizingId = id;
    this.resizingCorner = corner;
    this.resizeStartGeometry = { ...space.geometry };
  };

    private readonly onSpacePointerDown = (id: string, event: FederatedPointerEvent): void => {
    if (this.mode !== 'edit') return;

    const space = this.spaceData.get(id);
    if (!space) return;

    // Stop this pointerdown from reaching PointerInteraction's stage-level
    // listener, so dragging a space never also pans the camera underneath it.
    event.stopPropagation();

    this.draggingId = id;
    this.dragStartPointerX = event.global.x;
    this.dragStartPointerY = event.global.y;
    this.dragStartGeomX = space.geometry.x;
    this.dragStartGeomY = space.geometry.y;
  };

  private readonly onHandlePointerDown = (id: string, event: FederatedPointerEvent): void => {
    if (this.mode !== 'edit') return;

    const space = this.spaceData.get(id);
    if (!space) return;

    event.stopPropagation();

    this.rotatingId = id;
    this.rotateCenterX = space.geometry.x + space.geometry.width / 2;
    this.rotateCenterY = space.geometry.y + space.geometry.height / 2;
  };

  private readonly onDragMove = (event: FederatedPointerEvent): void => {
    if (this.resizingId && this.resizingCorner && this.resizeStartGeometry) {
      this.resizeFromPointer(event, this.resizingId, this.resizingCorner, this.resizeStartGeometry);
      return;
    }

    if (this.draggingId) {
      const zoom = this.getCamera().zoom;
      const dx = (event.global.x - this.dragStartPointerX) / zoom;
      const dy = (event.global.y - this.dragStartPointerY) / zoom;
      this.updateSpace(this.draggingId, {
        geometry: { x: this.dragStartGeomX + dx, y: this.dragStartGeomY + dy },
      });
      return;
    }

    if (this.rotatingId) {
      const cam = this.getCamera();
      const worldX = (event.global.x - cam.x) / cam.zoom;
      const worldY = (event.global.y - cam.y) / cam.zoom;
      const dx = worldX - this.rotateCenterX;
      const dy = worldY - this.rotateCenterY;

      // 0deg = straight up, increasing clockwise — matches the stored
      // geometry.rotation convention ("degrees, clockwise, around center").
      let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      this.updateSpace(this.rotatingId, { geometry: { rotation: Math.round(angleDeg) } });
    }
  };

  private resizeFromPointer(
    event: FederatedPointerEvent,
    id: string,
    corner: ResizeCorner,
    start: Space['geometry'],
  ): void {
    const cam = this.getCamera();
    const pointerWorldX = (event.global.x - cam.x) / cam.zoom;
    const pointerWorldY = (event.global.y - cam.y) / cam.zoom;

    const startCenterX = start.x + start.width / 2;
    const startCenterY = start.y + start.height / 2;
    const angle = ((start.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Convert the pointer into the start geometry's local coordinate system.
    const worldDx = pointerWorldX - startCenterX;
    const worldDy = pointerWorldY - startCenterY;
    const localX = worldDx * cos + worldDy * sin;
    const localY = -worldDx * sin + worldDy * cos;

    const sx = corner === 'ne' || corner === 'se' ? 1 : -1;
    const sy = corner === 'se' || corner === 'sw' ? 1 : -1;

    const anchorX = -sx * start.width / 2;
    const anchorY = -sy * start.height / 2;
    const minSize = 4;

    const targetX = sx > 0
      ? Math.max(anchorX + minSize, localX)
      : Math.min(anchorX - minSize, localX);
    const targetY = sy > 0
      ? Math.max(anchorY + minSize, localY)
      : Math.min(anchorY - minSize, localY);

    let newWidth = Math.abs(targetX - anchorX);
    let newHeight = Math.abs(targetY - anchorY);

    // A circle remains a true circle while still allowing free corner sizing.
    if (start.type === 'circle') {
      const diameter = Math.max(newWidth, newHeight);
      newWidth = diameter;
      newHeight = diameter;
    }

    const newCenterLocalX = (targetX + anchorX) / 2;
    const newCenterLocalY = (targetY + anchorY) / 2;

    const newCenterWorldX =
      startCenterX + newCenterLocalX * cos - newCenterLocalY * sin;
    const newCenterWorldY =
      startCenterY + newCenterLocalX * sin + newCenterLocalY * cos;

    this.updateSpace(id, {
      geometry: {
        x: newCenterWorldX - newWidth / 2,
        y: newCenterWorldY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      },
    });
  }

  private readonly onDragEnd = (): void => {
    if (this.resizingId) {
      const id = this.resizingId;
      this.resizingId = null;
      this.resizingCorner = null;
      this.resizeStartGeometry = null;
      const space = this.spaceData.get(id);
      if (space) this.events.emit('spacetransform', { id, geometry: space.geometry });
      return;
    }

    if (this.draggingId) {
      const id = this.draggingId;
      this.draggingId = null;
      const space = this.spaceData.get(id);
      if (space) this.events.emit('spacetransform', { id, geometry: space.geometry });
      return;
    }

    if (this.rotatingId) {
      const id = this.rotatingId;
      this.rotatingId = null;
      const space = this.spaceData.get(id);
      if (space) this.events.emit('spacetransform', { id, geometry: space.geometry });
    }
  };

  private cancelDrag(): void {
    this.draggingId = null;
    this.rotatingId = null;
    this.resizingId = null;
    this.resizingCorner = null;
    this.resizeStartGeometry = null;
  }

  /** Positions/rotates a node from its geometry. */
  private applyGeometry(entry: SpaceNode, geometry: Space['geometry']): void {
    // Position by center + pivot so rotation (when present) is around the
    // rectangle's own center rather than its top-left corner.
    entry.node.pivot.set(geometry.width / 2, geometry.height / 2);
    entry.node.position.set(geometry.x + geometry.width / 2, geometry.y + geometry.height / 2);
    entry.node.rotation = ((geometry.rotation ?? 0) * Math.PI) / 180;
  }

  /** Redraws one space's fill/stroke/image using its current status + hover/selection state. */
  private paintSpace(entry: SpaceNode, space: Space): void {
    const { geometry, properties } = space;
    const baseStyle =
      (properties.status && this.statusStyles[properties.status]) || FALLBACK_STATUS_STYLE;
    const style = this.applyInteractionState(space, baseStyle);
    const hasImage = typeof properties.imageUrl === 'string' && properties.imageUrl.length > 0;

    // Draw booths using their selected vector geometry. Infrastructure
    // and props use a lightweight map-symbol renderer instead.
    entry.shape.clear();

    if (space.type !== 'booth') {
      this.drawContextElement(entry.shape, space, geometry.width, geometry.height);
    } else {
      switch (geometry.type) {
        case 'circle': {
          const radius = Math.min(geometry.width, geometry.height) / 2;
          entry.shape.circle(geometry.width / 2, geometry.height / 2, radius);
          break;
        }
        case 'ellipse':
          entry.shape.ellipse(
            geometry.width / 2,
            geometry.height / 2,
            geometry.width / 2,
            geometry.height / 2,
          );
          break;
        case 'rounded-rectangle':
          entry.shape.roundRect(
            0,
            0,
            geometry.width,
            geometry.height,
            Math.min(16, Math.min(geometry.width, geometry.height) * 0.18),
          );
          break;
        case 'triangle':
          entry.shape.poly([
            geometry.width / 2, 0,
            geometry.width, geometry.height,
            0, geometry.height,
          ]);
          break;
        case 'diamond':
          entry.shape.poly([
            geometry.width / 2, 0,
            geometry.width, geometry.height / 2,
            geometry.width / 2, geometry.height,
            0, geometry.height / 2,
          ]);
          break;
        case 'line':
          entry.shape.roundRect(
            0,
            0,
            geometry.width,
            Math.max(2, geometry.height),
            Math.max(1, geometry.height / 2),
          );
          break;
        case 'rectangle':
        default:
          entry.shape.rect(0, 0, geometry.width, geometry.height);
          break;
      }
    }


    // Image fills currently support rectangles only; non-rectangular
    // geometry keeps its status fill until shape masking is introduced.
    entry.shape.fill({
      color: style.fill,
      alpha: hasImage && geometry.type === 'rectangle' ? 0 : (style.fillAlpha ?? 1),
    });

    if (style.strokeWidth) {
      entry.shape.stroke({ color: style.stroke ?? style.fill, width: style.strokeWidth });
    }

    this.updateImage(entry, space);
    this.updateLabel(entry, space);
    this.applyContentFocus(entry, this.shouldRecede(space.id));
    this.drawGlass(entry.glass, geometry); // visibility is set by updateFocusEffect()
    this.drawCheckBadge(entry.checkBadge, geometry);
    entry.checkBadge.visible = this.selectedIds.has(space.id);

    this.drawHandle(entry.handle, geometry);
    const showEditorHandles = this.mode === 'edit' && this.selectedIds.has(space.id);
    entry.handle.visible = showEditorHandles;
    entry.handle.eventMode = showEditorHandles ? 'static' : 'none';
    entry.node.addChild(entry.handle); // keep the rotation handle above the label/image

    this.drawResizeHandles(entry.resizeHandles, geometry);
    for (const resizeHandle of Object.values(entry.resizeHandles)) {
      resizeHandle.visible = showEditorHandles;
      resizeHandle.eventMode = showEditorHandles ? 'static' : 'none';
      entry.node.addChild(resizeHandle);
    }
  }

  /** Draws simple vector symbols for infrastructure and prop elements. */
  private drawContextElement(
    shape: Graphics,
    space: Space,
    width: number,
    height: number,
  ): void {
    const kind = space.properties.propKind as SpacePropKind | undefined;

    switch (kind) {
      case 'tree':
        shape
          .rect(width * 0.44, height * 0.52, width * 0.12, height * 0.35)
          .fill({ color: 0x76553a, alpha: 1 });
        shape
          .circle(width * 0.5, height * 0.38, Math.min(width, height) * 0.24)
          .fill({ color: 0x3f8f3c, alpha: 1 });
        shape
          .circle(width * 0.35, height * 0.45, Math.min(width, height) * 0.16)
          .fill({ color: 0x4fae45, alpha: 0.95 });
        shape
          .circle(width * 0.65, height * 0.45, Math.min(width, height) * 0.16)
          .fill({ color: 0x4fae45, alpha: 0.95 });
        break;

      case 'road':
        shape
          .roundRect(0, height * 0.2, width, height * 0.6, Math.min(10, height * 0.3))
          .fill({ color: 0x59616b, alpha: 0.95 });
        shape
          .moveTo(width * 0.08, height * 0.5)
          .lineTo(width * 0.92, height * 0.5)
          .stroke({ color: 0xf5f5f5, width: Math.max(1, height * 0.08), alpha: 0.8 });
        break;

      case 'path':
        shape
          .roundRect(0, height * 0.28, width, height * 0.44, Math.min(8, height * 0.22))
          .fill({ color: 0xcabfae, alpha: 0.95 });
        break;

      case 'parking':
        shape
          .roundRect(0, 0, width, height, Math.min(8, Math.min(width, height) * 0.15))
          .fill({ color: 0x7f8790, alpha: 0.9 });
        shape
          .stroke({ color: 0xcfd5db, width: 1, alpha: 0.7 });
        break;

      case 'building':
        shape
          .rect(0, 0, width, height)
          .fill({ color: 0xd8c8a9, alpha: 1 })
          .stroke({ color: 0x8f7754, width: 2, alpha: 0.85 });
        break;

      case 'entrance':
        shape
          .poly([
            width / 2, 0,
            width, height * 0.55,
            width, height,
            0, height,
            0, height * 0.55,
          ])
          .fill({ color: 0x86b7ef, alpha: 0.95 });
        break;

      case 'garden':
        shape
          .ellipse(width / 2, height / 2, width / 2, height / 2)
          .fill({ color: 0x78a84c, alpha: 0.7 })
          .stroke({ color: 0x4c7d34, width: 1.5, alpha: 0.8 });
        break;

      case 'bench':
      case 'seating':
        shape
          .rect(width * 0.15, height * 0.32, width * 0.7, Math.max(3, height * 0.13))
          .fill({ color: 0x98684f, alpha: 1 });
        shape
          .rect(width * 0.2, height * 0.62, width * 0.08, height * 0.25)
          .fill({ color: 0x6a4c3c, alpha: 1 });
        shape
          .rect(width * 0.72, height * 0.62, width * 0.08, height * 0.25)
          .fill({ color: 0x6a4c3c, alpha: 1 });
        break;

      case 'toilet':
        shape
          .roundRect(0, 0, width, height, Math.min(8, Math.min(width, height) * 0.15))
          .fill({ color: 0xeef4f8, alpha: 1 })
          .stroke({ color: 0x4e6778, width: 1.5, alpha: 0.9 });
        break;

      case 'garbage-bin':
        shape
          .roundRect(width * 0.2, height * 0.2, width * 0.6, height * 0.62, Math.min(5, width * 0.1))
          .fill({ color: 0x4f6770, alpha: 1 });
        shape
          .rect(width * 0.14, height * 0.12, width * 0.72, Math.max(2, height * 0.08))
          .fill({ color: 0x34434a, alpha: 1 });
        break;

      case 'information':
        shape
          .circle(width / 2, height / 2, Math.min(width, height) * 0.38)
          .fill({ color: 0x3f8fee, alpha: 1 });
        break;

      default:
        shape
          .rect(0, 0, width, height)
          .fill({ color: 0x87909a, alpha: 0.72 });
        break;
    }
  }

  /** Shows the space's name centered on it, hidden when the box is too small to read. */
  private updateLabel(entry: SpaceNode, space: Space): void {
    const { width, height } = space.geometry;
    const name = space.properties.name;

    if (!name || width < LABEL_MIN_WIDTH || height < LABEL_MIN_HEIGHT) {
      entry.label.visible = false;
      return;
    }

    entry.label.visible = true;
    entry.label.text = name;
    entry.label.style.fontSize = Math.max(9, Math.min(14, height / 4));
    entry.label.style.wordWrapWidth = Math.max(10, width - 8);
    entry.label.style.wordWrap = true;
    entry.label.position.set(width / 2, height / 2);
  }

  /**
   * Applies the subtle focus blur to the booth's actual content only.
   * The liquid-glass overlay remains crisp, while the shape, image, label,
   * badge, and edit handle recede together when a visual filter is active.
   */
  private applyContentFocus(entry: SpaceNode, recede: boolean): void {
    const filters = recede ? [this.contentBlurFilter] : [];

    entry.shape.filters = filters;
    entry.label.filters = filters;
    entry.checkBadge.filters = filters;
    entry.handle.filters = filters;

    if (entry.image) {
      entry.image.sprite.filters = filters;
    }
  }

  /** Draws a liquid-glass surface matching the receded vector geometry. */
  private drawGlass(glass: Graphics, geometry: Space['geometry']): void {
    const { width, height } = geometry;

    glass.clear();

    if (width <= 2 || height <= 2) return;

    const radius = Math.min(12, Math.max(4, Math.min(width, height) * 0.12));
    const inset = 1.5;

    const drawShape = (pad: number, inner = false): void => {
      const w = Math.max(0, width - pad * 2);
      const h = Math.max(0, height - pad * 2);

      switch (geometry.type) {
        case 'circle': {
          const r = Math.min(w, h) / 2;
          glass.circle(pad + w / 2, pad + h / 2, r);
          break;
        }
        case 'ellipse':
          glass.ellipse(pad + w / 2, pad + h / 2, w / 2, h / 2);
          break;
        case 'rounded-rectangle':
          glass.roundRect(
            pad,
            pad,
            w,
            h,
            inner ? Math.max(2, radius - 3) : radius,
          );
          break;
        case 'triangle':
          glass.poly([
            pad + w / 2, pad,
            pad + w, pad + h,
            pad, pad + h,
          ]);
          break;
        case 'diamond':
          glass.poly([
            pad + w / 2, pad,
            pad + w, pad + h / 2,
            pad + w / 2, pad + h,
            pad, pad + h / 2,
          ]);
          break;
        case 'line':
          glass.roundRect(
            pad,
            pad,
            w,
            Math.max(2, h),
            Math.max(1, h / 2),
          );
          break;
        case 'rectangle':
        default:
          glass.roundRect(
            pad,
            pad,
            w,
            h,
            inner ? Math.max(2, radius - 3) : radius,
          );
          break;
      }
    };

    drawShape(0);
    glass.fill({ color: FILTER_GLASS_TINT_COLOR, alpha: FILTER_GLASS_TINT_ALPHA });

    drawShape(inset, true);
    glass.fill({ color: FILTER_GLASS_BODY_COLOR, alpha: FILTER_GLASS_BODY_ALPHA });

    drawShape(0);
    glass.stroke({
      color: FILTER_GLASS_RIM_COLOR,
      width: 1.6,
      alpha: FILTER_GLASS_RIM_ALPHA,
    });

    drawShape(3, true);
    glass.stroke({
      color: FILTER_GLASS_RIM_COLOR,
      width: 1,
      alpha: FILTER_GLASS_INNER_RIM_ALPHA,
    });

    // Keep the specular highlight deliberately simple and uncluttered.
    if (width > 8 && height > 8) {
      const shineLength = Math.min(width * 0.42, 110);
      if (geometry.type === 'circle') {
        const r = Math.min(width, height) / 2;
        glass.arc(width / 2, height / 2, Math.max(0, r - 2), Math.PI * 1.1, Math.PI * 1.85);
      } else {
        glass
          .moveTo(radius * 0.55, 1.5)
          .lineTo(Math.min(width - radius, radius * 0.55 + shineLength), 1.5);
      }
      glass.stroke({
        color: FILTER_GLASS_RIM_COLOR,
        width: 1.4,
        alpha: FILTER_GLASS_SPECULAR_ALPHA,
      });
    }
  }

  /** Small corner check badge shown while selected — selection stays
   *  identifiable even on a status color the outline doesn't contrast
   *  well against, and even to someone who can't distinguish the outline
   *  color itself. */
  private drawCheckBadge(badge: Graphics, geometry: Space['geometry']): void {
    const cx = geometry.width - CHECK_BADGE_MARGIN - CHECK_BADGE_RADIUS;
    const cy = CHECK_BADGE_MARGIN + CHECK_BADGE_RADIUS;
    const fill = this.statusStyles.selected?.fill ?? DEFAULT_STATUS_STYLES.selected.fill;

    badge
      .clear()
      .circle(cx, cy, CHECK_BADGE_RADIUS)
      .fill({ color: fill })
      .stroke({ color: CHECK_COLOR, width: 1.5 })
      .moveTo(cx - 3.5, cy)
      .lineTo(cx - 1, cy + 2.5)
      .lineTo(cx + 3.5, cy - 3)
      .stroke({ color: CHECK_COLOR, width: 1.75 });
  }

  private drawHandle(handle: Graphics, geometry: Space['geometry']): void {
    handle.position.set(geometry.width / 2, -HANDLE_OFFSET);
    handle
      .clear()
      .moveTo(0, 0)
      .lineTo(0, HANDLE_OFFSET)
      .stroke({ color: HANDLE_LINE_COLOR, width: 1, alpha: 0.6 })
      .circle(0, 0, HANDLE_RADIUS)
      .fill({ color: HANDLE_COLOR });
  }

  /** Creates/updates/removes the image sprite layered on top of a space's fill. */
  private updateImage(entry: SpaceNode, space: Space): void {
    const url =
      typeof space.properties.imageUrl === 'string' ? space.properties.imageUrl : undefined;

    if (!url || space.geometry.type !== 'rectangle') {
      if (entry.image) {
        entry.image.sprite.destroy();
        entry.image = undefined;
      }
      return;
    }

    if (entry.image && entry.image.url === url) {
      // Same image already loaded — just keep its size in sync with geometry.
      entry.image.sprite.width = space.geometry.width;
      entry.image.sprite.height = space.geometry.height;
      entry.image.sprite.position.set(space.geometry.width / 2, space.geometry.height / 2);
      return;
    }

    entry.image?.sprite.destroy();

    // Sprite.from(url)/Texture.from(url) resolve a URL through Pixi's asset
    // loader, which picks a parser by file extension — a data: URI (no
    // extension) silently fails to resolve and the sprite is left on a
    // placeholder texture forever. Loading through a plain HTMLImageElement
    // and building the texture from that once it's loaded sidesteps the
    // resolver entirely and works for any image source.
    const sprite = new Sprite(Texture.EMPTY);
    sprite.anchor.set(0.5);
    sprite.width = space.geometry.width;
    sprite.height = space.geometry.height;
    sprite.position.set(space.geometry.width / 2, space.geometry.height / 2);
    sprite.zIndex = 2;
    entry.node.addChild(sprite);
    entry.image = { sprite, url };

    const img = new Image();
    img.onload = () => {
      // The space may have been removed, or its image swapped again, by
      // the time this resolves — only apply if this sprite is still current.
      if (sprite.destroyed || entry.image?.sprite !== sprite) return;
      sprite.texture = Texture.from(img);
      // sprite.width/height compute scale against whichever texture is
      // active when they're set — reapply now the real (differently
      // sized) texture has replaced the 1x1 placeholder, or the sprite
      // renders at the wrong size.
      const current = this.spaceData.get(entry.node.label as string);
      const w = current?.geometry.width ?? sprite.width;
      const h = current?.geometry.height ?? sprite.height;
      sprite.width = w;
      sprite.height = h;
      sprite.position.set(w / 2, h / 2);
    };
    img.src = url;
  }

  /** Layers hover/selection accents on top of a space's base status style. */
  private applyInteractionState(space: Space, base: StatusStyle): StatusStyle {
    const id = space.id;
    const isSelected = this.selectedIds.has(id);

    if (isSelected) {
      const selectedStyle = this.statusStyles.selected ?? DEFAULT_STATUS_STYLES.selected;
      return {
        ...base,
        stroke: selectedStyle.fill,
        strokeWidth: SELECTED_STROKE_WIDTH,
      };
    }

    // In edit mode every space is a legitimate drag/select target, so hover
    // always shows feedback there. In view mode, a space the SelectionRule
    // rejects shouldn't look interactive just because the pointer is over it.
    const isHovered = (this.hoveredId === id || this.focusedId === id) &&
      (this.mode === 'edit' || this.isSelectable(space));

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
    this.events.emit('hover', id);
  }

  private repaint(id: string): void {
    const entry = this.spaceNodes.get(id);
    const space = this.spaceData.get(id);
    if (entry && space) this.paintSpace(entry, space);
  }
}
