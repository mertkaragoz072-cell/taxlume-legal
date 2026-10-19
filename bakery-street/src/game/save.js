import { validateCafe } from './customers.js';

// Persistent save: validation, versioning, backup of unreadable saves and failure reporting. DOM-free (storage is injected).
// Saved: gold, ingredient stock, product stock and running production jobs (product + real start time).
// A job's duration is not stored; it comes from the product table, so rebalancing applies to running jobs too.

export const SAVE_KEY = 'bakery-street:save';
export const BACKUP_KEY = 'bakery-street:save.corrupt';
export const SAVE_VERSION = 2;   // v2 adds the cafe section (customers, tables, orders); v1 saves load with an empty cafe

const isCount = (n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n < 1e12;

/** Turns raw saved data into a clean state for `game`, or throws Error with a readable reason. Never mutates the game. */
export function validate(raw, game) {
  if (!raw || typeof raw !== 'object') throw new Error('kayıt biçimi geçersiz');
  if (!Number.isInteger(raw.version) || raw.version < 1) throw new Error('kayıt sürümü okunamadı');
  if (raw.version > SAVE_VERSION) { const e = new Error('kayıt daha yeni bir sürümden'); e.future = true; throw e; }
  if (!isCount(raw.gold)) throw new Error('altın değeri geçersiz');
  const ingredients = {}, products = {}, jobs = {};
  for (const [id, def] of Object.entries(game.ingredientsDef)) {
    const v = raw.ingredients?.[id];
    if (v === undefined) ingredients[id] = def.start ?? 0;        // item added after the save was made: use its starting stock
    else if (isCount(v)) ingredients[id] = v;
    else throw new Error(`malzeme stoğu geçersiz (${id})`);
  }
  for (const [id, def] of Object.entries(game.productsDef)) {
    const v = raw.products?.[id];
    if (v === undefined) products[id] = def.start ?? 0;
    else if (isCount(v)) products[id] = v;
    else throw new Error(`ürün stoğu geçersiz (${id})`);
  }
  for (const [station, job] of Object.entries(raw.jobs ?? {})) {
    if (!game.stationsDef[station]) continue;                    // station removed from the data: drop silently
    const def = game.productsDef[job?.product];
    if (!def) throw new Error(`üretim kaydı geçersiz (${station})`);
    if (def.station !== station) throw new Error(`üretim kaydı yanlış makinede (${station})`);
    if (!Number.isFinite(job.startedAt) || job.startedAt <= 0) throw new Error(`üretim zamanı geçersiz (${station})`);
    jobs[station] = { product: job.product, startedAt: job.startedAt };
  }
  const cafe = game.cafe ? validateCafe(raw.cafe, game, game.cafe.cfg, game.cafe.looks) : null;
  return { gold: raw.gold, ingredients, products, jobs, cafe: cafe?.state, cafeRepaired: cafe?.repaired ?? 0 };
}

export class SaveManager {
  /**
   * @param {import('./game.js').Game} game
   * @param {Storage|null} storage   localStorage-like object, or null when unavailable
   * @param {{onProblem?:(info:{kind:string,message:string})=>void, onRecover?:()=>void, key?:string}} [opts]
   */
  constructor(game, storage, opts = {}) {
    this.game = game;
    this.storage = storage;
    this.key = opts.key ?? SAVE_KEY;
    this.backupKey = opts.backupKey ?? BACKUP_KEY;
    this.onProblem = opts.onProblem ?? (() => {});
    this.onRecover = opts.onRecover ?? (() => {});
    this.enabled = !!storage;     // when false, nothing is ever written (protects a save we could not read)
    this.failing = false;         // true while the last write failed
    this.restoring = false;
  }

  snapshot() { return { version: SAVE_VERSION, savedAt: Date.now(), ...this.game.exportState() }; }

  /** Loads the save into the game. Returns { status: 'new'|'loaded'|'corrupt'|'future'|'nostorage', message? }. */
  load() {
    if (!this.storage) { this.problem('nostorage', 'Tarayıcı depolaması kullanılamıyor; ilerleme kaydedilemeyecek.'); return { status: 'nostorage' }; }
    let text;
    try { text = this.storage.getItem(this.key); }
    catch { this.enabled = false; this.problem('read', 'Kayıt okunamadı (depolama erişimi engelli). Mevcut kayıt korunuyor, yeni ilerleme kaydedilmeyecek.'); return { status: 'corrupt' }; }
    if (text == null) { this.save(); return { status: 'new' }; }
    try {
      let raw;
      try { raw = JSON.parse(text); } catch { throw new Error('dosya okunamadı'); }
      const state = validate(raw, this.game);
      this.apply(state);
      if (state.cafeRepaired) this.problem('repair', `Kafe kaydında ${state.cafeRepaired} tutarsızlık düzeltildi (eksik/geçersiz sipariş veya masa).`);
      return { status: 'loaded', repaired: state.cafeRepaired };
    } catch (err) {
      if (err.future) {
        this.enabled = false;   // never overwrite a save written by a newer version
        const message = 'Kayıt daha yeni bir oyun sürümünden. Üzerine yazılmadı; ilerleme kaydedilmeyecek.';
        this.problem('future', message);
        return { status: 'future', message };
      }
      return this.handleCorrupt(text, err);
    }
  }

  /** Unreadable save: keep the original text in a backup key, tell the player, continue with a fresh game. */
  handleCorrupt(text, err) {
    let backedUp = true;
    try { this.storage.setItem(this.backupKey, text); } catch { backedUp = false; }
    let message;
    if (backedUp) {
      message = `Kayıt dosyası bozuk (${err.message}). Eski kayıt yedeklendi; yeni oyunla başlandı.`;
    } else {
      this.enabled = false;   // could not preserve the old data: do not overwrite it
      message = `Kayıt dosyası bozuk (${err.message}) ve yedeklenemedi. Mevcut kayıt silinmeyecek; bu oturumda ilerleme kaydedilmeyecek.`;
    }
    this.problem('corrupt', message);
    if (this.enabled) this.save();
    return { status: 'corrupt', message };
  }

  apply(state) {
    this.restoring = true;
    try { this.game.importState(state); } finally { this.restoring = false; }
  }

  /** Writes the snapshot. Returns { ok, message? }; on failure the in-memory progress is kept and the player is told. */
  save() {
    if (!this.enabled || this.restoring) return { ok: false, message: 'kayıt kapalı' };
    try {
      this.storage.setItem(this.key, JSON.stringify(this.snapshot()));
    } catch (err) {
      this.failing = true;
      const message = 'İlerleme kaydedilemedi (tarayıcı depolaması dolu veya kapalı olabilir). Oyun devam ediyor; kayıt yeniden denenecek.';
      this.problem('write', message);
      return { ok: false, message };
    }
    if (this.failing) { this.failing = false; this.onRecover(); }
    return { ok: true };
  }

  /** Autosave after every state change; also reacts to saves written by another tab. */
  attach(win) {
    this.game.on('change', () => { if (!this.restoring) this.save(); });
    if (win) {
      win.addEventListener('storage', (e) => {
        if (e.key !== this.key || e.newValue == null) return;
        try { this.apply(validate(JSON.parse(e.newValue), this.game)); } catch { /* ignore an unreadable write from another tab */ }
      });
      const flush = () => this.save();
      win.addEventListener('pagehide', flush);
      win.document?.addEventListener('visibilitychange', () => { if (win.document.hidden) flush(); });
    }
  }

  problem(kind, message) { this.onProblem({ kind, message }); }
}

/** localStorage when it is actually usable, otherwise null. */
export function safeStorage(win) {
  try {
    const s = win.localStorage;
    const k = '__bakery_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return null; }
}
