"""Kadın savaşçı bekleme (idle) kareleri: references/nexora_heroine_idle_source.png (2172x724, şeffaf, 3 satır x 10 sütun = 30 kare, numaralar kare ALTINDA) ->
assets/characters/female/idle/idle_01..30.png. Kareler = büyük bağlı bileşenler (numara etiketleri küçük olduğu için elenir), satır-sütun sırasıyla.
Ölüm karesiyle AYNI tuval (death_frames_info.json: 340x235) ve pivot (170,225); ayaklar zeminde (gövde alt kenarı), yatay: ayakların orta noktası pivotta.
Çalıştır: python3 tools/extract_heroine_idle.py && python3 tools/build_female_animations.py"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_heroine_idle_source.png')).convert('RGBA'); arr = np.array(im); A = arr[:, :, 3] > 110
info = json.load(open(os.path.join(ROOT, 'assets/characters/female/death_frames_info.json'))); Wc, Hc = info['canvas']; PX, PY = info['pivot']
lab, n = ndi.label(ndi.binary_dilation(A, iterations=2)); comps = []
for k, s in enumerate(ndi.find_objects(lab), 1):
    m = (lab == k) & A
    if m.sum() > 5000: comps.append((s, m))
assert len(comps) == 30, f'30 kare bekleniyordu, {len(comps)}'
rows = sorted(comps, key=lambda c: (c[0][0].start + c[0][0].stop) / 2); rows = [sorted(rows[i * 10:(i + 1) * 10], key=lambda c: c[0][1].start) for i in range(3)]
out_dir = os.path.join(ROOT, 'assets/characters/female/idle'); os.makedirs(out_dir, exist_ok=True)
for f in os.listdir(out_dir):
    if f.startswith('idle_'): os.remove(os.path.join(out_dir, f))
def feet18(c):
    al = np.array(c)[:, :, 3] > 40; ys = np.where(al.any(1))[0]; b = ys.max() + 1
    low = np.where(al[int(b - 0.18 * (b - ys.min())):b].any(0))[0]; return (low.min() + low.max()) / 2
i = 0; pre = []
for row in rows:
    for s, m in row:                                           # 1. geçiş: ayakların (alt %18) ortalama konumu → sabit kaydırma (botlar pivotta dursun)
        keep = ndi.binary_dilation(m, iterations=3); y0, y1, x0, x1 = s[0].start, s[0].stop, s[1].start, s[1].stop
        sub = arr[y0:y1, x0:x1].copy(); sub[~keep[y0:y1, x0:x1]] = 0; c = Image.fromarray(sub, 'RGBA')
        al = np.array(c)[:, :, 3] > 40; ys, xs = np.where(al); bot = ys.max() + 1; low = np.where(al[int(bot - 0.4 * (bot - ys.min())):bot].any(0))[0]
        pre.append(feet18(c) - (low.min() + low.max()) / 2)
SHIFT = float(np.median(pre)); i = 0
for row in rows:
    for s, m in row:
        i += 1; keep = ndi.binary_dilation(m, iterations=3) & (arr[:, :, 3] > 0)
        y0, y1, x0, x1 = s[0].start, s[0].stop, s[1].start, s[1].stop; sub = arr[y0:y1, x0:x1].copy(); sub[~keep[y0:y1, x0:x1]] = 0
        c = Image.fromarray(sub, 'RGBA'); al = np.array(c)[:, :, 3] > 40; ys, xs = np.where(al); bot = ys.max() + 1
        low = np.where(al[int(bot - 0.4 * (bot - ys.min())):bot].any(0))[0]; fcx = (low.min() + low.max()) / 2        # ayakların orta noktası
        cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); cv.alpha_composite(c, (int(round(PX - fcx - SHIFT)), int(PY - bot))); cv.save(os.path.join(out_dir, f'idle_{i:02d}.png'))
print('idle kare', i, 'tuval', (Wc, Hc))
