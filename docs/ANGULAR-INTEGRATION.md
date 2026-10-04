# SpatialMaps Angular Integration Guide

## Overview

SpatialMaps supports two usage styles:

1. Built-in workflow: keep using the current toolbar, editor, filters, grid, zoom controls and status manager.
2. Code-controlled integration: Angular code can provide map data, settings and statuses, listen to events, and control the same runtime API.

The Angular component is available as app-spatial-map and is exported as spatialMap for template references.

Basic usage:

~~~~html
<app-spatial-map></app-spatial-map>
~~~~

When no integration inputs are supplied, the current demo/test workflow remains the default.

## 1. Angular inputs

The component accepts:

| Input | Type | Purpose |
|---|---|---|
| spaces | Space[] | Map data to render |
| statuses | MapStatusDefinition[] | Business statuses and booth colors |
| settings | SpatialMapSettingsPatch | Theme, zoom and grid settings |

Example:

~~~~ts
readonly spaces: Space[] = [
  {
    id: 'A101',
    type: 'booth',
    geometry: {
      type: 'rectangle',
      x: 100,
      y: 120,
      width: 140,
      height: 70,
    },
    properties: {
      name: 'A101',
      status: 'available',
    },
  },
];

readonly statuses: MapStatusDefinition[] = [
  { key: 'available', label: 'Available', color: '#22c55e' },
  { key: 'reserved', label: 'Reserved', color: '#f59e0b' },
  { key: 'booked', label: 'Booked', color: '#ef4444' },
];

readonly settings: SpatialMapSettingsPatch = {
  theme: 'light',
  zoom: {
    minZoom: 0.7,
    baseZoom: 1,
    maxZoom: 3,
  },
  grid: {
    enabled: true,
    size: 50,
  },
  search: {
    enabled: true,
  },
};
~~~~

~~~~html
<app-spatial-map
  [spaces]="spaces"
  [statuses]="statuses"
  [settings]="settings">
</app-spatial-map>
~~~~

The toolbar/editor is not replaced. It continues to operate on the supplied data.

## 2. Programmatic settings

The component exposes:

~~~~ts
setMapSettings(settings: SpatialMapSettingsPatch): void
getMapSettings(): SpatialMapSettings
~~~~

Example:

~~~~ts
this.map.setMapSettings({
  theme: 'dark',
  zoom: {
    minZoom: 0.8,
    baseZoom: 1.1,
    maxZoom: 4,
  },
  grid: {
    enabled: false,
  },
});
~~~~

Nested settings are patchable. A caller can change only one value without constructing the complete settings object.

## 3. Template reference API

The component uses exportAs spatialMap.

~~~~html
<app-spatial-map #map="spatialMap"></app-spatial-map>

<button (click)="map.fitToMap()">Fit map</button>
<button (click)="map.flyTo('A101')">Go to A101</button>
<button (click)="map.setZoom(1.5)">Zoom</button>
~~~~

This is useful when an application's own controls should drive the map.

## 4. ViewChild API

The same API is available from Angular component code.

~~~~ts
import { AfterViewInit, ViewChild } from '@angular/core';
import { SpatialMap } from './public-api';

export class BookingPage implements AfterViewInit {
  @ViewChild('map') map!: SpatialMap;

  ngAfterViewInit(): void {
    this.map.setMapSettings({
      zoom: {
        baseZoom: 1,
        maxZoom: 3,
      },
    });
  }

  openBooth(id: string): void {
    this.map.flyTo(id, { duration: 300 });
  }
}
~~~~

## 5. Map data operations

The public component API exposes:

~~~~ts
setMapSpaces(spaces: Space[]): void
addSpace(space: Space): void
updateSpace(id, patch): void
removeSpace(id: string): void
getSpace(id: string): Space | undefined
getSpaceCount(): number
~~~~

Booking update example:

~~~~ts
this.map.updateSpace('A101', {
  properties: {
    status: 'booked',
  },
});
~~~~

Replacing a server-loaded map:

~~~~ts
this.map.setMapSpaces(serverMap.spaces);
~~~~

Adding a new booth:

~~~~ts
this.map.addSpace({
  id: 'A102',
  type: 'booth',
  geometry: {
    type: 'rectangle',
    x: 260,
    y: 120,
    width: 140,
    height: 70,
  },
  properties: {
    name: 'A102',
    status: 'available',
  },
});
~~~~

## 6. Dynamic status configuration

Statuses are business configuration. All and Selected only are map controls and are not part of the status model.

Define statuses:

~~~~ts
this.map.setStatuses([
  { key: 'available', label: 'Available', color: '#22c55e' },
  { key: 'reserved', label: 'Reserved', color: '#f59e0b' },
  { key: 'sold', label: 'Sold', color: '#ef4444' },
  { key: 'blocked', label: 'Blocked', color: '#64748b' },
]);
~~~~

Update one:

~~~~ts
this.map.updateStatusDefinition('reserved', {
  label: 'Held',
  color: '#fb923c',
});
~~~~

Add one:

~~~~ts
this.map.addStatusDefinition({
  key: 'waitlist',
  label: 'Waitlist',
  color: '#8b5cf6',
});
~~~~

Remove one:

~~~~ts
this.map.removeStatusDefinition('waitlist');
~~~~

The booth background follows the configured status color.

The toolbar uses these definitions for status filters. When the status count becomes large, the UI switches from individual buttons to a dropdown.

## 7. Business selection rule

Selection is separate from color.

~~~~ts
this.map.setSelectionRule((space) => {
  return space.type === 'booth'
    && ['available', 'reserved'].includes(space.properties.status ?? '');
});
~~~~

A real backend rule can be used:

~~~~ts
this.map.setSelectionRule((space) => {
  if (space.type !== 'booth') return false;

  return (
    space.properties.status === 'available' &&
    space.properties.bookable === true
  );
});
~~~~

## 8. Integrated booth search

In View mode the component provides a built-in booth search panel. It searches booth ID, booth name and status, and the result list uses the same live `Space[]` data as the renderer.

Clicking a result navigates the map to the booth while reserving the left panel area so the booth remains visible.

Programmatic search is available through:

~~~~ts
const matches = this.map.searchSpaces('A101');
const booked = this.map.searchSpaces('booked');
~~~~

Search supports multiple words. All search terms must match the booth's searchable text.

The Angular output:

~~~~html
<app-spatial-map
  (searchResultClick)="onSearchResultClick($event)">
</app-spatial-map>
~~~~

receives the selected space ID.

~~~~ts
onSearchResultClick(id: string): void {
  this.analytics.track('map_search_result_opened', { id });
}
~~~~

The search panel is a navigation aid; it does not replace the normal map selection/filter workflow.


## Search panel setting

Search is an extension of the SpatialMap component rather than a separate widget. It can be enabled or disabled through the same settings object used by the map:

~~~~ts
this.map.setMapSettings({
  search: {
    enabled: true,
  },
});
~~~~

When enabled in View mode, the component reserves a dedicated left pane for search and automatically resizes the map viewport beside it. When disabled, the map uses the full available viewport.

The search panel does not replace map browsing, filtering or selection. A result click navigates the existing camera to the matching booth, using the same map engine.

## 10. Selection, filtering and mode

~~~~ts
this.map.selectSpaces(['A101', 'A103']);
this.map.clearSelection();

this.map.setMode('view');
this.map.setMode('edit');

this.map.setVisualFilter({ type: 'all' });
this.map.setVisualFilter({ type: 'status', status: 'available' });
this.map.setVisualFilter({ type: 'selected' });
~~~~

These calls use the same engine as the toolbar.

## 11. Camera control

~~~~ts
this.map.setZoom(1.25);
this.map.getZoom();

this.map.fitToMap();

this.map.flyTo('A101');
~~~~

Zoom settings can be configured in code:

~~~~ts
this.map.setMapSettings({
  zoom: {
    minZoom: 0.7,
    baseZoom: 1,
    maxZoom: 3,
  },
});
~~~~

The current architecture distinguishes base browsing zoom, minimum readable manual zoom, maximum zoom and fit-to-map navigation.

## 12. Theme and editor grid

~~~~ts
this.map.setMapSettings({
  theme: 'dark',
  grid: {
    enabled: true,
    size: 25,
  },
});
~~~~

The same settings can be changed from the existing Map Settings UI.

## 13. Editing and layering

~~~~ts
this.map.bringToFront('A101');
this.map.sendToBack('A101');
~~~~

Edit mode still provides the existing drag, resize, rotation and inspector workflow.

## 14. Import and export

~~~~ts
const revision = this.map.exportMap();

await saveMapRevision(revision);
~~~~

Restore:

~~~~ts
this.map.importMap(savedRevision);
~~~~

The exported payload is versioned and contains serializable Space data.

## 15. Angular outputs

Available outputs:

| Output | Payload | Purpose |
|---|---|---|
| ready | void | Engine initialized |
| selectionChange | string[] | Selected space IDs changed |
| hoverChange | string or null | Hovered space changed |
| modeChange | MapMode | View/edit changed |
| filterChange | filter value | Visual filter changed |
| spaceTransform | id + geometry | Move/resize/rotation completed |
| spacesChange | Space[] | Loaded map data changed |

Example:

~~~~html
<app-spatial-map
  [spaces]="spaces"
  [statuses]="statuses"
  [settings]="settings"
  (selectionChange)="onSelectionChange($event)"
  (spaceTransform)="onSpaceTransform($event)"
  (spacesChange)="onSpacesChange($event)">
</app-spatial-map>
~~~~

Booking example:

~~~~ts
onSelectionChange(ids: string[]): void {
  this.bookingService.openSelection(ids);
}
~~~~

## 16. Recommended booking architecture

~~~~text
Angular application
    |
    +-- Booking API / WebSocket
    |      |
    |      +-- availability
    |      +-- reservations
    |      +-- customer data
    |
    +-- SpatialMap Angular component
           |
           +-- Space[] data
           +-- status definitions
           +-- selection rule
           +-- map settings
           +-- events
           |
           +-- SpatialMapEngine
                  |
                  +-- Pixi renderer
                  +-- Camera
                  +-- Pointer interaction
~~~~

The application owns business data. SpatialMaps owns rendering and interaction.

For example, a reservation update stays an application operation:

~~~~ts
this.map.updateSpace('A101', {
  properties: { status: 'reserved' },
});
~~~~

## 17. Backward-compatible workflow

The intended migration path is:

~~~~text
<app-spatial-map>
        |
        +-- existing demo/test workflow

<app-spatial-map [spaces] [statuses] [settings]>
        |
        +-- application-controlled data/configuration

map.setMapSettings(...)
map.updateSpace(...)
map.flyTo(...)
map.selectSpaces(...)
        |
        +-- programmatic control of the same engine
~~~~

There is one rendering pipeline. Angular UI actions and application code both operate on the same SpatialMapEngine instance.

A developer can start with the current demo and later move to real API data without replacing the component.

## 18. Public integration surface

The repository now provides src/public-api.ts as the single integration entry point.

It exports:

- SpatialMap
- SpatialMapEngine
- Space and map model types
- MapStatusDefinition
- SpatialMapSettings and SpatialMapSettingsPatch
- default settings and default status definitions
- MapMode, SelectionRule and VisualFilter

## 19. Current packaging note

The repository is currently an application/prototype rather than a published Angular package. The integration API is intentionally structured so it can become a packaged Angular library later.

Package publishing, generated declaration files, semantic versioning and npm distribution are separate future work and are not required to use the current code API.
