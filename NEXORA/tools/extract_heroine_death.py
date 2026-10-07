"""Kadın savaşçı ölüm kareleri: references/nexora_heroine_death_source.png (1774x887, şeffaf, 10 kare: üstte 6, altta 4) ->
assets/characters/female/death/death_01..10.png (hepsi aynı tuval; ayak/zemin çizgisi ve gövde merkezi hizalı) + frames.json.
Kare sınırları, tahmini x'ler çevresinde en az dolu sütundan kesilir. Çalıştır: python3 tools/extract_heroine_death.py && python3 tools/build_female_animations.py"""
import json, os
import numpy as np
from scipy import ndimage as ndi
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_heroine_death_source.png')).convert('RGBA'); A = np.array(im)[:, :, 3] > 40
ROWS = [((235, 545), [300, 630, 893, 1148, 1440]), ((555, 800), [480, 905, 1330])]
def cut(y0, y1, est):
    cnt = A[y0:y1].sum(0); out = []
    for e in est: out.append(min(range(e - 45, e + 45), key=lambda x: cnt[x]))
    return out
frames = []
for (y0, y1), est in ROWS:
    xs = [0] + cut(y0, y1, est) + [im.width]
    for a, b in zip(xs[:-1], xs[1:]):
        sl = A[y0:y1, a:b].copy()
        lab, n = ndi.label(ndi.binary_dilation(sl, iterations=5))      # komşu kareden taşan parçaları (kesim kenarına değen, ana gövde olmayan) sil
        if n > 1:
            sizes = ndi.sum(sl, lab, range(1, n + 1)); main = int(np.argmax(sizes)) + 1
            for k, sob in enumerate(ndi.find_objects(lab), 1):
                if k != main and (sob[1].start <= 1 or sob[1].stop >= sl.shape[1] - 1): sl[lab == k] = False
        ys, xx = np.where(sl)
        frames.append((a + xx.min(), y0 + ys.min(), a + xx.max() + 1, y0 + ys.max() + 1, a, b, y0, y1, ndi.binary_dilation(sl, iterations=4)))
print([(f[2] - f[0], f[3] - f[1]) for f in frames])
# ayak/zemin çizgisi: kare bbox altı (toz/yıldız zeminde/üstte); yatay: opak piksel kütle merkezi
crops, cxs, bots = [], [], []
for (x0, y0, x1, y1, a, b, ry0, ry1, keep) in frames:
    c = im.crop((x0, y0, x1, y1)); ca = np.array(c); ca[~keep[y0 - ry0:y1 - ry0, x0 - a:x1 - a]] = 0; c = Image.fromarray(ca, 'RGBA'); crops.append(c)
    al = np.array(c)[:, :, 3] > 40; cxs.append(np.where(al)[1].mean()); bots.append(c.height)
Wc = int(max(c.width for c in crops) + 40); Hc = int(max(c.height for c in crops) + 20)
PIVX, PIVY = Wc // 2, Hc - 10
out_dir = os.path.join(ROOT, 'assets/characters/female/death'); os.makedirs(out_dir, exist_ok=True)
for i, (c, cx) in enumerate(zip(crops, cxs), 1):
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); cv.alpha_composite(c, (int(PIVX - cx), PIVY - c.height)); cv.save(os.path.join(out_dir, f'death_{i:02d}.png'))
print('tuval', (Wc, Hc), 'pivot', (PIVX, PIVY))
open(os.path.join(ROOT, 'assets/characters/female/death_frames_info.json'), 'w').write(json.dumps({'canvas': [Wc, Hc], 'pivot': [PIVX, PIVY], 'frames': len(crops), 'standingHeightPx': crops[0].height}))
