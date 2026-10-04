import { DecimalPipe } from '@angular/common';
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
import { generateBenchSpaces } from './generate-bench-spaces';
import { TEST_SPACES } from './test-spaces';

const BENCH_SIZES = [100, 1000, 5000, 10000, 50000] as const;

/**
 * Thin host component. It owns the <div> and the component lifecycle;
 * it does NOT touch rendering internals. All canvas work happens inside
 * SpatialMapEngine, outside Angular's zone so Pixi's render loop never
 * triggers Angular change detection.
 */
@Component({
  selector: 'app-spatial-map',
  imports: [DecimalPipe],
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
      <!-- Temporary dev harness for Step 1.6 — exercises the camera API.
           Will be replaced by real toolbar/search UI in a later step. -->
      <div class="dev-camera-controls">
        <button (click)="onFitAll()">Fit all</button>
        <button (click)="onFlyToRotated()">Fly to A106</button>
        <button (click)="onZoomIn()">Zoom 2x</button>
      </div>
      <!-- Dev harness for Step 1.8 — loads synthetic datasets to measure
           render/pan/zoom performance at scale. #fpsReadout is written to
           directly from outside Angular's zone, never via a signal. -->
      <div class="dev-bench-controls">
        @for (size of benchSizes; track size) {
          <button (click)="onLoadBenchSize(size)">{{ size | number }}</button>
        }
        <button (click)="onResetFixture()">Reset</button>
        <span #fpsReadout class="fps-readout">—</span>
      </div>
      <!-- Dev harness for Step 1.9 — exercises the incremental data API
           (addSpace/updateSpace/removeSpace) against the live fixture. -->
      <div class="dev-data-controls">
        <button (click)="onAddSpace()">Add space</button>
        <button (click)="onToggleA101Status()">Toggle A101 status</button>
        <button (click)="onMoveA101()">Move A101</button>
        <button (click)="onRemoveA105()">Remove A105</button>
      </div>
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

      .dev-camera-controls {
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        gap: 6px;
      }

      .dev-camera-controls button {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(20, 22, 28, 0.75);
        color: #e8eaf0;
        font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
      }

      .dev-camera-controls button:hover {
        background: rgba(20, 22, 28, 0.9);
      }

      .dev-bench-controls {
        position: absolute;
        bottom: 12px;
        left: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .dev-bench-controls button {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(20, 22, 28, 0.75);
        color: #e8eaf0;
        font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
      }

      .dev-bench-controls button:hover {
        background: rgba(20, 22, 28, 0.9);
      }

      .fps-readout {
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(20, 22, 28, 0.75);
        color: #7ee787;
        font: 12px/1 ui-monospace, 'SF Mono', Consolas, monospace;
        min-width: 11ch;
      }

      .dev-data-controls {
        position: absolute;
        top: 48px;
        right: 12px;
        display: flex;
        gap: 6px;
      }

      .dev-data-controls button {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(20, 22, 28, 0.75);
        color: #e8eaf0;
        font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
      }

      .dev-data-controls button:hover {
        background: rgba(20, 22, 28, 0.9);
      }
    `,
  ],
})
export class SpatialMap implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fpsReadout', { static: true }) fpsReadoutRef!: ElementRef<HTMLSpanElement>;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly benchSizes = BENCH_SIZES;

  private readonly engine = new SpatialMapEngine();
  private fpsIntervalId: ReturnType<typeof setInterval> | null = null;

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

      // FPS updates several times a second — too frequent to route through
      // change detection for a plain text readout. Write the DOM directly.
      this.fpsIntervalId = setInterval(() => {
        const fps = Math.round(this.engine.getFps());
        const count = this.engine.getSpaceCount();
        this.fpsReadoutRef.nativeElement.textContent = `${fps} fps · ${count.toLocaleString()}`;
      }, 250);
    });
  }

  ngOnDestroy(): void {
    if (this.fpsIntervalId !== null) clearInterval(this.fpsIntervalId);
    this.engine.destroy();
  }

  protected onFitAll(): void {
    this.engine.camera.fitBounds();
  }

  protected onFlyToRotated(): void {
    this.engine.camera.flyTo('A106');
  }

  protected onZoomIn(): void {
    this.engine.camera.setZoom(2);
  }

  protected onLoadBenchSize(count: number): void {
    this.engine.loadSpaces(generateBenchSpaces(count));
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }

  protected onResetFixture(): void {
    this.engine.loadSpaces(TEST_SPACES);
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }

  protected onAddSpace(): void {
    this.engine.addSpace({
      id: `extra-${Date.now()}`,
      type: 'booth',
      geometry: { type: 'rectangle', x: 320, y: 0, width: 80, height: 60 },
      properties: { name: 'New space', status: 'available' },
    });
  }

  private a101Booked = false;

  protected onToggleA101Status(): void {
    this.a101Booked = !this.a101Booked;
    this.engine.updateSpace('A101', {
      properties: { status: this.a101Booked ? 'booked' : 'available' },
    });
  }

  protected onMoveA101(): void {
    this.engine.updateSpace('A101', { geometry: { y: Math.random() * 150 } });
  }

  protected onRemoveA105(): void {
    this.engine.removeSpace('A105');
  }
}
