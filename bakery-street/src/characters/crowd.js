// The few people on the street: strollers, the waitress, and the seated cafe guests.
import { DESIGN } from '../config.js';
import { INK, rrect, poly, paint, shadow, vgrad } from '../util.js';
import { drawPerson } from './person.js';

const GROUND = 610; // table-set feet line

export const WALKERS = () => [
  { x: 120, dir: 1, speed: 34, y: DESIGN.walkY + 6, step: 8.2, phase: 0, skin: '#f7d3ae', hair: '#3a2416', hairStyle: 'short', top: '#4f86c6', pants: '#3b4559', backpack: '#2e6b4f' },
  { x: 980, dir: -1, speed: 30, y: DESIGN.walkY - 4, step: 7.6, phase: 2, skin: '#f7d3ae', hair: '#7a3b1f', hairStyle: 'hat', top: '#f4f0e6', pants: '#f4f0e6', dress: '#4a7fc1', bag: true },
  { x: 1290, dir: 1, speed: 26, y: DESIGN.walkY + 2, step: 7, phase: 4, skin: '#e9b98c', hair: '#2a1a12', hairStyle: 'cap', cap: '#9a6a3a', top: '#e8e2d0', pants: '#4a4036' },
];

export const WAITRESS = { x: 700, y: DESIGN.baseY + 22, skin: '#f7d3ae', hair: '#6a3420', hairStyle: 'maid', top: '#2f3a4a', pants: '#2f3a4a', apron: true, tray: true };

export const CAFE_SETS = [
  { x: 470, people: [
    { off: -42, skin: '#f7d3ae', hair: '#2a1a12', hairStyle: 'short', top: '#eef0f2', pants: '#3b4559', dir: 1 },
    { off: 42, skin: '#f7d3ae', hair: '#7a3b1f', hairStyle: 'long', top: '#e9807a', pants: '#3b4559', dir: -1 },
  ] },
  { x: 930, people: [
    { off: -42, skin: '#f7d3ae', hair: '#7a3b1f', hairStyle: 'long', top: '#f4f0e6', pants: '#3b4559', dir: 1 },
    { off: 42, skin: '#e9b98c', hair: '#2a1a12', hairStyle: 'short', beard: true, top: '#6a96cc', pants: '#3b4559', dir: -1 },
  ] },
];

export function updateWalkers(list, dt, xmin, xmax) {
  for (const w of list) {
    w.x += w.dir * w.speed * dt;
    if (w.dir > 0 && w.x > xmax + 70) w.x = xmin - 70;
    if (w.dir < 0 && w.x < xmin - 70) w.x = xmax + 70;
  }
}

export function drawWalker(ctx, w, t) {
  drawPerson(ctx, w.x, w.y, { ...w, walking: true }, t);
}

export function drawWaitress(ctx, t) {
  drawPerson(ctx, WAITRESS.x, WAITRESS.y, WAITRESS, t);
}

export function drawCafeSet(ctx, set, t) {
  const x = set.x, y = GROUND;
  shadow(ctx, x, y + 2, 78, 9, 0.22);
  for (const p of set.people) chair(ctx, x + p.off * 1.35, y, p.dir);
  set.people.forEach((p, i) => drawPerson(ctx, x + p.off * 0.95, y - 2, { ...p, seated: true, phase: i * 2 + x }, t));
  table(ctx, x, y);
  // umbrella
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y - 48); ctx.lineTo(x, y - 192); ctx.stroke();
  umbrella(ctx, x, y - 188);
}

function chair(ctx, x, y, dir) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  rrect(ctx, -22, -64, 7, 64, 2); paint(ctx, '#8a5530', 2);          // back post
  rrect(ctx, -22, -62, 20, 6, 2); paint(ctx, '#a8743f', 1.6);
  rrect(ctx, -22, -46, 20, 6, 2); paint(ctx, '#a8743f', 1.6);
  rrect(ctx, -22, -26, 30, 7, 2); paint(ctx, '#b57d44', 2);          // seat
  rrect(ctx, 2, -20, 5, 20, 2); paint(ctx, '#8a5530', 1.6);
  ctx.restore();
}

function table(ctx, x, y) {
  ctx.beginPath(); ctx.moveTo(x - 4, y - 42); ctx.lineTo(x + 4, y - 42); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x - 6, y - 6); ctx.closePath(); paint(ctx, '#5a3a22', 2);
  ctx.beginPath(); ctx.ellipse(x, y - 4, 22, 6, 0, 0, 7); paint(ctx, '#5a3a22', 2);
  ctx.beginPath(); ctx.ellipse(x, y - 46, 40, 10, 0, 0, 7); paint(ctx, vgrad(ctx, y - 56, y - 36, [[0, '#d9a362'], [1, '#a8743f']]), 2.4);
  // cups + plate
  for (const dx of [-15, 13]) {
    rrect(ctx, x + dx - 5, y - 58, 10, 9, 2); paint(ctx, '#fffaf0', 1.5);
    ctx.beginPath(); ctx.ellipse(x + dx, y - 49, 8, 2.5, 0, 0, 7); paint(ctx, '#fff', 1.2);
  }
  ctx.beginPath(); ctx.ellipse(x, y - 47, 6, 2.5, 0, 0, 7); paint(ctx, '#fff', 1.2);
  ctx.fillStyle = '#d98a2b'; ctx.beginPath(); ctx.ellipse(x, y - 50, 4, 2.6, 0, 0, 7); ctx.fill();
}

function umbrella(ctx, x, apexY) {
  const rx = 78, base = apexY + 46, n = 8;
  for (let i = 0; i < n; i++) {
    
    // map half-ellipse base edge left→right
    const lx = x - rx + (i / n) * rx * 2, rx2 = x - rx + ((i + 1) / n) * rx * 2;
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.quadraticCurveTo(lx + 2, apexY + 18, lx, base);
    ctx.quadraticCurveTo((lx + rx2) / 2, base + 12, rx2, base);
    ctx.quadraticCurveTo(rx2 - 2, apexY + 18, x, apexY);
    ctx.closePath();
    paint(ctx, i % 2 ? '#fff3d6' : '#d6382e', 2);
  }
  ctx.beginPath(); ctx.arc(x, apexY - 1, 4, 0, 7); paint(ctx, '#7a4824', 1.8);
}
