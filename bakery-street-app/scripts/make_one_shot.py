"""Builds a one-shot sheet (a 6-column grid in assets/game/characters/<name>.webp) from frames cut by extract_cat_walk.py (all on one common canvas, head centred).
Row by row the body height is levelled (ChatGPT draws some rows slightly smaller), then everything is scaled to `--target-h` (the character's height in the game sheets)
and the frames are placed with the head on the cell's centre line and the feet on one baseline.
Usage: python3 scripts/make_one_shot.py <name> <frames_dir> --target-h 243 [--row 6] [--cols 6] [--ref-h 191] [--fade-cut 44] [--head-x 158] [--no-fade 8,9]
(--ref-h H: no row levelling, one scale for everything from the height H of an upright frame; --fade-cut N: a prop tip that the source page cut off with a straight vertical edge fades out over its last N source pixels instead of ending hard)"""
import sys, glob, math
import numpy as np
from PIL import Image

name, d = sys.argv[1], sys.argv[2]
arg = lambda k, dflt=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else dflt
target = float(arg('--target-h')); row = int(arg('--row', 6)); COLS = int(arg('--cols', 6))
fr = [Image.open(p).convert('RGBA') for p in sorted(glob.glob(f'{d}/walk_*.png'))]
FADE = int(arg('--fade-cut', 0))
def fade_cut(f):
    a = np.asarray(f).copy(); op = a[..., 3] > 128
    cols = np.where(op.any(axis=0))[0]; xr = cols.max()
    if op[:, xr].sum() < 14 or op[:, max(0, xr - 3)].sum() < 14: return f, False           # a natural, rounded tip: leave it
    ramp = np.clip((xr - np.arange(a.shape[1])) / float(FADE), 0, 1); ramp = ramp * ramp * (3 - 2 * ramp)
    ramp[: xr - FADE] = 1; ramp[xr + 1:] = 0
    a[..., 3] = (a[..., 3] * ramp[None, :]).astype(np.uint8)
    return Image.fromarray(a, 'RGBA'), True
if FADE:
    keep = {int(x) for x in arg('--no-fade', '').split(',') if x}                         # 1-based frames whose tip was completed by hand and must not fade
    res = [(f, False) if i + 1 in keep else fade_cut(f) for i, f in enumerate(fr)]; print('faded frames', [i + 1 for i, (_, c) in enumerate(res) if c]); fr = [f for f, _ in res]
H0 = [(lambda b: b[3] - b[1])(f.getbbox()) for f in fr]
rowmed = [np.median(H0[i:i + row]) for i in range(0, len(fr), row)]
if arg('--ref-h'):                                                                        # one common scale (poses with bending or jumping differ in height on purpose)
    ks = [target / float(arg('--ref-h'))] * len(fr)
else:
    ref = float(np.median(rowmed[:-1])) if len(rowmed) > 1 else rowmed[0]                  # the rows that agree with each other set the size
    ks = [target / ref * (ref / rowmed[i // row]) for i in range(len(fr))]
W0, Hc = fr[0].size
HX = float(arg('--head-x', W0 / 2))                                                       # where the head's centre line is on the source canvas (not the middle when the canvas was padded)
Wc = int(math.ceil(2 * max(HX, W0 - HX) * max(ks))) + 8; Hcell = int(math.ceil(Hc * max(ks))) + 4
out = Image.new('RGBA', (Wc * COLS, Hcell * math.ceil(len(fr) / COLS)), (0, 0, 0, 0))
for i, (f, k) in enumerate(zip(fr, ks)):
    g = f.resize((int(round(f.width * k)), int(round(f.height * k))), Image.LANCZOS)
    x = int(Wc / 2 - HX * k); y = Hcell - g.height - 2                               # head centre (canvas centre) on the cell centre, feet on the baseline
    out.paste(g, ((i % COLS) * Wc + x, (i // COLS) * Hcell + y), g)
out.save(f'assets/game/characters/{name}.webp', quality=90)
print(name, 'frames', len(fr), 'cell', Wc, Hcell, 'sheet', out.size, 'scales', [round(k, 2) for k in sorted(set(round(k, 2) for k in ks))])
