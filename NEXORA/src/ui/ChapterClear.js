// ChapterClear: "BÖLÜM TAMAMLANDI!" ekranı (oyun duraklıdır). Ödüller çağıran tarafından uygulanıp burada gösterilir; DEVAM ET → onContinue.
const $ = (id) => document.getElementById(id);
let key = null;
export function showChapterClear({ name, rewards, next }, onContinue) {
  $('cc-name').textContent = name;
  $('cc-coins').textContent = '+' + rewards.coins; $('cc-gems').textContent = '+' + rewards.gems; $('cc-xp').textContent = '+' + rewards.xp;
  $('cc-next').textContent = next ? `Sıradaki bölüm: ${next}` : '';
  const root = $('chapter-clear'), btn = $('cc-continue');
  let done = false;
  const go = () => { if (done) return; done = true; root.classList.add('hidden'); removeEventListener('keydown', key); btn.onclick = null; onContinue(); };
  btn.onclick = go; key = (e) => { if (e.code === 'Enter' || e.code === 'Space') go(); };
  addEventListener('keydown', key);
  root.classList.remove('hidden');
}
