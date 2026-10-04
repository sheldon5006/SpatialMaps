import { Application, Graphics } from 'pixi.js';

/**
 * SpatialMapEngine
 *
 * Framework-agnostic rendering engine. Owns the PixiJS Application and the
 * render loop. This file must never import from @angular/* — it is the
 * seed of the future @spatial-map/core package.
 */
export class SpatialMapEngine {
  private app: Application | null = null;

  /**
   * Boots the PixiJS application into the given host element.
   * The host element should be an empty <div> sized by CSS (width/height: 100%).
   */
  async init(host: HTMLElement): Promise<void> {
    const app = new Application();

    await app.init({
      resizeTo: host,
      backgroundColor: 0x1a1d23,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    host.appendChild(app.canvas);
    this.app = app;

    // Temporary smoke-test graphic: proves the renderer + stage work.
    // Will be removed once real space rendering lands.
    const probe = new Graphics()
      .rect(-50, -50, 100, 100)
      .fill(0x4f8cff);
    probe.x = app.screen.width / 2;
    probe.y = app.screen.height / 2;
    app.stage.addChild(probe);
  }

  destroy(): void {
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
