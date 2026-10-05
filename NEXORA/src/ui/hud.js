import { state } from '../game/state.js';

const el = {};
export function initHud() {
  for (const id of ['hud-level', 'hp-fill', 'hp-text', 'xp-fill', 'xp-text', 'hud-coins', 'gameover', 'go-level', 'go-kills', 'go-coins']) {
    el[id] = document.getElementById(id);
  }
}

export function updateHud() {
  const p = state.player;
  el['hud-level'].textContent = p.level;
  el['hp-fill'].style.width = (p.hp / p.maxHp * 100) + '%';
  el['hp-text'].textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
  el['xp-fill'].style.width = (p.xp / p.xpNext * 100) + '%';
  el['xp-text'].textContent = `XP ${p.xp}/${p.xpNext}`;
  el['hud-coins'].textContent = p.coins;
}

export function showGameOver() {
  const p = state.player;
  el['go-level'].textContent = p.level;
  el['go-kills'].textContent = state.kills;
  el['go-coins'].textContent = p.coins;
  el.gameover.classList.remove('hidden');
}
export function hideGameOver() { el.gameover.classList.add('hidden'); }
