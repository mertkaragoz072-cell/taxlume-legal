// Meta sistemler: başarımlar, günlük görevler, kalıcı mağaza. Veri: data/meta.json; kalıcı durum: Save.meta() ({ach, stats, daily, shop}).
// add(stat, n) oyun içinden çağrılır (öldürme, boss, altın, kritik, mükemmel kaçınma, bölüm, ölüm); level için setMax.
import { META } from '../core/config.js';
import { Save } from '../core/save.js';
import { state } from './state.js';
import { events } from './events.js';
import { recalcMaxHp } from './PlayerStats.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function rngFor(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
const M = () => Save.meta();

// Gün değiştiyse 3 yeni görev seç (gün tohumlu → aynı gün aynı görevler), ilerleme tabanını o anki istatistiklere sabitle
export function initMeta() {
  const m = M(), d = today(); if (!m || !META.dailyPool) return;
  if (m.daily.day !== d) {
    const r = rngFor(d), pool = META.dailyPool.slice(), goals = [];
    while (goals.length < META.dailyCount && pool.length) {
      const q = pool.splice(Math.floor(r() * pool.length), 1)[0], n = q.targets[Math.floor(r() * q.targets.length)];
      goals.push({ id: q.id, stat: q.stat, target: n, text: q.text.replace('{n}', n), reward: q.reward, base: m.stats[q.stat] || 0 });
    }
    m.daily = { day: d, goals, claimed: [] }; Save.saveMeta();
  }
}
export function toast(html) { events.onToast?.(html); }
function grant(rw) { const p = state.player; if (!p) return; p.coins += rw.coins || 0; p.gems += rw.gems || 0; events.onCoin?.(); if (rw.gems) events.onGem?.(); }
const rewardText = (rw) => [rw.coins ? `🪙${rw.coins}` : '', rw.gems ? `💎${rw.gems}` : ''].filter(Boolean).join(' ');
function check(stat) {
  const m = M(); if (!m) return;
  for (const a of META.achievements) if (a.stat === stat && !m.ach[a.id] && (m.stats[stat] || 0) >= a.target) {
    m.ach[a.id] = Date.now(); grant(a.reward); toast(`<b>${a.icon} Başarım: ${a.name}</b><span>${a.desc} · ${rewardText(a.reward)}</span>`); Save.saveMeta();
  }
}
export function add(stat, n = 1) { const m = M(); if (!m) return; m.stats[stat] = (m.stats[stat] || 0) + n; check(stat); dailyCheck(); }
export function setMax(stat, v) { const m = M(); if (!m || v <= (m.stats[stat] || 0)) return; m.stats[stat] = v; check(stat); }
let doneToasted = new Set();
function dailyCheck() { const m = M(); if (!m) return; for (const g of m.daily.goals) { const k = m.daily.day + g.id; if (!doneToasted.has(k) && !m.daily.claimed.includes(g.id) && progressOf(g) >= g.target) { doneToasted.add(k); toast(`<b>📅 Günlük görev tamamlandı</b><span>${g.text} — ödülü Görevler sekmesinden al</span>`); } } }
export const progressOf = (g) => Math.min(g.target, Math.max(0, (M().stats[g.stat] || 0) - g.base));
export function claimDaily(id) {
  const m = M(), g = m.daily.goals.find((x) => x.id === id); if (!g || m.daily.claimed.includes(id) || progressOf(g) < g.target) return false;
  m.daily.claimed.push(id); grant(g.reward); Save.saveMeta(); return true;
}

// Mağaza: kalıcı güçlendirmeler (hesap geneli seviye), cüzdan = aktif kahraman. Statlar PlayerStats.derived içinde uygulanır.
export const shopLevel = (id) => (M()?.shop.owned[id] || 0);
export function shopBonus() {
  const out = {}, m = M(); if (!m) return out;
  for (const it of META.shop || []) { const lv = m.shop.owned[it.id] || 0; if (lv) out[it.stat] = (out[it.stat] || 0) + it.per * lv; }
  return out;
}
export function shopBuy(id) {
  const it = META.shop.find((x) => x.id === id), m = M(), p = state.player; if (!it || !m) return { ok: false, why: 'yok' };
  const lv = m.shop.owned[id] || 0; if (lv >= it.max) return { ok: false, why: 'maks' };
  const cost = it.cost[lv]; if ((p[it.currency] || 0) < cost) return { ok: false, why: 'yetersiz' };
  p[it.currency] -= cost; m.shop.owned[id] = lv + 1; m.shop.spent += cost;
  if (it.stat === 'maxHpMul') recalcMaxHp(p, true);
  Save.saveMeta(); return { ok: true };
}
