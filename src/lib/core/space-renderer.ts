import { Container, Graphics } from 'pixi.js';
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

export interface SpaceRendererEvents extends Record<string, unknown> {
  hover: string | null;
  select: string[];
}

/**
 * SpaceRenderer
 *
 * Owns the loaded spaces (both their data and their PixiJS graphics),
 * the hover/selection interaction state, and everything about painting
 * a space: status color, hover outline, selection outline. This is the
 * engine's data layer — addSpace/updateSpace/removeSpace/loadSpaces all
 * live here, alongside the pointer handlers that drive hover/select.
 *
 * It does not know about the camera, transitions, or app-level setup —
 * it only needs a `world` container to add/remove graphics from.
 */
export class SpaceRenderer {
  private readonly spaceGraphics = new Map<string, Graphics>();
  private readonly spaceData = new Map<string, Space>();
  private statusStyles: StatusStyleMap = DEFAULT_STATUS_STYLES;

  private hoveredId: string | null = null;
  private readonly selectedIds = new Set<string>();

  readonly events = new TypedEmitter<SpaceRendererEvents>();

  constructor(private readonly world: Container) {}

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

  /** Removes one space. Clears it from hover/selection state if applicable. */
  removeSpace(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    if (!graphic) {
      console.warn(`SpatialMapEngine.removeSpace: no space with id "${id}" is loaded.`);
      return;
    }

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
    this.events.emit('hover', id);
  }

  private repaint(id: string): void {
    const graphic = this.spaceGraphics.get(id);
    const space = this.spaceData.get(id);
    if (graphic && space) this.paintSpace(graphic, space);
  }
}
