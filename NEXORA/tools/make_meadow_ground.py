"""Yeşil dünya zemini: references/nexora_meadow_ground_source.png (2172x724, şeffaf) -> assets/environment/ground/tiles/meadow_ground.png
Üstteki ağaç/çit/fener kısmı kesilir; çim + toprak yol + yosunlu kaya yüzü bandı (y 428–632) alınır (2172x204).
Oyunda ayna eşiyle dönüşümlü döşenir (dikiş yok, groundTiles.meadow.mirror)."""
import os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_meadow_ground_source.png')).convert('RGBA')
im.crop((0, 428, im.width, 632)).save(os.path.join(ROOT, 'assets/environment/ground/tiles/meadow_ground.png'))
