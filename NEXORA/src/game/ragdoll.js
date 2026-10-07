// Kadın savaşçı ölüm fiziği (ragdoll): gövde (dönen katı cisim), iki bacak (menteşeli sarkaç) ve kılıç (ayrı katı cisim) gerçek yerçekimi,
// zeminle temas (dışbükey kabuk), sekme ve sürtünmeyle simüle edilir → düşüş, sekme ve yatış kodlanmış hareket değil fizikten çıkar.
// Koordinatlar: şerit orijini = ayakların zemine bastığı nokta, x ileri (kahraman sağa bakar), y AŞAĞI (ekran), zemin y=0. Birim = dünya birimi.
import { CONFIG } from '../core/config.js';
import { groundDust } from './fx.js';
import { state } from './state.js';

// Render tarafı (characters.js) görsel katmanlardan hesaplanan gövde kabuğunu buraya koyar
export let HULL = null; export const setHull = (h) => { HULL = h; };
export const GRAV = 1250, REST = 0.28, MU = 0.7;
const rot = (r, x, y) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };

// Tek temas noktası çözümü (gövde veya kılıç). b: {x,y (kütle merkezi), r, vx, vy, w, I, pts:[[lx,ly] KM'ye göre yerel]}
function solve(b, onImpact) {
  b.touch = false;
  for (let it = 0; it < 3; it++) {
    let worst = null, wy = 0;
    for (const [px, py] of b.pts) { const [rx, ry] = rot(b.r, px, py); if (b.y + ry > wy) { wy = b.y + ry; worst = [rx, ry]; } }
    if (!worst) return;
    const [rx, ry] = worst;
    if (wy > 0) b.touch = true;
    b.y -= wy;                                                    // penetrasyonu düzelt (zemin y=0)
    const vpx = b.vx - b.w * ry, vpy = b.vy + b.w * rx;           // temas noktası hızı
    if (vpy > 0) {                                                // zemine doğru gidiyor
      const e = vpy > 60 ? REST : 0;
      const jn = (1 + e) * vpy / (1 + rx * rx / b.I);
      b.vy -= jn; b.w -= rx * jn / b.I;                           // ω += (r × F)/I , F = (0,-jn) → r×F = -rx·jn
      const jt = Math.max(-MU * jn, Math.min(MU * jn, -vpx / (1 + ry * ry / b.I)));   // sürtünme
      b.vx += jt; b.w += -ry * jt / b.I;
      if (jn > 70 && onImpact) onImpact(b.x + rx, jn);
    }
  }
}

function integrate(b, dt) {
  b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.w * dt;
}

// h: { pts (gövde kabuğu, ayak orijinine göre birim), com:[x,y], hipB:[x,y], hipF:[x,y], legLen, swordPts (KM'ye göre), swordCom (ayak orijinine göre), swordA0 (doğal açı) }
export function startRagdoll(p, h) {
  const k = 42;
  p.rag = {
    h, t: 0, rest: 0, done: false,
    body: { x: h.com[0], y: h.com[1], r: 0, vx: -215, vy: -290, w: -4.5, I: k * k, pts: h.pts.map(([x, y]) => [x - h.com[0], y - h.com[1]]) },
    legB: { a: 0.2, w: 0 }, legF: { a: -0.15, w: 0 }, hair: { a: 0, w: 0 },                // dünya açısı (0 = aşağı sarkar), ayak-kalça menteşesi
    sword: null, impacts: 0,
  };
  const R = p.rag, B = R.body;
  // kılıç: gövdenin eliyle birlikte fırlar
  const sx = h.swordCom[0] - h.com[0], sy = h.swordCom[1] - h.com[1], [rx, ry] = rot(0, sx, sy);
  R.sword = { x: B.x + rx, y: B.y + ry, r: 0, vx: 150, vy: -180, w: 6.5, I: 20 * 20, pts: h.swordPts };
}

export function stepRagdoll(p, dt, R2) {
  const R = p.rag; if (!R || R.done) return;
  const h = R.h, onImpact = (xr, j) => {
    R.impacts++;
    groundDust(p.a + xr / R2, Math.min(24, Math.round(8 + j / 18)), Math.min(200, 60 + j * 0.5));
    if (j > 160) state.shake = Math.max(state.shake, 6);
  };
  R.t += dt;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));                // alt adımlar (sağlam temas)
  const sdt = dt / n;
  for (let i = 0; i < n; i++) {
    const B = R.body;
    integrate(B, sdt); solve(B, onImpact);
    // menteşeli parçalar (bacaklar + saç): menteşenin dünya konumu, sarkaç (yerçekimi + gövde ivmesi), mafsal sınırı, zemin
    for (const [leg, hip, L, b0, lim] of [[R.legB, h.hipB, h.legLen, Math.PI / 2, 1.15], [R.legF, h.hipF, h.legLen, Math.PI / 2, 1.15], [R.hair, h.hinge, h.hairLen, h.hairB0, 1.5]]) {
      const [hx, hy] = rot(B.r, hip[0] - h.com[0], hip[1] - h.com[1]);
      const hipY = B.y + hy, beta = b0 + leg.a;
      const alpha = (GRAV / L) * Math.cos(beta) * (leg === R.hair ? 0.35 : 0.55) - leg.w * (leg === R.hair ? 4.5 : 3.2) - B.w * 0.9;
      leg.w += alpha * sdt; leg.a += leg.w * sdt;
      const rel = leg.a - B.r;
      if (rel > lim) { leg.a = B.r + lim; leg.w = Math.min(leg.w, B.w); } else if (rel < -lim) { leg.a = B.r - lim; leg.w = Math.max(leg.w, B.w); }
      const bt = b0 + leg.a, tipY = hipY + L * Math.sin(bt);
      if (tipY > 0) {                                               // ucu zemini geçmesin: zemine teğet iki çözümden en yakını
        const v = Math.asin(Math.max(-1, Math.min(1, -hipY / L))), c1 = v, c2 = Math.PI - v, d = (x) => Math.abs(Math.atan2(Math.sin(x - bt), Math.cos(x - bt)));
        leg.a = (d(c1) < d(c2) ? c1 : c2) - b0; leg.w *= 0.2;
      }
    }
    const S = R.sword; integrate(S, sdt); solve(S, onImpact);
  }
  const B = R.body, S = R.sword;
  const calm = Math.hypot(B.vx, B.vy) < 14 && Math.abs(B.w) < 0.35 && Math.hypot(S.vx, S.vy) < 14 && Math.abs(S.w) < 0.6;
  if (calm) { R.rest += dt; if (R.rest > 0.25) { B.vx = B.vy = B.w = S.vx = S.vy = S.w = 0; R.legB.w = R.legF.w = R.hair.w = 0; R.done = true; } } else R.rest = 0;
  // zemin sürtünmesi (kayma): yerde sürekli temas halinde hız sönümü
  if (B.touch) { B.vx *= Math.pow(0.004, dt); B.w *= Math.pow(0.08, dt); }
  if (S.touch) { S.vx *= Math.pow(0.01, dt); S.w *= Math.pow(0.06, dt); }
}
