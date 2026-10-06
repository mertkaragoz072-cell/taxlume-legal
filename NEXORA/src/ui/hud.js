import { state } from '../game/state.js';
import { SKILLS } from '../core/config.js';
import { CONFIG, HERO } from '../core/config.js';
import { Assets } from '../core/assets.js';

const el = {};
export function initHud() {
  for (const id of ['hud-level', 'hp-fill', 'hp-text', 'xp-fill', 'hud-coins', 'hud-gems', 'gameover', 'go-level', 'go-kills', 'go-coins']) {
    el[id] = document.getElementById(id);
  }
}

const skillEls = {};
// Yetenek düğmeleri: bekleme süresi daire dilimi (--cd), hazırken parlama, seviye açılmamışsa gri
function updateSkillButtons() {
  for (const id of Object.keys(SKILLS)) {
    const b = skillEls[id] || (skillEls[id] = document.getElementById('btn-' + id)); if (!b) continue;
    const sk = SKILLS[id], locked = state.player.level < sk.unlockLevel, cd = locked ? 1 : state.skillCd[id] / sk.cooldown;
    b.style.setProperty('--cd', cd.toFixed(3)); b.classList.toggle('locked', locked); b.classList.toggle('ready', !locked && cd <= 0);
    b.title = locked ? `${sk.name} — Seviye ${sk.unlockLevel}'de açılır` : sk.name;
  }
}

export function updateHud() {
  updateSkillButtons();
  const p = state.player;
  el['hud-level'].textContent = p.level;
  el['hp-fill'].style.width = (p.hp / p.maxHp * 100) + '%';
  el['hp-text'].textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  el['xp-fill'].style.width = (p.xp / p.xpNext * 100) + '%';
  el['hud-coins'].textContent = p.coins;
  el['hud-gems'].textContent = p.gems;
}

export function showGameOver() {
  const p = state.player;
  el['go-level'].textContent = p.level;
  el['go-kills'].textContent = state.kills;
  el['go-coins'].textContent = p.coins;
  el.gameover.classList.remove('hidden');
}
export function hideGameOver() { el.gameover.classList.add('hidden'); }

// Portre: erkek idle karesinin baş bölgesi (data/config.json → hud.avatar). Sprite yoksa boş kalır.
export function drawAvatar() {
  const cv = document.getElementById('avatar'); if (!cv) return;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
  const bigPortrait = { female: 'female_portrait', heroine: 'heroine_portrait' }[HERO.id];
  if (bigPortrait) {                                 // büyük portre: kare kırp, daire içine sığdır
    const img = Assets.get(bigPortrait); if (!img) return;
    const s = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - s) / 2, 0, s, s, 0, 0, cv.width, cv.height); return;
  }
  const cfg = CONFIG.hud.avatar, img = Assets.get(cfg.key); if (!img) return;
  const [sx, sy, sw, sh] = cfg.crop;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
}
