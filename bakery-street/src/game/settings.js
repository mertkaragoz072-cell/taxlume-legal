// Player settings (sound effects, music, vibration). Stored under their own key, separate from the game save, so
// resetting progress never touches them (and a broken save never loses them). DOM-free; storage is injected.
export const SETTINGS_KEY = 'bakery-street:settings';
export const SETTINGS_VERSION = 1;
export const DEFAULT_SETTINGS = { sfx: true, music: true, vibration: true };

export class Settings {
  /** @param {Storage|null} storage @param {{key?:string, onProblem?:(info:{kind:string,message:string})=>void}} [opts] */
  constructor(storage, { key = SETTINGS_KEY, onProblem = () => {} } = {}) {
    this.storage = storage;
    this.key = key;
    this.onProblem = onProblem;
    this.values = { ...DEFAULT_SETTINGS };
    this.listeners = [];
  }

  get sfx() { return this.values.sfx; }
  get music() { return this.values.music; }
  get vibration() { return this.values.vibration; }
  on(fn) { this.listeners.push(fn); }

  /** Loads saved settings. Unknown / invalid fields fall back to defaults; unreadable data is reported, never fatal. */
  load() {
    if (!this.storage) { this.onProblem({ kind: 'nostorage', message: 'Ayarlar kaydedilemeyecek (depolama kullanılamıyor).' }); return this.values; }
    let text;
    try { text = this.storage.getItem(this.key); } catch { this.onProblem({ kind: 'read', message: 'Ayarlar okunamadı; varsayılanlar kullanılıyor.' }); return this.values; }
    if (text == null) return this.values;
    try {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object') throw new Error('bad');
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (typeof raw[k] === 'boolean') this.values[k] = raw[k];
    } catch {
      this.values = { ...DEFAULT_SETTINGS };
      this.onProblem({ kind: 'corrupt', message: 'Ayar kaydı bozuktu; varsayılan ayarlar kullanılıyor.' });
    }
    return this.values;
  }

  /** Changes one setting and saves it. The new value is kept in memory even if saving fails (the player is told). */
  set(name, value) {
    if (!(name in DEFAULT_SETTINGS) || typeof value !== 'boolean') return false;
    this.values[name] = value;
    const saved = this.save();
    for (const fn of this.listeners) fn(name, value);
    return saved;
  }

  toggle(name) { return this.set(name, !this.values[name]); }

  save() {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify({ version: SETTINGS_VERSION, ...this.values }));
      return true;
    } catch {
      this.onProblem({ kind: 'write', message: 'Ayarlar kaydedilemedi; bu oturumda geçerli.' });
      return false;
    }
  }
}
