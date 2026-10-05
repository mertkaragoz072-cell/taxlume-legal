#!/usr/bin/env python3
"""assets/references/nexora_camera_gameplay_reference.png → düşman sprite'ları.

Kaynak: referans moodboard'un "KARAKTER VE NESNELERİN BOYUT ORANI" paneli (düz koyu lacivert zemin, gerçek alfa yok).
Üç düşman (küçük goblin, orta goblin, büyük ogre) zemin renginden flood-fill ile ayrılır, ince boy çizgileri silinir,
2× Lanczos büyütülür ve şeffaf PNG olarak kaydedilir. Her biri TEK STATİK POZ'dur (animasyon karesi yok; oyunda
prosedürel salınım/ezilme/parlama ile canlandırılır). Çözünürlük düşüktür (kaynakta 55–100 px).
Çalıştır: cd NEXORA && python3 tools/extract_enemies.py   (Pillow, numpy, scipy gerekir)
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

SRC = 'assets/references/nexora_camera_gameplay_reference.png'
OUT = 'assets/enemies'
UP = 2
# ad: (x0, y0, x1, y1) kaynak piksel kutusu — zemin çizgisinin (y≈946) üstünde bitirilir
BOXES = {
    'goblin_scout':   (858, 890, 928, 946),
    'goblin_warrior': (950, 872, 1026, 946),
    'ogre_brute':     (1010, 848, 1142, 946),
}
im = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
os.makedirs(OUT, exist_ok=True)
info = {}
for name, (x0, y0, x1, y1) in BOXES.items():
    c = im[y0:y1, x0:x1]
    h, w = c.shape[:2]
    border = np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]])
    bgc = np.median(border, axis=0)
    dist = np.sqrt(((c - bgc) ** 2).sum(2))
    navy = ((c[..., 2] - c[..., 0]) > 14) & (c.max(2) < 100)          # koyu lacivert panel zemini (dış hat kahverengi: r ≥ b)
    bgmask = (dist < 30) | navy
    lab, _ = ndi.label(bgmask)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    fg = ~bg
    # ince yatay boy çizgilerini sil: 3 px'ten ince dikey yapıları aç
    fg = ndi.binary_opening(fg, structure=np.ones((3, 1)))
    fg = ndi.binary_opening(fg, iterations=1)
    l2, n2 = ndi.label(ndi.binary_dilation(fg, iterations=2))
    sz = ndi.sum(fg, l2, range(1, n2 + 1))
    fg = np.isin(l2, [int(np.argmax(sz)) + 1]) & ndi.binary_dilation(fg, iterations=2)   # tek büyük bileşen
    fg = ndi.binary_fill_holes(fg) & ~navy                  # kapalı kalan panel zemini parçalarını da at
    fg = ndi.binary_opening(fg, iterations=1)
    # kenar renk arındırma: zemine karışan kenarı iç renkle doldur
    inner = ndi.binary_erosion(fg, iterations=1)
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    rgb = np.where(inner[..., None], c, c[idx[0], idx[1]]).astype(np.uint8)
    alpha = (ndi.gaussian_filter(fg.astype(float), 0.6) * 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    ys, xs = np.where(alpha > 20)
    img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    img = img.resize((img.width * UP, img.height * UP), Image.LANCZOS)
    r, g, b, a = img.split()
    rgb_s = Image.merge('RGB', (r, g, b)).filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    from PIL import ImageEnhance
    rgb_s = ImageEnhance.Brightness(ImageEnhance.Color(rgb_s).enhance(1.18)).enhance(1.14)   # panel küçültülmüş/soluk: karakter paletine yaklaştır
    img = Image.merge('RGBA', (*rgb_s.split(), a))
    path = f'{OUT}/enemy_{name}_idle.png'
    img.save(path, optimize=True)
    info[name] = {'file': path, 'size': list(img.size)}
    print(name, img.size)

mp = 'data/asset_manifest.json'
man = json.load(open(mp))
man['images'] = {k: v for k, v in man['images'].items() if not k.startswith('enemy_')}
for n, v in info.items(): man['images'][f'enemy_{n}'] = v['file']
man['images'] = dict(sorted(man['images'].items()))
json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
