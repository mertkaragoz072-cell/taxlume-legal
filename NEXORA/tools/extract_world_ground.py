#!/usr/bin/env python3
"""assets/references/nexora_world_ground_source.png → zemin sprite'ları.

Kaynak sahte dama zeminli RGB (gerçek alfa yok): zemin kenardan flood-fill ile silinir.
Çıktılar:
  assets/environment/ground/hill_ground.png     tam tepe, şeffaf, kırpılmış (referans/landmark)
  assets/environment/ground/ground_tile_grass.png  dikişsiz (ayna-döşeme) çim dokusu; oyunda zemin deseni
Çalıştır: cd NEXORA && python3 tools/extract_world_ground.py   (Pillow, numpy, scipy gerekir)
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_world_ground_source.png'
A = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
mx, mn = A.max(2), A.min(2)
neutral = ((mx - mn) < 18) & (mn > 170)
lab, _ = ndi.label(neutral)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = ~np.isin(lab, list(border))
fg = ndi.binary_opening(fg, iterations=2)
l2, n2 = ndi.label(fg); sz = ndi.sum(fg, l2, range(1, n2 + 1))
fg = l2 == (int(np.argmax(sz)) + 1)                      # en büyük bileşen = tepe
fg = ndi.binary_fill_holes(fg)
soft = np.clip(ndi.gaussian_filter(ndi.binary_erosion(fg, iterations=1).astype(float), 0.7) * 1.15, 0, 1)
inner = ndi.binary_erosion(fg, iterations=2)
idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
rgb = np.where(inner[..., None], A, A[idx[0], idx[1]]).astype(np.uint8)
rgba = np.dstack([rgb, (soft * np.where(fg, 1, 0) * 255).astype(np.uint8)])
ys, xs = np.where(rgba[..., 3] > 8)
hill = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(hill, 'RGBA').save('assets/environment/ground/hill_ground.png', optimize=True)
print('hill', hill.shape[1], hill.shape[0])

# ---- dikişsiz çim dokusu: kayasız/çalısız iç bölgeden kırp, 4 ayna kopyasıyla döşe
H, W = hill.shape[:2]
import sys
BOX = tuple(json.loads(sys.argv[1])) if len(sys.argv) > 1 else (1068, 148, 1260, 188)   # kayasız/çalısız/topraksız düz çim bölgesi (ayna döşemede zikzak oluşmasın)
x0, y0, x1, y1 = BOX
R = hill[y0:y1, x0:x1, :3]
assert (hill[y0:y1, x0:x1, 3] > 250).all(), 'doku bölgesi tamamen opak olmalı'
top = np.concatenate([R, R[:, ::-1]], axis=1)
tile = np.concatenate([top, top[::-1]], axis=0)
Image.fromarray(tile, 'RGB').save('assets/environment/ground/ground_tile_grass.png', optimize=True)
print('tile', tile.shape[1], tile.shape[0], 'kutu', BOX)

mp = 'data/asset_manifest.json'
man = json.load(open(mp))
man['images']['ground_hill'] = 'assets/environment/ground/hill_ground.png'
man['images']['ground_tile'] = 'assets/environment/ground/ground_tile_grass.png'
man['images'] = dict(sorted(man['images'].items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
