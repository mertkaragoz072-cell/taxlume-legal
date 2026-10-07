"""Kadın savaşçı bekleme (idle) kareleri: references/nexora_heroine_idle_source.png (1774x887, SİYAH ARKA PLANLI, 3 satır x 10 sütun = 30 kare, numarasız) ->
assets/characters/female/idle/idle_01..30.png (şeffaf; sadece karakter, numara ve zemin gölgesi YOK — oyun kendi gölgesini çizer).
Yöntem: (1) arka plan = kenardan başlayan flood-fill (max kanal < 34; gölge elipsi de bu aralıkta); kenar bandında siyah matte çözülür (alfa = yumuşak eşik, renk = rgb/alfa → koyu hale yok);
(2) bileşenler: büyük = karakter; küçük gri/beyaz (numara) atılır, küçük renkli parçalar (kırmızı şerit) karaktere yakınsa kalır; (3) satır/sütun sırasıyla 1..30;
(4) ölüm karesiyle aynı tuval (340x235) ve pivot (170,225), boy ölüm duruşuyla aynı (211 px) olacak şekilde ölçeklenir; ayaklar zeminde, botlar yatayda pivota hizalı.
Çalıştır: python3 tools/extract_heroine_idle.py && python3 tools/build_female_animations.py"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_heroine_idle_source.png')).convert('RGB'); rgb = np.array(im).astype(np.float32); H, W = rgb.shape[:2]
info = json.load(open(os.path.join(ROOT, 'assets/characters/female/death_frames_info.json'))); Wc, Hc = info['canvas']; PX, PY = info['pivot']; TARGET_H = info['standingHeightPx']
mx = rgb.max(2); sat = rgb.max(2) - rgb.min(2)
# arka plan: saf siyah, kenardan bağlı olan alan.
dark = mx <= 10          # saf siyah. (Önceki sayfadaki gri gölge elipsi kuralı kaldırıldı: bu sayfada gölge yok, siyah taytlar yanlışlıkla arka plan sayılıyordu)
lab, n = ndi.label(dark); border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border))
bg = ndi.binary_opening(bg, iterations=1) | (bg & ~ndi.binary_dilation(~bg, iterations=1))   # ince sızıntı kanallarını kapat
fg0 = ~bg; fg = ndi.binary_fill_holes(fg0)                          # karakter içindeki delikler (göz/çizgi) karakterdir...
hl, hn = ndi.label(fg & ~fg0)
for k in range(1, hn + 1):                                         # ...ama saf siyah, büyük kapalı boşluklar (bacak arası vb.) arka plandır
    m = hl == k
    if m.sum() > 100 and mx[m].mean() < 14: fg[m] = False
pl, pn = ndi.label(mx <= 8)                                        # kapanan dar kanallar yüzünden 'kapalı' kalan saf siyah alanlar (bacak arası): büyükse arka plandır (göz bebeği/çizgi küçüktür)
psz = ndi.sum(mx <= 8, pl, range(1, pn + 1))
for k in range(1, pn + 1):
    if psz[k - 1] > 80: fg[pl == k] = False
bg = ~fg
lab2, n2 = ndi.label(fg)
comps = []
for k, s in enumerate(ndi.find_objects(lab2), 1):
    m = (lab2 == k) & fg; a = int(m.sum())
    if a < 30: continue
    comps.append((k, s, a, float(sat[m].mean()), float(mx[m].mean())))
big = [c for c in comps if c[2] > 12000]; assert len(big) == 30, f'30 karakter bekleniyordu, {len(big)} (alanlar: {sorted(c[2] for c in comps)[-34:]})'
cy = lambda c: (c[1][0].start + c[1][0].stop) / 2; cx = lambda c: (c[1][1].start + c[1][1].stop) / 2
big.sort(key=cy); rows = [sorted(big[i * 10:(i + 1) * 10], key=cx) for i in range(3)]
small = [c for c in comps if c[2] <= 12000]
# kenar bandında siyah matte çözme: alfa (yumuşak), renk un-premultiply
edge = ndi.binary_dilation(bg, iterations=3) & fg
alpha = np.where(fg, 1.0, 0.0).astype(np.float32)
t = np.clip((mx - 16) / (60 - 16), 0, 1); alpha[edge] = t[edge]
col = rgb.copy(); e3 = edge[..., None] & (alpha[..., None] > 0.02); col = np.where(e3, np.clip(rgb / np.maximum(alpha[..., None], 0.05), 0, 255), col)
rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
def crop_of(c):
    k, s, a, _, _ = c; keep = (lab2 == k) & fg
    for sm in small:                                            # karaktere yakın renkli küçük parçalar (şerit/saç) eklenir; gri-beyaz küçükler (numara) atılır
        if sm[3] > 55 and ndi.binary_dilation((lab2 == k), iterations=14)[(lab2 == sm[0])].any(): keep |= (lab2 == sm[0]) & fg
    keep = ndi.binary_dilation(keep, iterations=3) & (alpha > 0.01)
    ys, xs = np.where(keep); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = rgba[y0:y1, x0:x1].copy(); sub[~keep[y0:y1, x0:x1]] = 0; return Image.fromarray(sub, 'RGBA')
frames = [crop_of(c) for row in rows for c in row]
hs = sorted(f.height for f in frames); sc = TARGET_H / np.median(hs)
def feet18(c):
    al = np.array(c)[:, :, 3] > 40; ys = np.where(al.any(1))[0]; b = ys.max() + 1; low = np.where(al[int(b - 0.18 * (b - ys.min())):b].any(0))[0]; return (low.min() + low.max()) / 2
frames = [f.resize((max(1, round(f.width * sc)), max(1, round(f.height * sc))), Image.LANCZOS) for f in frames]
SH = float(np.median([feet18(f) - ((lambda al: (lambda ys: (np.where(al[int(ys.max() + 1 - 0.4 * (ys.max() + 1 - ys.min())):ys.max() + 1].any(0))[0].min() + np.where(al[int(ys.max() + 1 - 0.4 * (ys.max() + 1 - ys.min())):ys.max() + 1].any(0))[0].max()) / 2)(np.where(al.any(1))[0]))(np.array(f)[:, :, 3] > 40)) for f in frames]))
out_dir = os.path.join(ROOT, 'assets/characters/female/idle'); os.makedirs(out_dir, exist_ok=True)
for f in os.listdir(out_dir):
    if f.startswith('idle_'): os.remove(os.path.join(out_dir, f))
for i, f in enumerate(frames, 1):
    al = np.array(f)[:, :, 3] > 40; ys = np.where(al.any(1))[0]; bot = ys.max() + 1; b0 = int(bot - 0.4 * (bot - ys.min())); low = np.where(al[b0:bot].any(0))[0]; fcx = (low.min() + low.max()) / 2
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); cv.alpha_composite(f, (int(round(PX - fcx - SH)), int(PY - bot))); cv.save(os.path.join(out_dir, f'idle_{i:02d}.png'))
print('idle kare', len(frames), 'ölçek', round(float(sc), 3), 'tuval', (Wc, Hc))
