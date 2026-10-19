// One active tab at a time. Two tabs sharing one save would overwrite each other (and mix customers and jobs), so the newest tab
// claims ownership with a small marker in localStorage; any older tab sees the change, stops saving and asks the player what to do.
// Taking the game back is explicit ("Bu sekmede devam et"): the tab claims ownership again and reloads the latest save.
export const OWNER_KEY = 'bakery-street:owner';

export class TabGuard {
  /** @param {Storage|null} storage @param {{key?:string, id?:string, onLost?:()=>void}} [opts] */
  constructor(storage, { key = OWNER_KEY, id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, onLost } = {}) {
    this.storage = storage;
    this.key = key;
    this.id = id;
    this.onLost = onLost ?? (() => {});
    this.lost = false;
  }

  owner() {
    try { return JSON.parse(this.storage?.getItem(this.key) ?? 'null'); } catch { return null; }
  }

  /** True when this tab may write the save: it is the owner, or nobody (or no storage) owns the game. */
  isOwner() {
    if (!this.storage) return true;
    const o = this.owner();
    return !o || o.id === this.id;
  }

  /** Makes this tab the owner (a later tab always wins, the previous owner is told through the storage event). */
  claim() {
    this.lost = false;
    try { this.storage?.setItem(this.key, JSON.stringify({ id: this.id, at: Date.now() })); } catch { /* storage blocked: nothing to protect */ }
  }

  /** Call with every `storage` event; reports the loss of ownership once. */
  handle(e) {
    if (e.key !== this.key || this.lost) return;
    if (!this.isOwner()) { this.lost = true; this.onLost(); }
  }

  attach(win) { win.addEventListener('storage', (e) => this.handle(e)); }
}
