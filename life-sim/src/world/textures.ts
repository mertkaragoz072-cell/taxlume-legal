import * as THREE from 'three';

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

/** Deterministic pseudo-noise so textures are identical on every run. */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const rubberFloor = (): THREE.CanvasTexture =>
  canvasTexture(
    512,
    512,
    (g) => {
      const r = noise(7);
      g.fillStyle = '#23262d';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5000; i++) {
        const v = 28 + r() * 22;
        g.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
        g.fillRect(r() * 512, r() * 512, 2, 2);
      }
      g.strokeStyle = '#14161b';
      g.lineWidth = 4;
      g.strokeRect(0, 0, 512, 512);
      g.strokeStyle = '#2d313a';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(256, 0);
      g.lineTo(256, 512);
      g.stroke();
    },
    [14, 6],
  );

export const wallPanels = (): THREE.CanvasTexture =>
  canvasTexture(
    512,
    512,
    (g) => {
      g.fillStyle = '#3a404c';
      g.fillRect(0, 0, 512, 512);
      const r = noise(11);
      for (let i = 0; i < 2500; i++) {
        const v = 40 + r() * 14;
        g.fillStyle = `rgb(${v},${v + 3},${v + 10})`;
        g.fillRect(r() * 512, r() * 512, 3, 3);
      }
      g.strokeStyle = '#181a20';
      g.lineWidth = 6;
      for (let y = 0; y <= 512; y += 256) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(512, y);
        g.stroke();
      }
      g.lineWidth = 4;
      for (let x = 0; x <= 512; x += 128) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, 512);
        g.stroke();
      }
    },
    [10, 3],
  );

export const mirrorTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 256, 512);
    grad.addColorStop(0, '#5d7388');
    grad.addColorStop(0.45, '#8aa2b6');
    grad.addColorStop(0.5, '#a9bccb');
    grad.addColorStop(1, '#4a5d70');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 512);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 10;
    for (const o of [-200, -60, 90]) {
      g.beginPath();
      g.moveTo(o + 220, 0);
      g.lineTo(o + 20, 512);
      g.stroke();
    }
  });

export const neonSign = (text: string, color = '#ffcf33'): THREE.CanvasTexture =>
  canvasTexture(1024, 256, (g) => {
    g.clearRect(0, 0, 1024, 256);
    g.font = '800 150px system-ui, Arial Black, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 40;
    g.fillStyle = color;
    g.fillText(text, 512, 135);
    g.shadowBlur = 8;
    g.fillStyle = '#fff6cf';
    g.fillText(text, 512, 135);
  });

/** Dusk city skyline for gym windows: gradient sky, sun glow, two building layers with lit windows. */
export const skylineTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#2c4a86');
    sky.addColorStop(0.5, '#7d6aa6');
    sky.addColorStop(0.75, '#f3a15a');
    sky.addColorStop(1, '#ffd08a');
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 512);
    const sun = g.createRadialGradient(330, 380, 4, 330, 380, 150);
    sun.addColorStop(0, 'rgba(255,240,200,0.95)');
    sun.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, 512, 512);
    const r = noise(5);
    const layer = (base: number, color: string, winColor: string, hMin: number, hMax: number) => {
      let x = -10;
      while (x < 520) {
        const w = 34 + r() * 50;
        const h = hMin + r() * (hMax - hMin);
        g.fillStyle = color;
        g.fillRect(x, base - h, w, h + 200);
        g.fillStyle = winColor;
        for (let wy = base - h + 8; wy < base - 6; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (r() > 0.55) g.fillRect(wx, wy, 5, 7);
        x += w + 2 + r() * 6;
      }
    };
    layer(430, '#3a3f66', 'rgba(255,214,140,0.55)', 60, 170);
    layer(480, '#1d2038', 'rgba(255,224,160,0.9)', 50, 190);
  });

export const gymSign = (): THREE.CanvasTexture =>
  canvasTexture(512, 384, (g) => {
    g.fillStyle = '#1b1d22';
    g.fillRect(0, 0, 512, 384);
    g.strokeStyle = '#0c0d10';
    g.lineWidth = 14;
    g.strokeRect(0, 0, 512, 384);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 78px system-ui, Arial Black, sans-serif';
    ['TRAIN', 'HARDER', 'GET', 'STRONGER'].forEach((w, i) => {
      g.fillStyle = i < 2 ? '#e9e4d6' : '#ffcf33';
      g.fillText(w, 256, 62 + i * 88);
    });
  });

/** Dark reflective tile floor with warm glow pooled in the centre. */
export const tileFloor = (): THREE.CanvasTexture =>
  canvasTexture(
    512,
    512,
    (g) => {
      const r = noise(21);
      g.fillStyle = '#2b2e36';
      g.fillRect(0, 0, 512, 512);
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const v = 40 + r() * 12;
          g.fillStyle = `rgb(${v},${v + 3},${v + 10})`;
          g.fillRect(tx * 256 + 3, ty * 256 + 3, 250, 250);
          const grad = g.createLinearGradient(tx * 256, ty * 256, tx * 256 + 256, ty * 256 + 256);
          grad.addColorStop(0, 'rgba(255,255,255,0.07)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grad;
          g.fillRect(tx * 256 + 3, ty * 256 + 3, 250, 250);
        }
      g.fillStyle = '#15171c';
      g.fillRect(0, 0, 512, 4);
      g.fillRect(0, 254, 512, 4);
      g.fillRect(0, 0, 4, 512);
      g.fillRect(254, 0, 4, 512);
    },
    [14, 10],
  );

/** Soft round shadow/glow blob used under objects for cheap grounding. */
export const blobTexture = (): THREE.CanvasTexture =>
  canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
