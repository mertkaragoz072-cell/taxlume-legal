export type GameEventKind = 'info' | 'success' | 'warning' | 'error' | 'levelUp';

export interface GameEvent {
  kind: GameEventKind;
  message: string;
}

type Listener = (e: GameEvent) => void;

/** Tiny pub/sub the simulation uses to report things the UI should show. */
export class EventBus {
  private listeners = new Set<Listener>();
  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit(kind: GameEventKind, message: string): void {
    for (const l of this.listeners) l({ kind, message });
  }
}
