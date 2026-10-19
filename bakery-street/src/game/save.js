import { validateCafe } from './customers.js';
import { validateQuests } from './quests.js';
import { blankStats } from './game.js';
import { validateDaily } from './daily.js';
import { validateTown } from './town.js';
import { validateResearch } from './research.js';
import { validateExploration } from './exploration.js';
import { validateProgression } from './progression.js';

// Persistent save: validation, versioning, backup of unreadable saves and failure reporting. DOM-free (storage is injected).
// Saved: gold, ingredient stock, product stock, upgrade levels and running production jobs
// (product + real start time + duration, so a speed upgrade bought later does not change a job already running).

export const SAVE_KEY = 'bakery-street:save';
export const BACKUP_KEY = 'bakery-street:save.corrupt';
export const SAVE_VERSION = 9;   // v2 cafe, v3 upgrades + several jobs per station, v4 lifetime stats + quest rewards, v5 gems + daily reward, v6 player level / XP (older saves start at level 1), v7 town buildings (older saves: only the starter buildings are open), v8 Bookshop research levels, v9 exploration (active trip + completed counts)

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
  const stats = blankStats(game.productsDef);
  const rs = raw.stats;
  if (rs !== undefined) {
    if (!rs || typeof rs !== 'object') throw new Error('istatistikler geçersiz');
    for (const k of ['producedTotal', 'soldTotal', 'marketPurchases', 'upgradesBought', 'buildingsOpened', 'buildingUpgrades', 'researchBought', 'explorationsDone']) {
      if (rs[k] === undefined) continue;
      if (!isCount(rs[k])) throw new Error(`istatistik geçersiz (${k})`);
      stats[k] = rs[k];
    }
    for (const group of ['produced', 'sold']) {
      for (const id of Object.keys(game.productsDef)) {
        const v = rs[group]?.[id];
        if (v === undefined) continue;
        if (!isCount(v)) throw new Error(`istatistik geçersiz (${group}.${id})`);
        stats[group][id] = v;
      }
    }
  }
  if (raw.gems !== undefined && !isCount(raw.gems)) throw new Error('elmas değeri geçersiz');
  const gems = raw.gems ?? game.initial.gems;
  const daily = game.daily ? validateDaily(raw.daily, game.daily.defs) : undefined;
  const progression = game.progression ? validateProgression(raw.progression, game.progression) : undefined;
  const town = game.town ? validateTown(raw.town, game.town) : undefined;
  const research = game.research ? validateResearch(raw.research, game.research) : undefined;
  const exploration = game.exploration ? validateExploration(raw.exploration, game.exploration) : undefined;
  const quests = game.quests ? validateQuests(raw.quests, game.quests.defs) : undefined;
  const upgrades = {};
  for (const [id, def] of Object.entries(game.upgradesDef)) {
    const v = raw.upgrades?.[id];
    if (v === undefined) upgrades[id] = 0;                       // saves from before upgrades existed
    else if (Number.isInteger(v) && v >= 0 && v <= def.costs.length) upgrades[id] = v;
    else throw new Error(`geliştirme seviyesi geçersiz (${id})`);
  }
  for (const [station, entry] of Object.entries(raw.jobs ?? {})) {
    if (!game.stationsDef[station]) continue;                    // station removed from the data: drop silently
    const list = (Array.isArray(entry) ? entry : [entry]).map((job) => {   // v1/v2 saves stored a single job object
      const def = game.productsDef[job?.product];
      if (!def) throw new Error(`üretim kaydı geçersiz (${station})`);
      if (def.station !== station) throw new Error(`üretim kaydı yanlış makinede (${station})`);
      if (!Number.isFinite(job.startedAt) || job.startedAt <= 0) throw new Error(`üretim zamanı geçersiz (${station})`);
      const duration = job.duration === undefined ? def.time : job.duration;
      if (!Number.isFinite(duration) || duration < 1 || duration > def.time * 2) throw new Error(`üretim süresi geçersiz (${station})`);
      return { product: job.product, startedAt: job.startedAt, duration };
    });
    const cap = game.stationsDef[station].capacityUpgrade ? Math.max(...game.upgradesDef[game.stationsDef[station].capacityUpgrade].values) : 1;
    if (list.length > cap) throw new Error(`fazla üretim kaydı (${station})`);
    if (list.length) jobs[station] = list;
  }
  const cafe = game.cafe ? validateCafe(raw.cafe, game, game.cafe.cfg, game.cafe.looks) : null;
  return { gold: raw.gold, gems, ingredients, products, jobs, upgrades, stats, quests, daily, progression, town, research, exploration, cafe: cafe?.state, cafeRepaired: cafe?.repaired ?? 0 };
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

  /**
   * Resets all game progress to a fresh start. Never happens silently: the caller must pass { confirmed: true }
   * (the UI asks the player first). The previous save is copied to a backup key before anything is replaced, and if that
   * backup cannot be written the reset is refused. Settings are stored separately and are not touched.
   */
  reset({ confirmed = false } = {}) {
    if (confirmed !== true) return { ok: false, reason: 'unconfirmed', message: 'Sıfırlama için onay gerekir.' };
    if (!this.storage || !this.enabled) return { ok: false, reason: 'storage', message: 'Kayıt kapalı olduğu için sıfırlanamadı.' };
    try {
      const current = this.storage.getItem(this.key);
      if (current != null) this.storage.setItem(this.backupKey.replace('.corrupt', '.before-reset'), current);
    } catch { return { ok: false, reason: 'backup', message: 'Eski kayıt yedeklenemediği için ilerleme sıfırlanmadı.' }; }
    this.apply(this.game.defaultState());
    const saved = this.save();
    return saved.ok ? { ok: true } : { ok: true, warning: saved.message };
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
