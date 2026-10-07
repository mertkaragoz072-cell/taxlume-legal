"""Yeşil dünya zemini: references/nexora_meadow_ground_source.png (2172x724, şeffaf) -> assets/environment/ground/tiles/meadow_ground.png
Üstteki ağaç/çit/fener kısmı kesilir; çim + toprak yol + yosunlu kaya yüzü bandı (y 392–640) alınır (2172x248; ikinci, daha kalın zemin görseli).
Oyunda ayna eşiyle dönüşümlü döşenir (dikiş yok, groundTiles.meadow.mirror)."""
import os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_meadow_ground_source.png')).convert('RGBA')
im.crop((0, 392, im.width, 640)).save(os.path.join(ROOT, 'assets/environment/ground/tiles/meadow_ground.png'))
