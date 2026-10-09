#!/usr/bin/env python3
"""Yayın paketi: oyunun ÇALIŞMASI için gereken dosyaları www/ içine kopyalar (Capacitor webDir). tools/, references/, docs/ ve kaynak sayfalar dışarıda kalır.
Kullanım: python3 tools/build_www.py   (önce tools/build_sw.py ile sw.js sürümünü güncelle: npm run build:www ikisini de yapar)"""
import os, shutil, json
ROOT = os.path.join(os.path.dirname(__file__), '..'); OUT = os.path.join(ROOT, 'www')
INCLUDE = ['index.html', 'sw.js', 'manifest.webmanifest', 'src', 'data', 'audio', 'fonts', 'assets/app_icon']      # assets/: yalnızca data/asset_manifest.json'da listelenen görseller + app_icon (kaynak sayfalar/referanslar pakete girmez)
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
skip_dirs = {'__pycache__'}; skip_ext = {'.md', '.py'}
n = size = 0
for item in INCLUDE:
    s = os.path.join(ROOT, item)
    if not os.path.exists(s): continue
    if os.path.isfile(s): shutil.copy2(s, os.path.join(OUT, item)); n += 1; size += os.path.getsize(s); continue
    for d, ds, fs in os.walk(s):
        ds[:] = [x for x in ds if x not in skip_dirs]
        for f in fs:
            if os.path.splitext(f)[1] in skip_ext: continue
            src = os.path.join(d, f); dst = os.path.join(OUT, os.path.relpath(src, ROOT)); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst); n += 1; size += os.path.getsize(src)
import re
refs = set(json.load(open(os.path.join(ROOT, 'data/asset_manifest.json')))['images'].values())
pat = re.compile(r'assets/[\w./-]+\.(?:png|jpg|jpeg|webp|svg|gif|mp3|ogg|wav)')
for base in ('data', 'src'):                                   # veri/kod içinde doğrudan yol verilen görseller (kart sanatı vb.)
    for d, _, fs in os.walk(os.path.join(ROOT, base)):
        for f in fs:
            if f.endswith(('.json', '.js', '.css')): refs.update(pat.findall(open(os.path.join(d, f), encoding='utf-8', errors='ignore').read()))
for f in ('index.html',): refs.update(pat.findall(open(os.path.join(ROOT, f), encoding='utf-8').read()))
refs = {r for r in refs if '/references/' not in r}
missing = []
for v in sorted(refs):
    src = os.path.join(ROOT, v)
    if not os.path.exists(src): missing.append(v); continue
    dst = os.path.join(OUT, v)
    if not os.path.exists(dst): os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst); n += 1; size += os.path.getsize(src)
print(f'www/: {n} dosya, {size / 1048576:.1f} MB; bulunamayan referans: {len(missing)} {missing[:5]}')
