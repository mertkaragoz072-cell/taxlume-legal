#!/usr/bin/env python3
"""assets/references/nexora_goblin_sheet_source.png → düşman animasyon kareleri (3 goblin).

Kaynak sheet gerçek alfa kanallıdır (1536×1024). Üç satır: gürzlü goblin, kılıç+kalkan goblin, çekiçli brute.
Her satırda: sol portre (yüksek çözünürlük) + soldan sağa animasyon kareleri. Kareler soldan sağa kare merkezlerine göre
kesilir (sınırlar kolon yoğunluğunun vadisinden), alfa'dan yer gölgesi/halo atılır (oyun kendi gölgesini çizer),
her tür ortak tuvale ayakların altı hizalı yerleştirilir. Efektler (altın/mavi yay, kıvılcım, ateş) karelere gömülüdür.
Çalıştır: cd NEXORA && python3 tools/extract_goblins.py   (Pillow, numpy, scipy gerekir)
"""
import glob, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_goblin_sheet_source.png'
OUT = 'assets/enemies'
A = np.asarray(Image.open(SRC).convert('RGBA')).astype(int)
H, W = A.shape[:2]

# tür: satır y aralığı, portre kutusu x, kare merkezleri (mutlak x), animasyonlar (kare indeksleri 0 tabanlı), hedef boy (birim)
TYPES = {
    'goblin_warrior': dict(y=(70, 310), portrait=(40, 305), centers=[350, 445, 540, 635, 725, 830, 955, 1115, 1235, 1330, 1440], target=80,
        anims={'walk': ([0, 1, 2, 3, 4], 8, True), 'attack': ([5, 6, 7], 9, False), 'hurt': ([8, 9], 8, False), 'death': ([10], 6, False)}),
    'goblin_scout': dict(y=(350, 600), portrait=(25, 298), centers=[335, 430, 545, 660, 775, 915, 1040, 1170, 1300, 1440], target=68,
        anims={'walk': ([0, 1, 2, 3], 8, True), 'attack': ([4, 5, 6, 7], 10, False), 'hurt': ([8], 8, False), 'death': ([9], 6, False)}),
    'goblin_brute': dict(y=(605, 950), portrait=(10, 425), excl=(0, 430, 0, 775), x_lo=300, centers=[365, 470, 590, 710, 835, 985, 1160, 1295, 1430], target=128,
        anims={'walk': ([0, 1, 2], 6, True), 'attack': ([3, 4, 5, 6], 8, False), 'hurt': ([7], 8, False), 'death': ([8], 6, False)}),
}
IMPACT = {'goblin_warrior': 0.5, 'goblin_scout': 0.5, 'goblin_brute': 0.62}   # saldırı animasyonunun hasar anı (0-1)

# alfa: gölge/halo at (düşük alfa), kenarı yumuşat
al = A[..., 3].astype(float)
alpha = np.clip((al - 120) / 80.0, 0, 1)
LUM = A[..., :3].mean(2); BLUEISH = (A[..., 2] - A[..., 0]) > 25
EFFECT = (LUM > 195) | BLUEISH | ((A[..., 0] > 200) & (A[..., 1] > 130) & (A[..., 2] < 150))   # parlak altın/mavi efektler
BODY = (alpha > 0.5) & ~EFFECT

def valley_cuts(y0, y1, centers, x_lo=0):
    cs = (alpha[y0:y1] > 0.5).sum(0).astype(float)
    cuts = [max(x_lo, centers[0] - (centers[1] - centers[0]) // 2)]
    for a, b in zip(centers, centers[1:]):
        mid = (a + b) // 2; lo, hi = mid - 22, mid + 22
        cuts.append(lo + int(np.argmin(cs[lo:hi])))
    cuts.append(min(W, centers[-1] + (centers[-1] - centers[-2]) // 2 + 20))
    return cuts

def rgba_crop(x0, y0, x1, y1):
    rgb = A[y0:y1, x0:x1, :3].astype(np.uint8)
    return np.dstack([rgb, (alpha[y0:y1, x0:x1] * 255).astype(np.uint8)])

def trim(arr, pad=0):
    ys, xs = np.where(arr[..., 3] > 8)
    if len(ys) == 0: return None
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

os.makedirs(OUT, exist_ok=True)
for f in glob.glob(f'{OUT}/*.png') + glob.glob(f'{OUT}/*/*.png'): os.remove(f)
meta = {}
for name, T in TYPES.items():
    d = f'{OUT}/{name}'; os.makedirs(d, exist_ok=True)
    y0, y1 = T['y']
    if 'excl' in T:                                     # portre eşyası (çekiç başı) kare alanına taşıyorsa maskele
        ex0, ex1, ey0, ey1 = T['excl']; alpha[ey0:ey1, ex0:ex1] = 0
    cuts = valley_cuts(y0, y1, T['centers'], x_lo=T.get('x_lo', T['portrait'][1]))
    frames = []
    for i in range(len(T['centers'])):
        x0, x1 = cuts[i], cuts[i + 1]
        cell_alpha = alpha[y0:y1, x0:x1] > 0.5
        l, n = ndi.label(ndi.binary_dilation(cell_alpha, iterations=2))     # kopuk küçük kırıntıları + komşu kareden taşan kesik parçaları at
        if n:
            sz = ndi.sum(cell_alpha, l, range(1, n + 1)); big = sz.max()
            keep = []
            for j, sl in enumerate(ndi.find_objects(l)):
                touches = sl[1].start <= 1 or sl[1].stop >= cell_alpha.shape[1] - 1
                if sz[j] >= 60 and not (touches and sz[j] < 0.3 * big): keep.append(j + 1)
            mask = np.isin(l, keep)
        else: mask = cell_alpha
        arr = rgba_crop(x0, y0, x1, y1); arr[..., 3] = np.where(mask, arr[..., 3], 0)
        body = BODY[y0:y1, x0:x1] & mask
        frames.append((arr, body))
    # zemin: gövde alt kenarının medyanı; idle boyu: yürüme karelerinin gövde yüksekliği medyanı
    bottoms = [np.where(b.any(1))[0].max() for _, b in frames if b.any()]
    ground = int(np.median(bottoms))
    idle_h = int(np.median([np.ptp(np.where(frames[i][1].any(1))[0]) + 1 for i in T['anims']['walk'][0]]))
    maxw = max(a.shape[1] for a, _ in frames); maxh = max(ground + 1 for _ in frames)
    top = max(ground - np.where(a[..., 3] > 8)[0].min() for a, _ in frames if (a[..., 3] > 8).any())
    CW = int(max(frames[i][0].shape[1] for i in range(len(frames))) + 24); CW += CW % 2
    CH = int(top + 14); px = CW // 2; py = CH - 8
    scale = round(T['target'] / idle_h, 3)
    anims = {}
    for an, (idxs, fps, loop) in T['anims'].items():
        names = []
        for k, i in enumerate(idxs, 1):
            arr, body = frames[i]
            xs = np.where(body.any(0))[0]
            cx = (xs.min() + xs.max()) / 2 if len(xs) else arr.shape[1] / 2
            canvas = np.zeros((CH, CW, 4), np.uint8)
            ox, oy = int(round(px - cx)), int(round(py - ground))
            h, w = arr.shape[:2]
            ys0, ys1 = max(0, -oy), min(h, CH - oy); xs0, xs1 = max(0, -ox), min(w, CW - ox)
            canvas[ys0 + oy:ys1 + oy, xs0 + ox:xs1 + ox] = arr[ys0:ys1, xs0:xs1]
            fn = f'{an}_{k:02d}'
            Image.fromarray(canvas, 'RGBA').save(f'{d}/{fn}.png', optimize=True)
            names.append(f'enemy_{name}_{fn}')
        anims[an] = {'frames': names, 'fps': fps, 'loop': loop}
    anims['attack']['impact'] = IMPACT[name]
    # portre (yüksek çözünürlük): ileride elite girişi / UI için
    p0, p1 = T['portrait']; pa = rgba_crop(p0, y0 - 10, p1, y1 + 10); pt = trim(pa)
    Image.fromarray(pt, 'RGBA').save(f'{d}/portrait.png', optimize=True)
    meta[name] = {'canvas': [CW, CH], 'pivot': [px, py], 'scale': scale, 'facing': 'right', 'idleHeightPx': idle_h, 'targetHeight': T['target'], 'anims': anims}
    print(name, 'tuval', CW, CH, 'idle', idle_h, 'ölçek', scale, {k: len(v['frames']) for k, v in anims.items()})

json.dump(meta, open('data/enemy_animations.json', 'w'), indent=2, ensure_ascii=False); open('data/enemy_animations.json', 'a').write('\n')
mp = 'data/asset_manifest.json'
man = json.load(open(mp))
man['images'] = {k: v for k, v in man['images'].items() if not k.startswith('enemy_')}
for name, m in meta.items():
    for an in m['anims'].values():
        for key in an['frames']:
            man['images'][key] = f"{OUT}/{name}/{key[len('enemy_' + name) + 1:]}.png"
    man['images'][f'enemy_{name}_portrait'] = f'{OUT}/{name}/portrait.png'
man['images'] = dict(sorted(man['images'].items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
