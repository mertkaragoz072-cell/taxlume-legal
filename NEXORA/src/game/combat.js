// CombatManager: hasar (kritik dahil), geri tepme, ölüm/ödül, XP/seviye, oyuncu hasarı. Kullanıcı verisi: PlayerStats.
import { CONFIG, WAVES } from '../core/config.js';
import { rand, TAU, wrapAngle } from '../core/util.js';
import { state, xpForLevel } from './state.js';
import { events } from './events.js';
import { derived, recalcMaxHp, probRound } from './PlayerStats.js';
import { add as metaAdd, setMax as metaMax } from './Meta.js';
import { hitSparks, deathBurst, hurtSparks, hitStop, xpBurst, groundDust } from './fx.js';

// opts: { life (sn), rise (birim/sn), tag (toplu temizlik için), key (aynı anahtarlı yazı tekrar basılmaz, yenilenir) }
export function addText(a, h, text, color, scale = 1, crit = false, opts = {}) {
  const life = opts.life ?? CONFIG.hud.damageNumberLife, R = CONFIG.planet.radius;
  if (opts.key) { const ex = state.texts.find((t) => t.key === opts.key); if (ex) { Object.assign(ex, { text, color, life, max: life, h }); return; } }
  for (let k = 0; k < 5; k++) if (state.texts.some((t) => Math.abs(t.a - a) * R < 46 && Math.abs(t.h - h) < 20)) h += 22;   // yazılar üst üste binmesin
  a += rand(-6, 6) / R;
  if (state.texts.length >= 8) state.texts.splice(Math.max(0, state.texts.findIndex((t) => !t.key)), 1);   // ekranı yazıyla doldurma (önce sıradan yazılar düşer)
  state.texts.push({ a, h, text, color, life, max: life, ox: rand(-8, 8), scale, crit, rise: opts.rise ?? 50, tag: opts.tag, key: opts.key });
}

// Oyuncu hasarı: taban × hasar çarpanı, kritik şansıyla × kritik hasar. {dmg, crit}
export function rollDamage(base) {
  const s = derived(state.player), crit = Math.random() < s.critChance;
  return { dmg: base * s.damageMul * (crit ? s.critDamage : 1), crit };
}
const ELEMENT_COLOR = { fire: '#ff8a3a', ice: '#7fdcff', lightning: '#ffe85a' };
// Vuruş: opts.skill (yetenek hasarı çarpanı), opts.element (yeteneğin elementi). Her element gücü ek hasar + durum etkisi verir:
// ateş = yanma (zamanla hasar), buz = yavaşlatma, yıldırım = yakındaki düşmana zincirleme.
export function hitEnemy(en, base, opts = {}) {
  const S = derived(state.player), r = rollDamage(base);
  let dmg = r.dmg, color = null;
  if (opts.skill) dmg *= S.skillDmgMul;
  const el = ['fire', 'ice', 'lightning'];
  const bonus = el.reduce((t, k) => t + S[k], 0);
  if (bonus > 0) dmg *= 1 + bonus * 0.5;
  if (opts.element && S[opts.element] > 0) dmg *= 1 + S[opts.element] * 0.5;
  const top = el.reduce((m, k) => (S[k] > (S[m] || 0) ? k : m), '');
  if (S[top] > 0) color = ELEMENT_COLOR[top];
  damageEnemy(en, dmg, r.crit, color);
  if (en.dead) return;
  const C = CONFIG.player;
  if (S.fire > 0) en.burn = { t: C.burn.seconds, dps: base * S.damageMul * C.burn.dpsOfBase * S.fire, tick: 0 };
  if (S.ice > 0) en.chill = { t: C.chill.seconds, mul: Math.max(C.chill.minMul, 1 - S.ice * C.chill.perPoint) };
  if (S.lightning > 0 && !opts.chain && Math.random() < Math.min(C.chain.maxChance, S.lightning * C.chain.chancePerPoint * 0.4)) {
    let near = null, nd = C.chain.radius;
    for (const o of state.enemies) { if (o === en || o.dead) continue; const d = Math.abs(wrapAngle(o.a - en.a)) * CONFIG.planet.radius; if (d < nd) { nd = d; near = o; } }
    if (near) { damageEnemy(near, dmg * C.chain.damageMul, false, ELEMENT_COLOR.lightning); state.rings.push({ a: near.a, t: 0, life: 0.35, color: ELEMENT_COLOR.lightning }); }
  }
}

// Durum etkileri (yanma / yavaşlama): her karede düşman döngüsünden çağrılır
export function tickStatus(en, dt) {
  if (en.burn) {
    en.burn.t -= dt; en.burn.tick += dt;
    if (en.burn.tick >= 0.5) { en.burn.tick -= 0.5; damageEnemy(en, en.burn.dps * 0.5, false, ELEMENT_COLOR.fire, true); }
    if (en.burn.t <= 0) en.burn = null;
  }
  if (en.chill) { en.chill.t -= dt; if (en.chill.t <= 0) en.chill = null; }
}
export const slowMul = (en) => (en.chill ? en.chill.mul : 1);

export function applyKnock(en, k) { en.knock = Math.max(en.knock, k * (1 - en.def.knockResist)); en.stagger = Math.max(en.stagger, 0.3); }

export function damageEnemy(en, dmg, crit = false, color = null, dot = false) {
  if (crit && !dot) { metaAdd('crits'); events.onCrit?.(); hitStop(0.04); }
  if (en.def.boss && en.sp?.phase === 'recover') dmg *= WAVES.boss.recoverDamageMul || 1;     // saldırı sonrası savunmasız bekleme
  if (en.def.armor) dmg *= 1 - en.def.armor;                      // zırhlı düşmanlar (evren düşmanları)
  en.hp -= dmg;
  if (dot) {
    addText(en.a, en.def.heightUnits + 6, Math.round(dmg), color || '#ff8a3a', 0.6);
    if (en.hp <= 0 && !en.dead) killEnemy(en);
    return;
  }
  en.flash = 0.1; en.knock = 1 - en.def.knockResist; en.stagger = en.def.boss ? 0 : 0.22;
  if (en.def.knockResist < 0.5 && (en.attackT >= 0 || en.windT > 0) && !(en.noInterrupt > 0)) { en.attackT = -1; en.windT = -1; en.atkTimer = 0.4; en.noInterrupt = 1.6; }   // vuruş saldırıyı böler, ama art arda bölünüp goblin kilitlenmesin (1.6 sn dokunulmazlık)   // hafif düşmanın saldırısı vuruşla bölünür; elite/boss bölünmez
  events.onHit?.(en, dmg);
  state.shake = Math.max(state.shake, crit ? 2.8 : 1.3);          // hafif vuruş sarsıntısı
  hitStop(crit ? 0.08 : 0.05);              // kısa hit-stop (kritikte biraz uzun)
  addText(en.a, en.def.heightUnits + 10, (crit ? '' : '-') + Math.round(dmg) + (crit ? '!' : ''), crit ? '#ffd23f' : (color || '#ff6048'), (0.75 + en.def.heightUnits / 300) * (crit ? 1.8 : 1), crit);
  if (state.hitFx.length < 4) state.hitFx.push({ a: en.a, h: en.def.heightUnits * 0.55, life: 0.2, max: 0.2, k: en.def.heightUnits / 190 * (crit ? 1.5 : 1), dir: -en.face });
  hitSparks(en.a, en.def.heightUnits * 0.55, -en.face, crit);
  if (en.hp <= 0 && !en.dead) killEnemy(en);
}

function spawnPickup(a, kind, h, spreadV) {
  state.coins.push({ a, h, vh: rand(0.6, 1.2) * CONFIG.loot.coinPopSpeed * spreadV, va: rand(-1, 1) * 0.3, value: 1, magnet: false, grounded: false, spin: rand(0, TAU), kind });
}

const comboBonus = (n) => { let b = 0; for (const [at, v] of CONFIG.combo.tiers) if (n >= at) b = v; return b; };
export function killEnemy(en) {
  if (en.dead || en.rewarded) return; en.rewarded = true;          // ödül yalnız bir kez
  en.dead = true; en.deathT = 0; state.kills++; metaAdd('kills'); if (en.def.boss) { metaAdd('bosses'); state.runBosses++; }
  const cb = state.combo; cb.n++; cb.t = CONFIG.combo.window; cb.best = Math.max(cb.best, cb.n); metaMax('combo', cb.n); const cbn = comboBonus(cb.n);     // öldürme zinciri → altın/XP bonusu
  let n = Math.round(rand(en.def.coins[0], en.def.coins[1]) * (1 + cbn));
  if (Math.random() < derived(state.player).extraCoin) n += 1 + (en.def.elite ? 2 : 0);
  for (let i = 0; i < n; i++) spawnPickup(en.a, 'coin', 14, 1);
  const gems = en.def.gems ? Math.round(rand(en.def.gems[0], en.def.gems[1])) : (Math.random() < (en.def.gemChance || 0) ? 1 : 0);
  for (let i = 0; i < gems; i++) spawnPickup(en.a, 'gem', 18, 1.1);
  const xp = gainXp(en.def.xp * (1 + cbn)); state.lastXp = xp;
  addText(en.a, en.def.heightUnits + 34, '+' + xp + ' XP', '#7ee7ff', 0.7, false, { life: 1.2, rise: 28 });
  events.onKill?.(en);
  deathBurst(en.a, en.def.heightUnits * 0.4, !!en.def.boss);
  if (en.def.explode) {                                            // patlayıcı düşman: ölünce yakındaki kahramana hasar
    const X = en.def.explode; state.rings.push({ a: en.a, t: 0, life: 0.5, color: '#ff8a3a', r: X.radius }); groundDust(en.a, 12, 160); state.shake = Math.max(state.shake, 4);
    if (Math.abs(wrapAngle(state.player.a - en.a)) * CONFIG.planet.radius <= X.radius) hurtPlayer(en.damage * X.damageMul);
  }
  if (en.def.boss) { state.wave.bossDefeated = true; state.texts = state.texts.filter((t) => t.tag !== 'boss'); clearOthers(en); state.shake = Math.max(state.shake, 12); hitStop(0.14); state.slowT = 1.0; xpBurst(en.a, en.def.heightUnits * 0.6); bossReward(en); }
}

// Boss ölünce sahnedeki diğer düşmanlar ödülsüz temizlenir (ölüm animasyonu + toz) ve bekleyen doğuşlar iptal olur
function clearOthers(boss) {
  for (const o of state.enemies) if (o !== boss && !o.dead) { o.dead = true; o.rewarded = true; o.deathT = 0; deathBurst(o.a, o.def.heightUnits * 0.4, false); }
  state.wave.queue = [];
}

// Boss ödülü: doğrudan coin (250 × boss coin çarpanı) + görsel coin yağmuru, gem, tam iyileşme, sonraki seçimin EFSANE olması
function bossReward() {                       // coin + gem; XP killEnemy'de verilir; iyileşme yok (can korunur)
  if (state.wave.rewardGranted) return; state.wave.rewardGranted = true;   // ödül bir kez
  const R = WAVES.boss.reward, p = state.player, S = derived(p);
  const amount = Math.round(R.coins * S.bossCoinMul);
  p.coins += amount;
  for (let i = 0; i < (R.showerCoins || 20); i++) { spawnPickup(p.a + 0.01 + i * 0.0006, 'coin', 30, 1.4); state.coins[state.coins.length - 1].value = 0; }
  p.gems += R.gems;                                                   // gem doğrudan (bir kez); yerdekiler yalnız görsel (değer 0)
  for (let i = 0; i < R.gems; i++) { spawnPickup(p.a + 0.012 + i * 0.0007, 'gem', 34, 1.5); state.coins[state.coins.length - 1].value = 0; }
  if (R.healFull) p.hp = p.maxHp;                                     // waves.json'da false: boss ödülü canı sıfırlamaz
  if (R.epicUpgrade) state.wave.epicNext = true;
  state.bossReward = amount;
  events.onCoin?.();
  events.onBoss?.('dead', amount, state.lastXp);
}

// XP: XP çarpanı uygulanır; döndürülen = eklenen XP
export function gainXp(amount) {
  const p = state.player, L = CONFIG.leveling;
  amount = probRound(amount * derived(p).xpMul);
  p.xp += amount; const lv0 = p.level;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext; p.level++; p.xpNext = xpForLevel(p.level); metaMax('level', p.level);
    p.damage += L.damagePerLevel;
    recalcMaxHp(p, true);
    p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * L.healOnLevelUp);
    state.rings.push({ a: p.a, t: 0, life: 0.9 });
    events.onLevelUp?.(p.level);
  }
  p.lvShown ??= lv0;
  if (p.level > p.lvShown) {                                       // her seviye için yalnız bir kez; çoklu atlamada tek yazı; ~1.8 sn
    addText(p.a, 150, p.level - p.lvShown > 1 ? `LEVEL UP! ×${p.level - p.lvShown}` : 'LEVEL UP!', '#ffd23f', 1, false, { life: 1.8, rise: 14, key: 'levelup' });
    p.lvShown = p.level;
  }
  return amount;
}

export function collectCoin(value) { const p = state.player, n = probRound(value * derived(p).coinMul); p.coins += n; metaAdd('coins', n); events.onCoin?.(); }
export function collectGem(value) { state.player.gems += value; events.onGem?.(); }

// Oyuncuya hasar: savunma hasarı 1/(1+savunma) kadar azaltır
export function hurtPlayer(dmg) {
  const p = state.player;
  if (p.dodgeT > 0 && !state.over) {                               // kaçınma sıçraması: hasar yok; sıçrama başına bir kez MÜKEMMEL KAÇINMA ödülü
    if (!p.perfectDone) {
      p.perfectDone = true; p.dodgeCd = 0; state.slowT = Math.max(state.slowT, CONFIG.dodge.perfectSlow);
      addText(p.a, 135, 'KAÇTIN!', '#7dffb0', 1.1, false, { life: 1.1, rise: 40, key: 'dodge' }); gainXp(CONFIG.dodge.perfectXp); metaAdd('dodges'); events.onDodge?.(true);
    }
    return;
  }
  if (p.invuln > 0 || state.over) return;
  state.combo.n = 0; state.hitsWave++;                              // gerçek hasar: kombo zinciri ve 'kusursuz dalga' bozulur
  const S = derived(p);
  dmg = Math.max(1, dmg / (1 + S.defense) * (1 - S.dmgTaken));
  dmg = Math.min(dmg, p.maxHp * CONFIG.player.maxHitFrac);          // tek vuruş maksimum canın %35'inden fazlasını almaz
  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = CONFIG.player.invulnTime; p.hitFlash = 0.2; state.shake = Math.max(state.shake, 4);
  p.anim = 'hurt'; p.animT = 0; state.hurtFlash = 0.28; hurtSparks(p.a, 50);
  addText(p.a, 125, '-' + Math.round(dmg), '#ff9a3a');
  events.onHurt?.();
  if (p.hp <= 0) { metaAdd('deaths'); state.over = true; p.anim = 'death'; p.animT = 0; events.onGameOver?.(state); }
}
