// İlk oyun öğreticisi: 4 kısa ipucu (otomatik savaş → kaçınma → yetenekler → çanta). Oyunu durdurmaz; dokunarak geçilir; kaçınma kullanılınca 2. adım biter.
// Bittiğinde Settings.tutorialDone = true (Ayarlar'dan yeniden gösterilebilir).
import { Settings } from '../core/settings.js';
import { state } from '../game/state.js';

const STEPS = [
  { text: '⚔️ Savaşçın <b>otomatik koşar ve saldırır</b>.', ms: 3800 },
  { text: '🟢 Kırmızı uyarı belirince <b>KAÇIN</b> düğmesine bas (Shift / K). Doğru zamanda basarsan hasar almazsın ve ödül kazanırsın!', target: 'btn-dodge', ms: 11000, until: 'dodge' },
  { text: '⭐ ⚡ <b>Yetenekler</b>: bekleme dolunca kullan (Q / E).', target: ['btn-skill1', 'btn-skill2'], ms: 4500 },
  { text: '🎒 Çanta: <b>görevler, mağaza</b> ve ayarlar burada.', target: 'btn-bag', ms: 4000 },
];
let el, i = -1, timer = null, running = false;
const targets = (s) => (s?.target ? [].concat(s.target).map((id) => document.getElementById(id)).filter(Boolean) : []);
function clear() { for (const t of targets(STEPS[i])) t.classList.remove('hint-pulse'); clearTimeout(timer); }
function show() {
  const s = STEPS[i]; if (!s) { running = false; el.classList.add('hidden'); Settings.set('tutorialDone', true); return; }
  el.innerHTML = s.text + '<small>dokun: geç</small>'; el.classList.remove('hidden'); for (const t of targets(s)) t.classList.add('hint-pulse');
  const wait = () => { if (state.paused || state.userPause || state.over) { timer = setTimeout(wait, 400); return; } timer = setTimeout(next, s.ms); }; wait();
}
function next() { clear(); i++; show(); }
export function startTutorial() {
  if (Settings.get('tutorialDone') || running) return; running = true; el = document.getElementById('hint'); i = 0;
  el.onpointerdown = (e) => { e.stopPropagation(); next(); };
  setTimeout(show, 1500);
}
export function tutorialDodgeUsed() { if (running && STEPS[i]?.until === 'dodge') next(); }
export function restartTutorial() { Settings.set('tutorialDone', false); running = false; startTutorial(); }
