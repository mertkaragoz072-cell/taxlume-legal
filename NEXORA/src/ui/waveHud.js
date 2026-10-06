// Dalga HUD'u: üst ortada "WAVE n / 5" (5'lik blok içindeki sıra), boss dalgasında "BOSS", altında dalga no + kalan düşman; afişler.
import { state } from '../game/state.js';
import { WAVES } from '../core/config.js';
import { chapterInfo } from '../game/chapters.js';

let box, main, sub, banner, last = '';
export function initWaveHud() { main = document.getElementById('wave-main'); sub = document.getElementById('wave-sub'); banner = document.getElementById('banner'); }

let bar, fill, trail, hpTxt, disp = 1, dispTrail = 1, wasBoss = false;
function updateBossBar() {
  bar ||= document.getElementById('boss-bar'); fill ||= document.getElementById('bb-fill'); trail ||= document.getElementById('bb-trail');
  const b = state.enemies.find((e) => e.def.boss && !e.dead);
  bar.classList.toggle('hidden', !b);
  if (!b) { wasBoss = false; return; }
  const k = Math.max(0, b.hp / b.maxHp);
  if (!wasBoss) { disp = dispTrail = k; wasBoss = true; }
  disp += (k - disp) * 0.22;                                    // ana çubuk yumuşak iner
  dispTrail += (k - dispTrail) * 0.05;                          // arkadaki açık "hasar izi" daha yavaş
  fill.style.width = (disp * 100).toFixed(2) + '%'; trail.style.width = (Math.max(dispTrail, disp) * 100).toFixed(2) + '%';
  bar.classList.toggle('rage', k <= 0.5 && k > 0.2); bar.classList.toggle('enrage', k <= 0.2);
  (hpTxt ||= document.getElementById('bb-hp')).textContent = Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.round(b.maxHp);
}
export function updateWaveHud() {
  updateBossBar();
  const w = state.wave, boss = w.boss;
  const left = w.queue.length + state.enemies.filter((e) => !e.dead).length;
  const t = boss ? 'BOSS WAVE' : `WAVE ${w.n} / ${WAVES.wavesPerStage}`;
  const s = `${chapterInfo(w.stage).name} · Kalan ${left}`;
  const key = t + s; if (key === last) return; last = key;
  if (main.textContent !== t) { const bx = document.getElementById('wave-box'); bx.classList.remove('wave-pop'); void bx.offsetWidth; bx.classList.add('wave-pop'); }   // dalga değişince kısa büyüyüp küçülme
  main.textContent = t; main.classList.toggle('boss', boss); sub.textContent = s;
}

export function showBanner(text, kind = '', subText = '') {
  banner.innerHTML = subText ? `${text}<small>${subText}</small>` : text; banner.className = ''; void banner.offsetWidth; banner.className = `show ${kind}`;
}
