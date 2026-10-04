import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapMode, SpatialMapEngine } from '../../lib/core/spatial-map-engine';
import {
  Space,
  SpaceElementType,
  SpaceGeometry,
  SpacePropKind,
  SpaceStatus,
} from '../../lib/core/types';
import { generateBenchSpaces } from './generate-bench-spaces';
import { TEST_SPACES } from './test-spaces';

const BENCH_SIZES = [100, 1000, 5000, 10000, 50000] as const;

const STATUS_OPTIONS: SpaceStatus[] = [
  'available',
  'reserved',
  'booked',
  'unavailable',
  'maintenance',
];

const VECTOR_SHAPE_OPTIONS: Array<{ value: SpaceGeometry['type']; label: string; icon: string }> = [
  { value: 'rectangle', label: 'Rectangle', icon: '▭' },
  { value: 'rounded-rectangle', label: 'Rounded', icon: '▢' },
  { value: 'circle', label: 'Circle', icon: '○' },
  { value: 'ellipse', label: 'Ellipse', icon: '⬭' },
  { value: 'line', label: 'Path', icon: '—' },
  { value: 'triangle', label: 'Triangle', icon: '△' },
  { value: 'diamond', label: 'Diamond', icon: '◇' },
];
const ELEMENT_TYPE_OPTIONS: Array<{ value: SpaceElementType; label: string }> = [
  { value: 'booth', label: 'Booth' },
  { value: 'prop', label: 'Prop' },
];

const PROP_OPTIONS: Array<{ value: SpacePropKind; label: string }> = [
  { value: 'road', label: 'Road' },
  { value: 'path', label: 'Path' },
  { value: 'building', label: 'Building' },
  { value: 'parking', label: 'Parking' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'garden', label: 'Garden' },
  { value: 'tree', label: 'Tree' },
  { value: 'bench', label: 'Bench' },
  { value: 'seating', label: 'Seating' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'garbage-bin', label: 'Garbage bin' },
  { value: 'information', label: 'Information' },
];

function defaultShapeForElement(type: SpaceElementType): SpaceGeometry['type'] {
  return type === 'prop' ? 'circle' : 'rectangle';
}

function defaultPropKindForElement(type: SpaceElementType): SpacePropKind | null {
  return type === 'prop' ? 'tree' : null;
}

/** Human-readable label + swatch color per status, for the legend and
 *  tooltip — kept here rather than invented per-use so they stay in sync. */
const STATUS_META: Record<SpaceStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: '#2ecc71' },
  reserved: { label: 'Reserved', color: '#f1c40f' },
  booked: { label: 'Booked', color: '#e67e22' },
  unavailable: { label: 'Unavailable', color: '#7f8c8d' },
  maintenance: { label: 'Maintenance', color: '#9b59b6' },
  selected: { label: 'Selected', color: '#3498db' },
};

/** Status/business truth decides what's selectable — never color, never a
 *  UI guess. Mirrors the engine's own default SelectionRule so the legend
 *  and tooltip can say "selectable" accurately; a real integration would
 *  call engine.setSelectionRule() with its actual backend rule and this
 *  would need to match it (documented at that call site below). */
function isSelectableStatus(status: SpaceStatus | undefined): boolean {
  return status === 'available' || status === 'reserved';
}

interface SizePreset {
  label: string;
  width: number;
  height: number;
}

const SIZE_PRESETS: SizePreset[] = [
  { label: 'Small', width: 50, height: 40 },
  { label: 'Medium', width: 80, height: 60 },
  { label: 'Large', width: 120, height: 90 },
  { label: 'Wide', width: 140, height: 60 },
];

interface SpaceFormState {
  name: string;
  status: SpaceStatus;
  elementType: SpaceElementType;
  propKind: SpacePropKind | null;
  shape: SpaceGeometry['type'];
  width: number;
  height: number;
  imageDataUrl: string | null;
}

function defaultFormState(): SpaceFormState {
  return {
    name: '',
    status: 'available',
    elementType: 'booth',
    propKind: null,
    shape: 'rectangle',
    width: 80,
    height: 60,
    imageDataUrl: null,
  };
}

/** The inspector drawer (300px) covers the right edge while it's open, and
 *  the toolbar no longer overlaps the canvas at all (it's a real header
 *  now) — so only the drawer needs accounting for here. */
const EDIT_DRAWER_PADDING = { top: 24, right: 320, bottom: 24, left: 24 };

/**
 * Thin host component. It owns the <div> and the component lifecycle;
 * it does NOT touch rendering internals. All canvas work happens inside
 * SpatialMapEngine, outside Angular's zone so Pixi's render loop never
 * triggers Angular change detection.
 *
 * UI shell: a top toolbar (mode toggle + add-space action), a hover
 * preview chip, a contextual right-side inspector drawer (shown only
 * when there's something to edit — not a permanent sidebar), and a
 * collapsible bottom "Dev tools" drawer holding everything built as
 * test harnesses in earlier steps, kept available but out of the way.
 */
@Component({
  selector: 'app-spatial-map',
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="spatial-map-root">
      <!-- Top toolbar: a real in-flow header, not an overlay — the canvas
           area below it is the only thing the camera/handles ever need to
           reason about, so nothing rendered near world-space (0,0) can
           ever end up visually trapped under it. -->
      <div class="toolbar">
        <div class="mode-switch">
          <button [class.active]="mode() === 'view'" (click)="setMode('view')">View</button>
          <button [class.active]="mode() === 'edit'" (click)="setMode('edit')">Edit</button>
        </div>
        <div class="mode-switch">
          <button [class.active]="visualFilter() === 'all'" (click)="setVisualFilter('all')">All</button>
          @for (status of statusOptions; track status) {
            <button
              [class.active]="visualFilter() === status"
              (click)="setVisualFilter(status)"
            >
              {{ statusMeta[status].label }}
            </button>
          }
        </div>
        <button
          class="icon-btn"
          [class.active]="visualFilter() === 'selected'"
          (click)="setVisualFilter('selected')"
        >
          Selected only
        </button>
        @if (mode() === 'edit') {
          <button class="add-space-btn" (click)="openAddForm()">
            <span class="plus">+</span> Add space
          </button>
        }
        <div class="toolbar-spacer"></div>
        <button class="icon-btn" (click)="devToolsOpen.set(!devToolsOpen())" title="Dev tools">
          Dev tools
        </button>
      </div>

      <div class="canvas-area">
        <div #host class="spatial-map-host"></div>

        <!-- Hover preview chip -->
        @if (hoverPreview(); as preview) {
          <div class="hover-chip">
            <span class="hover-chip-name">{{ preview.name }}</span>
            <span class="hover-chip-status" [attr.data-status]="preview.status">{{ preview.status }}</span>
          </div>
        }

        <!-- Contextual inspector drawer -->
        <div class="inspector-drawer" [class.open]="drawerOpen()">
        <div class="inspector-header">
          <h3>{{ editingId() ? 'Edit space' : 'Add space' }}</h3>
          <button class="icon-btn" (click)="closeForm()">Close</button>
        </div>

        @if (form.elementType === 'booth') {
          <label class="field">
            <span>Name</span>
            <input type="text" [(ngModel)]="form.name" placeholder="e.g. Booth A101" />
          </label>
        }

        @if (mode() === 'edit') {
          <label class="field">
            <span>Map element</span>
            <div class="element-picker" role="group" aria-label="Map element type">
              @for (element of elementTypeOptions; track element.value) {
                <button
                  type="button"
                  class="element-option"
                  [class.active]="form.elementType === element.value"
                  [attr.aria-pressed]="form.elementType === element.value"
                  (click)="setElementType(element.value)"
                >
                  {{ element.label }}
                </button>
              }
            </div>
          </label>

          @if (form.elementType !== 'booth') {
            <label class="field">
              <span>Prop type</span>
              <select [(ngModel)]="form.propKind" (ngModelChange)="onPropKindChange($event)">
                @for (option of currentPropOptions(); track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
          }

          <label class="field">
            <span>Vector shape</span>
            <div class="shape-picker" role="group" aria-label="Vector shape">
              @for (shape of vectorShapeOptions; track shape.value) {
                <button
                  type="button"
                  class="shape-option"
                  [class.active]="form.shape === shape.value"
                  [attr.aria-pressed]="form.shape === shape.value"
                  (click)="setShape(shape.value)"
                >
                  <span class="shape-icon" aria-hidden="true">{{ shape.icon }}</span>
                  <span>{{ shape.label }}</span>
                </button>
              }
            </div>
          </label>
        }

        <label class="field">
          <span>Status</span>
          <select [(ngModel)]="form.status">
            @for (status of statusOptions; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Size</span>
          <div class="preset-row">
            @for (preset of sizePresets; track preset.label) {
              <button
                type="button"
                class="preset-btn"
                [class.active]="form.width === preset.width && form.height === preset.height"
                (click)="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            }
          </div>
          <div class="dims-row">
            <input type="number" min="4" [(ngModel)]="form.width" aria-label="Width" />
            <span class="dims-x">×</span>
            <input type="number" min="4" [(ngModel)]="form.height" aria-label="Height" />
          </div>
        </label>

        <label class="field">
          <span>Image</span>
          @if (form.imageDataUrl) {
            <div class="image-preview">
              <img [src]="form.imageDataUrl" alt="" />
              <button type="button" class="remove-image-btn" (click)="removeImage()">Remove</button>
            </div>
          } @else {
            <input type="file" accept="image/*" (change)="onImageSelected($event)" />
          }
        </label>

        @if (editingId()) {
          <p class="rotate-hint">
            Drag the handle above to rotate. Drag a corner handle to resize.
          </p>

          <label class="field">
            <span>Layering</span>
            <div class="preset-row">
              <button type="button" class="preset-btn" (click)="bringToFront()">Bring to front</button>
              <button type="button" class="preset-btn" (click)="sendToBack()">Send to back</button>
            </div>
          </label>
        }

        <div class="inspector-actions">
          @if (editingId()) {
            <button class="danger-btn" (click)="deleteSpace()">Delete</button>
          }
          <button class="ghost-btn" (click)="closeForm()">Cancel</button>
          <button class="primary-btn" (click)="saveForm()">Save</button>
        </div>
      </div>

      <!-- Dev tools drawer: every test harness from earlier steps, kept
           available but tucked behind one toggle instead of scattered
           floating buttons. -->
      <div class="dev-drawer" [class.open]="devToolsOpen()">
        <div class="dev-section">
          <span class="dev-label">Camera</span>
          <button (click)="onFitAll()">Fit all</button>
          <button (click)="onFlyToRotated()">Fly to A106</button>
          <button (click)="onZoomIn()">Zoom 2x</button>
        </div>
        <div class="dev-section">
          <span class="dev-label">Benchmark</span>
          @for (size of benchSizes; track size) {
            <button (click)="onLoadBenchSize(size)">{{ size | number }}</button>
          }
          <button (click)="onResetFixture()">Reset</button>
          <span #fpsReadout class="fps-readout">—</span>
        </div>
        <div class="dev-section">
          <span class="dev-label">Data ops</span>
          <button (click)="onAddTestSpace()">Add test space</button>
          <button (click)="onToggleA101Status()">Toggle A101 status</button>
          <button (click)="onMoveA101()">Move A101</button>
          <button (click)="onRemoveA105()">Remove A105</button>
        </div>
        <div class="dev-section">
          <span class="dev-label">Import / export</span>
          <button (click)="onExport()">Export JSON</button>
          <button (click)="onImportLastExport()" [disabled]="!lastExportJson">Import last export</button>
        </div>
        @if (hoveredId() || selectedIds().length || lastTransform()) {
          <div class="dev-section dev-readout">
            <span class="dev-label">Status</span>
            @if (hoveredId()) {
              <span>Hover: {{ hoveredId() }}</span>
            }
            @if (selectedIds().length) {
              <span>Selected: {{ selectedIds().join(', ') }}</span>
            }
            @if (lastTransform(); as t) {
              <span>Last transform: {{ t }}</span>
            }
          </div>
        }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .spatial-map-root {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .canvas-area {
        position: relative;
        flex: 1;
        min-height: 0;
      }

      .spatial-map-host {
        width: 100%;
        height: 100%;
        display: block;
      }

      button {
        font: inherit;
        cursor: pointer;
      }

      /* ---- Toolbar ---- */

      .toolbar {
        flex-shrink: 0;
        margin: 12px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding: 6px;
        border-radius: 10px;
        background: rgba(20, 22, 28, 0.85);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .toolbar-spacer {
        flex: 1;
      }

      .mode-switch {
        display: flex;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 7px;
        padding: 2px;
      }

      .mode-switch button {
        border: none;
        background: transparent;
        color: #9a9fab;
        padding: 6px 14px;
        border-radius: 5px;
        transition: background 0.15s, color 0.15s;
      }

      .mode-switch button.active {
        background: #3a7afe;
        color: #fff;
      }

      .add-space-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.06);
        color: #e8eaf0;
        padding: 7px 12px;
        border-radius: 7px;
      }

      .add-space-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .add-space-btn .plus {
        font-weight: 600;
      }

      .icon-btn {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: transparent;
        color: #c3c7d1;
        padding: 6px 12px;
        border-radius: 7px;
      }

      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .icon-btn.active {
        background: #3a7afe;
        border-color: #3a7afe;
        color: #fff;
      }

      /* ---- Hover chip ---- */

      .hover-chip {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 7px;
        background: rgba(20, 22, 28, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #e8eaf0;
        pointer-events: none;
      }

      .hover-chip-status {
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        color: #c3c7d1;
        text-transform: capitalize;
      }

      /* ---- Inspector drawer (contextual, right side) ---- */

      .inspector-drawer {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        background: rgba(18, 20, 26, 0.96);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        transform: translateX(100%);
        transition: transform 0.2s ease;
        overflow-y: auto;
      }

      .inspector-drawer.open {
        transform: translateX(0);
      }

      .inspector-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .inspector-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #e8eaf0;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: #c3c7d1;
      }

      .field > span {
        font-size: 12px;
        color: #9a9fab;
      }

      .field input[type='text'],
      .field input[type='number'],
      .field select {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        color: #e8eaf0;
        padding: 7px 8px;
        font: inherit;
      }

      .element-picker {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }

      .element-option {
        min-height: 34px;
        padding: 6px 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        color: #c3c7d1;
      }

      .element-option.active {
        background: rgba(58, 122, 254, 0.18);
        border-color: #3a7afe;
        color: #fff;
      }

      .shape-picker {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }

      .shape-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 54px;
        padding: 6px 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        color: #c3c7d1;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }

      .shape-option:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .shape-option.active {
        background: rgba(58, 122, 254, 0.18);
        border-color: #3a7afe;
        color: #fff;
      }

      .shape-icon {
        font-size: 20px;
        line-height: 1;
      }

      .preset-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .preset-btn {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        color: #c3c7d1;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 12px;
      }

      .preset-btn.active {
        background: #3a7afe;
        border-color: #3a7afe;
        color: #fff;
      }

      .dims-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .dims-row input {
        width: 70px;
      }

      .dims-x {
        color: #6b7280;
      }

      .image-preview {
        position: relative;
        width: 100%;
        height: 120px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }

      .image-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .remove-image-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        border: none;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        padding: 4px 8px;
        border-radius: 5px;
        font-size: 11px;
      }

      .rotate-hint {
        margin: 0;
        font-size: 12px;
        color: #6b7280;
      }

      .inspector-actions {
        margin-top: auto;
        display: flex;
        gap: 8px;
      }

      .primary-btn,
      .ghost-btn,
      .danger-btn {
        flex: 1;
        padding: 8px 10px;
        border-radius: 7px;
        border: 1px solid transparent;
        font-weight: 500;
      }

      .primary-btn {
        background: #3a7afe;
        color: #fff;
      }

      .primary-btn:hover {
        background: #2f6ae0;
      }

      .ghost-btn {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
        color: #c3c7d1;
      }

      .danger-btn {
        background: rgba(226, 75, 74, 0.15);
        border-color: rgba(226, 75, 74, 0.4);
        color: #f09595;
        flex: 0 0 auto;
      }

      /* ---- Dev tools drawer (bottom, collapsible) ---- */

      .dev-drawer {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        padding: 14px;
        background: rgba(14, 15, 20, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        transform: translateY(100%);
        transition: transform 0.2s ease;
      }

      .dev-drawer.open {
        transform: translateY(0);
      }

      .dev-section {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .dev-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6b7280;
        margin-right: 4px;
      }

      .dev-section button {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: #c3c7d1;
      }

      .dev-section button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
      }

      .dev-section button:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .fps-readout {
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: #7ee787;
        font: 12px/1 ui-monospace, 'SF Mono', Consolas, monospace;
        min-width: 11ch;
      }

      .dev-readout {
        flex-direction: column;
        align-items: flex-start;
        color: #9a9fab;
        font-size: 12px;
        gap: 2px;
      }
    `,
  ],
})
export class SpatialMap implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fpsReadout', { static: true }) fpsReadoutRef!: ElementRef<HTMLSpanElement>;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly hoverPreview = signal<{ name: string; status: string } | null>(null);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly lastTransform = signal<string | null>(null);
  protected readonly mode = signal<MapMode>('view');
  protected readonly visualFilter = signal<'all' | SpaceStatus | 'selected'>('all');
  protected readonly statusMeta = STATUS_META;
  protected readonly devToolsOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly isAdding = signal(false);

  protected readonly benchSizes = BENCH_SIZES;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly sizePresets = SIZE_PRESETS;
  protected readonly vectorShapeOptions = VECTOR_SHAPE_OPTIONS;
  protected readonly elementTypeOptions = ELEMENT_TYPE_OPTIONS;
  protected readonly propOptions = PROP_OPTIONS;
  protected form: SpaceFormState = defaultFormState();

  private readonly engine = new SpatialMapEngine();
  private fpsIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly zone: NgZone) {}

  protected drawerOpen(): boolean {
    return this.isAdding() || this.editingId() !== null;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(async () => {
      await this.engine.init(this.hostRef.nativeElement);
      this.engine.loadSpaces(TEST_SPACES);

      // Hover/select/mode/transform are discrete, low-frequency events
      // (unlike pan/zoom), so re-entering the Angular zone here is right.
      this.engine.on('hover', (id) =>
        this.zone.run(() => {
          this.hoveredId.set(id);
          const space = id ? this.engine.getSpace(id) : undefined;
          this.hoverPreview.set(
            space ? { name: space.properties.name ?? id!, status: space.properties.status ?? '—' } : null,
          );
        }),
      );

      this.engine.on('select', (ids) =>
        this.zone.run(() => {
          this.selectedIds.set(ids);
          this.syncDrawerToSelection(ids);
        }),
      );

      this.engine.on('modechange', (mode) =>
        this.zone.run(() => {
          this.mode.set(mode);
          if (mode === 'view') this.closeForm();
        }),
      );

      this.engine.on('spacetransform', ({ id, geometry }) =>
        this.zone.run(() => {
          const r = Math.round(geometry.rotation ?? 0);
          this.lastTransform.set(
            `${id} → (${Math.round(geometry.x)}, ${Math.round(geometry.y)}), ${r}°`,
          );
        }),
      );

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

  // ---- Mode / inspector drawer ----

  protected setMode(mode: MapMode): void {
    this.engine.setMode(mode);
  }

  protected setVisualFilter(kind: 'all' | SpaceStatus | 'selected'): void {
    this.visualFilter.set(kind);
    if (kind === 'all') this.engine.setVisualFilter({ type: 'all' });
    else if (kind === 'selected') this.engine.setVisualFilter({ type: 'selected' });
    else this.engine.setVisualFilter({ type: 'status', status: kind });
  }

  private syncDrawerToSelection(ids: string[]): void {
    if (this.engine.getMode() !== 'edit' || this.isAdding()) return;
    if (ids.length === 1) {
      this.openEditForm(ids[0]);
    } else if (this.editingId()) {
      this.editingId.set(null);
    }
  }

  protected openAddForm(): void {
    this.engine.clearSelection();
    this.editingId.set(null);
    this.isAdding.set(true);
    this.form = defaultFormState();
  }

  private openEditForm(id: string): void {
    const space = this.engine.getSpace(id);
    if (!space) return;
    this.isAdding.set(false);
    this.editingId.set(id);
    this.form = {
      name: space.properties.name ?? '',
      status: space.properties.status ?? 'available',
      elementType: space.type === 'prop' || space.type === 'infrastructure' ? 'prop' : 'booth',
      propKind: space.properties.propKind ?? null,
      shape: space.geometry.type,
      width: space.geometry.width,
      height: space.geometry.height,
      imageDataUrl: space.properties.imageUrl ?? null,
    };
    // The drawer is about to cover the right edge of the canvas — nudge the
    // camera so the selected space lands in the clear area next to it,
    // instead of sliding underneath where it'd be hidden.
    this.engine.camera.fitBounds([id], {
      padding: EDIT_DRAWER_PADDING,
      maxZoom: 1.6,
      duration: 300,
    });
  }

  protected closeForm(): void {
    this.isAdding.set(false);
    if (this.editingId()) {
      this.editingId.set(null);
      this.engine.clearSelection();
    }
  }

  protected applyPreset(preset: SizePreset): void {
    this.form.width = preset.width;
    this.form.height = preset.height;
  }

  protected setElementType(elementType: SpaceElementType): void {
    this.form.elementType = elementType;
    this.form.propKind = defaultPropKindForElement(elementType);
    this.form.shape = defaultShapeForElement(elementType);

    if (elementType === 'prop') {
      this.form.name = '';
    }

    if (this.form.shape === 'circle') {
      const diameter = Math.max(4, Number(this.form.width) || 80);
      this.form.width = diameter;
      this.form.height = diameter;
    }
  }

  protected currentPropOptions(): Array<{ value: SpacePropKind; label: string }> {
    return this.propOptions;
  }

  protected onPropKindChange(kind: SpacePropKind | null): void {
    this.form.propKind = kind;
  }

  protected setShape(shape: SpaceGeometry['type']): void {
    this.form.shape = shape;

    if (shape === 'circle') {
      // Circle uses width as its diameter, so keep both dimensions equal.
      const diameter = Math.max(4, Number(this.form.width) || 80);
      this.form.width = diameter;
      this.form.height = diameter;
    }

    if (shape === 'line') {
      // Path is represented as a thin rotated vector segment.
      this.form.height = Math.max(3, Math.min(8, Number(this.form.height) || 6));
    }
  }

  protected onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.zone.run(() => (this.form.imageDataUrl = reader.result as string));
    reader.readAsDataURL(file);
  }

  protected removeImage(): void {
    this.form.imageDataUrl = null;
  }

  /** Places a new space just to the right of the current content's bounding
   *  box, so it never lands on top of an existing space regardless of what's
   *  already on the map (a fixed grid offset would only avoid collisions
   *  with one specific fixture, not whatever a real app has loaded). */
  private nextPlacement(width: number, height: number): { x: number; y: number } {
    const spaces = this.engine.exportData().spaces;
    if (spaces.length === 0) return { x: 0, y: 0 };

    const maxX = Math.max(...spaces.map((s) => s.geometry.x + s.geometry.width));
    const minY = Math.min(...spaces.map((s) => s.geometry.y));
    return { x: maxX + 40, y: minY };
  }

  protected saveForm(): void {
    const { name, status, elementType, propKind, shape, width, height, imageDataUrl } = this.form;
    const w = Math.max(4, Number(width) || 80);
    const h = shape === 'circle' ? w : Math.max(4, Number(height) || 60);
    const savedType: SpaceElementType = elementType;

    if (this.isAdding()) {
      const id = `space-${Date.now()}`;
      const position = this.nextPlacement(w, h);
      const newSpace: Space = {
        id,
        type: savedType,
        geometry: { type: shape, ...position, width: w, height: h },
        properties: {
          name: savedType === 'booth' ? (name || id) : undefined,
          status,
          propKind: savedType === 'booth' ? undefined : (propKind ?? undefined),
          imageUrl: savedType === 'booth' && shape === 'rectangle'
            ? (imageDataUrl ?? undefined)
            : undefined,
        },
      };
      this.engine.addSpace(newSpace);
      this.isAdding.set(false);
      this.engine.camera.flyTo(id);
      return;
    }

    const id = this.editingId();
    if (!id) return;
    this.engine.updateSpace(id, {
      type: savedType,
      geometry: { type: shape, width: w, height: h },
      properties: {
        name: savedType === 'booth' ? (name || id) : undefined,
        status,
        propKind: savedType === 'booth' ? undefined : (propKind ?? undefined),
        imageUrl: savedType === 'booth' && shape === 'rectangle'
          ? (imageDataUrl ?? undefined)
          : undefined,
      },
    });
    this.editingId.set(null);
    this.engine.clearSelection();
    this.engine.camera.flyTo(id);
  }

  protected deleteSpace(): void {
    const id = this.editingId();
    if (!id) return;
    this.engine.removeSpace(id);
    this.editingId.set(null);
  }

  protected bringToFront(): void {
    const id = this.editingId();
    if (id) this.engine.bringToFront(id);
  }

  protected sendToBack(): void {
    const id = this.editingId();
    if (id) this.engine.sendToBack(id);
  }

  // ---- Dev tools: camera ----

  protected onFitAll(): void {
    this.engine.camera.fitBounds();
  }

  protected onFlyToRotated(): void {
    this.engine.camera.flyTo('A106');
  }

  protected onZoomIn(): void {
    this.engine.camera.setZoom(2);
  }

  // ---- Dev tools: benchmark ----

  protected onLoadBenchSize(count: number): void {
    this.engine.loadSpaces(generateBenchSpaces(count));
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }

  protected onResetFixture(): void {
    this.engine.loadSpaces(TEST_SPACES);
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }

  // ---- Dev tools: data ops ----

  protected onAddTestSpace(): void {
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

  // ---- Dev tools: import/export ----

  protected lastExportJson: string | null = null;

  protected onExport(): void {
    const data = this.engine.exportData();
    this.lastExportJson = JSON.stringify(data, null, 2);

    const blob = new Blob([this.lastExportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spatial-map-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected onImportLastExport(): void {
    if (!this.lastExportJson) return;
    this.engine.importData(JSON.parse(this.lastExportJson));
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }
}
