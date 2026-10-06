// EnemySpawner: düşman oluşturma + dalga içeriği. Sağ ekran kenarının DIŞINDA doğar (aniden belirmez).
import { CONFIG, WAVES, ENEMY_TYPES, ANIMS } from '../core/config.js';
import { View } from '../core/view.js';
import { rand, TAU } from '../core/util.js';
import { state } from './state.js';

export const enemyMeta = (en) => ANIMS.enemies?.[en.def.animFrom || en.type];       // boss, brute karelerini paylaşır (animFrom)
export const aliveNormal = () => state.enemies.filter((x) => !x.dead && !x.def.elite);
export const aliveElite = () => state.enemies.filter((x) => !x.dead && x.def.elite);
export const aliveAny = () => state.enemies.filter((x) => !x.dead);

export function spawnEnemy(typeKey, offsetUnits = 0) {
  const t = ENEMY_TYPES[typeKey], n = state.wave.n;
  const hp = t.hp * (1 + WAVES.hpPerWave * (n - 1));
  const en = {
    type: typeKey, def: t,
    a: state.player.a + (View.visibleRightUnits + CONFIG.enemies.spawnOffscreen + offsetUnits) / CONFIG.planet.radius,
    hp, maxHp: hp, damage: t.damage * (1 + WAVES.dmgPerWave * (n - 1)),
    atkTimer: 0.3, flash: 0, bob: rand(0, TAU), face: -1, knock: 0, dead: false, deathT: 0, stagger: 0, attackT: -1, hitDone: false,
    speedMul: 1 + rand(-CONFIG.enemies.speedJitter, CONFIG.enemies.speedJitter),
  };
  if (t.boss) en.sp = { cd: WAVES.boss.slamEvery * 0.6, wind: 0, target: 0, summoned: false, enraged: false };
  state.enemies.push(en);
  return en;
}

// Dalga n için spawn kuyruğu: sırayla çıkacak düşman türleri. Boss dalgasında boss + eşlikçiler; elite dalgasında sonda elite.
export function buildQueue(n) {
  const W = WAVES;
  if (n % W.bossEvery === 0) return [W.bossType, ...Array(W.bossEscorts).fill('goblin_scout')];
  const total = Math.min(W.total.cap, W.total.base + Math.ceil(n * W.total.perWave));
  const pool = Object.entries(W.weights).map(([k, w]) => ({ k, w: n < (w.fromWave || 1) ? 0 : Math.min(w.cap ?? 99, Math.max(w.min ?? 0, w.base + w.perWave * n)) })).filter((x) => x.w > 0);
  const sum = pool.reduce((s, x) => s + x.w, 0), q = [];
  for (let i = 0; i < total; i++) { let r = rand(0, sum), pick = pool[0].k; for (const x of pool) { if ((r -= x.w) <= 0) { pick = x.k; break; } } q.push(pick); }
  if (n % W.eliteEvery === 0) q.push(W.eliteType);
  return q;
}
