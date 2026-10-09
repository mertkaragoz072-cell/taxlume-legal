// Goblin Lordu davranışı (data/waves.json → boss). Durum makinesi: idle → windup (telegraph) → [dash] → recover → idle.
// 3 özel saldırı (hepsinden ÖNCE kırmızı uyarı + hazırlık animasyonu):
//   hammer  — yakın çekiç darbesi (boss önünde küçük bölge, ağır hasar, küçük sarsıntı + yer tozu)
//   charge  — geri çekilir, oyuncunun konumuna kırmızı uyarı dairesi + çizgi, sonra hızlı hücum (zamanında uzaklaşan kaçar)
//   smash   — silahı kaldırır (~0.7 sn uyarı), yere vurur: geniş şok dalgası, belirgin sarsıntı
// HP eşikleri: %50 öfke (saldırı arası ×0.8, hız ×1.15, destek çağrısı), %20 delilik (arası ×0.6, hız ×1.35).
// Kahraman kendi başına hareket etmediği için "okuyup kaçma" otomatik geri çekilmeyle yapılır: B.dodge.chance olasılıkla
// uyarı sırasında kısa bir tepki gecikmesinden sonra geriye koşar (p.retreat; systems.js uygular). updateBoss true → normal hareket/saldırı atlanır.
import { CONFIG, WAVES } from '../core/config.js';
import { wrapAngle, rand } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { hurtPlayer, addText } from './combat.js';
import { spawnEnemy, enemyMeta } from './EnemySpawner.js';
import { rosterType } from './chapters.js';
import { groundDust, hitStop } from './fx.js';

const R = () => CONFIG.planet.radius;
const dist = (a, b) => Math.abs(wrapAngle(a - b)) * R();

export const newBossState = () => ({ cd: WAVES.boss.firstCd, phase: 'idle', t: 0, dur: 0, atk: null, last: null, rage: 0, summoned: false, target: 0, center: 0, dir: 1, hit: false, dodgeIn: null });

function pickAttack(en, d) {
  const B = en.bossCfg || WAVES.boss, pool = [];
  if (d <= B.hammer.maxDist) pool.push('hammer');
  if (en.sp.rage >= B.combo.minRage && d <= B.hammer.maxDist) pool.push('combo');
  if (d <= B.smash.maxDist) pool.push('smash');
  if (d >= B.charge.minDist && d <= B.charge.maxDist) pool.push('charge');
  if (B.disable?.length) for (let i = pool.length - 1; i >= 0; i--) if (B.disable.includes(pool[i])) pool.splice(i, 1);
  const fresh = pool.filter((k) => k !== en.sp.last);
  const from = fresh.length ? fresh : pool;
  return from.length ? from[Math.floor(rand(0, from.length))] : null;
}

function startAttack(en, atk) {
  const B = en.bossCfg || WAVES.boss, sp = en.sp, p = state.player, r = R();
  sp.phase = 'windup'; sp.atk = atk; sp.t = 0; sp.hit = false;
  if (atk === 'hammer' || atk === 'combo') { const H = B.hammer; sp.dur = atk === 'combo' ? B.combo.windup : H.windup; sp.combo = atk === 'combo' ? B.combo.hits : 0; sp.center = en.a + en.face * H.reach / r; state.telegraphs.push({ a: sp.center, radius: H.radius, t: 0, life: H.windup, boss: en }); }
  else if (atk === 'smash') { const S = B.smash; sp.dur = S.windup; sp.center = en.a; state.telegraphs.push({ a: en.a, radius: S.radius, t: 0, life: S.windup, boss: en }); }
  else { const C = B.charge; sp.dur = C.pullback; sp.target = p.a; state.telegraphs.push({ a: p.a, radius: C.radius, t: 0, life: C.pullback + 0.15, boss: en, line: true }); }
  sp.dodgeIn = Math.random() < B.dodge.chance ? B.dodge.delay : null;      // bu saldırıyı "okuyup" kaçacak mı
  events.onBoss?.('telegraph', atk);
}

function impact(en, atk) {
  const B = en.bossCfg || WAVES.boss, sp = en.sp, p = state.player;
  { const A = enemyMeta(en)?.anims.attack; sp.postAtk = (atk === 'hammer' || atk === 'combo' || atk === 'smash') && A && A.impact && A.impact < 1 ? { dur: A.frames.length / A.fps, imp: A.impact } : null; en.attackT = sp.postAtk ? sp.postAtk.dur * sp.postAtk.imp : -1; } en.atkTimer = 1;      // vuruştan sonra animasyonun kalan kısmı (toparlanma) recover sırasında oynar
  state.telegraphs = state.telegraphs.filter((t) => t.boss !== en);
  if (atk === 'hammer' || atk === 'combo') {
    const H = B.hammer, cm = atk === 'combo';
    state.rings.push({ a: sp.center, t: 0, life: 0.45, color: '#ff9a3a' }); groundDust(sp.center, 14, 150);
    state.shake = Math.max(state.shake, 5); hitStop(0.05); events.onBoss?.('slam');
    if (dist(p.a, sp.center) <= H.radius) hurtPlayer(en.damage * H.damageMul * (cm ? B.combo.damageMul : 1));
    if (cm && sp.combo > 1) {                                // kombo: bir sonraki çekiç — boss öne adım atar, uyarı kısalır
      sp.combo--; en.a += en.face * B.combo.step / R(); sp.phase = 'windup'; sp.t = 0; sp.dur = Math.max(0.3, B.combo.windup * (0.85 ** (B.combo.hits - sp.combo))); sp.hit = false; sp.dodgeIn = null;
      sp.center = en.a + en.face * H.reach / R(); state.telegraphs.push({ a: sp.center, radius: H.radius, t: 0, life: sp.dur, boss: en }); events.onBoss?.('telegraph', 'hammer');
      sp.t = 0; return;
    }
    sp.phase = 'recover'; sp.dur = cm ? B.combo.recover : H.recover;
  } else if (atk === 'smash') {
    const S = B.smash;
    state.rings.push({ a: en.a, t: 0, life: 0.75, color: '#ff5a4a', r: S.radius }); state.rings.push({ a: en.a, t: 0, life: 0.5, color: '#ffd0a0' });
    groundDust(en.a, 28, 280); state.shake = Math.max(state.shake, 12); hitStop(0.08); events.onBoss?.('slam');
    if (dist(p.a, en.a) <= S.radius) hurtPlayer(en.damage * S.damageMul);
    sp.phase = 'recover'; sp.dur = S.recover;
  } else {                                                  // charge: geri çekilme bitti → hücum
    sp.phase = 'dash'; sp.dir = en.face; sp.dur = 1.0; events.onBoss?.('charge');
  }
  sp.t = 0;
}

export function updateBoss(en, dt) {
  const B = en.bossCfg || WAVES.boss, sp = en.sp, p = state.player, r = R(), hpK = en.hp / en.maxHp;
  if (!sp.summoned && hpK <= B.summonAtHp) {
    sp.summoned = true; { const mk = rosterType('goblin_scout', state.wave.stage); spawnEnemy(mk, 40); spawnEnemy(mk, 130); }
    addText(en.a, en.def.heightUnits + 60, 'DESTEK!', '#ff9a3a', 1.1, false, { tag: 'boss' }); events.onBoss?.('summon');
  }
  if (sp.rage < 1 && hpK <= B.rageAtHp) {
    sp.rage = 1; en.speedMul *= B.rageSpeedMul; addText(en.a, en.def.heightUnits + 60, 'ÖFKELENDİ!', '#ff9a3a', 1.2, false, { tag: 'boss' }); events.onBoss?.('enrage'); state.shake = Math.max(state.shake, 6);
  }
  if (sp.rage < 2 && hpK <= B.enrageAtHp) {
    sp.rage = 2; en.speedMul *= B.enrageSpeedMul / B.rageSpeedMul; addText(en.a, en.def.heightUnits + 60, 'DELİRDİ!', '#ff4a4a', 1.3, false, { tag: 'boss' }); events.onBoss?.('enrage'); state.shake = Math.max(state.shake, 9);
  }

  if (sp.phase === 'idle') {
    sp.cd -= dt;
    if (sp.cd > 0 || en.attackT >= 0 || en.windT > 0) return false;
    const atk = pickAttack(en, dist(p.a, en.a));
    if (atk) startAttack(en, atk); else sp.cd = 0.25;           // uygun menzil yok: yaklaşırken tekrar dene
    return !!atk;
  }

  sp.t += dt;
  if (sp.phase === 'windup') {
    if (sp.dodgeIn != null && (sp.dodgeIn -= dt) <= 0) { p.retreat = Math.max(0.2, sp.dur - sp.t); sp.dodgeIn = null; }
    if (sp.atk === 'charge') en.a -= en.face * B.charge.pullSpeed * dt / r;                       // saldırıdan önce geri çekilir
    else { const A = enemyMeta(en)?.anims.attack, dur = A ? A.frames.length / A.fps : 0.5, imp = A?.impact ?? 1; en.attackT = Math.min(dur * imp * 0.999, (sp.t / sp.dur) * dur * imp); en.hitDone = true; }   // uyarı süresi animasyonun vuruş anına kadar olan kısmına eşlenir (vuruş = darbe anı)
    if (sp.t >= sp.dur) impact(en, sp.atk);
    return true;
  }
  if (sp.phase === 'dash') {
    const C = B.charge, step = C.speed * dt / r;
    en.a += sp.dir * step;
    const dTarget = dist(sp.target, en.a), passed = wrapAngle(sp.target - en.a) * sp.dir <= 0 || wrapAngle(p.a - en.a) * sp.dir <= 0;
    if (!sp.hit && dist(p.a, en.a) <= C.hitRadius) {
      sp.hit = true; hurtPlayer(en.damage * C.damageMul); state.shake = Math.max(state.shake, 8); hitStop(0.06); groundDust(p.a, 10, 160);
    }
    if (dTarget <= C.hitRadius * 0.9 || passed || sp.t >= sp.dur) {   // hedefin biraz önünde durur (kahramanı geçip arkasında kalmaz)
      state.telegraphs = state.telegraphs.filter((t) => t.boss !== en);
      groundDust(en.a, 10, 160); state.shake = Math.max(state.shake, 3);
      sp.phase = 'recover'; sp.dur = C.recover; sp.t = 0;
    }
    return true;
  }
  // recover: boss kısa süre savunmasız bekler, sonra bir sonraki saldırı için sayaç
  if (sp.postAtk && sp.phase === 'recover') en.attackT = Math.min(sp.postAtk.dur * 0.999, sp.postAtk.dur * sp.postAtk.imp + (sp.t / sp.dur) * sp.postAtk.dur * (1 - sp.postAtk.imp));
  if (sp.t >= sp.dur) {
    sp.phase = 'idle'; sp.last = sp.atk; sp.atk = null; if (sp.postAtk) { en.attackT = -1; sp.postAtk = null; }
    sp.cd = rand(B.baseCd[0], B.baseCd[1]) * (sp.rage >= 2 ? B.enrageCdMul : sp.rage >= 1 ? B.rageCdMul : 1);
  }
  return true;
}
