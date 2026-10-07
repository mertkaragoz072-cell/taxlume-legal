// İlk oyun öğreticisi: adım adım "spot ışığı" turu. Arka plan bulanıklaştırılır, anlatılan düğme/alan açık bırakılır, yanında kart (başlık, açıklama, tuş rozetleri) çıkar.
// Adımlar oyunu durdurur (state.userPause); KAÇIN adımı canlıdır — oyuncu düğmeye gerçekten basınca ilerler. Bittiğinde Settings.tutorialDone = true (Ayarlar'dan yeniden gösterilebilir).
import { Settings } from '../core/settings.js';
import { state } from '../game/state.js';

const STEPS = [
  { ic: '🌍', title: 'NEXORA\'ya hoş geldin!', text: 'Savaşçın <b>kendiliğinden koşar ve yakındaki düşmanlara saldırır</b>. Sen düğmelerle onu yönetirsin. Amaç: <b>5 dalgayı</b> geçip <b>Goblin Lordu</b>\'nu yenmek.' },
  { ic: '❤️', title: 'Can ve seviye', target: '.hud-left', text: '<b>Kırmızı çubuk</b> canın, altındaki <b>mavi çubuk</b> deneyimin. Düşmanları yendikçe seviye atlar, her seviyede <b>güç kartı</b> seçersin. Canın azalınca ekran kenarı kırmızıya döner.' },
  { ic: '🌊', title: 'Dalga sayacı', target: '#wave-box', text: 'Şu an kaçıncı dalgada olduğunu gösterir. Her dalga bitince ödül kazanırsın; <b>hasar almadan</b> bitirirsen ekstra ödül var!' },
  { ic: '🪙', title: 'Coin ve elmas', target: '.hud-right', text: '<b>Coin</b> ve <b>elmas</b> toplarsın. Bunlarla 🎒 çantadaki <b>mağazadan</b> kalıcı güçlendirmeler alır, yetenek ağacını açarsın.' },
  { ic: '⚔️', title: 'Saldırı', target: '#btn-attack', keys: ['Boşluk', 'J'], text: 'Savaşçın zaten otomatik vurur; bu düğmeyle <b>anında saldırırsın</b>. Art arda vurdukça <b>kombo</b> artar ve hasarın büyür. Canın azalınca kombo sıfırlanır.' },
  { ic: '⭐', title: 'Yıldız Patlaması', target: '#btn-skill1', keys: ['Q'], text: 'Çevrendeki düşmanlara <b>alan hasarı</b> verir. Kullandıktan sonra düğme üzerindeki sayaç dolana kadar <b>bekleme süresi</b> vardır.' },
  { ic: '⚡', title: 'Mavi Dalga', target: '#btn-skill2', keys: ['E'], text: 'Önündeki düşmanlara <b>güçlü bir dalga</b> gönderir. Kalabalık dalgalarda ve bossa karşı ideal.' },
  { ic: '💨', title: 'Kaçın!', target: '#btn-dodge', keys: ['Shift', 'K', '↓'], live: true, text: '<b>Kırmızı uyarı</b> belirince düğmeye bas: kısa süre <b>hasar almazsın</b>. Tam doğru anda basarsan <b>mükemmel kaçınma</b> olur ve ödül kazanırsın.<br><b>Şimdi dene: KAÇIN düğmesine bas!</b>' },
  { ic: '🎒', title: 'Çanta', target: '#btn-bag', keys: ['I'], text: 'Karakter istatistikleri, <b>görevler</b>, <b>mağaza</b>, yetenek ağacı ve <b>ayarlar</b> burada. Açıkken oyun durur.' },
  { ic: '🔊', title: 'Ses', target: '#btn-sound', keys: ['M'], text: 'Müzik ve efektleri tek dokunuşla açıp kapatırsın. Ayrıntılı ses ayarı Çanta → Ayarlar\'da.' },
  { ic: '🏆', title: 'Hazırsın!', text: 'Bu turu istediğin zaman <b>Çanta → Ayarlar → Öğretici</b>\'nden tekrar izleyebilirsin. İyi şanslar, savaşçı!', last: true },
];
let root, hole, card, i = -1, running = false, prevPause = false, poll = null;

function build() {
  if (root) return;
  const game = document.getElementById('game');
  root = document.createElement('div'); root.id = 'tut'; root.className = 'hidden';
  root.innerHTML = '<div class="tut-blur"></div><div class="tut-ring"></div><div class="tut-card" role="dialog" aria-live="polite"></div>';
  game.appendChild(root);
  hole = root.querySelector('.tut-ring'); card = root.querySelector('.tut-card');
  addEventListener('resize', () => running && layout());
  addEventListener('keydown', (e) => { if (!running || root.classList.contains('hidden') || e.repeat) return; if (e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); if (!STEPS[i]?.live) next(); } else if (e.code === 'Escape') finish(); });   // Enter/→ ilerler, Esc atlar
}
function rectOf(sel) { const t = sel && document.querySelector(sel); if (!t) return null; const g = document.getElementById('game').getBoundingClientRect(), r = t.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height }; }
function layout() {
  const s = STEPS[i]; if (!s) return;
  const g = document.getElementById('game').getBoundingClientRect(), W = g.width, H = g.height, r = rectOf(s.target);
  const blur = root.querySelector('.tut-blur');
  if (!r) { card.dataset.tail = ''; blur.style.clipPath = 'none'; hole.style.display = 'none'; card.style.left = '50%'; card.style.top = '50%'; card.style.transform = 'translate(-50%,-50%)'; return; }
  const p = 8, x = r.x - p, y = r.y - p, w = r.w + p * 2, h = r.h + p * 2, rad = Math.min(w, h) / 2 < 40 ? Math.min(w, h) / 2 : 18;
  const hp = `M${x + rad} ${y}h${w - 2 * rad}a${rad} ${rad} 0 0 1 ${rad} ${rad}v${h - 2 * rad}a${rad} ${rad} 0 0 1 -${rad} ${rad}h-${w - 2 * rad}a${rad} ${rad} 0 0 1 -${rad} -${rad}v-${h - 2 * rad}a${rad} ${rad} 0 0 1 ${rad} -${rad}z`;
  blur.style.clipPath = `path(evenodd,"M0 0H${W}V${H}H0Z ${hp}")`;
  Object.assign(hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: rad + 'px' });
  card.style.transform = 'none'; card.dataset.tail = '';
  const cw = Math.min(card.offsetWidth || 300, W - 20), ch = card.offsetHeight || 150, gap = 16;
  let left = x + w / 2 > W / 2 ? x - gap - cw : x + w + gap, top = y + h / 2 - ch / 2;
  if (left < 10 || left + cw > W - 10) { left = x + w / 2 - cw / 2; top = y > H / 2 ? y - gap - ch : y + h + gap; }
  left = Math.max(10, Math.min(W - cw - 10, left)); top = Math.max(16, Math.min(H - ch - 10, top));
  card.style.left = left + 'px'; card.style.top = top + 'px';
  // konuşma balonu kuyruğu hedefi gösterir
  const tcx = x + w / 2, tcy = y + h / 2, side = left + cw <= x ? 'r' : left >= x + w ? 'l' : top + ch <= y ? 'b' : 't';
  card.dataset.tail = side;
  const horiz = side === 'r' || side === 'l', off = horiz ? Math.max(22, Math.min(ch - 22, tcy - top)) : Math.max(22, Math.min(cw - 22, tcx - left));
  card.style.setProperty('--tail', off + 'px');
}
function show() {
  const s = STEPS[i]; if (!s) return finish();
  const keys = s.keys ? `<div class="tut-keys"><span>Klavye:</span>${s.keys.map((k) => `<kbd>${k}</kbd>`).join('')}</div>` : '';
  card.innerHTML = `<div class="tut-head"><canvas class="tut-av" width="72" height="72"></canvas><div class="tut-ttl"><small>${i + 1} / ${STEPS.length}</small><b>${s.title}</b></div><span class="tut-ic">${s.ic}</span></div><p></p>${keys}
    <div class="tut-prog"><i style="width:${((i + 1) / STEPS.length) * 100}%"></i></div>
    <div class="tut-btns"><button type="button" data-a="skip" class="tut-skip">${s.last ? '' : 'Atla'}</button><button type="button" data-a="next" class="tut-next">${s.last ? 'OYNA ▶' : s.live ? 'Geç' : 'İleri ▶'}</button></div><div class="tut-tail"></div>`;
  words(card.querySelector('p'), s.text);
  try { const av = document.getElementById('avatar'), c = card.querySelector('.tut-av'); if (av) c.getContext('2d').drawImage(av, 0, 0, 72, 72); } catch {}
  card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  root.classList.toggle('live', !!s.live); state.userPause = !s.live; layout(); requestAnimationFrame(layout);
}
function words(el, html) {
  const t = document.createElement('template'); t.innerHTML = html; let n = 0;
  const walk = (node) => { for (const c of [...node.childNodes]) { if (c.nodeType === 3) { const f = document.createDocumentFragment(); for (const w of c.textContent.split(/(\s+)/)) { if (!w.trim()) { f.append(w); continue; } const sp = document.createElement('span'); sp.className = 'w'; sp.style.animationDelay = (n++ * 28) + 'ms'; sp.textContent = w; f.append(sp); } c.replaceWith(f); } else if (c.nodeType === 1) walk(c); } };
  walk(t.content); el.append(t.content);
}
function next() { i++; show(); }
function finish() { running = false; clearInterval(poll); root?.classList.add('hidden'); state.userPause = prevPause; Settings.set('tutorialDone', true); }
export function startTutorial() {
  if (Settings.get('tutorialDone') || running) return; build(); running = true; i = 0; prevPause = false;
  card.onpointerdown = (e) => e.stopPropagation();
  card.onclick = (e) => { const a = e.target.closest('button')?.dataset.a; if (a === 'next') next(); else if (a === 'skip') finish(); };
  setTimeout(() => {
    if (!running) return; if (Settings.get('tutorialDone')) { running = false; return; } root.classList.remove('hidden'); show();
    // güç seçimi / oyun sonu gibi başka ekranlar açılırsa tur geçici gizlenir
    poll = setInterval(() => { if (state.over) return finish(); const busy = state.paused; root.classList.toggle('hidden', busy); if (!busy && STEPS[i] && !STEPS[i].live) state.userPause = true; }, 300);
  }, 1500);
}
export function tutorialDodgeUsed() { if (running && STEPS[i]?.live) setTimeout(() => running && STEPS[i]?.live && next(), 700); }
export const tutorialActive = () => running && !Settings.get('tutorialDone');
export function restartTutorial() { Settings.set('tutorialDone', false); running = false; startTutorial(); }
