/**
 * Minimal typed pub/sub. Backs the engine's public on()/off() API
 * (e.g. engine.on('select', handler)). No external dependency needed
 * for something this small.
 */
export type Listener<T> = (payload: T) => void;

export class TypedEmitter<Events extends Record<string, unknown>> {
  private readonly listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    (this.listeners[event] ??= new Set()).add(listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => listener(payload));
  }
}
