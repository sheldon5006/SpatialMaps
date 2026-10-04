import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { SpatialMapEngine } from '../../lib/core/spatial-map-engine';
import { TEST_SPACES } from './test-spaces';

/**
 * Thin host component. It owns the <div> and the component lifecycle;
 * it does NOT touch rendering internals. All canvas work happens inside
 * SpatialMapEngine, outside Angular's zone so Pixi's render loop never
 * triggers Angular change detection.
 */
@Component({
  selector: 'app-spatial-map',
  template: `
    <div class="spatial-map-root">
      <div #host class="spatial-map-host"></div>
      @if (hoveredId() || selectedIds().length) {
        <div class="status-overlay">
          @if (hoveredId()) {
            <span>Hover: {{ hoveredId() }}</span>
          }
          @if (selectedIds().length) {
            <span>Selected: {{ selectedIds().join(', ') }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .spatial-map-root {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .spatial-map-host {
        width: 100%;
        height: 100%;
        display: block;
      }

      .status-overlay {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(20, 22, 28, 0.75);
        color: #e8eaf0;
        font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        pointer-events: none;
      }
    `,
  ],
})
export class SpatialMap implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly selectedIds = signal<string[]>([]);

  private readonly engine = new SpatialMapEngine();

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(async () => {
      await this.engine.init(this.hostRef.nativeElement);
      this.engine.loadSpaces(TEST_SPACES);

      // Hover/select are discrete, low-frequency events (unlike pan/zoom),
      // so re-entering the Angular zone here is the right call: this is
      // the one place the demo UI needs to react to engine state.
      this.engine.on('hover', (id) => this.zone.run(() => this.hoveredId.set(id)));
      this.engine.on('select', (ids) => this.zone.run(() => this.selectedIds.set(ids)));
    });
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
