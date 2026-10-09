// CardSystem: kart envanteri + kuşanma + bonus hesabı (UI YOK; yalnız gameplay altyapısı). Veri: data/cards.json.
//   player.cards = { owned: { kartId: seviye }, equipped: [kartId, ...] }   ownedCards = sahip olunanlar, equippedCards = aktif (en çok maxEquipped)
// Bonus = effectValue × seviye. Bonuslar PlayerStats.derived() içinde mevcut statlara EKLENİR (final = taban + kart bonusu):
//   attack → damageMul, crit → critChance, maxHp → maxHpMul. Yeni etki türü eklemek: EFFECTS'e satır + cards.json'a kart.
// Yeni kart/rarity/deste/ödül eklemek için: cards.json + (isteğe bağlı) grantCard/levelUpCard çağrıları — başka koda dokunmaz.
import { CARDS } from '../core/config.js';
import { state } from './state.js';
import { recalcMaxHp, derived } from './PlayerStats.js';

export const EFFECTS = { attack: 'damageMul', crit: 'critChance', maxHp: 'maxHpMul' };   // effectType → derived() stat anahtarı
export const CardSystem = { log: true };
const say = (...a) => { if (CardSystem.log) console.log('[CardSystem]', ...a); };
const pct = (v) => `+${Math.round(v * 1000) / 10}%`;

export const cardDef = (id) => CARDS.cards.find((c) => c.id === id);
export const emptyCards = () => ({ owned: {}, equipped: [] });
const store = () => (state.player.cards ||= emptyCards());
export const ownedCards = () => store().owned;
export const equippedCards = () => store().equipped;

// Kartın şu anki bonusu (seviye × değer)
export const cardBonusOf = (id, level = ownedCards()[id] || 0) => (cardDef(id)?.effectValue || 0) * level;

// Kuşanılmış kartların effectType başına toplam bonusu → { attack: 0.05, crit: 0, maxHp: 0 }. derived() her karede çağırır (≤3 kart, ucuz).
export function equippedBonus(p = state.player) {
  const out = {}, c = p.cards; if (!c) return out;
  for (const id of c.equipped) { const d = cardDef(id), lv = c.owned[id] || 0; if (d && lv) out[d.effectType] = (out[d.effectType] || 0) + d.effectValue * lv; }
  return out;
}

function refresh(reason) {                 // stat değişti: max can yeniden hesaplanır, loglar
  recalcMaxHp(state.player, true);
  const S = derived(state.player), B = equippedBonus();
  say(`Attack bonus: ${pct(B.attack || 0)} | Crit bonus: ${pct(B.crit || 0)} | Max HP bonus: ${pct(B.maxHp || 0)}  (${reason})`);
  say(`Final Attack: ${(state.player.damage * S.damageMul).toFixed(2)} (base ${state.player.damage} × ${S.damageMul.toFixed(2)}) | Crit: ${(S.critChance * 100).toFixed(0)}% | Max HP: ${state.player.maxHp}`);
}

export function grantCard(id, level = 1) {          // kartı envantere ekler (varsa seviyeyi yükseltir)
  const d = cardDef(id); if (!d) { say('unknown card', id); return false; }
  const o = ownedCards(); o[id] = Math.min(d.maxLevel, (o[id] || 0) + Math.max(1, level | 0));
  say(`${d.name} owned Lv.${o[id]}`);
  if (equippedCards().includes(id)) refresh(`${d.name} Lv.${o[id]}`);
  return true;
}
export function setCardLevel(id, level) {
  const d = cardDef(id); if (!d || !ownedCards()[id]) return false;
  ownedCards()[id] = Math.max(1, Math.min(d.maxLevel, level | 0));
  say(`${d.name} level set to Lv.${ownedCards()[id]}`);
  if (equippedCards().includes(id)) refresh(`${d.name} Lv.${ownedCards()[id]}`);
  return true;
}
export const levelUpCard = (id) => grantCard(id, 1);

export function equipCard(id) {                     // aktif kart sayısı en çok maxEquipped
  const d = cardDef(id), eq = equippedCards();
  if (!d || !ownedCards()[id]) { say('cannot equip (not owned):', id); return false; }
  if (eq.includes(id)) return true;
  if (eq.length >= CARDS.maxEquipped) { say(`slots full (${CARDS.maxEquipped}) — unequip one first`); return false; }
  eq.push(id); say(`${d.name} Lv.${ownedCards()[id]} equipped`); refresh(`${d.name} equipped`); return true;
}
export function unequipCard(id) {
  const eq = equippedCards(), i = eq.indexOf(id); if (i < 0) return false;
  eq.splice(i, 1); say(`${cardDef(id)?.name || id} unequipped`); refresh(`${cardDef(id)?.name || id} unequipped`); return true;
}

// Kayıt: yalnız bilinen kartlar, seviyeler kırpılır, kuşanılanlar sahip olunanların alt kümesi ve ≤ maxEquipped
export function serializeCards(p = state.player) { const c = p.cards || emptyCards(); return { owned: { ...c.owned }, equipped: [...c.equipped] }; }
export function restoreCards(p, s) {
  const c = emptyCards();
  if (s && typeof s === 'object') {
    for (const d of CARDS.cards) { const lv = Math.floor(+(s.owned?.[d.id])); if (lv > 0) c.owned[d.id] = Math.min(lv, d.maxLevel); }
    for (const id of (Array.isArray(s.equipped) ? s.equipped : [])) if (c.owned[id] && !c.equipped.includes(id) && c.equipped.length < CARDS.maxEquipped) c.equipped.push(id);
  }
  p.cards = c;
}

// Test yardımcısı: ?cards=1 (veya ?cards=3 → seviye 3) tüm test kartlarını verir ve kuşandırır
export function debugGrantAll(level = 1) {
  for (const d of CARDS.cards.slice(0, CARDS.maxEquipped)) { grantCard(d.id, 1); setCardLevel(d.id, level); equipCard(d.id); }
}
Object.assign(CardSystem, { grantCard, setCardLevel, levelUpCard, equipCard, unequipCard, equippedBonus, ownedCards, equippedCards, debugGrantAll, defs: () => CARDS.cards });
