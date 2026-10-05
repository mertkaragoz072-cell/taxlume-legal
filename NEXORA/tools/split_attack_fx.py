#!/usr/bin/env python3
"""Saldırı karelerindeki gömülü mavi kılıç efektini gövdeden ayırır (orijinal kareler DEĞİŞMEZ).
assets/characters/male/animations/attack_N_MM.png → layers/attack_N_MM_body.png + layers/attack_N_MM_fx.png
Oyun, efekt katmanını küçülterek (data/config.json → player.slashFxScale) kılıç ucuna sabitleyerek çizer.
Efekt = mavi/parlak, gövde dış hattı ve koyu pikseller hariç. data/male_animations.json 'fxAnchor' (kare başına
efektin gövdeye en yakın noktası, tuval px) ve manifest güncellenir. Çalıştır: python3 tools/split_attack_fx.py
"""
import glob, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = 'assets/characters/male/animations'; L = f'{D}/layers'
os.makedirs(L, exist_ok=True)
for f in glob.glob(f'{L}/*.png'): os.remove(f)
meta = json.load(open('data/male_animations.json')); man = json.load(open('data/asset_manifest.json'))
man['images'] = {k: v for k, v in man['images'].items() if not k.startswith(('malefx_', 'malebody_'))}
anchors = {}
for an in [k for k in meta['animations'] if k.startswith('attack_')]:
    for fr in meta['animations'][an]['frames']:
        a = np.asarray(Image.open(f'{D}/{fr}.png').convert('RGBA')).astype(int)
        alpha = a[..., 3] > 20
        blue = (a[..., 2] - a[..., 0]) > 28
        lum = a[..., :3].mean(2)
        cand = alpha & blue & (lum > 110)                    # parlak mavi (efekt); koyu outline/gövde değil
        cand = ndi.binary_opening(cand, iterations=1)
        # yalnızca yeterince büyük efekt bileşenleri (kılıç bıçağındaki küçük mavi vurgular gövdede kalsın)
        lab, n = ndi.label(ndi.binary_dilation(cand, iterations=2))
        fx = np.zeros_like(cand)
        for i in range(1, n + 1):
            comp = (lab == i) & cand
            if comp.sum() >= 90: fx |= comp
        # beyaz çekirdek: gövdeden (koyu/renkli piksellerden) büyük ölçüde ayrı, parlak bileşenler de efekttir
        core = ndi.binary_dilation(alpha & (lum < 135), iterations=2)
        bright = alpha & (lum > 190) & ~fx
        lb, nb = ndi.label(ndi.binary_dilation(bright, iterations=1))
        for i in range(1, nb + 1):
            comp = (lb == i) & bright
            if comp.sum() >= 40 and (comp & core).sum() < 0.25 * comp.sum(): fx |= comp
        fx = ndi.binary_dilation(fx, iterations=1) & alpha     # kenar halkasını da efektle birlikte al
        body = alpha & ~fx
        for name, m in (('body', body), ('fx', fx)):
            out = a.copy().astype(np.uint8); out[..., 3] = np.where(m, a[..., 3], 0)
            Image.fromarray(out, 'RGBA').save(f'{L}/{fr}_{name}.png', optimize=True)
            man['images'][f'male{name}_{fr}'] = f'{L}/{fr}_{name}.png'
        # çapa: efektin gövdeye en yakın noktası (kılıcın çıktığı yer)
        if fx.any() and body.any():
            dist = ndi.distance_transform_edt(~body)
            ys, xs = np.where(fx); j = int(np.argmin(dist[ys, xs]))
            anchors[fr] = [int(xs[j]), int(ys[j])]
        print(fr, 'fx px', int(fx.sum()), 'anchor', anchors.get(fr))
meta['fxAnchor'] = anchors
json.dump(meta, open('data/male_animations.json', 'w'), indent=2); open('data/male_animations.json', 'a').write('\n')
man['images'] = dict(sorted(man['images'].items()))
json.dump(man, open('data/asset_manifest.json', 'w'), indent=2, ensure_ascii=False); open('data/asset_manifest.json', 'a').write('\n')
