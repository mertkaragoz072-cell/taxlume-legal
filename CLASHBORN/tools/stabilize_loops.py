"""Döngü animasyonlarında (yürüme/bekleme/koşu) kareler arası yatay titremeyi giderir.
Sorun: yapay zekâ çizimi sayfalarda her kare baştan çizildiği için gövde merkezi kareden kareye 3–15 birim zıplar → oyunda "titreme".
Yöntem: her karenin gövde merkezi (yüksekliğin %35–70'i, alfa>150) ölçülür; döngüsel hareketli ortalama (pencere 9) ile düzleştirilir; fark kadar kare yatay kaydırılır
(kaydırma `data/asset_manifest.json → trim` kaydındaki ox değerine eklenir, dosya değişmez; `stab` kaydı idempotansı sağlar). En fazla ±14 px.
Kullanım (kare üretildikten / trim_frames.py'den SONRA): python3 tools/stabilize_loops.py"""
import os, json
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..'); mp = os.path.join(ROOT, 'data/asset_manifest.json'); man = json.load(open(mp)); im = man['images']; trim = man.setdefault('trim', {}); stab = man.setdefault('stab', {})
WIN, CLIP = 9, 14
def sets():
    E = json.load(open(os.path.join(ROOT, 'data/enemy_animations.json')))
    for ty, e in E.items():
        if 'walk' in e['anims']: yield ty + '/walk', e['anims']['walk']['frames']
    M = json.load(open(os.path.join(ROOT, 'data/male_animations.json')))['animations']
    for an in ('idle', 'run'): yield 'male/' + an, ['male_' + f for f in M[an]['frames']]
    H = json.load(open(os.path.join(ROOT, 'data/heroine_animations.json')))['animations']
    for an in ('idle', 'run'):
        if H[an].get('frames') and not H[an].get('procedural'): yield 'heroine/' + an, H[an]['frames']
def center(key):
    p = os.path.join(ROOT, im[key]); img = Image.open(p).convert('RGBA'); t = trim.get(key)
    if t and img.size == (t[4], t[5]): base_ox = t[2] - stab.get(key, 0); ox, oy, W, H = base_ox, t[3], t[0], t[1]
    else: ox = oy = 0; W, H = img.size; t = None; base_ox = 0
    a = np.array(img)[..., 3] > 150; ys, xs = np.where(a)
    if not len(ys): return None
    top, bot = ys.min(), ys.max(); h = bot - top; band = (ys > top + 0.35 * h) & (ys < top + 0.7 * h)
    return xs[band].mean() + ox, (W, H, base_ox, oy, img.size)
tot = 0; worst = 0
for name, frames in sets():
    keys = [k for k in frames if k in im]; res = [center(k) for k in keys]
    if len(keys) < 6 or any(r is None for r in res): continue
    c = np.array([r[0] for r in res]); n = len(c); half = WIN // 2
    s = np.array([np.mean([c[(i + j) % n] for j in range(-half, half + 1)]) for i in range(n)])
    dx = np.clip(np.round(s - c), -CLIP, CLIP).astype(int); worst = max(worst, int(np.abs(dx).max()))
    for k, r, d in zip(keys, res, dx):
        W, H, base_ox, oy, size = r[1]; stab[k] = int(d); trim[k] = [W, H, base_ox + int(d), oy, size[0], size[1]]
    tot += n
man['stab'] = dict(sorted(stab.items())); man['trim'] = dict(sorted(trim.items())); json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
print(f'{tot} kare stabilize edildi (en büyük kaydırma {worst} px)')
