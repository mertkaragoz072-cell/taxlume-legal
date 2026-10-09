"""Yeşil dünya zemini: references/nexora_meadow_ground_source.png (2172x724, şeffaf) -> assets/environment/ground/tiles/meadow_ground.png
Üstteki ağaç/çit/fener kısmı kesilir; çim + toprak yol + yosunlu kaya yüzü bandı (y 392–640) alınır (2172x248; ikinci, daha kalın zemin görseli).
Oyunda ayna eşiyle dönüşümlü döşenir (dikiş yok, groundTiles.meadow.mirror)."""
import os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_meadow_ground_source.png')).convert('RGBA')
# Orijinal çözünürlük korunur (filtre/büyütme yok): oyunda nearest-neighbor + tam sayı ölçekle çizilir.
out = im.crop((0, 392, im.width, 640))
out.save(os.path.join(ROOT, 'assets/environment/ground/tiles/meadow_ground.png'))

# --- Yürüme şeridindeki (üst H px) taşları sil: karakter taşın üstünde duruyormuş gibi görünmesin.
# Taş = gri (düşük doygunluk) bileşenler. Her taşın x aralığı (+pay) gri içermeyen başka bir x aralığından kopyalanıp kenar yumuşatmayla üstüne yazılır.
import numpy as np
from scipy import ndimage as ndi
p = os.path.join(ROOT, 'assets/environment/ground/tiles/meadow_ground.png')
a = np.array(Image.open(p).convert('RGBA')).astype(np.uint8); H = 62; ai = a.astype(int)
top = ai[:H, :, :3]; sat = top.max(2) - top.min(2); mx = top.max(2)
gray = (sat < 45) & (mx > 60) & (mx < 225) & (ai[:H, :, 3] > 128)
gray = ndi.binary_opening(gray, iterations=1)
col_has = ndi.binary_dilation(gray.any(0), iterations=14)                  # taş içeren sütunlar (+pay)
lab, n = ndi.label(col_has[None, :]); runs = [(s[1].start, s[1].stop) for s in ndi.find_objects(lab)]
clean_ok = ~col_has; made = 0
for (x0, x1) in runs:
    w = x1 - x0
    cands = [c for c in range(0, a.shape[1] - w) if clean_ok[c:c + w].all() and abs(c - x0) > 20]
    if not cands: continue
    c0 = cands[(made * 7919) % len(cands)]; made += 1
    al = np.ones(w); f = min(10, w // 3); al[:f] = np.linspace(0, 1, f); al[-f:] = np.linspace(1, 0, f); al = al[None, :, None]
    a[:H, x0:x1] = (a[:H, c0:c0 + w] * al + a[:H, x0:x1] * (1 - al)).astype(np.uint8)
Image.fromarray(a, 'RGBA').save(p); print('taş bölgesi temizlendi:', made, 'adet')
