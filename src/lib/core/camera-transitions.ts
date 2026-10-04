import { Application } from 'pixi.js';
import { unionBounds } from './bounds';
import { Camera } from './camera';
import { Space } from './types';

const DEFAULT_TRANSITION_DURATION_MS = 500;
const FIT_BOUNDS_PADDING_PX = 80;
const FLY_TO_PADDING_PX = 120;
/** flyTo deliberately doesn't zoom in past this, even for a tiny space —
 *  "light" focus, not a tight crop you have to zoom back out of. */
const FLY_TO_MAX_ZOOM = 1.4;

export interface EdgePadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface TransitionOptions {
  /** Transition length in ms. Defaults to 500. */
  duration?: number;
  /** Screen-space padding kept clear around fitted content. A number applies
   *  uniformly; an object lets one side (e.g. a drawer covering the right
   *  edge) reserve more space than the others. */
  padding?: number | EdgePadding;
  /** Caps how far in the transition is allowed to zoom. */
  maxZoom?: number;
}

interface Transition {
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

function resolvePadding(padding: number | EdgePadding | undefined, fallback: number): Required<EdgePadding> {
  if (padding === undefined) return { top: fallback, right: fallback, bottom: fallback, left: fallback };
  if (typeof padding === 'number') return { top: padding, right: padding, bottom: padding, left: padding };
  return {
    top: padding.top ?? fallback,
    right: padding.right ?? fallback,
    bottom: padding.bottom ?? fallback,
    left: padding.left ?? fallback,
  };
}

/**
 * CameraTransitions
 *
 * Drives flyTo/fitBounds/setZoom as smooth, eased, interruptible
 * animations of the Camera's transform. One animation core
 * (`animateTo`) backs all three public methods.
 *
 * Interruption itself is NOT handled here — PointerInteraction calls
 * `cancel()` the moment the user starts a gesture. This class only
 * knows how to animate towards a target; it never fights user input.
 */
export class CameraTransitions {
  private transition: Transition | null = null;

  constructor(
    private readonly app: Application,
    private readonly camera: Camera,
    /** Resolves the spaces to fit bounds around. Omit `ids` for "all loaded spaces". */
    private readonly getSpaces: (ids?: string[]) => Space[],
  ) {}

  /** Call once per frame (e.g. from app.ticker). No-ops when nothing is animating. */
  tick(): void {
    if (!this.transition) return;

    this.transition.elapsedMs += this.app.ticker.deltaMS;
    const t = Math.min(1, this.transition.elapsedMs / this.transition.durationMs);
    const eased = easeOutCubic(t);

    this.camera.setTransform(
      lerp(this.transition.fromX, this.transition.toX, eased),
      lerp(this.transition.fromY, this.transition.toY, eased),
      lerp(this.transition.fromZoom, this.transition.toZoom, eased),
    );

    if (t >= 1) this.transition = null;
  }

  /** Drops any in-flight transition. The camera stays exactly where it is. */
  cancel(): void {
    this.transition = null;
  }

  /** Fits the given spaces' combined bounds into view. Fits all loaded spaces if `ids` is omitted. */
  fitBounds(ids?: string[], options?: TransitionOptions): void {
    const spaces = this.getSpaces(ids);
    const bounds = unionBounds(spaces);
    if (!bounds) return;

    const pad = resolvePadding(options?.padding, FIT_BOUNDS_PADDING_PX);
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const availableWidth = Math.max(1, this.app.screen.width - pad.left - pad.right);
    const availableHeight = Math.max(1, this.app.screen.height - pad.top - pad.bottom);

    let targetZoom = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
    if (options?.maxZoom !== undefined) targetZoom = Math.min(targetZoom, options.maxZoom);
    // fitBounds must be able to show the entire map even when the user's
    // interactive readable minimum is higher than the fitted scale. The
    // minimum applies to manual zooming; "fit" is a navigation operation.
    targetZoom = this.camera.clampZoom(targetZoom, true);

    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;
    // Center within the space actually left visible after padding, not the
    // full screen — this is what keeps a space from landing behind a
    // right-side drawer or a top toolbar instead of in the clear area.
    const visibleCenterX = pad.left + (this.app.screen.width - pad.left - pad.right) / 2;
    const visibleCenterY = pad.top + (this.app.screen.height - pad.top - pad.bottom) / 2;

    this.animateTo(
      visibleCenterX - contentCenterX * targetZoom,
      visibleCenterY - contentCenterY * targetZoom,
      targetZoom,
      options?.duration ?? DEFAULT_TRANSITION_DURATION_MS,
    );
  }

  /** Flies to a single space. A light focus move — generous padding, capped zoom — not a tight crop you have to zoom back out of. */
  flyTo(id: string, options?: TransitionOptions): void {
    this.fitBounds([id], {
      padding: FLY_TO_PADDING_PX,
      maxZoom: FLY_TO_MAX_ZOOM,
      ...options,
    });
  }

  /** Animates zoom only, keeping the point currently under screen-center fixed. */
  setZoom(zoom: number, options?: TransitionOptions): void {
    const current = this.camera.getState();
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;
    const worldCenterX = (screenCenterX - current.x) / current.zoom;
    const worldCenterY = (screenCenterY - current.y) / current.zoom;

    const targetZoom = this.camera.clampZoom(zoom);
    this.animateTo(
      screenCenterX - worldCenterX * targetZoom,
      screenCenterY - worldCenterY * targetZoom,
      targetZoom,
      options?.duration ?? DEFAULT_TRANSITION_DURATION_MS,
    );
  }

  getZoom(): number {
    return this.camera.zoom;
  }

  setZoomLimits(limits: { minZoom?: number; maxZoom?: number }): void {
    this.camera.setLimits(limits);
  }

  private animateTo(toX: number, toY: number, toZoom: number, duration: number): void {
    const from = this.camera.getState();
    this.transition = {
      fromX: from.x,
      fromY: from.y,
      fromZoom: from.zoom,
      toX,
      toY,
      toZoom: this.camera.clampZoom(toZoom, true),
      elapsedMs: 0,
      durationMs: duration,
    };
  }
}
