"""Kadın savaşçı ölüm kareleri: references/nexora_heroine_death_source.png (şeffaf sayfa, 10 kare: üstte 6, altta 4) ->
assets/characters/female/death/death_01..10.png (hepsi aynı tuval; zemin çizgisi ve gövde merkezi hizalı).
Yöntem: alfa maskesi 2 px genişletilip bağlı bileşenler bulunur; büyük bileşenler = kare gövdeleri (üst satır → alt satır, soldan sağa),
küçük bileşenler (yıldız, vuruş patlaması, hareket çizgisi, toz) en yakın gövdeye eklenir. Çalıştır:
python3 tools/extract_heroine_death.py && python3 tools/build_female_animations.py"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_heroine_death_source.png')).convert('RGBA'); arr = np.array(im); A = arr[:, :, 3] > 40
lab, n = ndi.label(ndi.binary_dilation(A, iterations=2)); objs = ndi.find_objects(lab)
info = []
for k, s in enumerate(objs, 1):
    area = int(((lab == k) & A).sum()); cy = (s[0].start + s[0].stop) / 2; cx = (s[1].start + s[1].stop) / 2
    info.append((k, s, area, cx, cy))
bodies = [i for i in info if i[2] > 9000]; small = [i for i in info if i[2] <= 9000 and i[2] > 30]
mid = (min(b[4] for b in bodies) + max(b[4] for b in bodies)) / 2
bodies.sort(key=lambda b: (0 if b[4] < mid else 1, b[3]))
assert len(bodies) == 10, f'10 kare bekleniyordu, {len(bodies)} bulundu'
groups = [[b] for b in bodies]
for sm in small:                                           # küçük parça → en yakın gövde (bbox uzaklığı)
    def dist(g):
        s = g[0][1]; x0, x1, y0, y1 = s[1].start, s[1].stop, s[0].start, s[0].stop; sx, sy = sm[3], sm[4]
        return np.hypot(max(x0 - sx, 0, sx - x1), max(y0 - sy, 0, sy - y1))
    best = min(groups, key=dist)
    if dist(best) < 90: best.append(sm)
crops, cxs = [], []
for g in groups:
    keep = np.isin(lab, [m[0] for m in g]); ys, xs = np.where(keep)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sub = arr[y0:y1, x0:x1].copy(); sub[~keep[y0:y1, x0:x1]] = 0
    c = Image.fromarray(sub, 'RGBA'); crops.append(c); cxs.append(np.where(np.array(c)[:, :, 3] > 40)[1].mean())
print([(c.width, c.height) for c in crops])
Wc = int(max(c.width for c in crops) + 40); Hc = int(max(c.height for c in crops) + 20); PIVX, PIVY = Wc // 2, Hc - 10
out_dir = os.path.join(ROOT, 'assets/characters/female/death'); os.makedirs(out_dir, exist_ok=True)
for i, (c, cx) in enumerate(zip(crops, cxs), 1):
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); cv.alpha_composite(c, (int(PIVX - cx), PIVY - c.height)); cv.save(os.path.join(out_dir, f'death_{i:02d}.png'))
print('tuval', (Wc, Hc), 'pivot', (PIVX, PIVY), 'ayakta boy', crops[0].height)
json.dump({'canvas': [Wc, Hc], 'pivot': [PIVX, PIVY], 'frames': len(crops), 'standingHeightPx': crops[0].height}, open(os.path.join(ROOT, 'assets/characters/female/death_frames_info.json'), 'w'))
