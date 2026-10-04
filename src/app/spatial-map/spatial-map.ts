import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
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
  template: `<div #host class="spatial-map-host"></div>`,
  styles: [
    `
      .spatial-map-host {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class SpatialMap implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private readonly engine = new SpatialMapEngine();

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(async () => {
      await this.engine.init(this.hostRef.nativeElement);
      this.engine.loadSpaces(TEST_SPACES);
    });
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
