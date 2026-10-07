"""Yeşil dünya zemini: references/nexora_meadow_ground_source.png (2172x724, şeffaf) -> assets/environment/ground/tiles/meadow_ground.png
Üstteki ağaç/çit/fener kısmı kesilir; çim + toprak yol + yosunlu kaya yüzü bandı (y 392–640) alınır (2172x248; ikinci, daha kalın zemin görseli).
Oyunda ayna eşiyle dönüşümlü döşenir (dikiş yok, groundTiles.meadow.mirror)."""
import os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_meadow_ground_source.png')).convert('RGBA')
from PIL import ImageFilter, ImageEnhance
im = im.crop((0, 392, im.width, 640)); w, h = im.size
# keskinlik: 2x Lanczos büyütme + unsharp mask + hafif renk/kontrast (oyunda ~1.3x küçültülerek çizilir → telefonda net)
rgb = im.convert('RGB').resize((w * 2, h * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=110, threshold=2))
rgb = ImageEnhance.Contrast(ImageEnhance.Color(rgb).enhance(1.06)).enhance(1.04)
out = rgb.convert('RGBA'); out.putalpha(im.getchannel('A').resize((w * 2, h * 2), Image.LANCZOS))
out.save(os.path.join(ROOT, 'assets/environment/ground/tiles/meadow_ground.png'), optimize=True)
