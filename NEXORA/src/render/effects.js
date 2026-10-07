import { CONFIG, ANIMS, HERO, SKILLS, WORLD } from '../core/config.js';
import { View } from '../core/view.js';
import { Settings } from '../core/settings.js';
import { Assets } from '../core/assets.js';
import { clamp, wrapAngle } from '../core/util.js';
import { TAU } from '../core/util.js';
import { state } from '../game/state.js';
import { onLane, outlined, visible } from './draw.js';

export function drawCoin(ctx, c) {
  onLane(ctx, c.a, c.h, 0, () => {
    const w = Math.abs(Math.cos(c.spin)) * 7 + 1.5;
    if (c.kind === 'gem') {                                           // mor elmas, dönerken parlar
      ctx.rotate(Math.sin(c.spin) * 0.15);
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(w + 2, 0); ctx.lineTo(0, 10); ctx.lineTo(-w - 2, 0); ctx.closePath();
      ctx.fillStyle = '#c04bff'; ctx.fill(); outlined(ctx, 2);
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(w * 0.5, -1); ctx.lineTo(0, 2); ctx.lineTo(-w * 0.6, -2); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      return;
    }
    ctx.beginPath(); ctx.ellipse(0, 0, w, 7, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); outlined(ctx, 2);
    ctx.beginPath(); ctx.ellipse(-w * 0.25, -2, w * 0.3, 2.5, 0, 0, TAU); ctx.fillStyle = '#fff6a8'; ctx.fill();
  });
}

// Seviye atlama: oyuncunun ayaklarından genişleyen altın halka + yukarı süzülen ışık çizgileri
export function drawRing(ctx, g) {
  const u = g.t / g.life, k = 1 - Math.pow(1 - u, 3);
  onLane(ctx, g.a, 0, 0, () => {
    ctx.globalAlpha = 1 - u * 0.75;
    ctx.beginPath(); ctx.ellipse(0, -2, 20 + k * (g.r ?? (g.color ? 150 : 70)), 5 + k * (g.r ?? (g.color ? 150 : 70)) * 0.17, 0, 0, TAU); ctx.lineWidth = 7 * (1 - u) + 1.5; ctx.strokeStyle = g.color || '#ffd23f'; ctx.stroke();
    if (!g.color) for (let i = -3; i <= 3; i++) { const x = i * 11, hh = 30 + k * 60 + (i % 2 ? 14 : 0); const gr = ctx.createLinearGradient(0, 0, 0, -hh); gr.addColorStop(0, 'rgba(255,230,120,.8)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 2, -hh * (0.4 + 0.6 * k), 4, hh * (0.4 + 0.6 * k)); }
    ctx.globalAlpha = 1;
  });
}

export function drawSlash(ctx, s) {
  if (Assets.get(HERO.id + '_' + (ANIMS.hero?.animations.attack_1?.frames[0] || ANIMS.hero?.animations.attack?.frames[0] || ''))) return; // sprite karelerinde efekt zaten var

  const t = 1 - s.life / s.max;
  onLane(ctx, state.player.a, 0, state.player.lean, () => {
    ctx.scale(s.dir, 1); ctx.translate(18, -30);
    const r = CONFIG.player.attackRange * 0.9;
    ctx.globalAlpha = 1 - t * t;
    ctx.beginPath(); ctx.arc(0, 0, r, -1.1 + t * 1.4, -0.1 + t * 1.4);
    ctx.arc(0, 0, r * 0.7, -0.1 + t * 1.4, -1.1 + t * 1.4, true); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7ee7ff'; ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

export function drawText(ctx, t) {
  onLane(ctx, t.a, t.h, 0, () => {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    const big = t.text === 'LEVEL UP!', age = 1 - t.life / t.max;
    const pop = t.crit ? 1 + 0.45 * Math.pow(Math.max(0, 1 - age * 5), 2) : 1;          // kritik: büyüyerek belirir, sonra oturur
    ctx.font = `900 ${Math.round((big ? 28 : 24) * (t.scale || 1) * pop)}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = t.crit ? 5 : 5; ctx.strokeStyle = t.crit ? '#7a2a00' : '#2a1020'; ctx.lineJoin = 'round';
    if (t.crit) { ctx.shadowColor = 'rgba(255,190,40,.9)'; ctx.shadowBlur = 10; }
    ctx.strokeText(t.text, t.ox, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, t.ox, 0);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  });
}

// Vuruş kıvılcımı: düşmanın gövdesinde, düşmanın boyutuna göre ölçeklenir (sprite varsa mavi yıldız patlaması)
export function drawHitFx(ctx, f) {
  const t = 1 - f.life / f.max, img = Assets.get('fx_effect_weapon_starburst');
  onLane(ctx, f.a, f.h, 0, () => {
    ctx.globalAlpha = 1 - t * t;
    const k = f.k * (0.55 + t * 0.5);
    if (img) ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
    else { ctx.beginPath(); ctx.arc(0, 0, 14 * k, 0, TAU); ctx.fillStyle = '#9fe0ff'; ctx.fill(); }
    ctx.globalAlpha = 1;
  });
}

// Yetenek efektleri: wave = ileri giden mavi hilal (dünya açısında ilerler), burst = yerde patlama kareleri
export function drawSkillFx(ctx, f) {
  const sk = SKILLS[f.id], R = CONFIG.planet.radius;
  if (f.type === 'wave') {
    const img = Assets.get(sk.fx); if (!img) return;
    const a = f.a + f.dir * f.x / R, k = sk.fxHeight / img.height, fade = 1 - Math.pow(Math.min(1, f.t / f.life), 3);
    onLane(ctx, a, 38, 0, () => {
      ctx.scale(f.dir, 1); ctx.globalAlpha = fade;
      for (let i = 3; i >= 0; i--) { ctx.globalAlpha = fade * (i === 0 ? 1 : 0.18 * (4 - i)); ctx.drawImage(img, -img.width * k * 0.5 - i * 14, -img.height * k * 0.5, img.width * k, img.height * k); }
      ctx.globalAlpha = 1;
    });
  } else {
    const n = sk.fxFrames.length, i = Math.min(n - 1, Math.floor(f.t / f.life * n)), img = Assets.get(sk.fxFrames[i]); if (!img) return;
    const k = (sk.radius * 1.9) / img.width;
    onLane(ctx, f.a, 0, 0, () => { ctx.globalAlpha = 1 - Math.pow(f.t / f.life, 6); ctx.drawImage(img, -img.width * k / 2, -img.height * k + 8, img.width * k, img.height * k); ctx.globalAlpha = 1; });
  }
}

// Boss yer darbesi uyarısı: hedef noktada kırmızı, nabız gibi atan oval (süre dolunca patlar)
export function drawTelegraph(ctx, t) {
  const u = Math.min(1, t.t / t.life), pu = 0.5 + 0.5 * Math.sin(t.t * 18), cb = Settings.get('colorblind');   // renk körü: kırmızı yerine sarı dolgu + koyu kesikli kontur
  const fill = cb ? '255,225,60' : '255,50,40', edge = cb ? '255,240,120' : '255,70,50';
  onLane(ctx, t.a, 0, 0, () => {
    if (t.line && t.boss) {                                           // hücum: boss'tan hedefe uyarı şeridi
      const len = wrapAngle(t.boss.a - t.a) * CONFIG.planet.radius;
      ctx.fillStyle = `rgba(${fill},${0.16 + 0.2 * u})`; ctx.fillRect(Math.min(0, len), -7, Math.abs(len), 14);
    }
    ctx.beginPath(); ctx.ellipse(0, -1, t.radius, t.radius * 0.2, 0, 0, TAU);
    ctx.fillStyle = `rgba(${fill},${0.14 + 0.2 * u})`; ctx.fill();
    if (cb) { ctx.setLineDash([10, 7]); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,20,0,.85)'; ctx.stroke(); }
    ctx.lineWidth = 2 + pu * 2; ctx.strokeStyle = `rgba(${edge},${0.55 + 0.4 * pu})`; ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(0, -1, t.radius * u, t.radius * 0.2 * u, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,230,200,.9)'; ctx.lineWidth = 2; ctx.stroke();
  });
}

// Savaş parçacıkları (kıvılcım çizgisi / toz noktası): game/fx.js
export function drawParticles(ctx, pt) {
  const k = pt.life / pt.max;
  onLane(ctx, pt.a, pt.h, 0, () => {
    ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = pt.color; ctx.strokeStyle = pt.color;
    if (pt.kind === 'streak') { const m = Math.hypot(pt.vx, pt.vh) || 1, L = 5 + pt.size * 2.2; ctx.lineWidth = pt.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-pt.vx / m * L, pt.vh / m * L); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, 0, pt.size * (0.5 + k * 0.6), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  });
}

// Oyuncu hasar alınca ekran kenarlarında kısa kırmızı parlama (HUD'a dokunmaz; canvas içinde)
export function drawHurtFlash(ctx, W, H, k) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(255,40,30,0)'); g.addColorStop(1, `rgba(255,40,30,${0.38 * Math.min(1, k)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Sandık (rastgele olay): prop_chest_01 sprite'ı şeritte; kahraman yaklaşınca Chests.update toplar. Hafif zıplama + parıltı.
export function drawChests(ctx) {
  const img = Assets.get('prop_chest_01'), P = WORLD.props?.chest_01;
  for (const c of state.chests) {
    if (!visible(c.a)) continue;
    onLane(ctx, c.a, 0, 0, () => {
      const pu = 0.5 + 0.5 * Math.sin(state.time * 4 + c.a * 50);
      const gg = ctx.createRadialGradient(0, -22, 2, 0, -22, 46); gg.addColorStop(0, `rgba(255,230,120,${0.35 + 0.25 * pu})`); gg.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gg; ctx.fillRect(-50, -70, 100, 100);
      if (img && P) { const k = (P.height * 1.1) / img.height; ctx.drawImage(img, -P.pivot[0] * k, (-P.pivot[1] - pu * 2) * k, img.width * k, img.height * k); }
      else { ctx.fillStyle = '#c98a4b'; ctx.fillRect(-16, -26, 32, 26); }
    });
  }
}

// Can düşükken kenarlarda nabız gibi kırmızı vinyet (ayar: lowHp.frac). Düşük efekt modunda sabit/hafif.
export function drawLowHp(ctx) {
  const p = state.player; if (state.over || !p || p.hp / p.maxHp > CONFIG.lowHp.frac) return;
  const k = 1 - p.hp / p.maxHp / CONFIG.lowHp.frac, beat = 0.5 + 0.5 * Math.sin(state.time * 7);
  const W = View.w, H = View.h, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(220,20,20,0)'); g.addColorStop(1, `rgba(220,20,20,${(0.16 + 0.26 * beat) * (0.4 + 0.6 * k)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
