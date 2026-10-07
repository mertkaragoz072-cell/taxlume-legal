#!/usr/bin/env python3
"""Kadın savaşçı (hero id: heroine) kare tabanlı animasyon kurulumu.

Kareleri şu klasörlere TEK TEK koy (şeffaf PNG, hepsi AYNI boyutta, sağa bakar):
    assets/characters/female/idle/idle_01.png, idle_02.png ...
    assets/characters/female/run/run_01.png ...
    assets/characters/female/attack/attack_01.png ...
    assets/characters/female/hurt/hurt_01.png ...
    assets/characters/female/death/death_01.png ...
Sonra:  cd NEXORA && python3 tools/build_female_animations.py
Betik: kareleri tarar, tuval/pivot/ölçeği doğrular, kayma (jitter) ve boyut tutarsızlığı uyarıları verir,
data/heroine_animations.json ve data/asset_manifest.json'u günceller.
Klasörü boş olan animasyon, oyunda mevcut prosedürel hareketle (tek görsel) çalışmaya devam eder.

Ayarlar (opsiyonel): assets/characters/female/frames.json
  { "pivot": [x, y],            # ayakların orta noktası, TUVAL pikseli. Yoksa (W/2, H-12)
    "scale": 0.5,               # px → oyun birimi. Yoksa idle gövde boyu ≈ HERO_HEIGHT birim olacak şekilde hesaplanır
    "fps": {"idle": 8, "run": 12, "attack": 14, "hurt": 10, "death": 8},
    "strideUnits": 15,          # run: bir kare için kat edilmesi gereken mesafe (oyun birimi) → ayak kayması olmaz
    "attackFx": "overlay",      # "overlay": oyunun mavi hilali kılıç ucuna çizilir | "baked": efekt karelerde gömülü
    "swordTip": [x, y],         # overlay için kılıç ucu (tuval pikseli); attack kareleri için "swordTipFrames": {"attack_03": [x,y]}
    "impact": 0.5 }             # attack içinde hasarın uygulandığı an (0-1)
"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
CH = os.path.join(ROOT, 'assets/characters/female')
ANIMS = ['idle', 'run', 'attack', 'hurt', 'death']
DEF_FPS = {'idle': 8, 'run': 12, 'attack': 14, 'hurt': 10, 'death': 8}
LOOP = {'idle': True, 'run': True}
HERO_HEIGHT = 89.0                      # erkek savaşçıyla aynı oyun içi boy (birim)
cfg = {}
if os.path.exists(f'{CH}/frames.json'): cfg = json.load(open(f'{CH}/frames.json'))

meta_path = os.path.join(ROOT, 'data/heroine_animations.json')
old = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
static = old.get('static') or {"image": "heroine_main", "size": [638, 455], "pivot": [278, 452], "scale": 0.1982, "swordTip": [634, 252]}
man_path = os.path.join(ROOT, 'data/asset_manifest.json'); man = json.load(open(man_path))
man['images'] = {k: v for k, v in man['images'].items() if not k.startswith('heroine_') or k in ('heroine_main', 'heroine_portrait')}

found, warns, size = {}, [], None
for an in ANIMS:
    fs = sorted(glob.glob(f'{CH}/{an}/{an}_[0-9]*.png'), key=lambda p: int(re.findall(r'_(\d+)\.png$', p)[0]))
    if fs: found[an] = fs
for an, fs in found.items():
    for f in fs:
        im = Image.open(f)
        if im.mode != 'RGBA': warns.append(f'{f}: RGBA değil ({im.mode}) — şeffaf PNG olmalı')
        if size is None: size = im.size
        elif im.size != size: warns.append(f'{f}: boyut {im.size} ≠ {size} — TÜM kareler aynı tuval boyutunda olmalı')
frames_meta = None
if found:
    W, H = size
    pivot = cfg.get('pivot', [W // 2, H - 12])
    def bbox(f):
        a = np.asarray(Image.open(f).convert('RGBA'))[..., 3] > 20
        ys, xs = np.where(a); return xs.min(), xs.max(), ys.min(), ys.max(), a
    scale = cfg.get('scale')
    if scale is None:
        ref = (found.get('idle') or next(iter(found.values())))[0]
        _, _, y0, y1, _ = bbox(ref); scale = round(HERO_HEIGHT / (y1 - y0 + 1), 4)
    # tutarlılık: ayak çizgisi ve gövde merkezi kareler arasında kaymamalı (idle/run/hurt)
    for an in ('idle', 'run', 'attack'):
        if an not in found: continue
        feet, cx = [], []
        for f in found[an]:
            x0, x1, y0, y1, a = bbox(f); feet.append(y1)
            low = a[int(y1 - 0.4 * (y1 - y0)):y1 + 1]; xs = np.where(low.any(0))[0]; cx.append((xs.min() + xs.max()) / 2)
        if max(feet) - min(feet) > 6 and an in ('idle',): warns.append(f'{an}: ayak çizgisi kareler arasında {max(feet)-min(feet)} px oynuyor (jitter) — kareleri aynı zemine hizala')
        if max(cx) - min(cx) > 8 and an in ('idle',): warns.append(f'{an}: gövde x kayması {max(cx)-min(cx):.0f} px (jitter)')
        if abs(np.mean(feet) - pivot[1]) > 10: warns.append(f'{an}: ayaklar pivot y={pivot[1]}\'den {abs(np.mean(feet)-pivot[1]):.0f} px uzakta — pivot ayarını (frames.json) kontrol et')
    frames_meta = {'size': [W, H], 'pivot': pivot, 'scale': scale}

anims = {}
for an in ANIMS:
    if an in found:
        names = []
        for i, f in enumerate(found[an], 1):
            key = f'heroine_{an}_{i:02d}'; names.append(key)
            man['images'][key] = os.path.relpath(f, ROOT).replace(os.sep, '/')
        e = {'frames': names, 'fps': cfg.get('fps', {}).get(an, DEF_FPS[an]), 'loop': LOOP.get(an, False)}
        if cfg.get('dx', {}).get(an): e['dx'] = cfg['dx'][an]
        if cfg.get('durations', {}).get(an): e['durations'] = cfg['durations'][an]      # kare başına süre (sn); varsa fps yerine
        if an == 'run': e['strideUnits'] = cfg.get('strideUnits', 15)
        if an == 'attack':
            e['impact'] = cfg.get('impact', 0.5); e['fx'] = cfg.get('attackFx', 'overlay')
            e['swordTip'] = cfg.get('swordTip'); e['swordTipFrames'] = cfg.get('swordTipFrames', {})
        anims[an] = e
    else:   # klasör boş → prosedürel (tek görsel), süreler kodla
        d = {'idle': (1, 1, True), 'run': (1, 1, True), 'attack': (1, 2.2, False), 'hurt': (1, 3.6, False), 'death': (1, 1.25, False)}[an]
        anims[an] = {'frames': ['main'], 'fps': d[1], 'loop': d[2], 'procedural': True}
        if an == 'attack': anims[an]['impact'] = 0.35
out = {'_comment': 'tools/build_female_animations.py üretir. procedural:true olan animasyon klasörü boş → tek görselle kodla oynatılır.',
       'static': static, 'framed': frames_meta, 'facing': 'right', 'animations': anims}
# geriye uyumluluk: kod bu alanları okur
out.update({'image': static['image'], 'size': static['size'], 'pivot': static['pivot'], 'scale': static['scale'], 'swordTip': static['swordTip']})
json.dump(out, open(meta_path, 'w'), indent=2); open(meta_path, 'a').write('\n')
man['images'] = dict(sorted(man['images'].items())); json.dump(man, open(man_path, 'w'), indent=2, ensure_ascii=False); open(man_path, 'a').write('\n')
print({a: (len(found[a]) if a in found else 'prosedürel') for a in ANIMS})
if frames_meta: print('tuval', frames_meta['size'], 'pivot', frames_meta['pivot'], 'ölçek', frames_meta['scale'])
for w in warns: print('UYARI:', w)
if not warns and found: print('tutarlılık kontrolü: temiz')
