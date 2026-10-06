// Dalga HUD'u: üst ortada "WAVE n / 5" (5'lik blok içindeki sıra), boss dalgasında "BOSS", altında dalga no + kalan düşman; afişler.
import { state } from '../game/state.js';
import { WAVES } from '../core/config.js';
import { waveInBlock, isBossWave } from '../game/WaveManager.js';

let box, main, sub, banner, last = '';
export function initWaveHud() { main = document.getElementById('wave-main'); sub = document.getElementById('wave-sub'); banner = document.getElementById('banner'); }

export function updateWaveHud() {
  const w = state.wave, boss = isBossWave(w.n);
  const left = w.queue.length + state.enemies.filter((e) => !e.dead).length;
  const t = boss ? 'BOSS WAVE' : `WAVE ${waveInBlock(w.n)} / ${WAVES.upgradeEvery}`;
  const s = `Dalga ${w.n}${boss ? '' : ''} · Kalan ${left}`;
  const key = t + s; if (key === last) return; last = key;
  main.textContent = t; main.classList.toggle('boss', boss); sub.textContent = s;
}

export function showBanner(text, kind = '') {
  banner.textContent = text; banner.className = ''; void banner.offsetWidth; banner.className = `show ${kind}`;
}
