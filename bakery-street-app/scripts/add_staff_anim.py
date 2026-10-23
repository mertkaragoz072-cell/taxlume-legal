"""Appends frames cut by extract_cat_walk.py to a staff sheet (chef.webp / waiter.webp) and repacks everything into a 10-column grid.
New frames are scaled so their median height equals the median height of the existing frames (`--match 0-8`: indices of existing frames to measure),
and only `--loop start,length` of them are kept (a clean loop picked by hand, e.g. when the last frames are damaged by the page's numbers).
Usage: python3 scripts/add_staff_anim.py <name> <frames_dir> --old 15 --oldcols 15 --match 0-8 --loop 1,22"""
import sys, glob, math
import numpy as np
from PIL import Image

name, d = sys.argv[1], sys.argv[2]
arg = lambda k, dflt=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else dflt
old_n, old_cols = int(arg('--old')), int(arg('--oldcols'))
m0, m1 = map(int, arg('--match', '0-0').split('-'))
ls, ll = map(int, arg('--loop', '0,30').split(','))
P = f'assets/game/characters/{name}.webp'
sheet = Image.open(P).convert('RGBA')
rows = math.ceil(old_n / old_cols); cw, ch = sheet.width // old_cols, sheet.height // rows
old = [sheet.crop(((i % old_cols) * cw, (i // old_cols) * ch, (i % old_cols + 1) * cw, (i // old_cols + 1) * ch)) for i in range(old_n)]
hts = [(lambda b: b[3] - b[1])(old[i].getbbox()) for i in range(m0, m1 + 1)]
new = [Image.open(p).convert('RGBA') for p in sorted(glob.glob(f'{d}/walk_*.png'))][ls:ls + ll]
k = float(np.median(hts)) / float(np.median([(lambda b: b[3] - b[1])(f.getbbox()) for f in new]))
new = [f.resize((int(f.width * k), int(f.height * k)), Image.LANCZOS) for f in new]
CW = max(cw, max(f.width for f in new) + 4); CH = max(ch, max(f.height for f in new) + 2)
allf = old + new; COLS = 10; R = math.ceil(len(allf) / COLS)
out = Image.new('RGBA', (CW * COLS, CH * R), (0, 0, 0, 0))
for i, f in enumerate(allf):
    out.paste(f, ((i % COLS) * CW + (CW - f.width) // 2, (i // COLS) * CH + CH - f.height - 1), f)
out.save(P, quality=90)
print(name, 'scale', round(k, 3), 'old', old_n, 'new frames start at', old_n, 'count', len(new), 'total', len(allf), 'cell', CW, CH, 'sheet', out.size)
