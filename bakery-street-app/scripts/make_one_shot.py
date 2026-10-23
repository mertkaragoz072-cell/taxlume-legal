"""Builds a one-shot sheet (a 6-column grid in assets/game/characters/<name>.webp) from frames cut by extract_cat_walk.py (all on one common canvas, head centred).
Row by row the body height is levelled (ChatGPT draws some rows slightly smaller), then everything is scaled to `--target-h` (the character's height in the game sheets)
and the frames are placed with the head on the cell's centre line and the feet on one baseline.
Usage: python3 scripts/make_one_shot.py <name> <frames_dir> --target-h 243 [--row 6] [--cols 6] [--drop 24,25]   (--drop: frame indices left out)"""
import sys, glob, math
import numpy as np
from PIL import Image

name, d = sys.argv[1], sys.argv[2]
arg = lambda k, dflt=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else dflt
target = float(arg('--target-h')); row = int(arg('--row', 6)); COLS = int(arg('--cols', 6))
fr = [Image.open(p).convert('RGBA') for p in sorted(glob.glob(f'{d}/walk_*.png'))]
H0 = [(lambda b: b[3] - b[1])(f.getbbox()) for f in fr]
rowmed = [np.median(H0[i:i + row]) for i in range(0, len(fr), row)]
ref = float(np.median(rowmed[:-1])) if len(rowmed) > 1 else rowmed[0]                  # the rows that agree with each other set the size
ks = [target / ref * (ref / rowmed[i // row]) for i in range(len(fr))]
W0, Hc = fr[0].size
Wc = int(math.ceil(W0 * max(ks))) + 8; Hcell = int(math.ceil(Hc * max(ks))) + 4
out = Image.new('RGBA', (Wc * COLS, Hcell * math.ceil(len(fr) / COLS)), (0, 0, 0, 0))
for i, (f, k) in enumerate(zip(fr, ks)):
    g = f.resize((int(round(f.width * k)), int(round(f.height * k))), Image.LANCZOS)
    x = int(Wc / 2 - (W0 / 2) * k); y = Hcell - g.height - 2                               # head centre (canvas centre) on the cell centre, feet on the baseline
    out.paste(g, ((i % COLS) * Wc + x, (i // COLS) * Hcell + y), g)
out.save(f'assets/game/characters/{name}.webp', quality=90)
print(name, 'frames', len(fr), 'cell', Wc, Hcell, 'sheet', out.size, 'scales', [round(k, 2) for k in sorted(set(round(k, 2) for k in ks))])
