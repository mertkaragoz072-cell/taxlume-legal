#!/usr/bin/env python3
"""assets/references/nexora_world_props_source.png → ayrı şeffaf PNG'ler (bulut, ada, prop).

Kaynak gerçek alfa kanallıdır. Üst yarıdaki büyük panorama bir kompozisyon/mood görseli olduğu için
kesilmez (referans olarak kalır); alt şeritteki tekil sprite'lar bağlı bileşenlerle ayrılır.
Çalıştır: cd NEXORA && python3 tools/extract_world_props.py   (Pillow, numpy, scipy gerekir)
"""
import glob, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_world_props_source.png'
OUT = {'cloud': 'assets/environment/background/clouds', 'island': 'assets/environment/background/islands',
       'prop': 'assets/environment/props'}
STRIP_Y = 505                  # panoramanın bittiği yerden sonrası: tekil sprite şeridi

im = Image.open(SRC).convert('RGBA')
A = np.asarray(im).copy()
A[..., 3] = np.where(A[..., 3] < 12, 0, A[..., 3])          # çok soluk kenar kırıntısını temizle
al = A[..., 3]
m = al > 40; m[:STRIP_Y] = False
lab, n = ndi.label(ndi.binary_dilation(m, iterations=1))
objs = [(i + 1, o) for i, o in enumerate(ndi.find_objects(lab))]
objs = sorted([t for t in objs if m[t[1]].sum() > 60], key=lambda t: t[1][1].start)
print('bileşen:', len(objs))

# kullanıcının gördüğü sıraya göre (soldan sağa) adlar; sayı kontrol edilir
clouds = [f'cloud_{i:02d}' for i in range(1, 7)]
islands = [f'island_{i:02d}' for i in range(1, 8)]
props = ['bush_large_front', 'pine_large', 'rock_medium_01', 'pine_small', 'rock_medium_02', 'rock_small_01',
         'bush_01', 'bush_02', 'fence_long', 'bush_03', 'rock_large_01', 'fence_broken', 'bush_04', 'rock_large_02',
         'haystack', 'chest_01', 'rock_small_02', 'flower_pink', 'signpost', 'chest_02', 'flower_white',
         'club_spiked', 'grass_tuft_02', 'grass_tuft_01']
print(len(clouds), len(islands), len(props))
for d in OUT.values():
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(f'{d}/*.png'): os.remove(f)

def save(sl, name, kind, mask=None):
    sub = A[sl].copy()
    if mask is not None: sub[..., 3] = np.where(mask, sub[..., 3], 0)
    ys, xs = np.where(sub[..., 3] > 8)
    sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(sub, 'RGBA').save(f'{OUT[kind]}/{name}.png', optimize=True)
    return {'file': f'{OUT[kind]}/{name}.png', 'size': [sub.shape[1], sub.shape[0]]}

# x sırasına göre: ilk 6 bulut, sonraki 7 ada, kalan 24 prop
res = {}
seq = [(c, 'cloud') for c in clouds] + [(i_, 'island') for i_ in islands] + [(p, 'prop') for p in props]
if len(objs) != len(seq):
    raise SystemExit(f'beklenen {len(seq)} bileşen, bulunan {len(objs)} — adlandırma listesini güncelle')
for (lid, o), (name, kind) in zip(objs, seq):
    own = ndi.binary_dilation(lab[o] == lid, iterations=3)       # yalnız kendi bileşeni (komşu sprite parçalarını alma)
    res[name] = {'kind': kind, **save(o, name, kind, mask=own)}
json.dump(res, open('/tmp/world_props_sizes.json', 'w'), indent=1)
for k, v in res.items(): print(k, v['size'])

# ---- data/world_props.json: oyunda çizim ölçüleri (hedef yükseklik, oyun birimi; kahraman ≈ 98) ve yerleşim kuralları
H = {'pine_large': 200, 'pine_small': 145, 'bush_large_front': 64, 'bush_01': 52, 'bush_02': 52, 'bush_03': 48, 'bush_04': 50,
     'rock_small_01': 22, 'rock_small_02': 24, 'rock_medium_01': 40, 'rock_medium_02': 42, 'rock_large_01': 58, 'rock_large_02': 56,
     'fence_long': 58, 'fence_broken': 58, 'haystack': 66, 'chest_01': 46, 'chest_02': 44, 'signpost': 80, 'club_spiked': 100,
     'flower_pink': 18, 'flower_white': 16, 'grass_tuft_01': 26, 'grass_tuft_02': 22}
world = {
    '_comment': 'Pivot = sprite alt orta noktası (zemine basan nokta). height = oyundaki hedef yükseklik (birim). '
                'decor: yüzeye saçılan prop grupları (every = ortalama aralık, birim; depth = yüzeyin ne kadar önünde, birim; '
                'layer back = karakterlerin arkası, front = önü). Bulut/ada: parallax.',
    'props': {}, 'decor': [], 'clouds': {'keys': clouds, 'heightScale': 1.0},
    'islandLayers': [],
}
for k, v in res.items():
    if v['kind'] == 'prop':
        w, h = v['size']
        world['props'][k] = {'file': v['file'], 'pivot': [w // 2, h - 1], 'height': H[k]}
world['decor'] = [
    {'keys': ['pine_large', 'pine_small'], 'every': 560, 'scale': [0.85, 1.15], 'depth': [0, 0], 'layer': 'back'},
    {'keys': ['fence_long', 'fence_broken'], 'every': 900, 'scale': [0.9, 1.1], 'depth': [0, 8], 'layer': 'back'},
    {'keys': ['chest_01', 'chest_02', 'haystack', 'signpost'], 'every': 2600, 'scale': [0.95, 1.05], 'depth': [0, 10], 'layer': 'back'},
    {'keys': ['bush_01', 'bush_02', 'bush_03', 'bush_04', 'bush_large_front'], 'every': 240, 'scale': [0.8, 1.25], 'depth': [0, 12], 'layer': 'back'},
    {'keys': ['grass_tuft_01', 'grass_tuft_02', 'flower_pink', 'flower_white'], 'every': 70, 'scale': [0.9, 1.4], 'depth': [-2, 18], 'layer': 'back'},
    {'keys': ['rock_small_01', 'rock_small_02', 'rock_medium_01', 'rock_medium_02'], 'every': 420, 'scale': [0.9, 1.3], 'depth': [10, 28], 'layer': 'back'},
    {'keys': ['rock_small_01', 'rock_small_02', 'rock_medium_01', 'bush_01', 'bush_03'], 'every': 520, 'scale': [0.8, 1.1], 'depth': [66, 118], 'layer': 'front'},   # karakter ayaklarının altında kalır, hiçbir karakteri örtmez
]
# [anahtar, x oranı (periyot içinde), y oranı (ufuktan yukarı, 0=ufuk 1=üst), yükseklik birim]
world['islandLayers'] = [
    {'id': 'islands_far', 'speed': 0.03, 'period': 1500, 'alpha': 0.85,
     'items': [['island_02', 0.06, 0.62, 120], ['island_05', 0.30, 0.82, 100], ['island_07', 0.52, 0.55, 110],
               ['island_04', 0.74, 0.78, 105], ['island_03', 0.92, 0.50, 125]]},
    {'id': 'islands_mid', 'speed': 0.07, 'period': 1300, 'alpha': 1.0,
     'items': [['island_01', 0.15, 0.55, 230], ['island_06', 0.62, 0.40, 175]]},
]
json.dump(world, open('data/world_props.json', 'w'), indent=2, ensure_ascii=False); open('data/world_props.json', 'a').write('\n')

# ---- runtime manifest
mp = 'data/asset_manifest.json'
man = json.load(open(mp))
imgs = {k: v for k, v in man['images'].items() if not k.startswith(('bg_', 'prop_'))}
for k, v in res.items():
    imgs[('bg_' if v['kind'] != 'prop' else 'prop_') + k] = v['file']
man['images'] = dict(sorted(imgs.items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
