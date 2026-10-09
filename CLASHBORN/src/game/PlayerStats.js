// PlayerStats: kalıcı güçlendirmelerden türetilen oyuncu statları. Veri: data/upgrades.json (base + her güçlendirmenin stat/per/cap).
// p.upgrades = { upgradeId: seviye }. Türetilmiş değerler her çağrıda hesaplanır (basit, hızlı: ≤ 10 kayıt).
import { CONFIG, UPGRADES } from '../core/config.js';
import { equippedBonus, EFFECTS } from './CardSystem.js';
import { shopBonus } from './Meta.js';

// Build seviyesi: üyelerin toplam seviyesi eşiğe ulaşınca 1, 2×eşikte 2 (bonuslar buna göre katlanır)
export function buildLevels(p) {
  const out = {};
  for (const b of UPGRADES.builds || []) {
    const id = b.id, sum = b.members.reduce((t, m) => t + (p.upgrades?.[m] || 0), 0);
    const lv = sum >= b.threshold * 2 ? 2 : sum >= b.threshold ? 1 : 0;
    out[id] = { id, sum, lv, threshold: b.threshold, name: b.name, icon: b.icon, desc: b.desc };
  }
  return out;
}

// Bir gücün seviye için TOPLAM bonusu: tiers (Lv1..Lv4, artan) varsa tablodan, yoksa per × seviye
export function upgradeValue(u, lv) {
  if (!lv) return 0;
  return u.tiers ? u.tiers[Math.min(lv, u.tiers.length) - 1] : u.per * lv;
}

export function derived(p) {
  const s = { ...UPGRADES.base };
  for (const u of UPGRADES.list) {
    const lv = p.upgrades?.[u.id] || 0; if (!lv) continue;
    s[u.stat] += upgradeValue(u, lv);
    if (u.cap != null) s[u.stat] = Math.min(u.cap, s[u.stat]);
  }
  const bl = buildLevels(p);
  for (const b of UPGRADES.builds || []) {
    const lv = bl[b.id].lv; if (!lv) continue;
    for (const [k, v] of Object.entries(b.bonus)) s[k] = (s[k] ?? 0) + v * lv;
  }
  for (const [k, v] of Object.entries(shopBonus())) s[k] = (s[k] ?? 0) + v;                // mağaza: kalıcı hesap geneli güçlendirmeler
  const cb = equippedBonus(p);                                 // kuşanılmış kartlar: taban + kart bonusu (CardSystem)
  for (const [type, v] of Object.entries(cb)) { const k = EFFECTS[type]; if (k) s[k] = (s[k] ?? 0) + v; }
  for (const u of UPGRADES.list) if (u.floor != null) s[u.stat] = Math.max(u.floor, s[u.stat]);   // alt sınır (ör. cooldown ≥ ×0.4)
  return s;
}
export const stats = (p) => derived(p);

// Seviyeye göre taban can × can çarpanı. Güçlendirme/level-up sonrası çağır; healDelta=true ise artan can kadar iyileştirir.
export function recalcMaxHp(p, healDelta = true) {
  const L = CONFIG.leveling, base = CONFIG.player.maxHp + L.maxHpPerLevel * (p.level - 1);
  const next = Math.round(base * derived(p).maxHpMul), delta = next - p.maxHp;
  p.maxHp = next; p.hp = Math.min(p.maxHp, p.hp + (healDelta && delta > 0 ? delta : 0));
}

// Olasılıklı yuvarlama: 1.2 → %80 ihtimalle 1, %20 ihtimalle 2 (küçük çarpanlar da etkili olsun)
export function probRound(x) { const f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); }

export function describe(p) {          // HUD/hata ayıklama için okunur özet
  const s = derived(p);
  return `Hasar ×${s.damageMul.toFixed(2)} · Hız ×${s.attackSpeedMul.toFixed(2)} · Krit %${Math.round(s.critChance * 100)} ×${s.critDamage.toFixed(2)} · Can ×${s.maxHpMul.toFixed(2)} · Savunma ${Math.round(s.defense * 100)}% · Yenileme ${s.regen} HP/sn`;
}
