// Girdi: hareket YOK (kahraman otomatik sağa ilerler). Yalnızca yetenek/saldırı düğmeleri ve Q/E/Space kısayolları.
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
  axis: 1,                                   // hareket otomatik: her zaman sağa (elle yürüme yok)
  skillQueue: [],                            // yetenek düğmesi / Q,E → 'skill1' | 'skill2'
  attackQueued: false,                       // saldırı düğmesi / Space / J (otomatik saldırıya ek, elle)
  consumeAttack() { const q = this.attackQueued; this.attackQueued = false; return q; },
  init() {
    addEventListener('keydown', (e) => { if (e.repeat) return; if (e.code === 'KeyQ') this.skillQueue.push('skill1'); else if (e.code === 'KeyE') this.skillQueue.push('skill2'); else if ((e.code === 'Space' || e.code === 'KeyJ')) { this.attackQueued = true; e.preventDefault(); } });
    const gameEl = document.getElementById('game');
    gameEl.addEventListener('pointerdown', () => tryFullscreenLandscape());     // ilk dokunuşta tam ekran + yatay kilit denenir
    for (const id of ['skill1', 'skill2']) {
      const sb = document.getElementById('btn-' + id); if (!sb) continue;
      sb.addEventListener('pointerdown', (e) => { this.skillQueue.push(id); sb.classList.add('pressed'); e.preventDefault(); e.stopPropagation(); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) sb.addEventListener(ev, () => sb.classList.remove('pressed'));
    }
    const atk = document.getElementById('btn-attack');
    if (atk) atk.addEventListener('pointerdown', (e) => { this.attackQueued = true; atk.classList.add('pressed'); e.preventDefault(); e.stopPropagation(); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) atk?.addEventListener(ev, () => atk.classList.remove('pressed'));
  },
  update() {},
};
