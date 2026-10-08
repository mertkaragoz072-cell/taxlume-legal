"""Kadın savaşçı saldırı (attack) kareleri: references/nexora_heroine_attack_source.png (1536x1024, SİYAH ARKA PLANLI, 6 sütun x 5 satır = 30 kare, numaralar kare altında; ateş/kılıç efektleri karelere gömülü) ->
assets/characters/female/attack/attack_01..30.png (şeffaf; numara YOK; efekt parlaması şeffaflığa çevrilir).
Yöntem: (1) mx>=14 bileşenleri: büyük = karakter+efekt (30), küçük gri/beyaz = numara (atılır), karaktere yakın küçük renkli kıvılcımlar kalır;
(2) alfa: katı bölge (mx>=45 maskesi, delikleri doldurulur, mx>=22 olan 1 px halka eklenir) = 1; dışı (efekt/ateş parlaması, siyah zemine karışan yumuşak kenar) = (mx-8)/40 yumuşak eşik, renk = rgb/alfa (siyah matte çözülür);
(3) ölçek: kafa bandanası yüksekliği bekleme karelerininkiyle eşitlenir; (4) hizalama: ayaklar (kahverengi botların alt şeridi) pivot (170,225) x'ine, yer çizgisi tüm karelerde ortak (satır medyanı ±4 px); tuval death_frames_info.json (bekleme/koşu/ölümle aynı).
Çalıştır: python3 tools/extract_heroine_attack.py && python3 tools/build_female_animations.py"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..'); CH = os.path.join(ROOT, 'assets/characters/female')
info = json.load(open(os.path.join(CH, 'death_frames_info.json'))); Wc, Hc = info['canvas']; PX, PY = info['pivot']
rgb = np.array(Image.open(os.path.join(ROOT, 'references/nexora_heroine_attack_source.png')).convert('RGB')).astype(np.float32); H, W = rgb.shape[:2]
mx = rgb.max(2); mn = rgb.min(2); sat = mx - mn; yy, xx = np.indices((H, W))
S8 = np.ones((3, 3), bool)
lab, n = ndi.label(mx >= 14, structure=S8); area = ndi.sum(mx >= 14, lab, range(1, n + 1)); objs = ndi.find_objects(lab)
big = [(i + 1, objs[i]) for i in range(n) if area[i] > 8000]; assert len(big) == 30, f'30 karakter bekleniyordu, {len(big)} ({sorted(int(a) for a in area)[-34:]})'
small = [(i + 1, objs[i]) for i in range(n) if 30 < area[i] <= 8000]
cy = lambda c: (c[1][0].start + c[1][0].stop) / 2; cx = lambda c: (c[1][1].start + c[1][1].stop) / 2
big.sort(key=cy); rows = [sorted(big[r * 6:(r + 1) * 6], key=cx) for r in range(5)]; order = [c for r in rows for c in r]
def bandana_h(arr, mask):                                           # en yüksekteki kırmızı bileşen = bandana
    red = (arr[..., 0] > 170) & (arr[..., 1] < 70) & (arr[..., 2] < 70) & mask
    l2, k = ndi.label(red); 
    if k == 0: return None
    cs = [(ndi.center_of_mass(red, l2, j)[0], j) for j in range(1, k + 1) if (l2 == j).sum() > 300]; j = min(cs)[1]
    ys, xs = np.where(l2 == j); return ys.max() - ys.min() + 1
idle = [np.array(Image.open(os.path.join(CH, f'idle/idle_{k:02d}.png')).convert('RGBA')) for k in (1, 8, 15, 22, 29)]
ih = float(np.median([bandana_h(a, a[..., 3] > 200) for a in idle]))
rh = [bandana_h(rgb, lab == c[0]) for k, c in enumerate(order) if k in (0, 1, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29)]
SC = ih / float(np.median([r for r in rh if r])); recs = []
for k, c in enumerate(order, 1):
    i, s = c; m = lab == i; keep = m.copy()
    for sm, _ in small:
        smm = lab == sm
        if sat[smm].mean() > 70 and ndi.binary_dilation(m, iterations=16)[smm].any(): keep |= smm
    solid = ndi.binary_fill_holes(keep & (mx >= 45)); solid = ndi.binary_dilation(solid, iterations=1) & (mx >= 22) | solid
    soft = np.clip((mx - 8) / 40.0, 0, 1); alpha = np.where(solid, 1.0, soft) * ndi.binary_dilation(keep, iterations=4)
    col = np.where((alpha[..., None] > 0.02) & (~solid[..., None]), np.clip(rgb / np.maximum(alpha[..., None], 0.06), 0, 255), rgb)
    ys, xs = np.where(alpha > 0.02); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = np.dstack([col, alpha * 255])[y0:y1, x0:x1].astype(np.uint8)
    # ayak: gövde (katı) pikselleri içinde, kahverengi bot rengi (r>g+12>b) alt şeridi
    boots = solid & (rgb[..., 0] > rgb[..., 1] + 12) & (rgb[..., 1] > rgb[..., 2]) & (mx < 190) & (xx < x0 + (x1 - x0) * 0.75)
    yb, xb = np.where(boots); bot = yb.max(); band = boots & (yy > bot - 10); xs_b = np.where(band.any(0))[0]
    recs.append(dict(img=Image.fromarray(sub, 'RGBA'), fx=(xs_b.min() + xs_b.max()) / 2 - x0, bot=bot - y0 + 1, row=(k - 1) // 6))
med = float(np.median([r['bot'] * 0 + (r['bot'] - 0) for r in recs]))
out = os.path.join(CH, 'attack'); os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.startswith('attack_'): os.remove(os.path.join(out, f))
ext = [0, 0, 0, 0]
for i, r in enumerate(recs, 1):
    im2 = r['img']; w, h = im2.size; im2 = im2.resize((max(1, round(w * SC)), max(1, round(h * SC))), Image.LANCZOS)
    ox, oy = int(round(PX - r['fx'] * SC)), int(round(PY - r['bot'] * SC))
    ext = [max(ext[0], -ox), max(ext[1], ox + im2.width - Wc), max(ext[2], -oy), max(ext[3], oy + im2.height - Hc)]
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); cv.alpha_composite(im2, (max(ox, 0), max(oy, 0)), (max(-ox, 0), max(-oy, 0))); cv.save(os.path.join(out, f'attack_{i:02d}.png'))
print('attack kare', len(recs), 'ölçek', round(SC, 3), 'tuval', (Wc, Hc), 'taşma (sol,sağ,üst,alt) px:', ext)
