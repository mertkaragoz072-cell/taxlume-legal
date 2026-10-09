#!/usr/bin/env python3
"""Evren (world) paketi aracı. Bir evrenin görselleri assets/environment/worlds/<id>/ klasörüne konur; bu araç veriyi (oyun dosyalarını) otomatik üretir.

  python3 tools/worlds.py new <id> "AD"   → klasör + world.json şablonu oluşturur (id: küçük harf, ör. emberfall)
  python3 tools/worlds.py build           → tüm evren klasörlerini tarar; data/world_props.json (themes + groundTiles), data/asset_manifest.json,
                                            data/chapters.json dosyalarını günceller; görselleri doğrular (boyut/şeffaflık uyarıları)
  python3 tools/worlds.py check           → yalnız doğrulama raporu (hiçbir dosyayı değiştirmez)

Klasör düzeni (hepsi isteğe bağlı; olmayan parça Meadowlands'inkiyle / renk tonuyla yedeklenir):
  ground.png            zemin şeridi (üstü yürüme yüzeyi; meadow_ground.png gibi geniş, yatay döşenebilir, şeffaf)
  backdrop.png          arka plan panoraması (yatay; üst kenar gökyüzüne karışır)
  props/<ön ek>_<ad>.png  dekor sprite'ları (şeffaf PNG, alt orta = zemine basan nokta). Ön ek yerleşimi belirler:
        tall_   büyük (ağaç/kristal/kule) · her ~520 birimde, karakterin arkasında
        mid_    orta (kütük/çit/kaya)     · her ~230 birimde, arkada     (ön eksiz dosyalar da mid sayılır)
        front_  ön plan (büyük kaya/çalı) · her ~700 birimde, karakterin ÖNÜNDE
        tiny_   zemin örtüsü (ot/çiçek)   · her ~85 birimde, arkada
  world.json            ad, sıra, renkler, ölçekler (aşağıda)
"""
import os, sys, json, glob
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
WDIR = os.path.join(ROOT, 'assets/environment/worlds')
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
def W(p, d): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
TEMPLATE = {
  "id": "", "name": "", "order": 99,
  "_notlar": "order: evren sırası (Meadowlands=1). tint: görsel yokken kullanılan renk tonu [r,g,b,alpha] — kendi görselleri tamamlanınca null yapın. sky: gökyüzü 4 renk (üst→ufuk), haze: ufuk sisi [r,g,b]. ground.scale: birim/px (meadow 0.9), lift: yürüme yüzeyi yüksekliği, deep: zemin altı dolgu rengi. backdrop.height: birim (yükseklik), speed: kayma hızı. propScale: dekor px→birim çarpanı; props.<ad> ile tek tek height(birim)/pivot([x,y] px) ezilebilir.",
  "tint": None,
  "sky": ["#3b86d8", "#78b8ee", "#bcdcf6", "#e6f3fc"], "haze": [226, 240, 252], "sun": True, "clouds": True,
  "ground": {"scale": 0.9, "lift": 2, "deep": "#4a3524", "mirror": True},
  "backdrop": {"height": 210, "speed": 0.07},
  "propScale": 1.0, "props": {}
}
GROUPS = {'tall': dict(every=520, scale=[0.85, 1.15], depth=[0, 0], layer='back'), 'mid': dict(every=230, scale=[0.85, 1.2], depth=[0, 12], layer='back'),
          'front': dict(every=700, scale=[0.8, 1.1], depth=[66, 118], layer='front'), 'tiny': dict(every=85, scale=[0.9, 1.4], depth=[-2, 18], layer='back')}
def worlds():
    out = []
    for f in sorted(glob.glob(os.path.join(WDIR, '*/world.json'))):
        d = json.load(open(f, encoding='utf-8')); d['_dir'] = os.path.dirname(f); out.append(d)
    return sorted(out, key=lambda w: (w.get('order', 99), w['id']))
def need(cond, msg, warns): 
    if not cond: warns.append(msg)
def validate(w, warns):
    d = w['_dir']; i = w['id']
    for f in ('ground.png', 'backdrop.png'):
        p = os.path.join(d, f)
        if os.path.exists(p):
            im = Image.open(p); need(im.mode in ('RGBA', 'LA', 'P'), f'{i}/{f}: şeffaflık (alfa) kanalı yok — arka plan şeffaf olmalı' if f == 'ground.png' else '', warns) if f == 'ground.png' else None
            if f == 'ground.png': need(im.width >= 1000, f'{i}/ground.png: genişlik {im.width}px — yatay döşemek için en az ~1000px önerilir', warns); need(im.height >= 120, f'{i}/ground.png: yükseklik {im.height}px (≥120 önerilir; ekranın altına kadar inmesi için ~250)', warns)
            if f == 'backdrop.png': need(im.width / im.height >= 2, f'{i}/backdrop.png: yatay panorama olmalı (genişlik ≥ 2× yükseklik), şu an {im.width}×{im.height}', warns)
    for p in sorted(glob.glob(os.path.join(d, 'props/*.png'))):
        im = Image.open(p); n = os.path.basename(p)
        need(im.mode == 'RGBA', f'{i}/props/{n}: RGBA değil (şeffaf arka plan gerekir)', warns)
        if im.mode == 'RGBA': need(im.getchannel('A').getextrema()[0] == 0, f'{i}/props/{n}: hiç şeffaf piksel yok — arka plan silinmemiş olabilir', warns)
def build(write=True):
    ws, warns = worlds(), []
    props_data = J('data/world_props.json'); manifest = J('data/asset_manifest.json'); chapters = J('data/chapters.json')
    old = props_data.get('_generatedWorlds', [])
    for k in list(manifest['images']):                                   # önceki üretimleri temizle
        if any(k.startswith(p + o + '_') for o in old for p in ('gt_', 'tp_', 'theme_')): del manifest['images'][k]
    for o in old: props_data['themes'].pop(o, None); props_data['groundTiles'].pop(o, None)
    entries = [{"id": "meadowlands", "name": "MEADOWLANDS", "universe": "I", "theme": "meadow", "tint": None}]; gen = []
    for w in ws:
        i = w['id']; d = w['_dir']; validate(w, warns); rel = os.path.relpath(d, ROOT).replace(os.sep, '/')
        has = lambda f: os.path.exists(os.path.join(d, f))
        theme_id = 'meadow'
        if has('ground.png'):
            manifest['images'][f'gt_{i}_ground'] = f'{rel}/ground.png'
            g = w.get('ground', {}); props_data['groundTiles'][i] = {"tiles": [f'{i}_ground'], "mirror": g.get('mirror', True), "scale": g.get('scale', 0.9), "lift": g.get('lift', 2), "deep": g.get('deep', '#4a3524')}; theme_id = i; gen.append(i)
        pngs = sorted(glob.glob(os.path.join(d, 'props/*.png')))
        if has('backdrop.png') or pngs:
            theme_id = i; gen.append(i) if i not in gen else None
            th = {"sky": w['sky'], "haze": w['haze'], "sun": w.get('sun', True), "clouds": w.get('clouds', True), "props": {}, "decor": []}
            ps = w.get('propScale', 1.0); groups = {}
            for p in pngs:
                n = os.path.splitext(os.path.basename(p))[0]; im = Image.open(p); ov = w.get('props', {}).get(n, {})
                manifest['images'][f'tp_{i}_{n}'] = f'{rel}/props/{n}.png'
                th['props'][n] = {"height": ov.get('height', round(im.height * ps)), "pivot": ov.get('pivot', [im.width // 2, im.height])}
                grp = n.split('_')[0] if n.split('_')[0] in GROUPS else 'mid'; groups.setdefault(grp, []).append(n)
            for grp, keys in groups.items(): th['decor'].append({"keys": keys, **GROUPS[grp]})
            if has('backdrop.png'):
                manifest['images'][f'theme_{i}_backdrop'] = f'{rel}/backdrop.png'; b = w.get('backdrop', {}); th['backdrop'] = {"key": f'theme_{i}_backdrop', "height": b.get('height', 210), "speed": b.get('speed', 0.07)}
            props_data['themes'][i] = th
        entries.append({"id": i, "name": w['name'], "universe": '', "theme": theme_id, "tint": w.get('tint')})
        if not (has('ground.png') or has('backdrop.png') or pngs): warns.append(f'{i}: henüz görsel yok → Meadowlands görünümü + tint ile oynanır')
    ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    for n, e in enumerate(entries): e['universe'] = ROM[n] if n < len(ROM) else str(n + 1)
    props_data['_generatedWorlds'] = sorted(set(gen)); chapters['worlds'] = entries
    if write:
        W('data/world_props.json', props_data); W('data/asset_manifest.json', manifest); W('data/chapters.json', chapters)
    return entries, warns
def new(i, name):
    d = os.path.join(WDIR, i)
    if os.path.exists(os.path.join(d, 'world.json')): sys.exit(f'{i} zaten var')
    os.makedirs(os.path.join(d, 'props'), exist_ok=True)
    t = dict(TEMPLATE); t['id'] = i; t['name'] = name; t['order'] = len(worlds()) + 2
    W(os.path.relpath(os.path.join(d, 'world.json'), ROOT), t); print('oluşturuldu:', os.path.relpath(d, ROOT))
if __name__ == '__main__':
    c = sys.argv[1] if len(sys.argv) > 1 else ''
    if c == 'new' and len(sys.argv) >= 4: new(sys.argv[2], sys.argv[3])
    elif c in ('build', 'check'):
        entries, warns = build(write=(c == 'build'))
        print(('Üretildi' if c == 'build' else 'Kontrol'), ':', ', '.join(f"{e['universe']}={e['name']}({e['theme']})" for e in entries))
        for w in warns: print('  ⚠', w)
    else: print(__doc__)
