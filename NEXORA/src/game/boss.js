// Boss davranışı (data/waves.json → boss): periyodik YER DARBESİ (kırmızı uyarı dairesi + gecikmeli şok dalgası),
// %50 canda iki küçük düşman çağırır, %30 canda öfkelenir (hızlanır). Normal temas saldırısı da korunur.
// updateBoss true dönerse boss bu karede özel saldırıya hazırlanıyor (normal hareket/saldırı atlanır).
import { CONFIG, WAVES } from '../core/config.js';
import { wrapAngle } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { hurtPlayer, addText } from './combat.js';
import { spawnEnemy, enemyMeta } from './EnemySpawner.js';

export function updateBoss(en, dt) {
  const B = WAVES.boss, sp = en.sp, p = state.player, r = CONFIG.planet.radius;
  const hpK = en.hp / en.maxHp;
  if (!sp.summoned && hpK <= B.summonAtHp) {
    sp.summoned = true; spawnEnemy('goblin_scout', 40); spawnEnemy('goblin_scout', 130);
    addText(en.a, en.def.heightUnits + 60, 'DESTEK!', '#ff9a3a', 1.1); events.onBoss?.('summon');
  }
  if (!sp.enraged && hpK <= B.enrageAtHp) {
    sp.enraged = true; en.speedMul *= B.enrageSpeedMul;
    addText(en.a, en.def.heightUnits + 60, 'ÖFKE!', '#ff4a4a', 1.2); events.onBoss?.('enrage'); state.shake = 8;
  }
  if (sp.wind > 0) {                                           // hazırlanıyor: yerinde durur, saldırı animasyonunu oynar
    sp.wind -= dt;
    const A = enemyMeta(en)?.anims.attack, dur = A ? A.frames.length / A.fps : 0.5;
    en.attackT = Math.min(dur * 0.95, (1 - sp.wind / B.slamWind) * dur); en.hitDone = true;
    if (sp.wind <= 0) {
      en.attackT = -1; en.atkTimer = 1; sp.cd = B.slamEvery;
      state.rings.push({ a: sp.target, t: 0, life: 0.6, color: '#ff5a4a' }); state.shake = 11; events.onBoss?.('slam');
      if (Math.abs(wrapAngle(p.a - sp.target)) * r < B.slamRadius) hurtPlayer(en.damage * B.slamDamageMul);
      state.telegraphs = state.telegraphs.filter((t) => t.boss !== en);
    }
    return true;
  }
  sp.cd -= dt;
  const dist = Math.abs(wrapAngle(p.a - en.a)) * r;
  if (sp.cd <= 0 && dist < 460 && en.attackT < 0) {
    sp.wind = B.slamWind; sp.target = p.a;
    state.telegraphs.push({ a: sp.target, radius: B.slamRadius, t: 0, life: B.slamWind, boss: en });
  }
  return false;
}
