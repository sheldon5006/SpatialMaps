import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapMode, SpatialMapEngine } from '../../lib/core/spatial-map-engine';
import {
  DEFAULT_MAP_STATUS_DEFINITIONS,
  DEFAULT_SPATIAL_MAP_SETTINGS,
  SpatialMapSettings,
  SpatialMapSettingsPatch,
} from '../../lib/core/spatial-map-settings';
import {
  Space,
  SpaceElementType,
  MapTheme,
  SpaceGeometry,
  MapStatusDefinition,
  SpaceStatus,
} from '../../lib/core/types';
import { generateBenchSpaces } from './generate-bench-spaces';
import { TEST_SPACES } from './test-spaces';

const BENCH_SIZES = [100, 1000, 5000, 10000, 50000] as const;

const DEFAULT_STATUS_DEFINITIONS: MapStatusDefinition[] =
  DEFAULT_MAP_STATUS_DEFINITIONS.map((status) => ({ ...status }));

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
  { value: 'textbox', label: 'Text Box' },
];

const PROP_COLOR_PALETTE = [
  { value: '#64748b', label: 'Slate' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#a16207', label: 'Earth' },
  { value: '#f5f5f4', label: 'Light' },
];

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
  shape: SpaceGeometry['type'];
  width: number;
  height: number;
  imageDataUrl: string | null;
  propColor: string;
  propRepresentation: 'shape' | 'image';
  textVisible: boolean;
}

function defaultFormState(): SpaceFormState {
  return {
    name: '',
    status: 'available',
    elementType: 'booth',
    shape: 'rectangle',
    width: 80,
    height: 60,
    imageDataUrl: null,
    propColor: '#64748b',
    propRepresentation: 'shape',
    textVisible: false,
  };
}

/** The inspector drawer (300px) covers the right edge while it's open, and
 *  the toolbar no longer overlaps the canvas at all (it's a real header
 *  now) — so only the drawer needs accounting for here. */
const EDIT_DRAWER_PADDING = { top: 24, right: 320, bottom: 24, left: 24 };
const MAP_VIEW_PADDING = { top: 24, right: 24, bottom: 24, left: 24 };
const SEARCH_PANEL_PADDING = { top: 24, right: 24, bottom: 24, left: 340 };

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
  exportAs: 'spatialMap',
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="spatial-map-root" [class.search-open]="mode() === 'view' && searchEnabled()">
      <!-- Top toolbar: a real in-flow header, not an overlay — the canvas
           area below it is the only thing the camera/handles ever need to
           reason about, so nothing rendered near world-space (0,0) can
           ever end up visually trapped under it. -->
      <div class="toolbar">
        <div class="mode-switch">
          <button [class.active]="mode() === 'view'" (click)="setMode('view')">View</button>
          <button [class.active]="mode() === 'edit'" (click)="setMode('edit')">Edit</button>
        </div>
        <div class="status-filter-control">
          <button
            class="filter-all-btn"
            [class.active]="visualFilter() === 'all'"
            (click)="setVisualFilter('all')"
          >All</button>

          @if (useStatusDropdown) {
            <div class="toolbar-select-shell">
              <select
                [(ngModel)]="statusFilterSelection"
                (ngModelChange)="setVisualFilter($event)"
                aria-label="Filter by status"
              >
                <option value="">Filter by status</option>
                @for (status of statusDefinitions; track status.key) {
                  <option [value]="status.key">{{ status.label }}</option>
                }
              </select>
            </div>
          } @else {
            <div class="mode-switch">
              @for (status of statusDefinitions; track status.key) {
                <button
                  [class.active]="visualFilter() === status.key"
                  (click)="setVisualFilter(status.key)"
                >
                  <span class="status-dot" [style.background]="status.color"></span>
                  {{ status.label }}
                </button>
              }
            </div>
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
        @if (mode() === 'edit') {
          <button class="icon-btn" [class.active]="gridEnabled()" (click)="toggleGrid()">
            Grid
          </button>
        }
        <button class="icon-btn" [class.active]="settingsOpen()" (click)="settingsOpen.set(!settingsOpen())">
          Map settings
        </button>
        <div class="toolbar-spacer"></div>
        <button class="icon-btn" (click)="devToolsOpen.set(!devToolsOpen())" title="Dev tools">
          Dev tools
        </button>
      </div>

      <div class="canvas-area">
        @if (mode() === 'view' && searchEnabled()) {
          <aside
            class="search-panel"
            [class.collapsed]="!searchListOpen()"
            aria-label="Search spaces"
          >
            <div class="search-panel-header">
              <div>
                <strong>Find a booth</strong>
                @if (searchListOpen()) {
                  <span>{{ searchableBooths().length }} booths</span>
                }
              </div>

              <div class="search-panel-actions">
                @if (searchQuery()) {
                  <button
                    type="button"
                    class="search-clear-btn"
                    (click)="clearSearch()"
                    aria-label="Clear search"
                  >×</button>
                }
                <button
                  type="button"
                  class="search-collapse-btn"
                  (click)="toggleSearchList()"
                  [attr.aria-expanded]="searchListOpen()"
                  [attr.aria-label]="searchListOpen() ? 'Collapse booth list' : 'Expand booth list'"
                  [title]="searchListOpen() ? 'Collapse booth list' : 'Show booth list'"
                >
                  <span [class.collapsed]="!searchListOpen()">⌄</span>
                </button>
              </div>
            </div>

            <label class="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchQueryChange($event)"
                placeholder="Search booth name or ID..."
                autocomplete="off"
              />
            </label>

            @if (!searchListOpen() && hoverPreview(); as preview) {
              <div class="hover-chip search-panel-hover">
                <span class="hover-chip-name">{{ preview.name }}</span>
                <span class="hover-chip-status" [attr.data-status]="preview.status">{{ preview.status }}</span>
              </div>
            }

            @if (searchListOpen() && searchQuery() && searchResults().length > 0) {
              <div class="search-summary">
                {{ searchMatches().length }} matching {{ searchMatches().length === 1 ? 'booth' : 'booths' }}
              </div>

              <div class="search-table-head" aria-hidden="true">
                <span>BOOTH</span>
                <span>NAME</span>
                <span>STATUS</span>
              </div>
              <div class="search-results" role="list">
                @for (space of searchResults(); track space.id) {
                  <button
                    type="button"
                    class="search-result"
                    [class.selected]="searchHighlightedId() === space.id || selectedIds().includes(space.id)"
                    (click)="openSearchResult(space.id)"
                    role="listitem"
                  >
                    <span class="search-result-id">{{ searchDisplayName(space) }}</span>
                    <span class="search-result-name">{{ searchLongName(space) }}</span>
                    <span
                      class="search-result-status"
                      [style.background]="statusColor(space.properties.status)"
                    >
                      {{ statusLabel(space.properties.status) }}
                    </span>
                  </button>
                }
              </div>
            }

            @if (searchQuery() && searchResults().length === 0) {
              <div class="search-empty">
                <strong>No booths found</strong>
                <span>Try a booth ID, name or status.</span>
              </div>
            }
          </aside>
        }

        <div class="map-pane">
          <div #host class="spatial-map-host"></div>
        </div>

        @if (settingsOpen()) {
          <div class="settings-panel">
            <div class="settings-header">
              <strong>Map settings</strong>
              <button class="icon-btn" (click)="settingsOpen.set(false)">Close</button>
            </div>

            <div class="settings-section">
              <span class="settings-label">Search</span>
              <label class="toggle-option">
                <input
                  type="checkbox"
                  [ngModel]="searchEnabled()"
                  (ngModelChange)="setSearchEnabled($event)"
                />
                <span>Show booth search</span>
              </label>
            </div>

            <div class="settings-section">
              <span class="settings-label">Canvas</span>
              <div class="mode-switch">
                <button [class.active]="mapTheme() === 'light'" (click)="setMapTheme('light')">Light</button>
                <button [class.active]="mapTheme() === 'dark'" (click)="setMapTheme('dark')">Dark</button>
              </div>
            </div>

            <div class="settings-section">
              <span class="settings-label">View zoom</span>
              <div class="settings-grid">
                <label>
                  <span>Min readable</span>
                  <input type="number" min="0.1" max="3" step="0.05" [(ngModel)]="viewMinZoom" />
                </label>
                <label>
                  <span>Base</span>
                  <input type="number" min="0.1" max="4" step="0.05" [(ngModel)]="viewBaseZoom" />
                </label>
                <label>
                  <span>Max</span>
                  <input type="number" min="0.2" max="6" step="0.05" [(ngModel)]="viewMaxZoom" />
                </label>
              </div>
              <div class="settings-actions">
                <button class="preset-btn" (click)="applyViewZoomSettings()">Apply limits</button>
                <button class="preset-btn" (click)="resetViewZoom()">Reset to base</button>
              </div>
              <small class="settings-help">View mode will never zoom below the readable minimum.</small>
            </div>

            <div class="settings-section">
              <div class="settings-section-heading">
                <span class="settings-label">Space statuses</span>
                <span class="settings-count">{{ statusCount }}</span>
              </div>

              <div class="status-list">
                @for (status of statusDefinitions; track status.key) {
                  <div class="status-row">
                    <span class="status-dot large" [style.background]="status.color"></span>
                    <div class="status-row-main">
                      <strong>{{ status.label }}</strong>
                      <small>{{ status.key }}</small>
                    </div>
                    <input
                      class="status-color-input"
                      type="color"
                      [ngModel]="status.color"
                      (ngModelChange)="updateStatusColor(status.key, $event)"
                      [attr.aria-label]="'Color for ' + status.label"
                    />
                    <button
                      type="button"
                      class="status-remove-btn"
                      [disabled]="isStatusInUse(status.key)"
                      [title]="isStatusInUse(status.key) ? 'Status is assigned to a space' : 'Remove status'"
                      (click)="removeStatus(status.key)"
                    >×</button>
                  </div>
                }
              </div>

              <div class="status-add-row">
                <input
                  type="text"
                  [(ngModel)]="newStatusLabel"
                  placeholder="Add status, e.g. Pending"
                  (keydown.enter)="addStatus()"
                />
                <input
                  class="status-color-input"
                  type="color"
                  [(ngModel)]="newStatusColor"
                  aria-label="New status color"
                />
                <button type="button" class="preset-btn" (click)="addStatus()">Add</button>
              </div>
              <small class="settings-help">
                Status color controls booth background. All and Selected only are map controls.
              </small>
            </div>

            @if (mode() === 'edit') {
              <div class="settings-section">
                <span class="settings-label">Edit grid</span>
                <label class="toggle-option">
                  <input type="checkbox" [(ngModel)]="gridEnabled" (ngModelChange)="setGridEnabled($event)" />
                  <span>Show layout grid</span>
                </label>
                <div class="grid-size-row">
                  <span>Grid size</span>
                  @for (size of gridSizes; track size) {
                    <button
                      type="button"
                      class="preset-btn"
                      [class.active]="gridSize === size"
                      (click)="setGridSize(size)"
                    >{{ size }} px</button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Hover preview chip:
             collapsed search -> inside search panel below the search box;
             expanded search -> immediately beside the search panel;
             search disabled/edit mode -> original canvas position. -->
        @if (hoverPreview(); as preview) {
          @if (mode() === 'view' && searchEnabled() && searchListOpen()) {
            <div class="hover-chip search-adjacent-hover">
              <span class="hover-chip-name">{{ preview.name }}</span>
              <span class="hover-chip-status" [attr.data-status]="preview.status">{{ preview.status }}</span>
            </div>
          } @else if (!(mode() === 'view' && searchEnabled())) {
            <div class="hover-chip">
              <span class="hover-chip-name">{{ preview.name }}</span>
              <span class="hover-chip-status" [attr.data-status]="preview.status">{{ preview.status }}</span>
            </div>
          }
        }

        <!-- Contextual inspector drawer -->
        <div class="inspector-drawer" [class.open]="drawerOpen()">
        <div class="inspector-header">
          <h3>{{ editingId() ? 'Edit space' : 'Add space' }}</h3>
          <button class="icon-btn" (click)="closeForm()">Close</button>
        </div>

        <label class="field">
          <span>Name</span>
          <input
            type="text"
            [(ngModel)]="form.name"
            [placeholder]="
              form.elementType === 'booth'
                ? 'e.g. Booth A101'
                : form.elementType === 'textbox'
                  ? 'e.g. GENERAL STORE'
                  : 'e.g. Tree / Main Entrance'
            "
          />
        </label>

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

          @if (form.elementType === 'prop') {
            <label class="field">
              <span>Representation</span>
              <div class="mode-switch">
                <button
                  type="button"
                  [class.active]="form.propRepresentation === 'shape'"
                  [attr.aria-pressed]="form.propRepresentation === 'shape'"
                  (click)="setPropRepresentation('shape')"
                >Shape</button>
                <button
                  type="button"
                  [class.active]="form.propRepresentation === 'image'"
                  [attr.aria-pressed]="form.propRepresentation === 'image'"
                  (click)="setPropRepresentation('image')"
                >Image</button>
              </div>
            </label>

            <div class="field toggle-field">
              <span>Text</span>
              <label class="toggle-option">
                <input type="checkbox" [(ngModel)]="form.textVisible" />
                <span>Show prop name on map</span>
              </label>
            </div>

            @if (form.propRepresentation === 'shape') {
              <label class="field">
                <span>Shape</span>
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

              <label class="field">
                <span>Prop color</span>
                <div class="prop-color-palette" role="group" aria-label="Prop color">
                  @for (color of propColorPalette; track color.value) {
                    <button
                      type="button"
                      class="prop-color-swatch"
                      [class.active]="form.propColor === color.value"
                      [style.background]="color.value"
                      [attr.aria-label]="color.label"
                      [attr.aria-pressed]="form.propColor === color.value"
                      (click)="setPropColor(color.value)"
                    ></button>
                  }
                  <label class="custom-color">
                    <span>Custom</span>
                    <input type="color" [(ngModel)]="form.propColor" aria-label="Custom prop color" />
                  </label>
                </div>
              </label>
            }
          } @else if (form.elementType === 'booth') {
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
          } @else {
            <p class="rotate-hint">
              Uses the Name field as the text displayed on the map.
            </p>
          }
        }

        @if (form.elementType !== 'textbox') {
          <label class="field">
            <span>Status</span>
            <div class="select-shell">
              <select [(ngModel)]="form.status">
                @for (status of statusDefinitions; track status.key) {
                  <option [value]="status.key">{{ status.label }}</option>
                }
              </select>
            </div>
          </label>
        }

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

        @if (form.elementType === 'booth' || (form.elementType === 'prop' && form.propRepresentation === 'image')) {
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
        }

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

      /* ---- Search panel ------------------------------------------------ */

      .map-pane {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
      }

      .spatial-map-root.search-open .map-pane {
        left: 308px;
      }

      .search-panel {
        position: absolute;
        top: 0;
        left: 0;
        bottom: auto;
        z-index: 16;
        width: 308px;
        max-height: calc(100% - 16px);
        display: flex;
        flex-direction: column;
        background: rgba(18, 20, 26, 0.96);
        border-right: 1px solid rgba(255, 255, 255, 0.10);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0 0 10px 0;
        box-shadow: 14px 0 35px rgba(0, 0, 0, 0.16);
        overflow: hidden;
      }

      .search-panel.collapsed {
        bottom: auto;
        height: auto;
        max-height: none;
      }

      .search-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 16px 12px;
        color: #e8eaf0;
      }

      .search-panel-header > div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .search-panel-header strong {
        font-size: 15px;
        letter-spacing: -0.01em;
      }

      .search-panel-header span {
        color: #7f8794;
        font-size: 11px;
      }

      .search-panel-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .search-collapse-btn {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.04);
        color: #aab1bd;
      }

      .search-collapse-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .search-collapse-btn span {
        font-size: 14px;
        line-height: 1;
        transform: translateY(-1px);
        transition: transform 0.16s ease;
      }

      .search-collapse-btn span.collapsed {
        transform: rotate(-90deg) translateX(1px);
      }

      .search-clear-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.06);
        color: #aab1bd;
        font-size: 18px;
      }

      .search-box {
        margin: 0 14px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 11px;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.055);
        color: #8f97a3;
      }

      .search-box:focus-within {
        border-color: #3a7afe;
        box-shadow: 0 0 0 2px rgba(58, 122, 254, 0.14);
      }

      .search-box span {
        font-size: 18px;
        line-height: 1;
      }

      .search-box input {
        min-width: 0;
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        color: #edf0f4;
        font: inherit;
      }

      .search-box input::placeholder {
        color: #6f7783;
      }

      .search-summary {
        padding: 0 16px 10px;
        color: #707987;
        font-size: 11px;
      }

      /* Hover information lives with the search UI instead of being hidden
         underneath the left panel. */
      .search-panel-hover {
        position: static;
        margin: 0 14px 10px;
        width: auto;
        align-self: stretch;
        box-sizing: border-box;
      }

      .search-adjacent-hover {
        top: 12px;
        left: 320px;
        z-index: 17;
      }

      .search-table-head {
        display: grid;
        grid-template-columns: 58px 1fr auto;
        gap: 10px;
        padding: 0 17px 7px;
        color: #606876;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      .search-results {
        flex: 0 1 auto;
        min-height: 0;
        max-height: 42vh;
        overflow-y: auto;
        padding: 0 8px 14px;
      }

      .search-result {
        width: 100%;
        display: grid;
        grid-template-columns: 58px 1fr auto;
        gap: 7px 10px;
        align-items: center;
        padding: 10px 9px;
        margin-bottom: 4px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: #dfe3ea;
        text-align: left;
      }

      .search-result:hover {
        background: rgba(255, 255, 255, 0.055);
        border-color: rgba(255, 255, 255, 0.08);
      }

      .search-result.selected {
        background: rgba(58, 122, 254, 0.10);
        border-color: rgba(58, 122, 254, 0.28);
      }

      .search-result-id {
        font-weight: 700;
        font-size: 12px;
        color: #f0f3f7;
      }

      .search-result-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #aeb4be;
        font-size: 11px;
      }

      .search-result-status {
        justify-self: end;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 3px 6px;
        border-radius: 999px;
        color: #15191d;
        font-size: 9px;
        font-weight: 700;
      }

      .search-empty {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        padding: 36px 20px;
        text-align: center;
        color: #7e8692;
        font-size: 11px;
      }

      .search-empty strong {
        color: #dfe3ea;
        font-size: 13px;
      }

      /* ---- Map settings ---------------------------------------------- */

      .settings-panel {
        position: absolute;
        top: 10px;
        right: 12px;
        z-index: 20;
        width: 310px;
        max-height: calc(100% - 20px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        border-radius: 12px;
        background: rgba(18, 20, 26, 0.96);
        border: 1px solid rgba(255, 255, 255, 0.10);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.30);
      }

      .status-filter-control {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .filter-all-btn {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #c3c7d1;
        padding: 6px 12px;
        border-radius: 7px;
      }

      .filter-all-btn.active {
        background: #3a7afe;
        border-color: #3a7afe;
        color: #fff;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        display: inline-block;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28);
      }

      .mode-switch button {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .toolbar-select-shell,
      .select-shell {
        position: relative;
      }

      .toolbar-select-shell::after,
      .select-shell::after {
        content: '⌄';
        position: absolute;
        top: 50%;
        right: 10px;
        transform: translateY(-55%);
        color: #aeb4bf;
        pointer-events: none;
        font-size: 14px;
      }

      .toolbar-select-shell select,
      .select-shell select {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        min-width: 148px;
        padding: 7px 32px 7px 10px;
        border-radius: 7px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        background: #20242b;
        color: #e8eaf0;
        color-scheme: dark;
        font: inherit;
        outline: none;
      }

      .toolbar-select-shell select:focus,
      .select-shell select:focus {
        border-color: #3a7afe;
        box-shadow: 0 0 0 2px rgba(58, 122, 254, 0.18);
      }

      .toolbar-select-shell select option,
      .select-shell select option {
        background: #20242b;
        color: #e8eaf0;
      }

      .settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #e8eaf0;
      }

      .settings-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .settings-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7f8794;
      }

      .settings-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .settings-count {
        min-width: 22px;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: #aeb4bf;
        text-align: center;
        font-size: 11px;
      }

      .status-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.07);
      }

      .status-row-main {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .status-row-main strong {
        color: #e6e8ed;
        font-size: 12px;
      }

      .status-row-main small {
        color: #757d89;
        font-size: 10px;
      }

      .status-dot.large {
        width: 12px;
        height: 12px;
      }

      .status-color-input {
        width: 30px;
        height: 30px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 7px;
        background: transparent;
        overflow: hidden;
      }

      .status-remove-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
        color: #949ba6;
        border-radius: 6px;
      }

      .status-remove-btn:hover:not(:disabled) {
        background: rgba(226, 75, 74, 0.16);
        color: #ff9a9a;
      }

      .status-remove-btn:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }

      .status-add-row {
        display: grid;
        grid-template-columns: 1fr 36px auto;
        gap: 6px;
      }

      .status-add-row input[type='text'] {
        min-width: 0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 7px;
        color: #e8eaf0;
        padding: 7px 9px;
        font: inherit;
      }

      .settings-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .settings-grid label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: #9a9fab;
        font-size: 11px;
      }

      .settings-grid input {
        width: 100%;
        box-sizing: border-box;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 7px;
        color: #e8eaf0;
        padding: 7px 8px;
        font: inherit;
      }

      .settings-actions,
      .grid-size-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }

      .settings-help {
        color: #6f7681;
        line-height: 1.35;
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
      .field input[type='number'] {
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

      .prop-color-palette {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        align-items: center;
      }

      .prop-color-swatch {
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18);
      }

      .prop-color-swatch.active {
        border-color: #ffffff;
        box-shadow: 0 0 0 2px #3a7afe;
      }

      .toggle-option {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 7px 10px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        color: #c3c7d1;
        cursor: pointer;
      }

      .toggle-option input {
        width: 16px;
        height: 16px;
        accent-color: #3a7afe;
      }

      .toggle-option:has(input:checked) {
        background: rgba(58, 122, 254, 0.12);
        border-color: rgba(58, 122, 254, 0.55);
        color: #ffffff;
      }

      .custom-color {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 2px;
        font-size: 11px;
        color: #9a9fab;
      }

      .custom-color input {
        width: 30px;
        height: 30px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 7px;
        background: transparent;
        overflow: hidden;
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
export class SpatialMap implements AfterViewInit, OnChanges, OnDestroy {
  /** Optional application-controlled data source. Omit to keep the existing demo fixture. */
  @Input() spaces: Space[] | null = null;
  /** Optional application-controlled runtime settings. */
  @Input() settings: SpatialMapSettingsPatch | null = null;
  /** Optional application-controlled status definitions. */
  @Input() statuses: MapStatusDefinition[] | null = null;

  @Output() readonly selectionChange = new EventEmitter<string[]>();
  @Output() readonly hoverChange = new EventEmitter<string | null>();
  @Output() readonly modeChange = new EventEmitter<MapMode>();
  @Output() readonly filterChange = new EventEmitter<'all' | SpaceStatus | 'selected'>();
  @Output() readonly spaceTransform = new EventEmitter<{ id: string; geometry: Space['geometry'] }>();
  @Output() readonly spacesChange = new EventEmitter<Space[]>();
  @Output() readonly searchResultClick = new EventEmitter<string>();
  @Output() readonly ready = new EventEmitter<void>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fpsReadout', { static: true }) fpsReadoutRef!: ElementRef<HTMLSpanElement>;
  private engineReady = false;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly hoverPreview = signal<{ name: string; status: string } | null>(null);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly lastTransform = signal<string | null>(null);
  protected readonly mode = signal<MapMode>('view');
  protected readonly visualFilter = signal<'all' | SpaceStatus | 'selected'>('all');
  protected statusDefinitions: MapStatusDefinition[] = DEFAULT_STATUS_DEFINITIONS.map((status) => ({ ...status }));
  protected statusFilterSelection = '';
  protected newStatusLabel = '';
  protected newStatusColor = '#3b82f6';
  protected readonly mapTheme = signal<MapTheme>('light');
  protected readonly settingsOpen = signal(false);
  protected readonly gridEnabled = signal(true);
  protected readonly searchEnabled = signal(DEFAULT_SPATIAL_MAP_SETTINGS.search.enabled);
  protected focusEnabled = DEFAULT_SPATIAL_MAP_SETTINGS.focus.enabled;
  protected focusDurationMs = DEFAULT_SPATIAL_MAP_SETTINGS.focus.durationMs;
  protected focusColor = DEFAULT_SPATIAL_MAP_SETTINGS.focus.color;
  protected readonly devToolsOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly isAdding = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly searchHighlightedId = signal<string | null>(null);
  protected readonly searchListOpen = signal(true);

  protected readonly searchableBooths = computed(() =>
    this.searchableSpaces().filter((space) => space.type === 'booth'),
  );

  /** All matches are kept for map highlighting; the list is capped only for UI density. */
  protected readonly searchMatches = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];

    const terms = query.split(/\s+/).filter(Boolean);
    return this.searchableBooths().filter((space) => {
      const haystack = [
        space.id,
        space.properties.name ?? '',
        space.properties.status ?? '',
        this.statusLabel(space.properties.status),
      ].join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  });

  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.searchableBooths().slice(0, 12);
    return this.searchMatches().slice(0, 20);
  });

  protected readonly searchableSpaces = signal<Space[]>([]);

  protected readonly benchSizes = BENCH_SIZES;
  protected get statusOptions(): string[] {
    return this.statusDefinitions.map((status) => status.key);
  }

  protected get statusCount(): number {
    return this.statusDefinitions.length;
  }

  protected get useStatusDropdown(): boolean {
    return this.statusDefinitions.length > 5;
  }
  protected readonly sizePresets = SIZE_PRESETS;
  protected readonly vectorShapeOptions = VECTOR_SHAPE_OPTIONS;
  protected readonly elementTypeOptions = ELEMENT_TYPE_OPTIONS;
  protected readonly propColorPalette = PROP_COLOR_PALETTE;
  protected readonly gridSizes = [25, 50, 100] as const;
  protected viewMinZoom = 0.65;
  protected viewBaseZoom = 0.88;
  protected viewMaxZoom = 2.8;
  protected gridSize = 50;
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
      this.applyInputSettings();
      this.engine.setSettings(this.buildSettings());
      this.applyStatusStyles();
      this.engine.loadSpaces(this.spaces ?? TEST_SPACES);
      this.searchableSpaces.set(this.engine.exportData().spaces);
      this.engineReady = true;
      this.ready.emit();
      // Start from a complete map view instead of the engine's 60px/60px
      // world offset. Fit is allowed to go below the interactive readable
      // minimum so the whole venue remains visible.
      this.engine.camera.fitBounds(undefined, {
        duration: 0,
        padding: MAP_VIEW_PADDING,
      });
      // The overview is a browsing start point, not a tiny architectural
      // thumbnail. Center first, then move to the configured readable base.
      this.engine.camera.setZoom(this.viewBaseZoom, { duration: 0 });

      // Hover/select/mode/transform are discrete, low-frequency events
      // (unlike pan/zoom), so re-entering the Angular zone here is right.
      this.engine.on('hover', (id) =>
        this.zone.run(() => {
          this.hoveredId.set(id);
          const space = id ? this.engine.getSpace(id) : undefined;
          this.hoverPreview.set(
            space
            ? {
                name: space.properties.name ?? id!,
                status: this.statusLabel(space.properties.status),
              }
            : null,
          );
          this.hoverChange.emit(id);
        }),
      );

      this.engine.on('select', (ids) =>
        this.zone.run(() => {
          this.selectedIds.set(ids);
          this.syncDrawerToSelection(ids);
          this.selectionChange.emit(ids);
        }),
      );

      this.engine.on('modechange', (mode) =>
        this.zone.run(() => {
          this.mode.set(mode);
          this.modeChange.emit(mode);
          if (mode === 'view') this.closeForm();
        }),
      );

      this.engine.on('spacetransform', ({ id, geometry }) =>
        this.zone.run(() => {
          const r = Math.round(geometry.rotation ?? 0);
          this.lastTransform.set(
            `${id} → (${Math.round(geometry.x)}, ${Math.round(geometry.y)}), ${r}°`,
          );
          this.spaceTransform.emit({ id, geometry });
        }),
      );

      this.engine.on('spaceschange', (spaces) =>
        this.zone.run(() => {
          this.searchableSpaces.set(spaces);
          this.spacesChange.emit(spaces);
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

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.engineReady) return;

    if (changes['statuses']) {
      this.setStatuses(this.statuses ?? DEFAULT_STATUS_DEFINITIONS);
    }

    if (changes['settings']) {
      this.applyInputSettings();
      this.engine.setSettings(this.buildSettings());
    }

    if (changes['spaces'] && this.spaces) {
      this.setMapSpaces(this.spaces);
    }
  }

  private applyInputSettings(): void {
    const settings = this.settings ?? {};
    const zoom = settings.zoom ?? {};
    const grid = settings.grid ?? {};

    this.mapTheme.set(settings.theme ?? DEFAULT_SPATIAL_MAP_SETTINGS.theme);
    this.viewMinZoom = zoom.minZoom ?? DEFAULT_SPATIAL_MAP_SETTINGS.zoom.minZoom;
    this.viewBaseZoom = zoom.baseZoom ?? DEFAULT_SPATIAL_MAP_SETTINGS.zoom.baseZoom;
    this.viewMaxZoom = zoom.maxZoom ?? DEFAULT_SPATIAL_MAP_SETTINGS.zoom.maxZoom;
    this.gridEnabled.set(grid.enabled ?? DEFAULT_SPATIAL_MAP_SETTINGS.grid.enabled);
    this.gridSize = grid.size ?? DEFAULT_SPATIAL_MAP_SETTINGS.grid.size;
    this.searchEnabled.set(settings.search?.enabled ?? DEFAULT_SPATIAL_MAP_SETTINGS.search.enabled);
    this.focusEnabled = settings.focus?.enabled ?? DEFAULT_SPATIAL_MAP_SETTINGS.focus.enabled;
    this.focusDurationMs = settings.focus?.durationMs ?? DEFAULT_SPATIAL_MAP_SETTINGS.focus.durationMs;
    this.focusColor = settings.focus?.color ?? DEFAULT_SPATIAL_MAP_SETTINGS.focus.color;
    this.statusDefinitions = (this.statuses ?? DEFAULT_STATUS_DEFINITIONS).map((status) => ({ ...status }));
  }

  private buildSettings(): SpatialMapSettings {
    return {
      theme: this.mapTheme(),
      zoom: {
        minZoom: this.viewMinZoom,
        baseZoom: this.viewBaseZoom,
        maxZoom: this.viewMaxZoom,
      },
      grid: {
        enabled: this.gridEnabled(),
        size: this.gridSize,
      },
      search: {
        enabled: this.searchEnabled(),
      },
      focus: {
        enabled: this.focusEnabled,
        durationMs: this.focusDurationMs,
        color: this.focusColor,
      },
    };
  }

  /**
   * Programmatic integration API.
   * The built-in Angular controls call the same public methods, so external
   * code can drive the map without bypassing or replacing the UI workflow.
   */
  setMapSettings(settings: SpatialMapSettingsPatch): void {
    this.settings = { ...(this.settings ?? {}), ...settings };

    if (settings.theme) this.mapTheme.set(settings.theme);
    if (settings.zoom?.minZoom !== undefined) this.viewMinZoom = settings.zoom.minZoom;
    if (settings.zoom?.baseZoom !== undefined) this.viewBaseZoom = settings.zoom.baseZoom;
    if (settings.zoom?.maxZoom !== undefined) this.viewMaxZoom = settings.zoom.maxZoom;
    if (settings.grid?.enabled !== undefined) this.gridEnabled.set(settings.grid.enabled);
    if (settings.grid?.size !== undefined) this.gridSize = settings.grid.size;
    if (settings.search?.enabled !== undefined) this.searchEnabled.set(settings.search.enabled);
    if (settings.focus?.enabled !== undefined) this.focusEnabled = settings.focus.enabled;
    if (settings.focus?.durationMs !== undefined) this.focusDurationMs = Math.max(0, Math.round(settings.focus.durationMs));
    if (settings.focus?.color !== undefined) this.focusColor = settings.focus.color;

    this.engine.setSettings(settings);

    if (settings.search?.enabled !== undefined) {
      this.engine.camera.fitBounds(undefined, {
        padding: this.searchEnabled() ? SEARCH_PANEL_PADDING : { top: 24, right: 24, bottom: 24, left: 24 },
        duration: 250,
      });
    }
  }

  getMapSettings(): SpatialMapSettings {
    return this.engine.getSettings();
  }

  setMapSpaces(spaces: Space[]): void {
    this.spaces = spaces;
    if (!this.engineReady) return;
    this.engine.loadSpaces(spaces);
    this.engine.camera.fitBounds(undefined, { duration: 0 });
  }

  setStatuses(statuses: MapStatusDefinition[]): void {
    this.statusDefinitions = statuses.map((status) => ({ ...status }));
    this.statuses = this.statusDefinitions;
    this.applyStatusStyles();
  }

  addStatusDefinition(definition: MapStatusDefinition): void {
    this.setStatuses([
      ...this.statusDefinitions.filter((status) => status.key !== definition.key),
      { ...definition },
    ]);
  }

  updateStatusDefinition(key: string, patch: Partial<Omit<MapStatusDefinition, 'key'>>): void {
    this.setStatuses(
      this.statusDefinitions.map((status) =>
        status.key === key ? { ...status, ...patch } : status,
      ),
    );
  }

  removeStatusDefinition(key: string): void {
    this.removeStatus(key);
  }

  getSpace(id: string): Space | undefined {
    return this.engine.getSpace(id);
  }

  getSpaceCount(): number {
    return this.engine.getSpaceCount();
  }

  setSelectionRule(rule: Parameters<SpatialMapEngine['setSelectionRule']>[0]): void {
    this.engine.setSelectionRule(rule);
  }

  selectSpaces(ids: string[]): void {
    this.engine.clearSelection();
    ids.forEach((id) => this.engine.selectSpace(id, true));
  }

  clearSelection(): void {
    this.engine.clearSelection();
  }

  addSpace(space: Space): void {
    this.engine.addSpace(space);
  }

  updateSpace(
    id: string,
    patch: Parameters<SpatialMapEngine['updateSpace']>[1],
  ): void {
    this.engine.updateSpace(id, patch);
  }

  removeSpace(id: string): void {
    this.engine.removeSpace(id);
  }

  fitToMap(options?: Parameters<SpatialMapEngine['camera']['fitBounds']>[1]): void {
    this.engine.camera.fitBounds(undefined, options);
  }

  flyTo(
    id: string,
    options?: Parameters<SpatialMapEngine['camera']['flyTo']>[1],
  ): void {
    this.engine.camera.flyTo(id, options);

    const durationMs = this.focusEnabled ? this.focusDurationMs : 0;
    if (durationMs > 0) {
      this.engine.focusSpace(id, {
        durationMs,
        color: this.focusColor,
      });
    }
  }

  setFocusSettings(focus: Partial<SpatialMapSettings['focus']>): void {
    this.setMapSettings({ focus });
  }

  getFocusSettings(): SpatialMapSettings['focus'] {
    return this.getMapSettings().focus;
  }

  setZoom(zoom: number): void {
    this.engine.camera.setZoom(zoom);
  }

  setSearchHighlight(id: string | null): void {
    this.searchHighlightedId.set(id);
    this.engine.setSearchHighlight(id);
  }

  getZoom(): number {
    return this.engine.camera.getZoom();
  }

  setModeFromCode(mode: MapMode): void {
    this.setMode(mode);
  }

  setFilterFromCode(filter: 'all' | SpaceStatus | 'selected'): void {
    this.setVisualFilter(filter);
  }

  exportMap(): ReturnType<SpatialMapEngine['exportData']> {
    return this.engine.exportData();
  }

  importMap(data: Parameters<SpatialMapEngine['importData']>[0]): void {
    this.engine.importData(data);
  }

  ngOnDestroy(): void {
    if (this.fpsIntervalId !== null) clearInterval(this.fpsIntervalId);
    this.engine.destroy();
  }

  // ---- Mode / inspector drawer ----

  setMode(mode: MapMode): void {
    this.engine.setMode(mode);

    if (mode === 'view') {
      this.engine.setZoomLimits({
        minZoom: this.viewMinZoom,
        maxZoom: this.viewMaxZoom,
      });
      if (this.engine.camera.getZoom() < this.viewMinZoom) {
        this.engine.camera.setZoom(this.viewMinZoom, { duration: 250 });
      }
    } else {
      // Editor gets a wider range so large maps can be laid out comfortably.
      this.engine.setZoomLimits({ minZoom: 0.25, maxZoom: 3.5 });
    }
  }

  setMapTheme(theme: MapTheme): void {
    this.mapTheme.set(theme);
    this.engine.setTheme(theme);
  }

  toggleGrid(): void {
    this.setGridEnabled(!this.gridEnabled());
  }

  setGridEnabled(enabled: boolean): void {
    this.gridEnabled.set(enabled);
    this.engine.setGridEnabled(enabled);
  }

  setGridSize(size: number): void {
    this.gridSize = size;
    this.engine.setGridSize(size);
  }

  applyViewZoomSettings(): void {
    this.viewMinZoom = Math.max(0.1, Math.min(this.viewMinZoom, this.viewMaxZoom));
    this.viewBaseZoom = Math.max(this.viewMinZoom, Math.min(this.viewBaseZoom, this.viewMaxZoom));
    this.viewMaxZoom = Math.max(this.viewBaseZoom, this.viewMaxZoom);
    this.engine.setZoomLimits({
      minZoom: this.viewMinZoom,
      maxZoom: this.viewMaxZoom,
    });

    if (this.mode() === 'view' && this.engine.camera.getZoom() < this.viewMinZoom) {
      this.engine.camera.setZoom(this.viewMinZoom, { duration: 250 });
    }
  }

  resetViewZoom(): void {
    this.applyViewZoomSettings();
    this.engine.camera.setZoom(this.viewBaseZoom, { duration: 300 });
  }

  setVisualFilter(kind: 'all' | SpaceStatus | 'selected'): void {
    this.visualFilter.set(kind);
    if (kind === 'all') {
      this.statusFilterSelection = '';
      this.engine.setVisualFilter({ type: 'all' });
    } else if (kind === 'selected') {
      this.statusFilterSelection = '';
      this.engine.setVisualFilter({ type: 'selected' });
    } else {
      this.statusFilterSelection = kind;
      this.engine.setVisualFilter({ type: 'status', status: kind });
    }
    this.filterChange.emit(kind);
  }

  protected toggleSearchList(): void {
    this.searchListOpen.update((open) => !open);
  }

  protected onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    const trimmed = query.trim();

    if (!trimmed) {
      this.searchHighlightedId.set(null);
      this.engine.setSearchHighlights([]);
      this.engine.focusSpaces([]);
      return;
    }

    const matches = this.searchMatches();
    const ids = matches.map((space) => space.id);

    // Only reveal the result list when there are actual matches. The panel
    // naturally grows to the height of the visible result rows.
    this.searchListOpen.set(matches.length > 0);

    // Every matching booth is highlighted on every keystroke.
    this.searchHighlightedId.set(matches.length === 1 ? matches[0].id : null);
    this.engine.setSearchHighlights(ids);

    // A single result or a tight cluster flies to the nearest matching booth.
    // A scattered multi-result search zooms out to show all matching booths.
    if (matches.length === 1 || this.isSearchCluster(matches)) {
      const nearest = this.nearestSearchMatch(matches);
      this.engine.camera.flyTo(nearest.id, {
        padding: MAP_VIEW_PADDING,
        maxZoom: 1.8,
        duration: 450,
      });
    } else {
      this.engine.camera.fitBounds(ids, {
        padding: MAP_VIEW_PADDING,
        maxZoom: 1.15,
        duration: 450,
      });
    }

    // The temporary focus rope is applied to every current match, regardless
    // of whether the camera flies to one result or fits the multi-result set.
    if (this.focusEnabled && this.focusDurationMs > 0) {
      this.engine.focusSpaces(ids, {
        durationMs: this.focusDurationMs,
        color: '#111827',
      });
    } else {
      this.engine.focusSpaces([]);
    }
  }

  private isSearchCluster(matches: Space[]): boolean {
    if (matches.length <= 1) return true;

    const centers = matches.map((space) => ({
      x: space.geometry.x + space.geometry.width / 2,
      y: space.geometry.y + space.geometry.height / 2,
    }));
    const centerX = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
    const centerY = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;

    return centers.every((point) =>
      Math.hypot(point.x - centerX, point.y - centerY) <= 320,
    );
  }

  private nearestSearchMatch(matches: Space[]): Space {
    const camera = this.engine.getCameraState();
    const viewportWidth = Math.max(1, this.hostRef.nativeElement.clientWidth);
    const viewportHeight = Math.max(1, this.hostRef.nativeElement.clientHeight);
    const viewportCenterX = (viewportWidth / 2 - camera.x) / camera.zoom;
    const viewportCenterY = (viewportHeight / 2 - camera.y) / camera.zoom;

    return matches.reduce((nearest, space) => {
      const currentX = space.geometry.x + space.geometry.width / 2;
      const currentY = space.geometry.y + space.geometry.height / 2;
      const nearestX = nearest.geometry.x + nearest.geometry.width / 2;
      const nearestY = nearest.geometry.y + nearest.geometry.height / 2;

      return Math.hypot(currentX - viewportCenterX, currentY - viewportCenterY) <
        Math.hypot(nearestX - viewportCenterX, nearestY - viewportCenterY)
        ? space
        : nearest;
    });
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchHighlightedId.set(null);
    this.engine.setSearchHighlights([]);
    this.engine.focusSpaces([]);
  }

  protected setSearchEnabled(enabled: boolean): void {
    this.searchEnabled.set(enabled);
    if (!enabled) this.setSearchHighlight(null);
    this.setMapSettings({
      search: { enabled },
    });
  }

  protected searchDisplayName(space: Space): string {
    return space.id;
  }

  protected searchLongName(space: Space): string {
    const raw = (space.properties.name ?? '').replace(/\\n/g, ' ').trim();
    const prefixed = raw.toLowerCase().startsWith(space.id.toLowerCase())
      ? raw.slice(space.id.length).replace(/^[-:\s]+/, '').trim()
      : raw;
    return prefixed || 'Untitled booth';
  }

  protected statusColor(status: string | undefined): string {
    return this.statusDefinitions.find((item) => item.key === status)?.color ?? '#64748b';
  }

  protected openSearchResult(id: string): void {
    const query = this.searchQuery().trim();
    const matches = query
      ? this.searchMatches()
      : (() => {
          const space = this.engine.getSpace(id);
          return space ? [space] : [];
        })();

    if (matches.length > 0) {
      const ids = matches.map((space) => space.id);
      this.engine.setSearchHighlights(ids);
      this.searchHighlightedId.set(id);

      if (query && matches.length > 1 && !this.isSearchCluster(matches)) {
        this.engine.camera.fitBounds(ids, {
          padding: SEARCH_PANEL_PADDING,
          maxZoom: 1.15,
          duration: 450,
        });
      } else {
        const target = query ? this.nearestSearchMatch(matches) : this.engine.getSpace(id);
        if (target) {
          this.engine.camera.flyTo(target.id, {
            padding: SEARCH_PANEL_PADDING,
            maxZoom: 1.8,
            duration: 450,
          });
        }
      }

      if (this.focusEnabled && this.focusDurationMs > 0) {
        this.engine.focusSpaces(ids, {
          durationMs: this.focusDurationMs,
          color: '#111827',
        });
      }
    }

    this.searchResultClick.emit(id);
  }

  /** Programmatic search helper for surrounding Angular code. */
  searchSpaces(query: string): Space[] {
    const terms = query.trim().toLowerCase().split(/\\s+/).filter(Boolean);
    return this.searchableBooths().filter((space) => {
      if (terms.length === 0) return true;
      const haystack = [
        space.id,
        space.properties.name ?? '',
        space.properties.status ?? '',
        this.statusLabel(space.properties.status),
      ].join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  protected statusLabel(status: string | undefined): string {
    if (!status) return '—';
    return this.statusDefinitions.find((item) => item.key === status)?.label ?? status;
  }

  private applyStatusStyles(): void {
    const styles = Object.fromEntries(
      this.statusDefinitions.map((status) => {
        const fill = this.hexToNumber(status.color);
        return [
          status.key,
          {
            fill,
            stroke: fill,
            strokeWidth: 1,
          },
        ];
      }),
    );
    this.engine.setStatusStyles(styles);
  }

  private hexToNumber(value: string): number {
    const normalized = value.trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{6}$/.test(normalized)
      ? Number.parseInt(normalized, 16)
      : 0x64748b;
  }

  addStatus(): void {
    const label = this.newStatusLabel.trim();
    if (!label) return;

    const baseKey = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'status';

    let key = baseKey;
    let suffix = 2;
    while (this.statusDefinitions.some((status) => status.key === key)) {
      key = `${baseKey}-${suffix++}`;
    }

    this.statusDefinitions = [
      ...this.statusDefinitions,
      { key, label, color: this.newStatusColor },
    ];
    this.applyStatusStyles();
    this.newStatusLabel = '';
    this.statusFilterSelection = '';
  }

  updateStatusColor(key: string, color: string): void {
    this.statusDefinitions = this.statusDefinitions.map((status) =>
      status.key === key ? { ...status, color } : status,
    );
    this.applyStatusStyles();
  }

  protected isStatusInUse(key: string): boolean {
    return this.engine
      .exportData()
      .spaces.some((space) => space.type === 'booth' && space.properties.status === key);
  }

  protected removeStatus(key: string): void {
    if (this.isStatusInUse(key)) return;

    const next = this.statusDefinitions.filter((status) => status.key !== key);
    if (next.length === 0) return;

    this.statusDefinitions = next;
    if (this.visualFilter() === key) this.setVisualFilter('all');
    this.applyStatusStyles();
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
      elementType: space.type === 'prop'
        ? 'prop'
        : space.type === 'textbox'
          ? 'textbox'
          : 'booth',
      propColor: space.properties.propColor ?? '#64748b',
      propRepresentation: space.properties.imageUrl ? 'image' : 'shape',
      textVisible: space.properties.textVisible === true,
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
    if (elementType === 'booth' || elementType === 'textbox') {
      this.form.propRepresentation = 'shape';
      this.form.imageDataUrl = null;
    }
    if (elementType === 'textbox') {
      this.form.shape = 'rectangle';
    }
  }

  protected setPropRepresentation(representation: 'shape' | 'image'): void {
    this.form.propRepresentation = representation;
    if (representation === 'image') {
      this.form.shape = 'rectangle';
    } else {
      this.form.imageDataUrl = null;
    }
  }

  protected setPropColor(color: string): void {
    this.form.propColor = color;
  }

  protected setShape(shape: SpaceGeometry['type']): void {
    this.form.shape = shape;
    if (this.form.elementType === 'prop') {
      this.form.propRepresentation = 'shape';
    }
    if (shape === 'circle') {
      const diameter = Math.max(4, Number(this.form.width) || 80);
      this.form.width = diameter;
      this.form.height = diameter;
    }
    if (shape === 'line') {
      this.form.height = Math.max(3, Math.min(8, Number(this.form.height) || 6));
    }
  }

  protected onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.form.elementType === 'prop') {
      this.form.propRepresentation = 'image';
      this.form.shape = 'rectangle';
    }
    const reader = new FileReader();
    reader.onload = () => this.zone.run(() => (this.form.imageDataUrl = reader.result as string));
    reader.readAsDataURL(file);
  }

  protected removeImage(): void {
    this.form.imageDataUrl = null;
    if (this.form.elementType === 'prop') this.form.propRepresentation = 'shape';
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
    const { name, status, elementType, propColor, propRepresentation, textVisible, shape, width, height, imageDataUrl } = this.form;
    const savedType: SpaceElementType = elementType;
    const savedShape: SpaceGeometry['type'] = savedType === 'textbox' ? 'rectangle' : shape;
    const w = Math.max(4, Number(width) || 80);
    const h = savedShape === 'circle' ? w : Math.max(4, Number(height) || 60);

    if (this.isAdding()) {
      const id = `space-${Date.now()}`;
      const position = this.nextPlacement(w, h);
      const newSpace: Space = {
        id,
        type: savedType,
        geometry: { type: savedShape, ...position, width: w, height: h },
        properties: {
          name: name || id,
          status,
          propColor: savedType === 'prop' && propRepresentation === 'shape' ? propColor : undefined,
          textVisible: savedType === 'prop' ? textVisible : undefined,
          imageUrl: (savedType === 'booth' && savedShape === 'rectangle') ||
            (savedType === 'prop' && propRepresentation === 'image')
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
      geometry: { type: savedShape, width: w, height: h },
      properties: {
        name: name || id,
        status,
        propColor: savedType === 'prop' && propRepresentation === 'shape' ? propColor : undefined,
        textVisible: savedType === 'prop' ? textVisible : undefined,
        imageUrl: (savedType === 'booth' && savedShape === 'rectangle') ||
          (savedType === 'prop' && propRepresentation === 'image')
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

  bringToFront(id?: string): void {
    const targetId = id ?? this.editingId();
    if (targetId) this.engine.bringToFront(targetId);
  }

  sendToBack(id?: string): void {
    const targetId = id ?? this.editingId();
    if (targetId) this.engine.sendToBack(targetId);
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
