"""Appends an animation (30 frames cut by extract_cat_walk.py) to a cat sheet: assets/game/characters/<name>.webp is a grid (10 columns) of `--old` frames;
the new frames are added after them and the grid is repacked in one common cell. Prints the first index of the new frames and the new cell size.
Usage: python3 scripts/add_cat_anim.py <name> <frames_dir> --old 50 [--have 80] [--scale 0.95]   (--have: frames now in the sheet, when replacing an animation already added)"""
import sys, glob, math
from PIL import Image

name, d = sys.argv[1], sys.argv[2]
old_n = int(sys.argv[sys.argv.index('--old') + 1])
have = int(sys.argv[sys.argv.index('--have') + 1]) if '--have' in sys.argv else old_n      # frames currently in the sheet (more than --old when the animation is being replaced)
K = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 0.95
P = f'assets/game/characters/{name}.webp'
COLS = 10
sheet = Image.open(P).convert('RGBA')
rows = math.ceil(have / COLS); cw, ch = sheet.width // COLS, sheet.height // rows
frames = [sheet.crop(((i % COLS) * cw, (i // COLS) * ch, (i % COLS + 1) * cw, (i // COLS + 1) * ch)) for i in range(old_n)]
new = [Image.open(p).convert('RGBA') for p in sorted(glob.glob(f'{d}/walk_*.png'))]
new = [f.resize((int(f.width * K), int(f.height * K)), Image.LANCZOS) for f in new]
CW = max(cw, max(f.width for f in new) + 4); CH = max(ch, max(f.height for f in new) + 2)
allf = frames + new; n = len(allf); R = math.ceil(n / COLS)
out = Image.new('RGBA', (CW * COLS, CH * R), (0, 0, 0, 0))
for i, f in enumerate(allf):
    # old cells keep their content bottom-aligned inside the (possibly larger) new cell
    bb = f.getbbox()
    g = f.crop(bb) if bb else f
    # keep each frame's own bottom/centre relation: old frames were bottom-aligned & centred already
    ox = (CW - f.width) // 2; oy = CH - f.height - 1
    out.paste(f, ((i % COLS) * CW + ox, (i // COLS) * CH + oy), f)
out.save(P, quality=90)
print(name, 'new frames start at', old_n, 'total', n, 'cell', CW, CH, 'sheet', out.size)
