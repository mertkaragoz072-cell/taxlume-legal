// Klavye (A/D, ←/→) + sanal joystick. Çıktı: Input.axis (-1..1)
export const Input = {
  keys: {},
  axis: 0,
  joy: { id: null, ox: 0, oy: 0, x: 0 },
  init() {
    const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
    addEventListener('keydown', (e) => { if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (map[e.code]) this.keys[map[e.code]] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    const base = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    const gameEl = document.getElementById('game');
    const maxR = 40;
    const setStick = (dx, dy) => { stick.style.transform = `translate(${dx}px, ${dy}px)`; };

    gameEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || this.joy.id !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY; this.joy.x = 0;
      base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
      base.classList.add('active'); setStick(0, 0);
      try { gameEl.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
    });
    gameEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx *= maxR / d; dy *= maxR / d; }
      this.joy.x = dx / maxR;
      setStick(dx, dy);
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.x = 0; base.classList.remove('active');
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
