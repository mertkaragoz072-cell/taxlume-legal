#!/usr/bin/env python3
"""assets/references/nexora_male_sheet_source.png → ayrı, şeffaf, hizalı PNG kareleri.

Kaynak sheet'te gerçek şeffaflık yok (sahte dama deseni piksellere işlenmiş). Bu betik:
  1. kenardan flood-fill ile nötr (gri/beyaz) dama zeminini siler, etiket kutularını atar,
  2. mavi parlamayı (b-r farkı zeminden bağımsız) yarı saydam yapar, kenar renklerini iç renkle yeniden boyar,
  3. satırları kare hücrelerine böler; efekt bileşenlerini ait olduğu kareye bağlar,
  4. kareleri ortak tuvale (CANVAS) ayak noktasına (PIVOT) göre yerleştirir,
  5. saf efektleri ayrı PNG olarak kaydeder, data/male_animations.json üretir.
Çalıştır: cd NEXORA && python3 tools/extract_male_sheet.py   (Pillow, numpy, scipy gerekir)
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_male_sheet_source.png'
CANVAS = (224, 176)          # genişlik, yükseklik
PIVOT = (112, 164)           # ayak noktası: x orta, y alttan 12 px yukarı
ANIM_DIR = 'assets/characters/male/animations'
FX_DIR = 'assets/effects/attacks'

A = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
H, W = A.shape[:2]
mx, mn = A.max(2), A.min(2)

# ---- 1. zemin maskesi
neutral = ((mx - mn) < 18) & (mn > 170)
lab, _ = ndi.label(neutral)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = ~np.isin(lab, list(border))
# efektlerin içinde kapalı kalan dama parçaları: gri/beyaz dönüşümlü doku → zemin say (düz beyaz çekirdekler kalır)
for i, sl in enumerate(ndi.find_objects(lab), 1):
    if i in border: continue
    comp = lab[sl] == i
    if comp.sum() >= 120 and ((mx[sl] < 238) & comp).sum() / comp.sum() > 0.2:
        fg[sl] &= ~comp
pl, _ = ndi.label(ndi.binary_closing(mx < 90, iterations=2))
labels = np.zeros_like(fg)
for i, sl in enumerate(ndi.find_objects(pl), 1):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if sl[1].start < 20 and w > 60 and 18 < h < 50:
        labels |= (pl == i)
fg &= ~ndi.binary_dilation(labels, iterations=3)
fg = ndi.binary_opening(fg, iterations=1)

# ---- 2. alfa + renk
BLUE = (A[..., 2] - A[..., 0]).astype(float)
a_glow = np.where(BLUE > 12, np.clip(BLUE / 60.0, 0, 1), 1.0)
soft = np.clip(ndi.gaussian_filter(ndi.binary_erosion(fg, iterations=1).astype(float), 0.7) * 1.15, 0, 1)
ALPHA = np.where(fg, a_glow * soft, 0)
_blur = ndi.gaussian_filter(ALPHA, 1.3)
ALPHA = np.where(ALPHA >= 0.97, ALPHA, np.clip((_blur - 0.15) / 0.85, 0, 1) * ndi.binary_dilation(fg, iterations=2))
inner = (ALPHA >= 0.97) & ndi.binary_erosion(fg, iterations=2)
idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
RGB = np.where(inner[..., None], A, A[idx[0], idx[1]]).astype(np.uint8)   # kenar/halo → en yakın iç renk
LUM = A.mean(2)
BODY = fg & ((BLUE <= 25) | (LUM < 100))                                    # karakter gövdesi (efekt değil)
def rgba(x0, y0, x1, y1):
    return np.dstack([RGB[y0:y1, x0:x1], (ALPHA[y0:y1, x0:x1] * 255).astype(np.uint8)])

def trim(arr):
    ys, xs = np.where(arr[..., 3] > 8)
    if len(ys) == 0: return None
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def save(arr, path, written):
    Image.fromarray(arr, 'RGBA').save(path, optimize=True)
    written.append((path, arr.shape[1], arr.shape[0]))

def frame_rgba(x0, x1, y0, y1, margin=70):
    """Hücre [x0,x1) için kare: asıl gövdeyi bul, komşu karakterlerin gövde parçalarını at,
    efekt (mavi parlama) piksellerini gövdenin etrafındaki bölgeden al."""
    xa, xb = max(0, x0 - margin), min(W, x1 + margin)
    body = BODY[y0:y1, xa:xb] & (np.arange(xa, xb)[None, :] >= x0 - 12) & (np.arange(xa, xb)[None, :] < x1 + 12)
    l, n = ndi.label(ndi.binary_dilation(body, iterations=2) & BODY[y0:y1, xa:xb])
    if n == 0:
        return np.zeros((y1 - y0, xb - xa, 4), np.uint8), np.zeros((y1 - y0, xb - xa), bool)
    sizes = ndi.sum(np.ones_like(l), l, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    ys, xs = np.where(l == main)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    # gövde: ana bileşen + merkezi hücre içinde kalan küçük parçalar (el, kılıç ucu)
    keep_body = np.zeros_like(body)
    for i in range(1, n + 1):
        yy, xx = np.where(l == i)
        cxm = xx.mean() + xa
        if i == main or (x0 <= cxm < x1 and bx0 - 40 < xx.mean() < bx1 + 40):
            keep_body |= (l == i)
    cols = np.arange(xa, xb)[None, :] - xa
    rows = np.arange(y0, y1)[:, None] - y0
    zone = (cols >= bx0 - 70) & (cols <= bx1 + 70) & (rows >= by0 - 25) & (rows <= by1 + 25)
    effect = fg[y0:y1, xa:xb] & ~BODY[y0:y1, xa:xb] & zone
    el, en = ndi.label(effect)                      # küçük kopuk efekt kırıntılarını at
    if en:
        near = ndi.binary_dilation(keep_body, iterations=4)
        sz = ndi.sum(effect, el, range(1, en + 1)); touch = ndi.maximum(near, el, range(1, en + 1))
        effect = np.isin(el, [i + 1 for i in range(en) if sz[i] >= 120 or touch[i]])
    # efekt: başka gövdeye ait (komşu karakter) bileşenin yakınındaki parlama atılmaz, ama gövde atılır
    keep = ndi.binary_dilation(keep_body, iterations=1) | effect
    al = np.where(keep, ALPHA[y0:y1, xa:xb], 0)
    return np.dstack([RGB[y0:y1, xa:xb], (al * 255).astype(np.uint8)]), keep_body

def place(arr, cx, ground):
    """arr: kare (RGBA). cx: gövde orta x'i, ground: zemin y'si (arr koordinatı) → ortak tuval."""
    canvas = np.zeros((CANVAS[1], CANVAS[0], 4), np.uint8)
    ox, oy = PIVOT[0] - int(round(cx)), PIVOT[1] - int(round(ground))
    h, w = arr.shape[:2]
    y_lo, y_hi = max(0, -oy), min(h, CANVAS[1] - oy)
    x_lo, x_hi = max(0, -ox), min(w, CANVAS[0] - ox)
    if y_hi > y_lo and x_hi > x_lo:
        canvas[y_lo + oy:y_hi + oy, x_lo + ox:x_hi + ox] = arr[y_lo:y_hi, x_lo:x_hi]
    return Image.fromarray(canvas, 'RGBA')

# ---- 3. satırlar: ad, y0, y1, x0, x1, hücre sayısı, önek, mod
ROWS = [
    ('idle',    125, 275,  96, 822, 8, 'idle',     None),
    ('run',     285, 422,  98, 840, 8, 'run',      None),
    ('attack1', 440, 572, 105, 836, 7, 'attack_1', 'fx_last'),
    ('attack2', 588, 728, 100, 847, 7, 'attack_2', None),
    ('attack3', 730, 866, 114, 841, 6, 'attack_3', 'fx_last2'),
    ('jump',    872,1022, 108, 821, 7, 'jump',     None),
    ('hit',    1024,1136, 109, 825, 6, 'hurt',     None),
    ('death',  1138,1236, 113, 832, 6, 'death',    None),
    ('turn',   1240,1378,  89, 813, 8, 'turn',     None),
]
FPS = {'idle': 6, 'run': 12, 'attack_1': 14, 'attack_2': 14, 'attack_3': 14, 'jump': 10, 'hurt': 8, 'death': 8, 'turn': 8}
LOOP = {'idle': True, 'run': True}
CLUSTER_ROWS = {'jump', 'hit', 'death'}      # figürler eşit aralıklı değil: boşluklara göre kes

def cuts(y0, y1, x0, x1, n, cluster=False):
    cs = fg[y0:y1].sum(0).astype(float)
    if cluster:
        l, _ = ndi.label(ndi.binary_closing(cs > 0, iterations=3))
        spans = [[o[0].start, o[0].stop] for o in ndi.find_objects(l) if o[0].stop > x0 - 5]
        while len(spans) < n:                              # en geniş kümeyi vadiden böl
            j = int(np.argmax([e - s_ for s_, e in spans])); s_, e = spans[j]
            mid = (s_ + e) // 2
            v = mid - 25 + int(np.argmin(cs[mid - 25:mid + 25])); spans[j:j + 1] = [[s_, v], [v, e]]
        return [spans[0][0]] + [(spans[i][1] + spans[i + 1][0]) // 2 for i in range(len(spans) - 1)] + [spans[-1][1] + 1]
    b = [x0]
    for i in range(1, n):
        e = int(x0 + (x1 - x0) * i / n)
        b.append(e - 14 + int(np.argmin(cs[e - 14:e + 14])))
    b.append(x1 + 1)
    return b

os.makedirs(ANIM_DIR, exist_ok=True); os.makedirs(FX_DIR, exist_ok=True)
meta = {'canvas': list(CANVAS), 'pivot': list(PIVOT), 'facing': 'right', 'scale': 0.6, 'animations': {}}
written = []

for name, y0, y1, x0, x1, n, prefix, mode in ROWS:
    b = cuts(y0, y1, x0, x1, n, cluster=name in CLUSTER_ROWS)
    yy0, yy1 = y0 - 6, y1 + 6
    pre = [frame_rgba(b[i], b[i + 1], yy0, yy1) for i in range(n)]
    ground = int(np.median([np.where(bd.any(1))[0].max() for _, bd in pre if bd.any()]))
    frames, k = [], 0
    for i, (arr, body) in enumerate(pre):
        if (mode == 'fx_last' and i == n - 1) or (mode == 'fx_last2' and i >= n - 2):
            t = trim(arr)
            if t is not None:
                fxn = f'attack_{prefix[-1]}_slash' if mode == 'fx_last' else f'attack_3_burst_{i - (n - 2) + 1:02d}'
                save(t, f'{FX_DIR}/{fxn}.png', written)
            continue
        k += 1
        xs = np.where(body.any(0))[0]
        cx = (xs.min() + xs.max()) / 2 if len(xs) else arr.shape[1] / 2
        fn = f'{prefix}_{k:02d}'
        img = place(arr, cx, ground)
        img.save(f'{ANIM_DIR}/{fn}.png', optimize=True); written.append((f'{ANIM_DIR}/{fn}.png', *CANVAS))
        frames.append(fn)
    meta['animations'][prefix] = {'frames': frames, 'fps': FPS[prefix], 'loop': LOOP.get(prefix, False)}

# ---- 4. saf efekt satırları (bağlı bileşenler, soldan sağa)
def components(y0, y1, name_fn, dil=3, min_area=150):
    m = np.zeros_like(fg); m[y0:y1, 100:] = fg[y0:y1, 100:]
    l, _ = ndi.label(ndi.binary_dilation(m, iterations=dil))
    idx = 0
    for sl in sorted(ndi.find_objects(l), key=lambda s: s[1].start):
        if (fg[sl] & m[sl]).sum() < min_area: continue
        if BLUE[sl][fg[sl] & m[sl]].mean() < 25: continue          # bej toz/kırıntı: güvenilir ayrılamaz, alma
        t = trim(rgba(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
        if t is None: continue
        idx += 1
        save(t, f'{FX_DIR}/{name_fn(idx)}.png', written)

components(1395, 1500, lambda i: f'effect_slash_arc_{i:02d}', min_area=300)
components(1500, 1600, lambda i: f'effect_burst_{i:02d}', dil=1, min_area=300)
components(1695, 1785, lambda i: f'effect_weapon_streak_{i:02d}', min_area=100)

json.dump(meta, open('data/male_animations.json', 'w'), indent=2)
for p, w, h in written: print(p, w, h)
print(len(written), 'dosya')

# ---- 5. runtime manifest: yazılan her dosya data/asset_manifest.json'a anahtarıyla kaydedilir
mp = 'data/asset_manifest.json'
man = json.load(open(mp))
imgs = {k: v for k, v in man['images'].items() if not (k.startswith('male_') or k.startswith('fx_'))}
for p, _, _ in written:
    base = os.path.basename(p)[:-4]
    imgs[('male_' if '/animations/' in p else 'fx_') + base] = p
man['images'] = dict(sorted(imgs.items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
