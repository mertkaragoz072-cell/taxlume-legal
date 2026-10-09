#!/usr/bin/env python3
"""assets/references/nexora_female_sheet_source.png → kadın savaşçı kareleri (v2 sheet: gerçek alfa kanallı, kareler birbirine yakın).
Çıktı (erkekle aynı biçim): assets/characters/female/animations/<anim>_NN.png (+ layers/*_body|_fx.png), portre, gölge,
sağ paneldeki saf efektler → assets/effects/attacks/female_*.png, data/female_animations.json, manifest anahtarları female_*.
Çalıştır: cd CLASHBORN && python3 tools/extract_female_sheet.py
"""
import glob, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_female_sheet_v2_source.png'   # 1500×500, gerçek alfa kanallı
CANVAS = (280, 190); PIVOT = (100, 180); SCALE = 0.86   # kaynak kareler ≈ 105 px boy; oyunda ≈ 90 birim
AD = 'assets/characters/female/animations'; LD = f'{AD}/layers'; PD = 'assets/characters/female/portraits'; FD = 'assets/effects/attacks'
IM = np.asarray(Image.open(SRC).convert('RGBA')).astype(int); H, W = IM.shape[:2]
A = IM[..., :3]; AL = IM[..., 3] / 255.0
mx = A.max(2); BLUE = (A[..., 2] - A[..., 0]).astype(float); LUM = A.mean(2)
fg = AL > 0.25
fg[:, :62] = False                                                       # sol etiket sütunu
fg = ndi.binary_opening(fg, iterations=1)
EFFECT = fg & (BLUE > 40) & (A[..., 2] > 150)                             # mavi efekt
alpha = AL.copy()
RGB = A.astype(np.uint8)

def rgba(x0, y0, x1, y1, mask=None):
    al = alpha[y0:y1, x0:x1] if mask is None else np.where(mask, alpha[y0:y1, x0:x1], 0)
    return np.dstack([RGB[y0:y1, x0:x1], (al * 255).astype(np.uint8)])

def trim(arr):
    ys, xs = np.where(arr[..., 3] > 8)
    return None if len(ys) == 0 else arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# anim: (y0, y1, kare merkezleri, FPS, loop)
ROWS = {
    'idle':   (0, 130, [118, 231, 344, 457, 570, 683, 796, 909], 8, True),
    'run':    (130, 236, [118, 231, 344, 457, 570, 683, 796, 909], 14, True),
    'attack': (236, 346, [130, 270, 440, 660, 900], 7, False),
    'hurt':   (346, 430, [108, 215, 325, 440, 555, 670], 9, False),
    'death':  (430, 500, [110, 255, 395, 545, 710], 6, False),
}
def cuts(y0, y1, centers):
    cs = fg[y0:y1].sum(0).astype(float)
    c = [max(62, centers[0] - 70)]
    for a, b in zip(centers, centers[1:]):
        mid = (a + b) // 2; lo, hi = mid - 28, mid + 28
        c.append(lo + int(np.argmin(cs[lo:hi])))
    c.append(min(975, centers[-1] + 90)); return c

def place(arr, cx, ground):
    cv = np.zeros((CANVAS[1], CANVAS[0], 4), np.uint8)
    ox, oy = PIVOT[0] - int(round(cx)), PIVOT[1] - int(round(ground)); h, w = arr.shape[:2]
    y0, y1 = max(0, -oy), min(h, CANVAS[1] - oy); x0, x1 = max(0, -ox), min(w, CANVAS[0] - ox)
    if y1 > y0 and x1 > x0: cv[y0 + oy:y1 + oy, x0 + ox:x1 + ox] = arr[y0:y1, x0:x1]
    return cv

for d in (AD, LD, PD):
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(f'{d}/*.png'): os.remove(f)
meta = {'canvas': list(CANVAS), 'pivot': list(PIVOT), 'facing': 'right', 'scale': SCALE, 'animations': {}, 'fxAnchor': {}}
man = json.load(open('data/asset_manifest.json'))
man['images'] = {k: v for k, v in man['images'].items() if not k.startswith(('female_', 'femalebody_', 'femalefx_', 'fx_female_fx_'))}

# ground: idle gövdesinin alt kenarı (yürüme/idle karelerinin medyanı); diğer animasyonlarda kendi kare altı
BODYM = fg & ~EFFECT
frames_all = {}
for an, (y0, y1, cen, fps, loop) in ROWS.items():
    cc = [62, 200, 340, 568, 815, 1045] if an == 'attack' else cuts(y0, y1, cen)   # saldırıda efektler komşu kareye taşar: elle sınır
    lst = []
    for i in range(len(cen)):
        x0, x1 = cc[i], cc[i + 1]
        m = fg[y0:y1, x0:x1]
        l, n = ndi.label(m)
        if n:
            sz = ndi.sum(m, l, range(1, n + 1)); big = sz.max()
            keep = []
            for j, sl in enumerate(ndi.find_objects(l)):
                touch = sl[1].start <= 1
                if sz[j] >= 25 and not (touch and sz[j] < 0.5 * big): keep.append(j + 1)   # komşu karenin kılıç parçası
            mainsl = ndi.find_objects(l)[int(np.argmax(sz))]
            keep = [k_ for k_ in keep if ndi.find_objects(l)[k_ - 1][1].stop > mainsl[1].start + 3]   # ana gövdenin solunda kalan parçaları at
            m = np.isin(l, keep) & m
        cs_ = m.sum(0); thick = np.where(cs_ >= 14)[0]                 # gövde/saç kalın kolonlar
        if len(thick): m = m.copy(); m[:, :max(0, thick[0] - 2)] = False   # solundaki ince kılıç ucu = komşu kareden taşan
        arr = rgba(x0, y0, x1, y1, m); body = m & BODYM[y0:y1, x0:x1]
        lst.append((arr, body))
    frames_all[an] = lst
gb = [np.where(b.any(1))[0].max() for an in ('idle', 'run') for _, b in frames_all[an] if b.any()]
gl = {an: int(np.median([np.where(b.any(1))[0].max() for _, b in frames_all[an] if b.any()])) for an in frames_all}
written = []
for an, (y0, y1, cen, fps, loop) in ROWS.items():
    names = []
    for k, (arr, body) in enumerate(frames_all[an], 1):
        xs = np.where(body.any(0))[0]
        # gövde merkezi: baş/gövde kolonları (kılıç ve efekt hariç) — yatay uzunluk yerine gövde yoğunluğuna göre
        colsum = body.sum(0).astype(float); cx = (np.arange(len(colsum)) * colsum).sum() / max(colsum.sum(), 1)
        gnd = np.where(body.any(1))[0].max() if an in ('death',) else gl[an]
        cv = place(arr, cx, gnd); fn = f'{an}_{k:02d}'
        Image.fromarray(cv, 'RGBA').save(f'{AD}/{fn}.png', optimize=True); written.append(f'{AD}/{fn}.png'); names.append(fn)
        man['images'][f'female_{fn}'] = f'{AD}/{fn}.png'
        if an == 'attack':                                         # gömülü efekti gövdeden ayır (oyunda küçültülür)
            al = cv[..., 3] > 20; blue = (cv[..., 2].astype(int) - cv[..., 0]) > 28; lum = cv[..., :3].mean(2)
            fxm = al & blue
            lb, nb = ndi.label(ndi.binary_dilation(fxm, iterations=2)); fx = np.zeros_like(fxm)
            for i in range(1, nb + 1):
                comp = (lb == i) & fxm
                if comp.sum() >= 90: fx |= comp
            fx = ndi.binary_dilation(fx, iterations=1) & al; bd = al & ~fx
            for nm, mm in (('body', bd), ('fx', fx)):
                o = cv.copy(); o[..., 3] = np.where(mm, cv[..., 3], 0)
                Image.fromarray(o, 'RGBA').save(f'{LD}/{fn}_{nm}.png', optimize=True); man['images'][f'female{nm}_{fn}'] = f'{LD}/{fn}_{nm}.png'
            if fx.any() and bd.any():
                dist = ndi.distance_transform_edt(~bd); ys, xs = np.where(fx); j = int(np.argmin(dist[ys, xs]))
                meta['fxAnchor'][fn] = [int(xs[j]), int(ys[j])]
    meta['animations'][an] = {'frames': names, 'fps': fps, 'loop': loop}
meta['animations']['attack']['impact'] = 0.6

# portre (ilk büyük daire) + saf efektler + gölgeler (sağ panel)
def comps(x0, y0, x1, y1, mn=150, dil=2):
    m = np.zeros_like(fg); m[y0:y1, x0:x1] = fg[y0:y1, x0:x1]
    l, n = ndi.label(ndi.binary_dilation(m, iterations=dil)); out = []
    for sl in sorted(ndi.find_objects(l), key=lambda s: (s[0].start // 120, s[1].start)):
        if (m[sl]).sum() >= mn: out.append(sl)
    return out
pt = comps(975, 32, 1125, 175, 3000)
if pt:
    sl = pt[0]; t = trim(rgba(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)); Image.fromarray(t, 'RGBA').save(f'{PD}/female_portrait.png', optimize=True)
    man['images']['female_portrait'] = f'{PD}/female_portrait.png'
fxs = comps(1040, 185, 1500, 420, 150)
for i, sl in enumerate(fxs, 1):
    t = trim(rgba(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    if t is not None:
        Image.fromarray(t, 'RGBA').save(f'{FD}/female_fx_{i:02d}.png', optimize=True); man['images'][f'fx_female_fx_{i:02d}'] = f'{FD}/female_fx_{i:02d}.png'
json.dump(meta, open('data/female_animations.json', 'w'), indent=2); open('data/female_animations.json', 'a').write('\n')
man['images'] = dict(sorted(man['images'].items()))
json.dump(man, open('data/asset_manifest.json', 'w'), indent=2, ensure_ascii=False); open('data/asset_manifest.json', 'a').write('\n')
print({k: len(v['frames']) for k, v in meta['animations'].items()}, 'fx', len(fxs), 'anchors', len(meta['fxAnchor']), 'portre', bool(pt))
