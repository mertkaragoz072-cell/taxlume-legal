import { SKILLS, ANIMS, CONFIG } from '../core/config.js';
import { Input } from '../core/input.js';
import { wrapAngle } from '../core/util.js';
import { state } from './state.js';
import { hitEnemy, applyKnock } from './combat.js';
import { events } from './events.js';
import { derived } from './PlayerStats.js';
import { skillLevel } from './Meta.js';
const META_K = { dmg: 0.2, cd: 0.08, size: 0.12 };
const kLv = (id, k) => skillLevel(`k${id.slice(-1)}_${k}`);        // yetenek ağacı seviyesi (Meta: k1_dmg, k1_cd, k1_size, k2_*)

// Yetenekler data/skills.json'dan okunur (tip: wave = ileri giden dalga, burst = önde alan patlaması).
// Hasar = oyuncu hasarı × damageMul. Buton/Q,E ile tetiklenir; bekleme süresi HUD'da düğme üstünde gösterilir.
const R = () => CONFIG.planet.radius;

export const skillReady = (id) => state.skillCd[id] <= 0 && state.player.level >= SKILLS[id].unlockLevel;

export function castSkill(id) {
  const sk = SKILLS[id], p = state.player;
  if (!sk || state.over || !skillReady(id)) return false;
  state.skillCd[id] = sk.cooldown * derived(p).skillCdMul * Math.max(0.4, 1 - META_K.cd * kLv(id, 'cd')); events.onSkill?.(id);
  p.dir = p.dir || 1;
  const an = ANIMS.hero.animations.attack_2 ? 'attack_2' : (ANIMS.hero.animations.attack ? 'attack' : p.anim);
  p.anim = an; p.animT = 0; p.atkTimer = Math.max(p.atkTimer, 0.35);     // yetenek sırasında normal saldırı üst üste binmesin
  if (sk.type === 'wave') state.skillFx.push({ id, type: 'wave', a: p.a, dir: p.dir, t: 0, x: 24, hit: new Set(), life: sk.range / sk.speed });
  else state.skillFx.push({ id, type: 'burst', a: p.a + p.dir * sk.ahead / R(), t: 0, life: sk.fxDuration, done: false });
  return true;
}

export function updateSkills(dt) {
  for (const id of Object.keys(state.skillCd)) state.skillCd[id] = Math.max(0, state.skillCd[id] - dt);
  for (const q of Input.skillQueue.splice(0)) castSkill(q);
  const p = state.player, r = R();
  for (const f of state.skillFx) {
    const sk = SKILLS[f.id]; f.t += dt;
    if (f.type === 'wave') {
      f.x += sk.speed * dt;
      const wa = f.a + f.dir * f.x / r;
      for (const en of state.enemies) {
        if (en.dead || f.hit.has(en)) continue;
        if (Math.abs(wrapAngle(en.a - wa)) * r <= sk.width * (1 + META_K.size * kLv(f.id, 'size')) + en.def.width * 0.4) { f.hit.add(en); hitEnemy(en, p.damage * sk.damageMul * (1 + META_K.dmg * kLv(f.id, 'dmg')), { skill: true, element: sk.element }); }
      }
    } else if (!f.done && f.t >= sk.hitAt) {
      f.done = true;
      for (const en of state.enemies) {
        if (en.dead) continue;
        if (Math.abs(wrapAngle(en.a - f.a)) * r <= sk.radius * (1 + META_K.size * kLv(f.id, 'size')) + en.def.width * 0.3) { hitEnemy(en, p.damage * sk.damageMul * (1 + META_K.dmg * kLv(f.id, 'dmg')), { skill: true, element: sk.element }); applyKnock(en, sk.knockback); }
      }
      state.shake = Math.max(state.shake, 4);
    }
  }
  state.skillFx = state.skillFx.filter((f) => f.t < f.life + 0.05);
}
