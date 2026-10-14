"""Efekt (yay/patlama) çevresindeki izole koyu kırıntıları siler (kare dosyaları yerinde düzenlenir; trim_frames.py'den önce/sonra çalışabilir).
Kural: alfa>40, max kanal<70, kırmızı/ten tonu değil, bağlı bileşen alanı<160 px VE parlak efekt rengine (mavi/yeşil/mor/turuncu çekirdek) ≤14 px yakın → silinir.
Kullanım: python3 tools/clean_fx_fragments.py male_hd_attack enemy_goblin_scout_hd_attack ...   (manifest anahtar öneki)"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..'); man = json.load(open(os.path.join(ROOT, 'data/asset_manifest.json'))); im = man['images']
n = 0
for k, p in im.items():
    if not any(k.startswith(x) for x in sys.argv[1:]): continue
    f = os.path.join(ROOT, p); a = np.array(Image.open(f).convert('RGBA')); r, g, b, al = (a[..., i].astype(int) for i in range(4)); mx = np.maximum(np.maximum(r, g), b)
    core = (al > 120) & (mx > 170) & (((b - r) > 60) | ((g - r) > 50) | ((r - b) > 110) | ((b - g > 70) & (r > 130)))
    if core.sum() < 30: continue
    near = ndi.binary_dilation(core, iterations=14)
    dark = (al > 40) & (mx < 70) & ~((r > b + 10) & (r > 60))
    lab, c = ndi.label(dark, structure=np.ones((3, 3)))
    if not c: continue
    ar = ndi.sum(dark, lab, range(1, c + 1)); rm = [i + 1 for i, x in enumerate(ar) if x < 160 and near[lab == i + 1].mean() > 0.5]
    if rm:
        m = ndi.binary_dilation(np.isin(lab, rm), iterations=1) & (mx < 90); a[m] = 0; Image.fromarray(a, 'RGBA').save(f); n += int(m.sum())
print('silinen piksel', n)
