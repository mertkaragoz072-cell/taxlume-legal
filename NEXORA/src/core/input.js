// Klavye (A/D, ←/→) + sabit sol-alt sanal joystick. Çıktı: Input.axis (-1..1)
// İlk dokunuşta tam ekran + yatay kilit denenir (Android Chrome; iOS desteklemez, PWA/paketlemede manifest/yerel ayar kullanılır).
let triedFs = false;
function tryFullscreenLandscape() {
  if (triedFs) return; triedFs = true;
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  } catch (_) { /* yoksay */ }
}

export const Input = {
  keys: {},
  axis: 0,
  skillQueue: [],                            // yetenek düğmesi / Q,E → 'skill1' | 'skill2'
  attackQueued: false,                       // saldırı düğmesi / Space / J
  consumeAttack() { const q = this.attackQueued; this.attackQueued = false; return q; },
  joy: { id: null, ox: 0, oy: 0, x: 0 },
  init() {
    const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
    addEventListener('keydown', (e) => { if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (map[e.code]) this.keys[map[e.code]] = false; });
    addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'KeyJ') && !e.repeat) { this.attackQueued = true; e.preventDefault(); } });
    addEventListener('blur', () => { this.keys = {}; });
    addEventListener('keydown', (e) => { if (e.repeat) return; if (e.code === 'KeyQ') this.skillQueue.push('skill1'); else if (e.code === 'KeyE') this.skillQueue.push('skill2'); });
    for (const id of ['skill1', 'skill2']) {
      const sb = document.getElementById('btn-' + id); if (!sb) continue;
      sb.addEventListener('pointerdown', (e) => { this.skillQueue.push(id); sb.classList.add('pressed'); e.preventDefault(); e.stopPropagation(); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) sb.addEventListener(ev, () => sb.classList.remove('pressed'));
    }
    const atk = document.getElementById('btn-attack');
    if (atk) atk.addEventListener('pointerdown', (e) => { this.attackQueued = true; atk.classList.add('pressed'); e.preventDefault(); e.stopPropagation(); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) atk?.addEventListener(ev, () => atk.classList.remove('pressed'));

    const base = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    const gameEl = document.getElementById('game');
    const maxR = 40;
    const ZONE = 0.55;                       // dokunma alanı: ekranın solu
    const setStick = (dx, dy) => { stick.style.transform = `translate(${dx}px, ${dy}px)`; };
    const center = () => { const r = base.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const drag = (e) => {
      const [cx, cy] = center();
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx *= maxR / d; dy *= maxR / d; }
      this.joy.x = dx / maxR;
      setStick(dx, dy);
    };

    gameEl.addEventListener('pointerdown', (e) => {
      tryFullscreenLandscape();
      if (e.target.closest('button') || this.joy.id !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.clientX > window.innerWidth * ZONE) return;
      this.joy.id = e.pointerId; base.classList.add('active');
      try { gameEl.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
      drag(e);
    });
    gameEl.addEventListener('pointermove', (e) => { if (e.pointerId === this.joy.id) drag(e); });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.x = 0; base.classList.remove('active'); setStick(0, 0);
    };
    gameEl.addEventListener('pointerup', end);
    gameEl.addEventListener('pointercancel', end);
  },
  update() {
    const k = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const j = Math.abs(this.joy.x) > 0.15 ? this.joy.x : 0;
    this.axis = Math.max(-1, Math.min(1, k + j));
  },
};
