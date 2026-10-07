"""Gezegen zemin parçaları: references/nexora_planet_sheet_source.png (1536x1024, 5 gezegen) -> assets/environment/ground/tiles/<tema>_NN.png
Her gezegenin 'ZEMIN (SEAMLESS)' sütunundaki 5 plaka bulunur (koyu panel rengine uzaklıkla), yan kenarlar 5 px kırpılır (yuvarlak köşe),
kenardan flood-fill ile panel arka planı şeffaf yapılır. Ayrıca desert/volcanic için ARKA PLAN panosu backdrop.png olarak kesilir.
Çıktı bilgisi tiles/tiles.json (genişlik/yükseklik/alt renk). Kullanım: python3 tools/extract_planet_ground.py"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..')
src = Image.open(os.path.join(ROOT, 'references/nexora_planet_sheet_source.png')).convert('RGB'); a = np.array(src).astype(int)
THEMES = ['meadow', 'forest', 'frozen', 'desert', 'volcanic']
BANDS = [(55, 205), (255, 405), (455, 600), (655, 800), (850, 1005)]
BG = np.array([14, 18, 28]); TRIM = 5
RECT = {'forest', 'volcanic'}      # koyu temalarda plaka rengi panel rengine yakın → alfa yerine düz dikdörtgen kırpım (üst/alt 3 px, yan 6 px içeri)
out_dir = os.path.join(ROOT, 'assets/environment/ground/tiles'); os.makedirs(out_dir, exist_ok=True)
info = {}
for th, (y0, y1) in zip(THEMES, BANDS):
    reg = a[y0:y1, 538:880]
    d = ndi.binary_closing(ndi.binary_opening(np.abs(reg - BG).sum(2) > 60), iterations=2)
    lab, n = ndi.label(d); boxes = []
    for s in ndi.find_objects(lab):
        h = s[0].stop - s[0].start; w = s[1].stop - s[1].start
        if w > 40 and h > 25: boxes.append((s[0].start + y0, s[1].start + 538, h, w))
    boxes.sort(key=lambda t: (t[0] // 40, t[1])); info[th] = []
    for i, (y, x, h, w) in enumerate(boxes):
        if th in RECT:
            im = Image.fromarray(a[y + 3:y + h - 3, x + 6:x + w - 6].astype(np.uint8), 'RGB').convert('RGBA')
            name = f'{th}_{i + 1:02d}.png'; im.save(os.path.join(out_dir, name)); arr = np.array(im)
            info[th].append({'file': name, 'w': im.width, 'h': im.height, 'bottom': arr[-6:, :, :3].reshape(-1, 3).mean(0).round().astype(int).tolist()}); continue
        crop = a[y - 2:y + h + 2, x + TRIM:x + w - TRIM]
        near = np.abs(crop - BG).sum(2) < 55
        bgm = ndi.binary_propagation(near & np.pad(np.zeros((near.shape[0] - 2, near.shape[1] - 2), bool), 1, constant_values=True), mask=near)
        al = (~bgm).astype(np.uint8) * 255
        al = ndi.binary_opening(al > 0, iterations=1).astype(np.uint8) * 255
        rgba = np.dstack([crop.astype(np.uint8), al]); im = Image.fromarray(rgba, 'RGBA')
        ys = np.where(al.max(1) > 0)[0]; im = im.crop((0, ys[0], im.width, ys[-1] + 1))
        name = f'{th}_{i + 1:02d}.png'; im.save(os.path.join(out_dir, name))
        arr = np.array(im); opaque = arr[:, :, 3] > 0
        bot = arr[-6:, :, :3][opaque[-6:]].mean(0).round().astype(int).tolist() if opaque[-6:].any() else [30, 30, 30]
        info[th].append({'file': name, 'w': im.width, 'h': im.height, 'bottom': bot})
    print(th, [(t['w'], t['h']) for t in info[th]])
json.dump(info, open(os.path.join(out_dir, 'tiles.json'), 'w'), indent=1)
# desert / volcanic panorama (ARKA PLAN panosu, etiketsiz kısım)
for th, (y0, y1) in (('desert', (630, 785)), ('volcanic', (826, 975))):
    d = os.path.join(ROOT, 'assets/environment/themes', th); os.makedirs(d, exist_ok=True)
    src.crop((6, y0 + 52, 528, y1)).save(os.path.join(d, 'backdrop.png'))
