// Dalga HUD'u: üst ortada "WAVE n / 5" (5'lik blok içindeki sıra), boss dalgasında "BOSS", altında dalga no + kalan düşman; afişler.
import { state } from '../game/state.js';
import { WAVES } from '../core/config.js';

let box, main, sub, banner, last = '';
export function initWaveHud() { main = document.getElementById('wave-main'); sub = document.getElementById('wave-sub'); banner = document.getElementById('banner'); }

let bar, fill, hpTxt;
function updateBossBar() {
  bar ||= document.getElementById('boss-bar'); fill ||= document.getElementById('bb-fill');
  const b = state.enemies.find((e) => e.def.boss && !e.dead);
  bar.classList.toggle('hidden', !b);
  if (!b) return;
  fill.style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
  (hpTxt ||= document.getElementById('bb-hp')).textContent = Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.round(b.maxHp);
}
export function updateWaveHud() {
  updateBossBar();
  const w = state.wave, boss = w.boss;
  const left = w.queue.length + state.enemies.filter((e) => !e.dead).length;
  const t = boss ? 'BOSS WAVE' : `WAVE ${w.n} / ${WAVES.wavesPerStage}`;
  const s = `Bölüm ${w.stage} · Kalan ${left}`;
  const key = t + s; if (key === last) return; last = key;
  main.textContent = t; main.classList.toggle('boss', boss); sub.textContent = s;
}

export function showBanner(text, kind = '', subText = '') {
  banner.innerHTML = subText ? `${text}<small>${subText}</small>` : text; banner.className = ''; void banner.offsetWidth; banner.className = `show ${kind}`;
}
