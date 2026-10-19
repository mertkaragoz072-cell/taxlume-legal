// Settings panel: sound effects, music, vibration, and a progress reset that always asks for confirmation first.
import { vibrationSupported } from '../audio/haptics.js';

export function createSettingsPanel(root, settings, { onReset, onChanged }) {
  let open = false, confirming = false;
  const supportsVibration = vibrationSupported();

  const row = (key, icon, label, enabled = true, note = '') => `<div class="card setting">
    <div class="ci">${icon}</div>
    <div class="cm"><div class="ct"><b>${label}</b></div>${note ? `<div class="meta muted">${note}</div>` : ''}</div>
    <button class="go toggle ${settings.values[key] ? 'on' : 'off'}" data-setting="${key}" role="switch" aria-checked="${settings.values[key]}" ${enabled ? '' : 'disabled'}>${settings.values[key] ? 'Açık' : 'Kapalı'}</button>
  </div>`;

  function render() {
    if (!open) return;
    root.hidden = false;
    root.innerHTML = `<div class="panel-head"><b>Ayarlar</b><button class="x" aria-label="Kapat">✕</button></div>
      <div class="panel-body">
        ${row('sfx', '🔊', 'Ses efektleri')}
        ${row('music', '🎵', 'Müzik')}
        ${row('vibration', '📳', 'Titreşim', supportsVibration, supportsVibration ? '' : 'Bu cihaz titreşimi desteklemiyor')}
        <div class="card danger">
          ${confirming
            ? `<div class="cm"><div class="ct"><b>Emin misin?</b></div><div class="meta">Tüm ilerleme (altın, elmas, stok, görevler, geliştirmeler, günlük ödül) silinir. Eski kayıt yedeklenir. Ayarların değişmez.</div></div>
               <div class="btns"><button class="go lack" data-reset-confirm>Evet, sıfırla</button><button class="go alt" data-reset-cancel>Vazgeç</button></div>`
            : `<div class="cm"><div class="ct"><b>İlerlemeyi sıfırla</b></div><div class="meta muted">Oyuna baştan başlar. Önce onay istenir.</div></div>
               <button class="go lack" data-reset-ask>Sıfırla…</button>`}
        </div>
      </div>`;
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { api.close(); return; }
    const t = e.target.closest('[data-setting]');
    if (t) { if (!t.disabled) { settings.toggle(t.dataset.setting); onChanged?.(t.dataset.setting); render(); } return; }
    if (e.target.closest('[data-reset-ask]')) { confirming = true; render(); return; }
    if (e.target.closest('[data-reset-cancel]')) { confirming = false; render(); return; }
    if (e.target.closest('[data-reset-confirm]')) { confirming = false; onReset(); render(); }     // only this button resets
  });

  const api = {
    get isOpen() { return open; },
    open() { open = true; confirming = false; render(); },
    close() { open = false; confirming = false; root.hidden = true; root.innerHTML = ''; },
    toggle() { open ? api.close() : api.open(); },
  };
  return api;
}
