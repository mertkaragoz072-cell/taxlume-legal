#!/usr/bin/env python3
"""assets/references/nexora_male_sheet_v2_source.png → ayrı, şeffaf, hizalı PNG kareleri.

Kaynak sheet'te gerçek şeffaflık yok (sahte dama deseni piksellere işlenmiş). Bu betik:
  1. kenardan flood-fill ile nötr (açık gri/beyaz) dama zeminini siler, etiket kutularını atar,
  2. mavi parlamayı (b-r farkı zeminden bağımsız) yarı saydam yapar, kenar renklerini iç renkle yeniden boyar,
  3. her satırı boşluklara göre karelere böler (birleşik kümeleri vadiden böler),
  4. kareleri ortak tuvale (CANVAS) ayak noktasına (PIVOT) göre yerleştirir,
  5. saf efektleri ve tozu ayrı PNG olarak kaydeder, data/male_animations.json ve manifest'i günceller.
Çalıştır: cd CLASHBORN && python3 tools/extract_male_sheet.py   (Pillow, numpy, scipy gerekir)
"""
import json, os, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_male_sheet_v2_source.png'
CANVAS = (224, 176)          # genişlik, yükseklik
PIVOT = (112, 164)           # ayak noktası: x orta, y alttan 12 px yukarı
SCALE = 1.05                 # oyun içi çizim ölçeği (karakter ≈ 89 oyun birimi)
ANIM_DIR = 'assets/characters/male/animations'
FX_DIR = 'assets/effects/attacks'
PART_DIR = 'assets/effects/particles'

A = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
H, W = A.shape[:2]
mx, mn = A.max(2), A.min(2)

# ---- 1. zemin maskesi
neutral = ((mx - mn) < 12) & (mn > 200)
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
    if sl[1].start < 30 and w > 60 and 18 < h < 50:
        labels |= (pl == i)
fg &= ~ndi.binary_dilation(labels, iterations=3)
fg = ndi.binary_opening(fg, iterations=1)
fg[:, :100] = False                                   # etiket sütunu

# ---- 2. alfa + renk
BLUE = (A[..., 2] - A[..., 0]).astype(float)
LUM = A.mean(2)
a_glow = np.where(BLUE > 12, np.clip(BLUE / 60.0, 0, 1), 1.0)
soft = np.clip(ndi.gaussian_filter(ndi.binary_erosion(fg, iterations=1).astype(float), 0.7) * 1.15, 0, 1)
ALPHA = np.where(fg, a_glow * soft, 0)
_blur = ndi.gaussian_filter(ALPHA, 1.3)               # dama kaynaklı bloklaşmayı yumuşat
ALPHA = np.where(ALPHA >= 0.97, ALPHA, np.clip((_blur - 0.15) / 0.85, 0, 1) * ndi.binary_dilation(fg, iterations=2))
inner = (ALPHA >= 0.97) & ndi.binary_erosion(fg, iterations=2)
idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
RGB = np.where(inner[..., None], A, A[idx[0], idx[1]]).astype(np.uint8)   # kenar/halo → en yakın iç renk
BODY = fg & ((BLUE <= 25) | (LUM < 100))                                    # karakter gövdesi (efekt değil)

def trim(arr):
    ys, xs = np.where(arr[..., 3] > 8)
    return None if len(ys) == 0 else arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def save(arr, path, written):
    Image.fromarray(arr, 'RGBA').save(path, optimize=True)
    written.append((path, arr.shape[1], arr.shape[0]))

def place(arr, cx, ground):
    canvas = np.zeros((CANVAS[1], CANVAS[0], 4), np.uint8)
    ox, oy = PIVOT[0] - int(round(cx)), PIVOT[1] - int(round(ground))
    h, w = arr.shape[:2]
    y_lo, y_hi = max(0, -oy), min(h, CANVAS[1] - oy)
    x_lo, x_hi = max(0, -ox), min(w, CANVAS[0] - ox)
    if y_hi > y_lo and x_hi > x_lo:
        canvas[y_lo + oy:y_hi + oy, x_lo + ox:x_hi + ox] = arr[y_lo:y_hi, x_lo:x_hi]
    return Image.fromarray(canvas, 'RGBA')

# ---- 3. satırlar: ad, y0, y1, kare sayısı, önek, mod
ROWS = [
    ('idle',     0, 104, 11, 'idle',     None),
    ('run',    104, 200, 11, 'run',      None),
    ('attack1',200, 302, 10, 'attack_1', 'fx_last1'),
    ('attack2',302, 410,  9, 'attack_2', None),
    ('attack3',410, 514,  8, 'attack_3', 'fx_last4'),
    ('jump',   514, 612,  9, 'jump',     None),
    ('hit',    612, 702,  9, 'hurt',     None),
    ('death',  702, 785,  9, 'death',    None),
    ('turn',   785, 872, 13, 'turn',     None),
]
FPS = {'idle': 8, 'run': 14, 'attack_1': 16, 'attack_2': 16, 'attack_3': 14, 'jump': 10, 'hurt': 10, 'death': 8, 'turn': 10}
LOOP = {'idle': True, 'run': True}

def cell_bounds(y0, y1, n):
    cs = fg[y0:y1].sum(0).astype(float)
    pres = ndi.binary_closing(cs > 0, iterations=2)
    l, _ = ndi.label(pres)
    spans = [[o[0].start, o[0].stop] for o in ndi.find_objects(l) if o[0].stop - o[0].start >= 15]
    while len(spans) > n:                                    # en küçük boşluğu birleştir
        gaps = [spans[i + 1][0] - spans[i][1] for i in range(len(spans) - 1)]
        j = int(np.argmin(gaps)); spans[j:j + 2] = [[spans[j][0], spans[j + 1][1]]]
    while len(spans) < n:                                    # en geniş kümeyi vadiden böl
        j = int(np.argmax([e - s_ for s_, e in spans])); s_, e = spans[j]
        mid = (s_ + e) // 2
        v = mid - 30 + int(np.argmin(cs[mid - 30:mid + 30])); spans[j:j + 1] = [[s_, v], [v, e]]
    return [spans[0][0] - 4] + [(spans[i][1] + spans[i + 1][0]) // 2 for i in range(len(spans) - 1)] + [spans[-1][1] + 4]

def cell_frame(x0, x1, y0, y1):
    mask = np.zeros((H, W), bool); mask[y0:y1, max(0, x0):x1] = fg[y0:y1, max(0, x0):x1]
    # kopuk küçük kırıntıları at (gövdeye ya da büyük efekte bağlı olmayan)
    l, n = ndi.label(ndi.binary_dilation(mask, iterations=2))
    if n:
        sz = ndi.sum(mask, l, range(1, n + 1))
        keep = [i + 1 for i in range(n) if sz[i] >= 40]
        for i, sl in enumerate(ndi.find_objects(l), 1):         # bant üst/alt kenarına değen küçük kalıntı (komşu satırdan taşan)
            if i in keep and sz[i - 1] < 400 and (sl[0].start <= y0 or sl[0].stop >= y1 - 1): keep.remove(i)
        mask &= np.isin(l, keep)
    sub = (slice(y0, y1), slice(max(0, x0), x1))
    al = np.where(mask[sub], ALPHA[sub], 0)
    return np.dstack([RGB[sub], (al * 255).astype(np.uint8)]), mask[sub] & BODY[sub]

os.makedirs(ANIM_DIR, exist_ok=True); os.makedirs(FX_DIR, exist_ok=True); os.makedirs(PART_DIR, exist_ok=True)
for d in (ANIM_DIR, FX_DIR, PART_DIR):
    for f in glob.glob(f'{d}/*.png'): os.remove(f)
meta = {'canvas': list(CANVAS), 'pivot': list(PIVOT), 'facing': 'right', 'scale': SCALE, 'animations': {}}
written = []

for name, y0, y1, n, prefix, mode in ROWS:
    b = cell_bounds(y0, y1, n)
    pre = [cell_frame(b[i], b[i + 1], y0, y1) for i in range(n)]
    fx_from = {'fx_last1': n - 1, 'fx_last4': n - 4}.get(mode, n)
    # zemin: gövde alt kenarlarının medyanı (havadaki kareler zeminden farklı kalır)
    ground = int(np.median([np.where(bd.any(1))[0].max() for i, (_, bd) in enumerate(pre) if bd.any() and i < fx_from]))
    frames, k = [], 0
    for i, (arr, body) in enumerate(pre):
        if i >= fx_from:
            t = trim(arr)
            if t is not None:
                j = i - fx_from + 1
                fxn = f'attack_1_slash' if mode == 'fx_last1' else f'attack_3_burst_{j:02d}'
                save(t, f'{FX_DIR}/{fxn}.png', written)
            continue
        k += 1
        xs = np.where(body.any(0))[0]
        cx = (xs.min() + xs.max()) / 2 if len(xs) else arr.shape[1] / 2
        fn = f'{prefix}_{k:02d}'
        place(arr, cx, ground).save(f'{ANIM_DIR}/{fn}.png', optimize=True)
        written.append((f'{ANIM_DIR}/{fn}.png', *CANVAS)); frames.append(fn)
    meta['animations'][prefix] = {'frames': frames, 'fps': FPS[prefix], 'loop': LOOP.get(prefix, False)}

# ---- 4. saf efekt satırları (bağlı bileşenler, soldan sağa). Mavi → efekt, bej/gri → toz particle
def components(y0, y1, dil=2, min_area=120):
    m = np.zeros_like(fg); m[y0:y1] = fg[y0:y1]
    l, _ = ndi.label(ndi.binary_dilation(m, iterations=dil))
    out = []
    for sl in sorted(ndi.find_objects(l), key=lambda s: s[1].start):
        sel = fg[sl] & m[sl]
        if sel.sum() < min_area: continue
        arr = trim(np.dstack([RGB[sl], (np.where(m[sl], ALPHA[sl], 0) * 255).astype(np.uint8)]))
        if arr is not None: out.append((arr, BLUE[sl][sel].mean() >= 25))
    return out

# adlar sheet sırasına göredir (soldan sağa); sayılar bu sheet için sabittir
FX_ROW = ['effect_slash_arc_01', 'effect_slash_arc_02', 'effect_slash_arc_03', 'effect_slash_arc_04', 'effect_slash_arc_pair',
          'effect_ring_wave', 'effect_burst_01', 'effect_burst_02', 'effect_spike_01', 'effect_spike_02']
DUST_ROW = ['particle_dust_cloud_01', 'particle_dust_cloud_02', 'particle_dust_puff_01', 'particle_dust_puff_02'] + \
           [f'particle_debris_{i:02d}' for i in range(1, 12)]
WFX_ROW = ['effect_weapon_streak_01', 'effect_weapon_streak_02', 'effect_weapon_streak_03', 'effect_weapon_streak_04',
           'effect_weapon_streak_05', 'effect_weapon_starburst', 'effect_weapon_streak_06', 'effect_weapon_streak_07', 'effect_weapon_ring']

def emit(items, blue_names, dust_names):
    bi = di = 0
    for arr, is_blue in items:
        if is_blue:
            nm = blue_names[bi]; bi += 1
        else:
            nm = dust_names[di]; di += 1
        save(arr, f"{FX_DIR if is_blue else PART_DIR}/{nm}.png", written)
    print('uyarı: beklenmeyen sayı' if (bi != len(blue_names) and blue_names != WFX_ROW) else '', bi, di)

emit(components(872, 955, min_area=150), FX_ROW, DUST_ROW)
emit(components(955, 1024, min_area=60), WFX_ROW, [])

json.dump(meta, open('data/male_animations.json', 'w'), indent=2)

# ---- 5. runtime manifest
mp = 'data/asset_manifest.json'
man = json.load(open(mp))
imgs = {k: v for k, v in man['images'].items() if not k.startswith(('male_', 'fx_', 'particle_'))}
for p, _, _ in written:
    base = os.path.basename(p)[:-4]
    imgs[('male_' if '/animations/' in p else 'particle_' if '/particles/' in p else 'fx_') + base] = p
man['images'] = dict(sorted(imgs.items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
for p, w, h in written: print(p, w, h)
print(len(written), 'dosya')
