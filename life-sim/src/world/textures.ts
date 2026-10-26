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
