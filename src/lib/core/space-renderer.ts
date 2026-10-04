import { Circle, Container, FederatedPointerEvent, Graphics, Sprite, Texture } from 'pixi.js';
import { TypedEmitter } from './event-emitter';
import {
  DEFAULT_STATUS_STYLES,
  FALLBACK_STATUS_STYLE,
  Space,
  StatusStyle,
  StatusStyleMap,
} from './types';

const HOVER_STROKE_COLOR = 0xffffff;
const HOVER_STROKE_WIDTH = 2;
const SELECTED_STROKE_WIDTH = 3;

const HANDLE_OFFSET = 26;
const HANDLE_RADIUS = 6;
/** The clickable area is larger than the visual dot — easier to grab with
 *  a mouse, and necessary at all for touch/trackpad input. */
const HANDLE_HIT_RADIUS = 14;
const HANDLE_COLOR = 0xffffff;
const HANDLE_LINE_COLOR = 0xffffff;

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

export interface SpaceRendererEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
  modechange: MapMode;
  /** Fires once, when a move or rotate drag in edit mode ends — not on every pointermove. */
  spacetransform: { id: string; geometry: Space['geometry'] };
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
interface SpaceNode {
  node: Container;
  shape: Graphics;
  handle: Graphics;
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
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  private hoveredId: string | null = null;
  private readonly selectedIds = new Set<string>();

  private mode: MapMode = 'view';

  private draggingId: string | null = null;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartGeomX = 0;
  private dragStartGeomY = 0;

  private rotatingId: string | null = null;
  private rotateCenterX = 0;
  private rotateCenterY = 0;

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
    const cursor = mode === 'edit' ? 'move' : 'pointer';
    // shape is the actual hit target (node itself has no hitArea), so its
    // own cursor is what Pixi displays — kept in sync with node's.
    this.spaceNodes.forEach(({ node, shape }) => {
      node.cursor = cursor;
      shape.cursor = cursor;
    });
    // The rotation handle only shows for a selected space in edit mode,
    // so entering/leaving edit mode needs to repaint whatever is selected.
    this.selectedIds.forEach((id) => this.repaint(id));
    this.events.emit('modechange', mode);
  }

  getMode(): MapMode {
    return this.mode;
  }

  /** Overrides the default fill/stroke used per status. */
  setStatusStyles(styles: StatusStyleMap): void {
    this.statusStyles = { ...DEFAULT_STATUS_STYLES, ...styles };
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
    if (this.selectedIds.delete(id)) {
      this.events.emit('select', Array.from(this.selectedIds));
    }
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
    this.events.emit('select', Array.from(this.selectedIds));
  }

  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    const previouslySelected = Array.from(this.selectedIds);
    this.selectedIds.clear();
    previouslySelected.forEach((id) => this.repaint(id));
    this.events.emit('select', []);
  }

  destroy(): void {
    this.stage.off('globalpointermove', this.onDragMove);
    this.stage.off('pointerup', this.onDragEnd);
    this.stage.off('pointerupoutside', this.onDragEnd);

    this.cancelDrag();
    this.spaceNodes.clear();
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;
  }

  private createSpaceNode(space: Space): SpaceNode {
    const node = new Container();
    const shape = new Graphics();
    // The shape provides its own hit area from its drawn rect — the node
    // deliberately has NO explicit hitArea of its own. Setting one would
    // make Pixi treat it as the only hit region for the whole subtree,
    // which would make the handle (positioned outside that rect, above
    // the shape) permanently unreachable by hit-testing.
    shape.eventMode = 'static';
    node.addChild(shape);

    const handle = new Graphics();
    handle.eventMode = 'none';
    handle.hitArea = new Circle(0, 0, HANDLE_HIT_RADIUS);
    handle.visible = false;
    handle.cursor = 'grab';
    handle.on('pointerdown', (event) => this.onHandlePointerDown(space.id, event));
    node.addChild(handle);

    const entry: SpaceNode = { node, shape, handle };

    node.eventMode = 'static';
    const cursor = this.mode === 'edit' ? 'move' : 'pointer';
    node.cursor = cursor;
    shape.cursor = cursor;
    node.label = space.id;

    node.on('pointerover', () => this.setHover(space.id));
    node.on('pointerout', () => this.setHover(null));
    node.on('pointertap', () => this.selectSpace(space.id, !this.selectedIds.has(space.id)));
    node.on('pointerdown', (event) => this.onSpacePointerDown(space.id, event));

    this.paintSpace(entry, space);
    this.applyGeometry(entry, space.geometry);

    return entry;
  }

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

  private readonly onDragEnd = (): void => {
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
    const style = this.applyInteractionState(space.id, baseStyle);
    const hasImage = typeof properties.imageUrl === 'string' && properties.imageUrl.length > 0;

    entry.shape.clear().rect(0, 0, geometry.width, geometry.height);
    // An image fill replaces the flat status color, but the status/hover/
    // selection stroke still shows on top so state stays readable.
    entry.shape.fill({ color: style.fill, alpha: hasImage ? 0 : (style.fillAlpha ?? 1) });

    if (style.strokeWidth) {
      entry.shape.stroke({ color: style.stroke ?? style.fill, width: style.strokeWidth });
    }

    this.updateImage(entry, space);

    this.drawHandle(entry.handle, geometry);
    const showHandle = this.mode === 'edit' && this.selectedIds.has(space.id);
    entry.handle.visible = showHandle;
    entry.handle.eventMode = showHandle ? 'static' : 'none';
    entry.node.addChild(entry.handle); // keep the handle above the image sprite
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

    if (!url) {
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
    this.events.emit('hover', id);
  }

  private repaint(id: string): void {
    const entry = this.spaceNodes.get(id);
    const space = this.spaceData.get(id);
    if (entry && space) this.paintSpace(entry, space);
  }
}
