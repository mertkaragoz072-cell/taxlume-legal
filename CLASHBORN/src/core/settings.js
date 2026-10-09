// Oyuncu ayarları (cihaz başına, localStorage 'nexora_settings_v1'): titreşim, ekran sarsıntısı, sol el düzeni, büyük düğmeler, renk körü modu, düşük efekt, müzik/efekt, öğretici durumu.
// apply() sınıfları #game üzerine koyar (CSS) ve ilgili sistemlere (ses, çözünürlük) iletir. haptic(ms|[desen]) titreşim ayarına saygı duyar.
import { View } from './view.js';
import { Audio } from './audio.js';

const KEY = 'nexora_settings_v1';
const DEF = { vibration: true, shake: 1, lefty: false, bigButtons: false, colorblind: false, lowFx: false, music: true, sfx: true, tutorialDone: false };
let S = { ...DEF };
try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && typeof raw === 'object') for (const k of Object.keys(DEF)) if (typeof raw[k] === typeof DEF[k]) S[k] = raw[k]; } catch (_) { /* bozuk ayar → varsayılan */ }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* yoksay */ } };
export const Settings = {
  get: (k) => S[k],
  all: () => ({ ...S }),
  set(k, v) { if (!(k in DEF)) return; S[k] = v; save(); this.apply(); },
  reset() { const done = S.tutorialDone; S = { ...DEF, tutorialDone: done }; save(); this.apply(); },
  apply() {
    const g = document.getElementById('game'); if (g) { g.classList.toggle('lefty', S.lefty); g.classList.toggle('big', S.bigButtons); g.classList.toggle('cb', S.colorblind); g.classList.toggle('lowfx', S.lowFx); }
    Audio.setChannels?.(S.music, S.sfx);
    const cap = S.lowFx ? Math.min(View.dprCap, 1.5) : Math.max(View.dprCap, 3);        // düşük efekt: çözünürlük ≤ 1.5×; kapanınca üst sınır geri (yavaş cihazda uyarlanabilir çözünürlük yine düşürür)
    if (cap !== View.dprCap) { View.dprCap = cap; window.dispatchEvent(new Event('resize')); }
  },
};
export const shakeScale = () => S.shake;
export function haptic(p) { if (S.vibration && navigator.vibrate) { try { navigator.vibrate(p); } catch (_) { /* yoksay */ } } }
