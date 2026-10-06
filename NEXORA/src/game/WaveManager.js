// WaveManager: bölüm/dalga durum makinesi. Bölüm = 5 dalga → güç seçimi → BOSS → ödül + güç seçimi → sonraki bölüm (daha güçlü).
//   state.wave = { stage, n (1..5), boss (bool), phase, t, queue, ... }
//   intro:    "WAVE n / 5" (veya BOSS) afişi, kahraman koşmaya devam eder
//   fight:    EnemySpawner kuyruğundan sırayla düşman çıkarır (aynı anda en fazla maxAlive normal); hepsi ölünce complete
//   complete: "WAVE COMPLETE" + coin bonusu; sonra güç seçimi (5. dalga ve boss sonrası) ya da sonraki dalga
import { WAVES } from '../core/config.js';
import { rand } from '../core/util.js';
import { state } from './state.js';
import { events } from './events.js';
import { buildQueue, spawnEnemy, aliveNormal, aliveElite, aliveAny } from './EnemySpawner.js';
import { rollCards } from './UpgradeManager.js';
import { addText } from './combat.js';

export const isBossWave = () => state.wave.boss;
export const wavesPerStage = () => WAVES.wavesPerStage;

// Verilen konumdan (bölüm, dalga, boss?) dalgayı başlatır
export function startWave(stage = state.wave.stage, n = state.wave.n, boss = state.wave.boss) {
  const w = state.wave;
  w.stage = Math.max(1, stage); w.n = Math.min(WAVES.wavesPerStage, Math.max(1, n)); w.boss = !!boss;
  w.phase = 'intro'; w.t = WAVES.introSec; w.queue = buildQueue(w.stage, w.n, w.boss); w.total = w.queue.length; w.spawnT = 0.4;
  events.onWaveStart?.(w.n, { boss: w.boss, stage: w.stage });
}

export function restartWave() { startWave(); }                          // ölünce aynı dalga baştan

// Güç seçimi bitince: 5. dalgadan sonra BOSS, boss'tan sonra yeni bölümün 1. dalgası
export function resumeAfterUpgrade() {
  const w = state.wave; state.paused = false;
  if (w.boss) startWave(w.stage + 1, 1, false);
  else if (w.n >= WAVES.wavesPerStage) startWave(w.stage, WAVES.wavesPerStage, true);
  else startWave(w.stage, w.n + 1, false);
}

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
      w.phase = 'complete'; w.t = w.boss ? (WAVES.bossCompleteSec || WAVES.completeSec) : WAVES.completeSec;
      state.player.coins += WAVES.stage.coinBonusPerWave * w.n + WAVES.stage.coinBonusPerStage * (w.stage - 1);
      events.onWaveComplete?.(w.n, { boss: w.boss, stage: w.stage });
    }
    return;
  }
  if (w.phase === 'complete') {
    w.t -= dt;
    if (w.t <= 0) {
      if (w.boss || w.n >= WAVES.wavesPerStage) {                      // 5. dalga ve boss sonrası: oyun durur, 3 kart
        w.phase = 'upgrade'; state.paused = true;
        const epic = w.epicNext; w.epicNext = false;
        events.onUpgrade?.(rollCards(3, epic), epic);
      } else resumeAfterUpgrade();
    }
  }
}
