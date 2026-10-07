// Rastgele olay: sandık. Normal dalga başında şansla kahramanın önünde belirir; yaklaşınca otomatik açılır (altın / kristal / can / XP).
// Veri: data/config.json → chest. Boss dalgasında sandık yok; bekleyen sandık boss başlayınca kaybolur.
import { CONFIG } from '../core/config.js';
import { wrapAngle } from '../core/util.js';
import { state } from './state.js';
import { addText, gainXp } from './combat.js';
import { events } from './events.js';
import { add as metaAdd } from './Meta.js';
import { groundDust } from './fx.js';

const R = () => CONFIG.planet.radius;
export function maybeSpawnChest(boss) {
  if (boss) { state.chests.length = 0; return; }
  const C = CONFIG.chest; if (state.chests.length || Math.random() > C.chance) return;
  state.chests.push({ a: state.player.a + C.ahead / R(), t: 0 });
}
export function updateChests(dt) {
  const p = state.player, C = CONFIG.chest;
  for (const c of state.chests) {
    c.t += dt; if (state.over || Math.abs(wrapAngle(c.a - p.a)) * R() > C.touch) continue;
    c.done = true; metaAdd('chests'); groundDust(c.a, 10, 120); state.shake = Math.max(state.shake, 2);
    let x = Math.random() * C.rewards.reduce((t, r) => t + r.w, 0), rw = C.rewards[0]; for (const r of C.rewards) { if ((x -= r.w) <= 0) { rw = r; break; } }
    if (rw.id === 'coins') { const n = Math.round(rw.min + Math.random() * (rw.max - rw.min)); p.coins += n; addText(p.a, 135, `🎁 +${n} COIN`, '#ffd23f', 1.1, false, { life: 1.4, rise: 30 }); events.onCoin?.(); }
    else if (rw.id === 'gems') { const n = Math.round(rw.min + Math.random() * (rw.max - rw.min)); p.gems += n; addText(p.a, 135, `🎁 +${n} 💎`, '#d9a0ff', 1.1, false, { life: 1.4, rise: 30 }); events.onGem?.(); }
    else if (rw.id === 'heal') { const h = Math.round(p.maxHp * rw.frac); p.hp = Math.min(p.maxHp, p.hp + h); addText(p.a, 135, `🎁 +${h} CAN`, '#7dffb0', 1.1, false, { life: 1.4, rise: 30 }); }
    else { addText(p.a, 135, `🎁 +${gainXp(rw.amount)} XP`, '#7ee7ff', 1.1, false, { life: 1.4, rise: 30 }); }
    events.onChest?.();
  }
  state.chests = state.chests.filter((c) => !c.done);
}
