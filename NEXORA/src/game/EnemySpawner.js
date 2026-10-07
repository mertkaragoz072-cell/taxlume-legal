// EnemySpawner: düşman oluşturma + dalga içeriği. Sağ ekran kenarının DIŞINDA doğar (aniden belirmez).
import { CONFIG, WAVES, ENEMY_TYPES, ANIMS } from '../core/config.js';
import { View } from '../core/view.js';
import { rand, TAU, deepMerge } from '../core/util.js';
import { rosterType, worldExtras, bossFor } from './chapters.js';
import { state } from './state.js';
import { newBossState } from './boss.js';

export const enemyMeta = (en) => ANIMS.enemies?.[en.def.animFrom || en.type];       // boss, brute karelerini paylaşır (animFrom)
export const aliveNormal = () => state.enemies.filter((x) => !x.dead && !x.def.elite);
export const aliveElite = () => state.enemies.filter((x) => !x.dead && x.def.elite);
export const aliveAny = () => state.enemies.filter((x) => !x.dead);

// Doğuş noktası: ekranın sağ bölümü (görünür sağ alanın ~%88'i); boss/elite offsetUnits ile dışarıdan gelir.
// Yaşayan düşmanlarla üst üste binmesin: çakışıyorsa daha sağa kaydırılır.
function spawnAngle(t, offsetUnits) {
  const E = CONFIG.enemies, R = CONFIG.planet.radius;
  let u = View.visibleRightUnits * E.spawnScreenFrac + offsetUnits;
  for (let guard = 0; guard < 12; guard++) {
    const a = state.player.a + u / R;
    const hit = state.enemies.find((o) => !o.dead && Math.abs(o.a - a) * R < E.spawnMinGap + (o.def.width + t.width) * 0.25);
    if (!hit) break;
    u += E.spawnMinGap * 0.6;
  }
  return state.player.a + u / R;
}

export function spawnEnemy(typeKey, offsetUnits = 0) {
  const t = ENEMY_TYPES[typeKey], { stage, n } = state.wave, S = WAVES.stage, k = Math.min(n, S.waveScale.hp.length) - 1;
  // Dalga ölçeği (wave 1→5: HP %100→165 vb.) yalnız normal düşmanlara; boss'un kendi statları (enemies.json) + yalnız bölüm çarpanı
  const ws = t.boss ? { hp: 1, dmg: 1, speed: 1, atk: 1 } : { hp: S.waveScale.hp[k], dmg: S.waveScale.dmg[k], speed: S.waveScale.speed[k], atk: S.waveScale.atk[k] };
  const hp = t.hp * stageHpMul(stage) * ws.hp;
  const en = {
    type: typeKey, def: t,
    a: spawnAngle(t, offsetUnits), age: 0,
    hp, maxHp: hp, damage: t.damage * (1 + S.dmgPerStage * (stage - 1)) * ws.dmg, attackCd: t.attackCooldown * ws.atk,
    side: 1, atkTimer: 0.3, flash: 0, bob: rand(0, TAU), face: -1, knock: 0, dead: false, deathT: 0, stagger: 0, attackT: -1, windT: -1, hitDone: false,
    speedMul: (1 + rand(-CONFIG.enemies.speedJitter, CONFIG.enemies.speedJitter)) * ws.speed,
  };
  if (t.boss) { en.sp = newBossState(); en.bossCfg = t.bossCfg ? deepMerge(WAVES.boss, t.bossCfg) : WAVES.boss; }
  state.enemies.push(en);
  return en;
}

// Bölüm çarpanı: Bölüm 1 ×1, Bölüm 2 ×1.4, Bölüm 3 ×1.8 ... (data/waves.json → stage.hpPerStage)
export const stageHpMul = (stage) => 1 + WAVES.stage.hpPerStage * (stage - 1);

// Dalga için spawn kuyruğu (data/waves.json → waves[n-1]); sonraki bölümlerde her 2 bölümde bir ekstra gözcü eklenir.
// Boss dalgasında boss + eşlikçiler.
export function buildQueue(stage, n, boss) {
  const W = WAVES;
  if (boss) return [bossFor(stage, W.bossType), ...Array(W.bossEscorts).fill(rosterType('goblin_scout', stage))];
  const q = W.waves[Math.min(n, W.waves.length) - 1].map((k) => rosterType(k, stage));
  const extra = Math.floor((stage - 1) / 2) * W.stage.extraPerTwoStages;
  for (let i = 0; i < extra; i++) q.splice(Math.floor(rand(0, q.length)), 0, rosterType('goblin_scout', stage));
  const sp = worldExtras(stage); if (sp.length && n >= 2) for (let i = 0; i < Math.floor(n / 2); i++) q.splice(Math.floor(rand(0, q.length)), 0, sp[Math.floor(rand(0, sp.length))]);   // evrene özgü düşmanlar
  return q;
}
