"""Appends a 30-frame side walk (frames cut by extract_cat_walk.py) to a cat strip in assets/game/characters/<name>.webp.
The strip becomes 20 original frames (0-7 front walk, 8-15 back walk, 16-19 idle) + 30 side-walk frames (20-49), all in one common cell.
Usage: python3 scripts/add_cat_walk.py <name> <frames_dir>   (re-running replaces the old side frames)"""
import sys, glob
from PIL import Image

name, d = sys.argv[1], sys.argv[2]
P = f'assets/game/characters/{name}.webp'
old = Image.open(P).convert('RGBA')
N0 = 20
if old.height > 260:                                              # already a grid (re-run): take the original 20 frames back from it
    sys.exit('run on the original 20-frame strip (git checkout the file first)')
w0 = old.width // N0
base = [old.crop((i * w0, 0, (i + 1) * w0, old.height)) for i in range(N0)]
new = [Image.open(p).convert('RGBA') for p in sorted(glob.glob(f'{d}/walk_*.png'))]
K = 0.95
new = [f.resize((int(f.width * K), int(f.height * K)), Image.LANCZOS) for f in new]
CW = max(max(f.width for f in new), w0) + 4; CH = max(max(f.height for f in new), old.height) + 2
COLS = 10; total = N0 + len(new); ROWS = -(-total // COLS)        # a grid, so the picture stays under the 8192 px texture limit
strip = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0))
for i, f in enumerate(base + new):
    strip.paste(f, ((i % COLS) * CW + (CW - f.width) // 2, (i // COLS) * CH + CH - f.height - 1), f)
strip.save(P, quality=90)
print(name, 'cell', CW, CH, 'cols', COLS, 'frames', total, 'sheet', strip.size)
