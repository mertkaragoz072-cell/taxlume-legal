// Procedural chibi people (placeholder art). Feet are at (x, y); the figure faces +x and is mirrored by `dir`.
import { INK, rrect, paint, shadow, vgrad } from '../util.js';

export const SKINS = ['#f7d3ae', '#e9b98c', '#d49c70'];

export function drawPerson(ctx, x, y, p, t = 0) {
  const sc = p.scale ?? 1, dir = p.dir ?? 1;
  const skin = p.skin ?? SKINS[0], top = p.top ?? '#4a7fc1', pants = p.pants ?? '#3d4a63';
  const walking = !!p.walking, seated = !!p.seated;
  const ph = walking ? t * (p.step ?? 7) + (p.phase ?? 0) : 0;
  const sw = walking ? Math.sin(ph) : 0;
  const bob = walking ? -Math.abs(Math.cos(ph)) * 2.4 : Math.sin(t * 2 + (p.phase ?? 0)) * 0.7;
  const lift = seated ? 9 : 0; // sitting lowers the torso / head

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc * dir, sc);
  if (!p.seatedBehind) shadow(ctx, 0, 1, 17, 5, 0.3);

  // backpack goes behind the torso
  if (p.backpack) {
    rrect(ctx, -26, -64 + lift, 16, 28, 6); paint(ctx, p.backpack, 2);
    rrect(ctx, -24, -52 + lift, 11, 9, 3); paint(ctx, 'rgba(0,0,0,.18)', 1.2);
  }

  // legs
  if (!p.seatedBehind) {
    if (seated) {
      for (const [dx, c] of [[-2, shade(pants)], [2, pants]]) {
        rrect(ctx, dx - 4, -32 + lift, 24, 9, 4); paint(ctx, c, 2);
        rrect(ctx, dx + 11, -30 + lift, 9, 30 - lift, 4); paint(ctx, c, 2);
        ctx.beginPath(); ctx.ellipse(dx + 17, -1, 8, 4, 0, 0, 7); paint(ctx, '#3a2a22', 1.8);
      }
    } else {
      for (const [d, c] of [[-1, shade(pants)], [1, pants]]) {
        ctx.save(); ctx.translate(d * 1.5, -34 + bob);
        ctx.rotate(sw * d * 0.55);
        rrect(ctx, -4.5, 0, 9, 32, 4); paint(ctx, c, 2);
        ctx.beginPath(); ctx.ellipse(2.5, 32, 8, 4.2, 0, 0, 7); paint(ctx, '#3a2a22', 1.8);
        ctx.restore();
      }
    }
  }

  // back arm
  arm(ctx, p, -1, sw, bob, lift, seated, top, skin);

  // torso (dress shows a skirt)
  if (p.dress) {
    ctx.beginPath(); ctx.moveTo(-12, -36 + lift); ctx.lineTo(12, -36 + lift); ctx.lineTo(18, -16 + lift + (seated ? 0 : 0)); ctx.lineTo(-18, -16 + lift); ctx.closePath();
    paint(ctx, p.dress, 2);
  }
  rrect(ctx, -12, -64 + bob + lift, 24, 31, 9); paint(ctx, vgrad(ctx, -64, -33, [[0, lighten(top)], [1, top]]), 2.2);
  if (p.apron) {
    rrect(ctx, -9, -50 + bob + lift, 18, 24, 5); paint(ctx, p.apron === true ? '#fffaf0' : p.apron, 1.8);
    ctx.fillStyle = INK; ctx.fillRect(-1, -62 + bob + lift, 2, 12);
  }
  if (p.collar) { ctx.beginPath(); ctx.moveTo(-6, -64 + bob + lift); ctx.lineTo(0, -56 + bob + lift); ctx.lineTo(6, -64 + bob + lift); paint(ctx, p.collar, 1.6); }

  // head
  const hy = -78 + bob + lift;
  if (p.hairStyle === 'long' || p.hairStyle === 'bun') {
    rrect(ctx, -19, hy - 12, 22, 44, 11); paint(ctx, p.hair, 2.2);
  }
  ctx.beginPath(); ctx.arc(0, hy, 16, 0, 7); paint(ctx, skin, 2.4);
  // face
  ctx.fillStyle = INK;
  for (const ex of [4.5, 11]) { ctx.beginPath(); ctx.ellipse(ex, hy + 1, 1.9, 2.8, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const ex of [5.2, 11.7]) { ctx.beginPath(); ctx.arc(ex, hy - 0.2, 0.8, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,110,110,.45)'; ctx.beginPath(); ctx.ellipse(10, hy + 7, 3.4, 2.2, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(8, hy + 6, 3, 0.25, 2.2); ctx.stroke();
  if (p.mustache) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(8, hy + 5, 6, 2.4, 0.05, 0, 7); ctx.fill(); }
  if (p.beard) {
    ctx.beginPath(); ctx.arc(1, hy + 2, 16.4, 0.15, Math.PI - 0.15); ctx.lineTo(-10, hy + 4); ctx.closePath(); ctx.fillStyle = p.hair; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(8, hy + 6, 2.5, 0.2, 2.2); ctx.stroke();
  }
  // hair / hats
  hair(ctx, p, hy);

  // front arm
  arm(ctx, p, 1, sw, bob, lift, seated, top, skin);

  if (p.tray) {
    ctx.save(); ctx.translate(16, -52 + bob);
    ctx.beginPath(); ctx.ellipse(8, 2, 18, 4, 0, 0, 7); paint(ctx, '#e8e2d6', 2);
    for (const cx of [2, 14]) { rrect(ctx, cx - 4, -8, 8, 8, 2); paint(ctx, '#fff', 1.4); }
    ctx.restore();
  }
  if (p.bag) { // hand basket
    ctx.save(); ctx.translate(14, -20 + bob);
    ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI, 0); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    rrect(ctx, -9, -2, 18, 12, 3); paint(ctx, '#c9843a', 1.8);
    ctx.restore();
  }
  ctx.restore();
}

function arm(ctx, p, side, sw, bob, lift, seated, top, skin) {
  ctx.save();
  ctx.translate(side * 2, -58 + bob + lift);
  let ang;
  if (seated) ang = -1.25 - (side > 0 ? 0.15 : 0);
  else if (p.tray && side > 0) ang = -1.2;
  else if (p.bag && side > 0) ang = 0.15;
  else ang = sw * -side * 0.7;
  ctx.rotate(ang);
  rrect(ctx, -4, 0, 8, 22, 4); paint(ctx, side < 0 ? shade(top) : top, 2);
  ctx.beginPath(); ctx.arc(0, 23, 4.6, 0, 7); paint(ctx, skin, 1.8);
  ctx.restore();
}

function hair(ctx, p, hy) {
  const c = p.hair ?? '#4a2a18';
  switch (p.hairStyle) {
    case 'hat': { // straw hat
      ctx.beginPath(); ctx.ellipse(0, hy - 9, 27, 7.5, 0, 0, 7); paint(ctx, '#e8c775', 2.2);
      ctx.beginPath(); ctx.arc(0, hy - 10, 15, Math.PI, 0); ctx.closePath(); paint(ctx, '#f1d58a', 2.2);
      ctx.fillStyle = '#d6382e'; ctx.fillRect(-15, hy - 15, 30, 5);
      break;
    }
    case 'maid': {
      fringe(ctx, c, hy);
      ctx.beginPath(); ctx.ellipse(0, hy - 13, 15, 6, 0, 0, 7); paint(ctx, '#fffaf0', 2);
      ctx.beginPath(); ctx.arc(-9, hy - 14, 4, 0, 7); ctx.arc(9, hy - 14, 4, 0, 7); ctx.fillStyle = '#fffaf0'; ctx.fill();
      break;
    }
    case 'cap': {
      fringe(ctx, c, hy);
      ctx.beginPath(); ctx.arc(0, hy - 4, 17, Math.PI, 0); ctx.closePath(); paint(ctx, p.cap ?? '#c93a2e', 2.2);
      rrect(ctx, 6, hy - 8, 20, 5, 2.5); paint(ctx, p.cap ?? '#c93a2e', 2);
      break;
    }
    case 'bun': fringe(ctx, c, hy); ctx.beginPath(); ctx.arc(-10, hy - 17, 8, 0, 7); paint(ctx, c, 2.2); break;
    default: fringe(ctx, c, hy);
  }
}
function fringe(ctx, c, hy) {
  ctx.beginPath();
  ctx.arc(0, hy, 17, Math.PI * 0.98, Math.PI * 2.04);
  ctx.quadraticCurveTo(12, hy - 8, 5, hy - 9);
  ctx.quadraticCurveTo(-4, hy - 4, -13, hy - 3);
  ctx.closePath();
  paint(ctx, c, 2.2);
}

function shade(c) { return mixHex(c, '#000000', 0.22); }
function lighten(c) { return mixHex(c, '#ffffff', 0.18); }
function mixHex(a, b, f) {
  const p = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const m = (i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * f).toString(16).padStart(2, '0');
  return `#${m(1)}${m(3)}${m(5)}`;
}
