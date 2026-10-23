"""The oven page (E5) draws the peel with the bread cut off by the cell edge in three frames. The bread is round, so its visible part is mirrored about its centre to complete it.
Frames come from extract_cat_walk.py (canvas head-centred); the canvas is padded on the right (the head stays where it was).
Usage: python3 scripts/complete_cut_bread.py <frames_dir> <out_dir> --frames 7,8,9 --width 62 --pad 60
(--frames: 1-based frames with a cut bread; --width: the bread's full width in canvas px, measured on a frame where it is whole)"""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
which = [int(x) for x in arg('--frames').split(',')]; WB = int(arg('--width', 62)); PAD = int(arg('--pad', 60))
os.makedirs(dst, exist_ok=True)

def bread(a):
    r, g, b = [a[..., i].astype(float) for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = np.maximum(mx - mn, 1)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    m = (a[..., 3] > 128) & (hue > 24) & (hue < 44) & ((mx - mn) / np.maximum(mx, 1) > 0.5) & (mx / 255 > 0.78)
    m[:, :185] = False                                                       # the head and hands are left of the bread
    lab, n = ndi.label(ndi.binary_closing(m, iterations=2))
    return lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))

for i, f in enumerate(sorted(glob.glob(f'{src}/walk_*.png')), 1):
    a = np.asarray(Image.open(f).convert('RGBA')); H, W = a.shape[:2]
    out = np.zeros((H, W + PAD, 4), np.uint8); out[:, :W] = a
    if i in which:
        m = bread(a); ys, xs = np.where(m); xl, xv = xs.min(), int(np.where(a[..., 3].any(axis=0))[0].max())    # bread's left edge, the cut column
        c = xl + WB / 2.0; y0, y1 = max(0, ys.min() - 4), min(H, ys.max() + 16)                                 # the bread and the blade under it
        ve = xv - 4                                                                                     # the last columns hold the page's cut edge (a dark seam): rebuilt from the mirror too
        out[y0:y1, ve + 1:] = 0
        for x in range(ve + 1, int(xl + WB) + 1):
            xs_ = min(ve, int(round(2 * c - x)))
            if xl <= xs_ and x < W + PAD: out[y0:y1, x] = out[y0:y1, xs_]
        print('frame', i, 'bread left', xl, 'cut at', xv, 'completed to', int(xl + WB))
    Image.fromarray(out, 'RGBA').save(os.path.join(dst, os.path.basename(f)))
print('canvas', W + PAD, 'head x stays at', W // 2)
