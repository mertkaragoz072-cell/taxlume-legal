"""Cuts a 30-frame animation sheet (6 columns x 5 rows, numbered, pure black background) into frames and appends them to a character strip.
Usage: python3 scripts/extract_cat_walk.py <sheet.png|webp> <out_frames_dir> [--cols 6 --rows 5]
Each frame: the largest bright blob of its cell (numbers and stray bits dropped), holes filled, soft edge, feet (bottom of the blob) on one common line,
horizontal position smoothed over the loop so ChatGPT's cell jitter disappears but the walk sway stays. Output: RGBA PNGs on one common canvas."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def cut(path, cols=6, rows=5):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    H, W = im.shape[:2]; cw, ch = W / cols, H / rows
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, x1, y0, y1 = int(c * cw), int((c + 1) * cw), int(r * ch), int((r + 1) * ch)
            a = im[y0:y1, x0:x1]
            hh = a.shape[0]
            mx, mn = a.max(axis=2), a.min(axis=2)
            sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
            # the frame number (also the one of the row above, when rows are not evenly spaced): a small, pure white, unsaturated blob that is its own
            # component (the black background separates it from the cat) in the top or bottom band; pale belly fur is cream, never pure white
            fg0 = mx > 38
            l0, n0 = ndi.label(fg0)
            num = np.zeros_like(fg0)
            for i in range(1, n0 + 1):
                comp = l0 == i
                if comp.sum() >= 700: continue
                yy, xx = np.where(comp)
                if not (yy.min() > hh * 0.78 or yy.max() < hh * 0.22): continue
                if mn[comp].mean() > 170 and sat[comp].mean() < 0.08: num |= comp
            fg = fg0 & ~ndi.binary_dilation(num, iterations=2)
            fg = ndi.binary_closing(fg, iterations=2)
            lab, n = ndi.label(fg)
            sz = ndi.sum(fg, lab, range(1, n + 1))
            m = lab == (1 + int(np.argmax(sz)))
            holes = ndi.binary_fill_holes(m) & ~m                      # eyes (dark but not pure black) are filled; the black gap between tail and back stays open
            hl, hn = ndi.label(holes)
            for i in range(1, hn + 1):
                hm = hl == i
                if hm.sum() < 40 or mx[hm].mean() > 14: m |= hm
            ys, xs = np.where(m)
            al = ndi.gaussian_filter(m.astype(float), 0.7)
            rgba = np.dstack([a, al * 255]).astype(np.uint8)
            out.append((Image.fromarray(rgba, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), (xs.min() + xs.max()) / 2 + x0))
    return out

def canvas(frames, pad=4):
    ims = [f for f, _ in frames]
    W = max(i.width for i in ims) + 2 * pad; H = max(i.height for i in ims) + 2 * pad
    xs = np.array([c for _, c in frames], float)
    k = np.ones(5) / 5; sm = np.convolve(np.r_[xs[-2:], xs, xs[:2]], k, 'valid')       # loop-aware smoothing
    res = []
    for (im, cx), s in zip(frames, sm):
        cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        cv.paste(im, (int((W - im.width) / 2 + (cx - s) * 0.0), H - im.height - pad), im)    # centred; sway comes from the pose itself
        res.append(cv)
    return res

if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    fr = canvas(cut(src))
    for i, f in enumerate(fr, 1): f.save(os.path.join(outdir, f'walk_{i:02d}.png'))
    print(len(fr), fr[0].size)
