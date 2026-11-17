#!/usr/bin/env python3
"""Turns a ChatGPT picture of a decoration at a higher level (one object on a plain black background) into the game's level picture:
transparent background, trimmed, scaled to the level-1 picture's height and saved as assets/game/interior/levels/<item id>-l<level>.webp.

    python3 scripts/add_item_level.py plantA 2 ~/Downloads/saksi_2.png
    node scripts/gen-assets.mjs            # (once, after adding files) so the app bundles it

Item ids and their level-1 pictures are in src/data/economy.js (SHOP_ITEMS, category 'decor'). The café and the shop card draw the picture of
the piece's level, or the best lower one that exists. --fit width keeps the level-1 picture's width instead of its height.
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from add_equipment_tier import cut, INTERIOR

def base_image(item):
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'economy.js'), encoding='utf-8').read()
    m = re.search(r"\{ id: '" + re.escape(item) + r"'[^\n]*?art: \{ image: '([^']+)' \}", src)
    if not m: sys.exit(f'unknown decoration id {item} (see SHOP_ITEMS in src/data/economy.js)')
    return m.group(1)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('item'); ap.add_argument('level', type=int, choices=(2, 3, 4, 5)); ap.add_argument('source')
    ap.add_argument('--fit', choices=('height', 'width'), default='height')
    a = ap.parse_args()
    base = Image.open(os.path.join(INTERIOR, f'{base_image(a.item)}.webp')); bw, bh = base.size
    rgba = Image.fromarray(cut(np.array(Image.open(a.source).convert('RGB'))), 'RGBA')
    box = rgba.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box: sys.exit('no object found: the picture must show the piece on a plain black background')
    obj = rgba.crop(box)
    k = (bh / obj.height) if a.fit == 'height' else (bw / obj.width)
    obj = obj.resize((max(1, round(obj.width * k)), max(1, round(obj.height * k))), Image.LANCZOS)
    os.makedirs(os.path.join(INTERIOR, 'levels'), exist_ok=True)
    out = os.path.join(INTERIOR, 'levels', f'{a.item}-l{a.level}.webp')
    obj.save(out, 'WEBP', quality=92, method=6)
    print(f'wrote {out} ({obj.width}x{obj.height}; level-1 picture {bw}x{bh})')

if __name__ == '__main__':
    main()
