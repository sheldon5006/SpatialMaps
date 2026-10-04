import { Container, FederatedPointerEvent, Graphics } from 'pixi.js';
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

/**
 * 'view': hover + select + pan/zoom (the search/rental viewer experience).
 * 'edit': spaces can be dragged to a new position. Hover/select still work.
 */
export type MapMode = 'view' | 'edit';

export interface SpaceRendererEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
  modechange: MapMode;
  /** Fires once, when a drag in edit mode ends — not on every pointermove. */
  spacemoved: { id: string; geometry: Space['geometry'] };
}

/**
 * SpaceRenderer
 *
 * Owns the loaded spaces (both their data and their PixiJS graphics),
 * the hover/selection/drag interaction state, and everything about
 * painting a space: status color, hover outline, selection outline.
 * This is the engine's data layer — addSpace/updateSpace/removeSpace/
 * loadSpaces all live here, alongside the pointer handlers that drive
 * hover/select/drag.
 *
 * It does not know about the camera's pan/zoom transitions or app-level
 * setup — it only needs a `world` container to add/remove graphics
 * from, a `stage` to listen for drag-continuation events on (the same
 * pattern PointerInteraction uses for panning), and a zoom getter so
 * drag deltas convert from screen space to world space correctly at
 * any zoom level.
 */
export class SpaceRenderer {
  private readonly spaceGraphics = new Map<string, Graphics>();
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

  readonly events = new TypedEmitter<SpaceRendererEvents>();

  constructor(
    private readonly world: Container,
    private readonly stage: Container,
    private readonly getZoom: () => number,
  ) {
    // Drag continuation: like PointerInteraction's panning, these use the
    // "global" variants so the drag keeps tracking the pointer even once
    // it moves outside the dragged shape's own bounds.
    this.stage.on('globalpointermove', this.onDragMove);
    this.stage.on('pointerup', this.onDragEnd);
    this.stage.on('pointerupoutside', this.onDragEnd);
  }

  /** Switches between the view (hover/select/pan/zoom) and edit (+ drag-to-move) experiences. */
  setMode(mode: MapMode): void {
    if (this.mode === mode) return;
    this.cancelDrag();
    this.mode = mode;
    const cursor = mode === 'edit' ? 'move' : 'pointer';
    this.spaceGraphics.forEach((graphic) => (graphic.cursor = cursor));
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

  /** Adds one space. If `id` already exists, replaces it (with a dev warning — likely a caller bug). */
  addSpace(space: Space): void {
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
  updateSpace(
    id: string,
    patch: { geometry?: Partial<Space['geometry']>; properties?: Partial<Space['properties']> },
  ): void {
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

  /** Removes one space. Clears it from hover/selection/drag state if applicable. */
  removeSpace(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    if (!graphic) {
      console.warn(`SpatialMapEngine.removeSpace: no space with id "${id}" is loaded.`);
      return;
    }

    if (this.draggingId === id) this.cancelDrag();
    this.world.removeChild(graphic);
    graphic.destroy();
    this.spaceGraphics.delete(id);
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
    this.spaceGraphics.clear();
    this.spaceData.clear();
    this.selectedIds.clear();
    this.hoveredId = null;
  }

  private createSpaceGraphic(space: Space): Graphics {
    const graphic = new Graphics();
    this.paintSpace(graphic, space);
    this.applyGeometry(graphic, space.geometry);

    graphic.eventMode = 'static';
    graphic.cursor = this.mode === 'edit' ? 'move' : 'pointer';
    graphic.label = space.id;

    graphic.on('pointerover', () => this.setHover(space.id));
    graphic.on('pointerout', () => this.setHover(null));
    graphic.on('pointertap', () => this.selectSpace(space.id, !this.selectedIds.has(space.id)));
    graphic.on('pointerdown', (event) => this.onSpacePointerDown(space.id, event));

    return graphic;
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

  private readonly onDragMove = (event: FederatedPointerEvent): void => {
    if (!this.draggingId) return;

    const zoom = this.getZoom();
    const dx = (event.global.x - this.dragStartPointerX) / zoom;
    const dy = (event.global.y - this.dragStartPointerY) / zoom;

    this.updateSpace(this.draggingId, {
      geometry: { x: this.dragStartGeomX + dx, y: this.dragStartGeomY + dy },
    });
  };

  private readonly onDragEnd = (): void => {
    if (!this.draggingId) return;
    const id = this.draggingId;
    this.draggingId = null;

    const space = this.spaceData.get(id);
    if (space) this.events.emit('spacemoved', { id, geometry: space.geometry });
  };

  private cancelDrag(): void {
    this.draggingId = null;
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
    this.events.emit('hover', id);
  }

  private repaint(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    const space = this.spaceData.get(id);
    if (graphic && space) this.paintSpace(graphic, space);
  }
}
