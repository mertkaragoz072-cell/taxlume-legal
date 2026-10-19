// Procedural chibi-style people (placeholder art). Feet sit at (x, y); the figure faces +x and is mirrored by `dir`.
// Each person is described by a plain options object so the crowd can give everyone a distinct look.
import { INK, rrect, paint, shadow, vgrad, hgrad, lighten, darken } from '../util.js';

export const SKINS = ['#f8d7b4', '#ecbc90', '#d89f72', '#b9784e'];

export function drawPerson(ctx, x, y, p, t = 0) {
  const sc = p.scale ?? 1, dir = p.dir ?? 1;
  const skin = p.skin ?? SKINS[0], top = p.top ?? '#4a7fc1', pants = p.pants ?? '#3d4a63', hairC = p.hair ?? '#4a2a18';
  const walking = !!p.walking, seated = !!p.seated;
  const ph = walking ? t * (p.step ?? 7) + (p.phase ?? 0) : 0;
  const sw = walking ? Math.sin(ph) : 0;
  const breathe = Math.sin(t * 2.1 + (p.phase ?? 0)) * 0.7;
  const bob = walking ? -Math.abs(Math.cos(ph)) * 2.6 : breathe;
  const lift = seated ? 10 : 0;
  const blink = ((t * 0.6 + (p.phase ?? 0) * 0.37) % 3) > 2.9;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc * dir, sc);
  if (!p.seatedBehind) shadow(ctx, 1, 1, 18, 5, 0.32);

  const hy = -85 + bob + lift;

  // ---- things behind the body
  if (p.backpack) backpack(ctx, p.backpack, lift, bob);
  backHair(ctx, p, hairC, hy);

  // ---- legs
  if (!p.seatedBehind) {
    if (seated) {
      for (const [dx, c] of [[-2, darken(pants, 0.2)], [3, pants]]) {
        rrect(ctx, dx - 5, -34 + lift, 27, 11, 5); paint(ctx, vgrad(ctx, -34 + lift, -23 + lift, [[0, lighten(c, 0.1)], [1, darken(c, 0.12)]]), 2);
        rrect(ctx, dx + 13, -30 + lift, 10, 30 - lift, 4.5); paint(ctx, c, 2);
        shoe(ctx, dx + 19, -3, p.shoe ?? '#3a2a22');
      }
    } else {
      for (const d of [-1, 1]) leg(ctx, d, sw, bob, d < 0 ? darken(pants, 0.22) : pants, p.shoe ?? '#3a2a22', p);
    }
  }

  arm(ctx, p, -1, sw, bob, lift, seated, top, skin);

  // ---- torso & outfit
  torso(ctx, p, top, lift, bob);

  // neck + head
  rrect(ctx, -4.5, hy + 12, 9, 10, 3); paint(ctx, darken(skin, 0.1), 1.6);
  ctx.beginPath(); ctx.arc(-14.5, hy + 3, 3.6, 0, 7); paint(ctx, darken(skin, 0.05), 1.8); // ear
  ctx.beginPath(); ctx.arc(0, hy, 17, 0, 7);
  const hg = ctx.createRadialGradient(5, hy - 6, 2, 0, hy, 19);
  hg.addColorStop(0, lighten(skin, 0.22)); hg.addColorStop(0.7, skin); hg.addColorStop(1, darken(skin, 0.1));
  paint(ctx, hg, 2.4);
  face(ctx, p, hy, blink, hairC, skin);
  frontHair(ctx, p, hairC, hy);

  arm(ctx, p, 1, sw, bob, lift, seated, top, skin);

  if (p.tray) {
    ctx.save(); ctx.translate(15, -62 + bob);
    ctx.beginPath(); ctx.ellipse(9, 3, 19, 4.4, 0, 0, 7); paint(ctx, vgrad(ctx, -1, 8, [[0, '#f4efe4'], [1, '#bdb5a6']]), 2);
    for (const cx of [2, 15]) { rrect(ctx, cx - 4.5, -8, 9, 9, 2.5); paint(ctx, '#fff', 1.4); ctx.fillStyle = '#7a4320'; ctx.fillRect(cx - 3.5, -7, 7, 2); }
    ctx.restore();
  }
  if (p.bag) { // hand basket with a flower
    ctx.save(); ctx.translate(15, -19 + bob);
    ctx.beginPath(); ctx.arc(0, -3, 9, Math.PI, 0); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    rrect(ctx, -10, -3, 20, 13, 3.5); paint(ctx, vgrad(ctx, -3, 10, [[0, '#d99a4a'], [1, '#a8682a']]), 1.8);
    ctx.strokeStyle = 'rgba(70,35,10,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(9, 3); ctx.stroke();
    ctx.beginPath(); ctx.arc(-3, -5, 3.2, 0, 7); paint(ctx, '#ff7a9a', 1.2); ctx.beginPath(); ctx.arc(3, -6, 3.2, 0, 7); paint(ctx, '#ffd34d', 1.2);
    ctx.restore();
  }
  if (p.paperBag) { // paper bag with baguettes
    ctx.save(); ctx.translate(15, -22 + bob);
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-9, -30); ctx.stroke();
    ctx.strokeStyle = '#e0a04a'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-9, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(11, -8); ctx.lineTo(9, 14); ctx.lineTo(-7, 14); ctx.closePath(); paint(ctx, vgrad(ctx, -8, 14, [[0, '#efe0b8'], [1, '#c8aa72']]), 1.8);
    ctx.fillStyle = '#c93a2e'; ctx.beginPath(); ctx.arc(1, 3, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ parts
function leg(ctx, d, sw, bob, c, shoeC, p) {
  ctx.save();
  ctx.translate(d * 3, -36 + bob);
  const a = sw * d * 0.6;
  ctx.rotate(a);
  rrect(ctx, -5.5, -2, 11, 20, 5); paint(ctx, hgrad(ctx, -5.5, 5.5, [[0, lighten(c, 0.1)], [1, darken(c, 0.12)]]), 2);
  ctx.translate(0, 17);
  ctx.rotate(Math.max(0, a) * 0.9);
  rrect(ctx, -4.8, -1, 9.6, 19, 4.5); paint(ctx, hgrad(ctx, -4.8, 4.8, [[0, lighten(c, 0.06)], [1, darken(c, 0.15)]]), 2);
  if (p.socks) { ctx.fillStyle = p.socks; ctx.fillRect(-4.2, 11, 8.4, 5); }
  shoe(ctx, 3, 17, shoeC);
  ctx.restore();
}

function shoe(ctx, x, y, c) {
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 3, y - 3); ctx.quadraticCurveTo(x + 13, y - 2, x + 13, y + 3.5); ctx.lineTo(x - 6, y + 3.5); ctx.closePath();
  paint(ctx, vgrad(ctx, y - 3, y + 4, [[0, lighten(c, 0.15)], [1, darken(c, 0.1)]]), 1.9);
  ctx.fillStyle = '#f2ead8'; ctx.fillRect(x - 6, y + 2, 19, 2);
}

function arm(ctx, p, side, sw, bob, lift, seated, top, skin) {
  ctx.save();
  ctx.translate(side * 2, -64 + bob + lift);
  let ang;
  if (seated) ang = -1.2 - (side > 0 ? 0.2 : 0);
  else if ((p.tray || p.paperBag) && side > 0) ang = p.tray ? -1.25 : 0.1;
  else if (p.bag && side > 0) ang = 0.12;
  else ang = sw * -side * 0.75;
  ctx.rotate(ang);
  const sleeve = side < 0 ? darken(top, 0.18) : top;
  rrect(ctx, -4.6, -2, 9.2, 24, 4.6); paint(ctx, hgrad(ctx, -4.6, 4.6, [[0, lighten(sleeve, 0.1)], [1, darken(sleeve, 0.12)]]), 2);
  if (p.rolled) { ctx.fillStyle = skin; ctx.fillRect(-4, 11, 8, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(-4.6, 11, 9.2, 11); }
  ctx.fillStyle = p.cuff ?? lighten(sleeve, 0.35); ctx.fillRect(-4.6, 19, 9.2, 3);
  ctx.beginPath(); ctx.arc(0, 25, 4.8, 0, 7); paint(ctx, skin, 1.8);
  ctx.restore();
}

function torso(ctx, p, top, lift, bob) {
  const y0 = -69 + bob + lift, h = 36;
  if (p.dress) { // skirt
    ctx.beginPath(); ctx.moveTo(-13, -40 + lift); ctx.lineTo(13, -40 + lift); ctx.quadraticCurveTo(22, -26 + lift, 20, -17 + lift); ctx.lineTo(-20, -17 + lift); ctx.quadraticCurveTo(-22, -26 + lift, -13, -40 + lift);
    paint(ctx, vgrad(ctx, -40, -17, [[0, lighten(p.dress, 0.12)], [1, darken(p.dress, 0.16)]]), 2.2);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1.4;
    for (const dx of [-9, -3, 4, 10]) { ctx.beginPath(); ctx.moveTo(dx * 0.7, -38 + lift); ctx.lineTo(dx * 1.4, -19 + lift); ctx.stroke(); }
  }
  ctx.save();
  rrect(ctx, -13.5, y0, 27, h, 11);
  paint(ctx, vgrad(ctx, y0, y0 + h, [[0, lighten(top, 0.16)], [0.6, top], [1, darken(top, 0.14)]]), 2.4);
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, -13, 14, [[0, 'rgba(255,255,255,.1)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(20,10,0,.22)']]);
  ctx.fillRect(-14, y0, 28, h);
  if (p.under) { // shirt visible through an open jacket / vest
    ctx.beginPath(); ctx.moveTo(-5, y0); ctx.lineTo(5, y0); ctx.lineTo(7, y0 + h); ctx.lineTo(-7, y0 + h); ctx.closePath(); paint(ctx, p.under, 1.4, 'rgba(30,10,0,.6)');
  }
  if (p.stripes) {
    ctx.strokeStyle = p.stripes; ctx.lineWidth = 2.4;
    for (let yy = y0 + 6; yy < y0 + h; yy += 7) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(14, yy); ctx.stroke(); }
  }
  if (p.apron) {
    ctx.beginPath(); ctx.moveTo(-8, y0 + 8); ctx.lineTo(8, y0 + 8); ctx.lineTo(11, y0 + h); ctx.lineTo(-11, y0 + h); ctx.closePath();
    paint(ctx, vgrad(ctx, y0, y0 + h, [[0, '#ffffff'], [1, p.apron === true ? '#e6dfd0' : darken(p.apron, 0.1)]]), 1.8);
    if (p.apron === true) { ctx.fillStyle = '#d6382e'; ctx.fillRect(-4, y0 + 17, 8, 3); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, y0 + 8); ctx.lineTo(-11, y0 + 1); ctx.moveTo(8, y0 + 8); ctx.lineTo(11, y0 + 1); ctx.stroke();
  }
  if (p.zip) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, y0 + 3); ctx.lineTo(0, y0 + h); ctx.stroke(); }
  if (p.buttons) { ctx.fillStyle = p.buttons; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, y0 + 10 + i * 8, 1.6, 0, 7); ctx.fill(); } }
  if (p.belt) { ctx.fillStyle = p.belt; ctx.fillRect(-14, y0 + h - 7, 28, 5); ctx.fillStyle = '#e8c46a'; ctx.fillRect(-2, y0 + h - 7, 4, 5); }
  // soft crease lines
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-8, y0 + 22); ctx.quadraticCurveTo(-3, y0 + 25, 2, y0 + 23); ctx.stroke();
  ctx.restore();
  if (p.collar) { // collar
    ctx.beginPath(); ctx.moveTo(-7, y0 + 1); ctx.lineTo(0, y0 + 9); ctx.lineTo(7, y0 + 1); ctx.lineTo(4, y0 - 1); ctx.lineTo(0, y0 + 3); ctx.lineTo(-4, y0 - 1); ctx.closePath(); paint(ctx, p.collar, 1.6);
  }
  if (p.scarf) { rrect(ctx, -10, y0 - 2, 20, 7, 3.5); paint(ctx, p.scarf, 1.8); }
}

function backpack(ctx, c, lift, bob) {
  rrect(ctx, -28, -70 + lift + bob, 18, 32, 7); paint(ctx, hgrad(ctx, -28, -10, [[0, lighten(c, 0.12)], [1, darken(c, 0.2)]]), 2.2);
  rrect(ctx, -26, -55 + lift + bob, 13, 11, 3.5); paint(ctx, darken(c, 0.15), 1.5);
  ctx.fillStyle = '#e8c46a'; ctx.fillRect(-21, -52 + lift + bob, 4, 2.5);
  ctx.strokeStyle = darken(c, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -66 + lift + bob); ctx.quadraticCurveTo(-4, -58 + lift + bob, -9, -44 + lift + bob); ctx.stroke();
}

function face(ctx, p, hy, blink, hairC, skin) {
  const eyeC = p.eye ?? '#3a2a22';
  for (const ex of [4.5, 12.5]) {
    if (blink) { ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 2.6, hy + 1.5); ctx.quadraticCurveTo(ex, hy + 3.4, ex + 2.6, hy + 1.5); ctx.stroke(); continue; }
    ctx.beginPath(); ctx.ellipse(ex, hy + 1, 3.4, 4.3, 0, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 0.6, hy + 1.4, 2.5, 3.6, 0, 0, 7); ctx.fillStyle = eyeC; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 0.6, hy + 2, 1.3, 1.9, 0, 0, 7); ctx.fillStyle = '#120a06'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 0.4, hy - 0.4, 1.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 1.6, hy + 3.2, 0.6, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(ex, hy + 1, 4.2, Math.PI * 1.08, Math.PI * 1.95); ctx.stroke();
    if (p.lashes) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex + 3.6, hy - 1.5); ctx.lineTo(ex + 5.6, hy - 2.8); ctx.stroke(); }
  }
  // brows
  ctx.strokeStyle = darken(p.browC ?? hairC, 0.15); ctx.lineWidth = 1.9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(1.5, hy - 6.5); ctx.quadraticCurveTo(5, hy - 8.6, 8, hy - 6.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, hy - 6.8); ctx.quadraticCurveTo(13, hy - 8.8, 16, hy - 6.6); ctx.stroke();
  // nose, blush, mouth
  ctx.strokeStyle = darken(skin, 0.28); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(14.5, hy + 4.6); ctx.quadraticCurveTo(16.6, hy + 6.2, 14.2, hy + 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,105,105,.38)'; ctx.beginPath(); ctx.ellipse(7, hy + 8.4, 3.6, 2.2, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(10, hy + 9.6, 3.2, 0.2, 2.5); ctx.stroke();
  if (p.mustache) { ctx.fillStyle = darken(p.mustacheC ?? hairC, 0.05); ctx.beginPath(); ctx.moveTo(14.5, hy + 7); ctx.quadraticCurveTo(10, hy + 5.4, 5, hy + 8); ctx.quadraticCurveTo(10, hy + 10.6, 14.5, hy + 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
  if (p.beard) {
    ctx.beginPath(); ctx.moveTo(-13, hy + 2); ctx.quadraticCurveTo(-8, hy + 24, 5, hy + 22); ctx.quadraticCurveTo(15, hy + 20, 17, hy + 6); ctx.quadraticCurveTo(10, hy + 12, 4, hy + 11); ctx.quadraticCurveTo(-6, hy + 12, -13, hy + 2);
    ctx.fillStyle = hairC; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(10, hy + 12, 2.6, 0.2, 2.5); ctx.stroke();
  }
  if (p.glasses) {
    ctx.strokeStyle = '#2a1c14'; ctx.lineWidth = 1.7;
    for (const ex of [4.5, 12.5]) { ctx.beginPath(); ctx.arc(ex, hy + 1, 5, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(9.5, hy + 0.5); ctx.lineTo(7.5, hy + 0.5); ctx.moveTo(-0.5, hy + 0.5); ctx.lineTo(-15, hy - 1); ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.25)'; for (const ex of [4.5, 12.5]) { ctx.beginPath(); ctx.arc(ex, hy + 1, 4.6, 0, 7); ctx.fill(); }
  }
}

function hairShade(ctx, c, hy) { return vgrad(ctx, hy - 20, hy + 14, [[0, lighten(c, 0.22)], [0.5, c], [1, darken(c, 0.25)]]); }

function backHair(ctx, p, c, hy) {
  switch (p.hairStyle) {
    case 'long': rrect(ctx, -22, hy - 14, 26, 50, 13); paint(ctx, hairShade(ctx, c, hy + 14), 2.2); break;
    case 'bob': rrect(ctx, -21, hy - 13, 26, 32, 11); paint(ctx, hairShade(ctx, c, hy), 2.2); break;
    case 'ponytail':
      ctx.beginPath(); ctx.moveTo(-12, hy - 10); ctx.bezierCurveTo(-36, hy - 8, -34, hy + 24, -22, hy + 30); ctx.bezierCurveTo(-24, hy + 10, -16, hy + 6, -10, hy + 4); ctx.closePath();
      paint(ctx, hairShade(ctx, c, hy + 10), 2.2); break;
    case 'braid':
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-15 - i * 0.6, hy + 8 + i * 8, 5.2, 5, 0, 0, 7); paint(ctx, i % 2 ? darken(c, 0.12) : c, 1.8); }
      ctx.beginPath(); ctx.arc(-16, hy + 48, 3, 0, 7); paint(ctx, '#d6382e', 1.2); break;
    case 'bun': ctx.beginPath(); ctx.arc(-12, hy - 19, 8.5, 0, 7); paint(ctx, hairShade(ctx, c, hy - 18), 2.2); break;
    default: break;
  }
}

function frontHair(ctx, p, c, hy) {
  const cap = (extra) => {
    ctx.beginPath();
    ctx.arc(0, hy, 18, Math.PI * 0.93, Math.PI * 2.07);
    ctx.quadraticCurveTo(14, hy - 9 + (extra ?? 0), 6, hy - 10);
    ctx.quadraticCurveTo(-3, hy - 3, -15, hy - 4);
    ctx.closePath();
    paint(ctx, hairShade(ctx, c, hy), 2.4);
    ctx.strokeStyle = 'rgba(255,255,255,.34)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy, 14.5, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  };
  switch (p.hairStyle) {
    case 'hat': {
      ctx.save(); ctx.translate(0, hy - 11);
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, -0.05, 0, 7); paint(ctx, vgrad(ctx, -8, 8, [[0, '#f4dc98'], [1, '#c99a48']]), 2.4);
      ctx.beginPath(); ctx.moveTo(-16, -1); ctx.quadraticCurveTo(-15, -22, 0, -22); ctx.quadraticCurveTo(15, -22, 16, -1); ctx.closePath(); paint(ctx, vgrad(ctx, -22, 0, [[0, '#f8e5aa'], [1, '#d6aa58']]), 2.4);
      ctx.fillStyle = p.hatBand ?? '#d6382e'; ctx.fillRect(-16, -8, 32, 6);
      ctx.strokeStyle = 'rgba(120,80,20,.4)'; ctx.lineWidth = 1; for (let i = -12; i < 14; i += 5) { ctx.beginPath(); ctx.moveTo(i, -19); ctx.lineTo(i * 1.1, -2); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, hy, 17.5, Math.PI * 0.96, Math.PI * 1.1); ctx.lineTo(-10, hy - 3); ctx.fill();
      break;
    }
    case 'maid':
      cap();
      ctx.beginPath(); ctx.ellipse(-1, hy - 14, 16, 6, 0, 0, 7); paint(ctx, '#fffaf0', 2);
      for (const dx of [-10, -3, 4, 11]) { ctx.beginPath(); ctx.arc(dx, hy - 18, 3.4, 0, 7); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.fillStyle = '#d6382e'; ctx.fillRect(-14, hy - 14, 28, 2.5);
      break;
    case 'cap': { // flat cap
      cap();
      ctx.beginPath(); ctx.moveTo(-17, hy - 8); ctx.quadraticCurveTo(-8, hy - 24, 12, hy - 17); ctx.quadraticCurveTo(20, hy - 14, 24, hy - 9); ctx.lineTo(-17, hy - 8); ctx.closePath();
      paint(ctx, vgrad(ctx, hy - 24, hy - 6, [[0, lighten(p.cap ?? '#9a6a3a', 0.2)], [1, darken(p.cap ?? '#9a6a3a', 0.15)]]), 2.4);
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, hy - 19); ctx.lineTo(0, hy - 9); ctx.stroke();
      break;
    }
    case 'bald': // only side hair, shiny head
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, hy, 17.8, Math.PI * 0.8, Math.PI * 1.02); ctx.lineTo(-10, hy + 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-3, hy - 12, 5, 2.4, -0.3, 0, 7); ctx.fill();
      break;
    case 'bun': cap(2); break;
    case 'ponytail': case 'braid': case 'bob': case 'long': cap(-2); break;
    default: cap(1);
  }
}
