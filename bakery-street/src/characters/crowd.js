// The few people on the street: three strollers, the waitress, and four seated cafe guests.
import { DESIGN } from '../config.js';
import { INK, rrect, poly, paint, shadow, vgrad, hgrad, lighten, darken } from '../util.js';
import { drawPerson, SKINS } from './person.js';

const GROUND = 610; // table-set feet line

export const WALKERS = () => [
  // schoolboy: tall, backpack, blue jacket, sneakers
  { x: 120, dir: 1, speed: 34, y: DESIGN.walkY + 5, step: 8.2, phase: 0, skin: SKINS[0], hair: '#4a2a14', hairStyle: 'short', top: '#3f7fc9', under: '#f4f0e6', zip: true, pants: '#39435c', shoe: '#e8e2d6', backpack: '#2e8a5a', scale: 1.04 },
  // girl in a straw hat and sundress with a flower basket
  { x: 980, dir: -1, speed: 29, y: DESIGN.walkY - 3, step: 7.6, phase: 2, skin: SKINS[1], hair: '#6a3418', hairStyle: 'hat', top: '#fff7ea', dress: '#3f86d6', pants: '#e8d2b0', shoe: '#a8683a', lashes: true, bag: true, scale: 0.98, eye: '#5a3a1e' },
  // elderly gentleman: flat cap, vest, white moustache, baguettes in a paper bag
  { x: 1290, dir: 1, speed: 24, y: DESIGN.walkY + 1, step: 6.6, phase: 4, skin: SKINS[2], hair: '#d8d4cc', mustache: true, hairStyle: 'cap', cap: '#7a5a3a', top: '#7a8a5a', under: '#f4efe2', buttons: '#e8d8a0', pants: '#5a4a3a', shoe: '#3a2a20', paperBag: true, scale: 1.0, glasses: true },
];

export const WAITRESS = { x: 700, y: DESIGN.groundY - 2, skin: SKINS[0], hair: '#6a3420', hairStyle: 'maid', top: '#2f3a4e', pants: '#2f3a4e', apron: true, tray: true, lashes: true, collar: '#fffaf0', shoe: '#1f1a18', eye: '#3a6a4a' };

export const SHOPKEEPER = { skin: SKINS[1], hair: '#2a1a12', hairStyle: 'short', mustache: true, top: '#f4f0e6', apron: '#7a4a2a', rolled: true, pants: '#5a4a3a', seatedBehind: true, scale: 0.92, browC: '#2a1a12' };

export const CAFE_SETS = [
  { x: 470, people: [
    { off: -42, skin: SKINS[0], hair: '#2a1a12', hairStyle: 'short', top: '#e9edf2', stripes: '#7aa0d0', pants: '#3b4559', dir: 1, glasses: true },
    { off: 42, skin: SKINS[1], hair: '#8a4a22', hairStyle: 'ponytail', top: '#e9807a', buttons: '#fff', pants: '#3b4559', dir: -1, lashes: true, eye: '#3a5a3a' },
  ] },
  { x: 930, people: [
    { off: -42, skin: SKINS[0], hair: '#b86a2a', hairStyle: 'bob', top: '#5aa88a', under: '#fff', pants: '#3b4559', dir: 1, lashes: true, eye: '#3a5a8a' },
    { off: 42, skin: SKINS[3], hair: '#1a110c', hairStyle: 'short', beard: true, top: '#c9a86a', rolled: true, pants: '#3b4559', dir: -1 },
  ] },
];

export function updateWalkers(list, dt, xmin, xmax) {
  for (const w of list) {
    w.x += w.dir * w.speed * dt;
    if (w.dir > 0 && w.x > xmax + 70) w.x = xmin - 70;
    if (w.dir < 0 && w.x < xmin - 70) w.x = xmax + 70;
  }
}

export function drawWalker(ctx, w, t) { drawPerson(ctx, w.x, w.y, { ...w, walking: true }, t); }
export function drawWaitress(ctx, t) { drawPerson(ctx, WAITRESS.x, WAITRESS.y, WAITRESS, t); }

export function drawCafeSet(ctx, set, t) {
  const x = set.x, y = GROUND;
  shadow(ctx, x + 6, y + 2, 84, 9, 0.24);
  for (const p of set.people) chair(ctx, x + p.off * 1.35, y, p.dir);
  set.people.forEach((p, i) => drawPerson(ctx, x + p.off * 0.95, y - 2, { ...p, seated: true, phase: i * 2 + x * 0.01 }, t));
  table(ctx, x, y);
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - 48); ctx.lineTo(x, y - 192); ctx.stroke();
  ctx.strokeStyle = '#8a8078'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x, y - 48); ctx.lineTo(x, y - 192); ctx.stroke();
  umbrella(ctx, x, y - 188);
}

function chair(ctx, x, y, dir) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  rrect(ctx, -23, -66, 7, 66, 2.5); paint(ctx, hgrad(ctx, -23, -16, [[0, '#a8703a'], [1, '#6a4020']]), 2);
  for (const yy of [-62, -46]) { rrect(ctx, -23, yy, 21, 7, 2.5); paint(ctx, vgrad(ctx, yy, yy + 7, [[0, '#c08648'], [1, '#8a5a2c']]), 1.6); }
  rrect(ctx, -23, -27, 31, 8, 2.5); paint(ctx, vgrad(ctx, -27, -19, [[0, '#cc9250'], [1, '#8a5a2c']]), 2);
  rrect(ctx, 2, -20, 5, 20, 2); paint(ctx, '#6a4020', 1.6);
  ctx.restore();
}

function table(ctx, x, y) {
  poly(ctx, [[x - 4, y - 42], [x + 4, y - 42], [x + 6, y - 6], [x - 6, y - 6]]); paint(ctx, hgrad(ctx, x - 6, x + 6, [[0, '#6a4a30'], [1, '#3a2418']]), 2);
  ctx.beginPath(); ctx.ellipse(x, y - 4, 23, 6.5, 0, 0, 7); paint(ctx, vgrad(ctx, y - 10, y + 2, [[0, '#6a4a30'], [1, '#3a2418']]), 2);
  ctx.beginPath(); ctx.ellipse(x, y - 46, 41, 10.5, 0, 0, 7); paint(ctx, vgrad(ctx, y - 57, y - 36, [[0, '#e0aa68'], [1, '#a8743f']]), 2.4);
  ctx.fillStyle = 'rgba(255,240,200,.4)'; ctx.beginPath(); ctx.ellipse(x - 12, y - 50, 14, 2.6, -0.1, 0, 7); ctx.fill();
  for (const dx of [-15, 13]) { // cups
    ctx.beginPath(); ctx.ellipse(x + dx, y - 47, 8.5, 2.8, 0, 0, 7); paint(ctx, '#fff', 1.2);
    rrect(ctx, x + dx - 5, y - 57, 10, 10, 2.6); paint(ctx, hgrad(ctx, x + dx - 5, x + dx + 5, [[0, '#fff'], [1, '#d8d2c8']]), 1.5);
    ctx.fillStyle = '#7a4320'; ctx.fillRect(x + dx - 4, y - 56, 8, 2);
  }
  ctx.beginPath(); ctx.ellipse(x, y - 47, 6.5, 2.6, 0, 0, 7); paint(ctx, '#fff', 1.2);
  ctx.beginPath(); ctx.ellipse(x, y - 50, 4.4, 3, 0, 0, 7); paint(ctx, '#e0922f', 1.2, '#7a4417');
}

function umbrella(ctx, x, apexY) {
  const rx = 80, base = apexY + 46, n = 8;
  for (let i = 0; i < n; i++) {
    const lx = x - rx + (i / n) * rx * 2, r2 = x - rx + ((i + 1) / n) * rx * 2, c = i % 2 ? '#fff3d6' : '#d6382e';
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.quadraticCurveTo(lx + 2, apexY + 18, lx, base);
    ctx.quadraticCurveTo((lx + r2) / 2, base + 13, r2, base);
    ctx.quadraticCurveTo(r2 - 2, apexY + 18, x, apexY);
    ctx.closePath();
    // lit left side, shaded right side
    const lit = 1 - Math.abs(i / (n - 1) - 0.25) * 0.9;
    ctx.fillStyle = vgrad(ctx, apexY, base + 8, [[0, lighten(c, 0.08 * lit)], [1, darken(c, 0.12 + (i / n) * 0.2)]]); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x - rx + 6, base + 2); ctx.quadraticCurveTo(x, base + 20, x + rx - 6, base + 2); ctx.strokeStyle = 'rgba(60,20,10,.18)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, apexY - 1, 4.4, 0, 7); paint(ctx, vgrad(ctx, apexY - 5, apexY + 3, [[0, '#d9a05a'], [1, '#7a4824']]), 1.8);
}
