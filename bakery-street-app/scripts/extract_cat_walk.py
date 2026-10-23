"""Cuts a 30-frame animation sheet (6 columns x 5 rows, numbered, pure black background) into frames and appends them to a character strip.
Usage: python3 scripts/extract_cat_walk.py <sheet.png|webp> <out_frames_dir> [--inpaint] [--head-anchor] [--whole]   (--inpaint: the numbers overlap the feet, paint them out; --head-anchor: keep the head still, for poses where a prop reaches out; --whole: cut by connected pieces of the whole page, for props that cross into the next cell)
Each frame: the largest bright blob of its cell (numbers and stray bits dropped), holes filled, soft edge, feet (bottom of the blob) on one common line,
horizontal position smoothed over the loop so ChatGPT's cell jitter disappears but the walk sway stays. Output: RGBA PNGs on one common canvas."""
import sys, os, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def cut(path, cols=6, rows=5, inpaint=False):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    H, W = im.shape[:2]; cw, ch = W / cols, H / rows
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, x1, y0, y1 = int(c * cw), int((c + 1) * cw), int(r * ch), int((r + 1) * ch)
            a = im[y0:y1, x0:x1]
            hh = a.shape[0]
            if inpaint:                                                  # numbers drawn over the feet: pure white pixels in the bottom band are painted over from their surroundings
                import cv2
                mn0, mx0 = a.min(axis=2), a.max(axis=2)
                pw = (mn0 > 244) & (mx0 - mn0 < 14); pw[: int(hh * 0.70)] = False
                pw = ndi.binary_dilation(pw, iterations=2)
                if pw.any():
                    a = cv2.inpaint(a.astype(np.uint8), (pw * 255).astype(np.uint8), 4, cv2.INPAINT_TELEA).astype(float)
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
            top = ys < ys.min() + (ys.max() - ys.min()) * 0.35                  # the head: its horizontal centre is the anchor when a prop (a tray) reaches out to one side
            hx = float(xs[top].mean() - xs.min())
            out.append((Image.fromarray(rgba, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), (xs.min() + xs.max()) / 2 + x0, hx))
    return out

def cut_whole(path, cols=6, rows=5):
    """For poses where a prop (peel, tray) reaches into the neighbour's cell: label the whole page, give every cell the piece that holds its cat's body (a box in the
    middle of the cell), and where one piece holds the bodies of two neighbours (the prop tip touches the next cat) cut it at the thinnest column just right of the cell
    boundary. Frame numbers are never a body, so they are dropped."""
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    H, W = im.shape[:2]; cw, ch = W / cols, H / rows
    mx = im.max(axis=2); fg0 = mx > 38
    def body(r, c):
        x0, x1 = int((c + 0.5) * cw - 0.2 * cw), int((c + 0.5) * cw + 0.2 * cw); y0, y1 = int(r * ch + 0.15 * ch), int(r * ch + 0.6 * ch)
        return y0, y1, x0, x1
    for _ in range(2):
        lab, n = ndi.label(fg0); cut = False
        for r in range(rows):
            for c in range(cols - 1):
                ya, yb, xa, xb = body(r, c); ya2, yb2, xa2, xb2 = body(r, c + 1)
                l1 = np.bincount(lab[ya:yb, xa:xb][fg0[ya:yb, xa:xb]]); l2 = np.bincount(lab[ya2:yb2, xa2:xb2][fg0[ya2:yb2, xa2:xb2]])
                if len(l1) < 2 or len(l2) < 2: continue
                i1, i2 = int(np.argmax(l1[1:] if l1[0] == 0 else l1[1:])) + 1, int(np.argmax(l2[1:])) + 1
                if i1 != i2: continue
                bx = int(round((c + 1) * cw)); lo, hi = bx, bx + 70
                band = fg0[int(r * ch):int((r + 1) * ch), lo:hi]; t = band.sum(axis=0).astype(float); t[t == 0] = 1e9
                k = lo + int(np.argmin(t)); fg0[int(r * ch):int((r + 1) * ch), k - 1:k + 2] = False; cut = True
        if not cut: break
    lab, n = ndi.label(fg0)
    frames = []
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = body(r, c)
            cnt = np.bincount(lab[y0:y1, x0:x1][fg0[y0:y1, x0:x1]], minlength=n + 1); cnt[0] = 0
            m = lab == int(np.argmax(cnt))
            holes = ndi.binary_fill_holes(m) & ~m; hl, hn = ndi.label(holes)
            for k in range(1, hn + 1):
                hm = hl == k
                if hm.sum() < 40 or mx[hm].mean() > 14: m |= hm
            ys, xs = np.where(m)
            al = ndi.gaussian_filter(m.astype(float), 0.6)
            rgba = np.dstack([im, al * 255]).astype(np.uint8)
            top = ys < ys.min() + (ys.max() - ys.min()) * 0.35
            frames.append((Image.fromarray(rgba, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), (xs.min() + xs.max()) / 2, float(xs[top].mean() - xs.min())))
    return frames

def canvas(frames, pad=4, head=False):
    ims = [f for f, _, _ in frames]
    H = max(i.height for i in ims) + 2 * pad
    W = int(math.ceil(2 * max(max(h, f.width - h) for f, _, h in frames))) + 2 * pad if head else max(i.width for i in ims) + 2 * pad
    xs = np.array([c for _, c, _ in frames], float)
    k = np.ones(5) / 5; sm = np.convolve(np.r_[xs[-2:], xs, xs[:2]], k, 'valid')       # loop-aware smoothing
    res = []
    for (im, cx, hx), s in zip(frames, sm):
        cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        px = int(W / 2 - hx) if head else int((W - im.width) / 2)
        cv.paste(im, (px, H - im.height - pad), im)    # centred; sway comes from the pose itself
        res.append(cv)
    return res

if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    fr = canvas(cut_whole(src) if '--whole' in sys.argv else cut(src, inpaint='--inpaint' in sys.argv), head='--head-anchor' in sys.argv)
    for i, f in enumerate(fr, 1): f.save(os.path.join(outdir, f'walk_{i:02d}.png'))
    print(len(fr), fr[0].size)
