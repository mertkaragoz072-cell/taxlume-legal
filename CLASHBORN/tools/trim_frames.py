"""HD kare setlerinde saydam kenar boşluğunu kırpar (bellek ~yarıya iner: çözülmüş bitmap = genişlik×yükseklik×4 bayt).
Kullanım: python3 tools/trim_frames.py            (extract_enemy_sheet.py ile yeni kare üretildikten sonra yeniden çalıştırılabilir; idempotent)
Kapsam: assets/characters/male/hd, assets/enemies/*/hd  (kadın kareleri build_female_animations.py aynı tuval boyutu bekler → kapsam dışı)
Kayıt: data/asset_manifest.json → "trim": { anahtar: [W, H, ox, oy, tw, th] }  (W×H = özgün tuval, ox/oy = kırpılmış karenin tuvaldeki yeri, tw×th = dosyadaki boyut).
Çalışma zamanı (src/core/assets.js): görsel boyutu kayıttaki tw×th ile eşleşirse `width/height` özgün tuvali bildirir ve ctx.drawImage kırpmayı geri koyar → çizim kodu değişmez.
Boyut eşleşmezse (dosya yeniden üretilmiş, kayıt eski) kayıt yok sayılır, tam kare çizilir. Piksel kaybı yok (alfa>0 sınır kutusu)."""
import os, sys, json
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
mp = os.path.join(ROOT, 'data/asset_manifest.json'); man = json.load(open(mp)); trim = man.get('trim', {})
path2key = {v: k for k, v in man['images'].items()}
dirs = ['assets/characters/male/hd'] + [f'assets/enemies/{d}/hd' for d in sorted(os.listdir(os.path.join(ROOT, 'assets/enemies'))) if os.path.isdir(os.path.join(ROOT, f'assets/enemies/{d}/hd'))]
saved = 0; n = 0
for d in dirs:
    for f in sorted(os.listdir(os.path.join(ROOT, d))):
        if not f.endswith('.png'): continue
        rel = f'{d}/{f}'; key = path2key.get(rel)
        if not key: continue
        p = os.path.join(ROOT, rel); im = Image.open(p)
        if im.mode != 'RGBA': im = im.convert('RGBA')
        t = trim.get(key)
        if t and im.size == (t[4], t[5]): continue                       # zaten kırpılmış
        bb = im.getchannel('A').getbbox()
        if not bb: continue
        W, H = im.size; x0, y0, x1, y1 = bb
        if (x1 - x0, y1 - y0) == (W, H): trim.pop(key, None); continue
        im.crop(bb).save(p, optimize=True); trim[key] = [W, H, x0, y0, x1 - x0, y1 - y0]; saved += W * H * 4 - (x1 - x0) * (y1 - y0) * 4; n += 1
man['trim'] = dict(sorted(trim.items())); json.dump(man, open(mp, 'w'), indent=2, ensure_ascii=False); open(mp, 'a').write('\n')
print(f'{n} kare kırpıldı, çözülmüş bellek −{saved/1e6:.0f} MB; kayıt {len(trim)}')
