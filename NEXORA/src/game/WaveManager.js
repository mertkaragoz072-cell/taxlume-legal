// WaveManager: dalga durum makinesi. intro → fight (sırayla spawn) → complete → [her 5. dalgada upgrade duraklaması] → sonraki dalga.
//   intro:    "WAVE n" afişi, kahraman koşmaya devam eder
//   fight:    EnemySpawner kuyruğundan sırayla düşman çıkarır (aynı anda en fazla maxAlive normal); hepsi ölünce complete
//   complete: "WAVE COMPLETE" afişi + coin bonusu; upgradeEvery'de oyun duraklar ve güç seçimi açılır
// Boss dalgası (her bossEvery): boss + eşlikçiler. Elite dalgası (her eliteEvery): sonda elite.
import { WAVES } from '../core/config.js';
import { rand } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { buildQueue, spawnEnemy, aliveNormal, aliveElite, aliveAny } from './EnemySpawner.js';
import { rollCards } from './UpgradeManager.js';
import { addText } from './combat.js';

export const isBossWave = (n) => n % WAVES.bossEvery === 0;
export const waveInBlock = (n) => ((n - 1) % WAVES.upgradeEvery) + 1;       // "WAVE 3 / 5"

export function startWave(n) {
  const w = state.wave;
  w.n = n; w.phase = 'intro'; w.t = WAVES.introSec; w.queue = buildQueue(n); w.total = w.queue.length; w.spawnT = 0.4;
  events.onWaveStart?.(n, { boss: isBossWave(n) });
}

export function restartWave() { startWave(state.wave.n); }            // ölünce aynı dalga baştan

export function resumeAfterUpgrade() { state.paused = false; w_next(); }
function w_next() { startWave(state.wave.n + 1); }

export function updateWaves(dt) {
  const w = state.wave;
  if (state.over) return;
  if (w.phase === 'intro') { w.t -= dt; if (w.t <= 0) { w.phase = 'fight'; } return; }
  if (w.phase === 'fight') {
    w.spawnT -= dt;
    if (w.queue.length && w.spawnT <= 0) {
      const next = w.queue[0], isBig = next === WAVES.bossType || next === WAVES.eliteType;
      const ok = isBig ? aliveNormal().length <= (next === WAVES.bossType ? 2 : 1) : aliveNormal().length < WAVES.maxAlive;
      if (ok && !(isBig && aliveElite().length)) {
        w.queue.shift(); spawnEnemy(next, isBig ? 160 : 0);
        if (next === WAVES.bossType) { addText(state.player.a, 175, 'BOSS!', '#ff4a4a', 1.4); events.onBoss?.('spawn'); }
        w.spawnT = rand(WAVES.spawnGapSec[0], WAVES.spawnGapSec[1]);
      } else w.spawnT = 0.3;
    }
    if (!w.queue.length && aliveAny().length === 0) {
      w.phase = 'complete'; w.t = WAVES.completeSec;
      state.player.coins += WAVES.coinBonusPerWave * w.n;
      events.onWaveComplete?.(w.n);
    }
    return;
  }
  if (w.phase === 'complete') {
    w.t -= dt;
    if (w.t <= 0) {
      if (w.n % WAVES.upgradeEvery === 0) {
        w.phase = 'upgrade'; state.paused = true;
        const epic = w.epicNext; w.epicNext = false;
        events.onUpgrade?.(rollCards(3, epic), epic);
      } else w_next();
    }
  }
}
