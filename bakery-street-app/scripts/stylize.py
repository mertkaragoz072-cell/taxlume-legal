"""Pushes a supplied picture from photographic towards a flat, game-like look: edge-preserving smoothing removes fine texture and noise,
colour is posterised in a few soft steps, saturation is lifted a little. Alpha is kept as it is.
usage: python3 scripts/stylize.py in.webp out.webp [strength 0..1]"""
import sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

def stylize(im, strength=0.85, levels=14):
    rgba = np.array(im.convert('RGBA'))
    rgb, a = rgba[:, :, :3].copy(), rgba[:, :, 3]
    # spread colour into transparent pixels so the filters do not pull in black/white halos
    solid = a > 20
    if not solid.all():
        idx = ndi.distance_transform_edt(~solid, return_indices=True)[1]
        rgb = rgb[idx[0], idx[1]]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    sm = bgr
    for _ in range(2):
        sm = cv2.bilateralFilter(sm, 7, 38, 6)
    sm = cv2.pyrMeanShiftFiltering(sm, 5, 14)
    hsv = cv2.cvtColor(sm, cv2.COLOR_BGR2HSV).astype(np.float32)
    # soft posterise: snap value and saturation to steps, but only part of the way
    for ch, n in ((2, levels), (1, levels)):
        step = 255.0 / n
        q = np.round(hsv[:, :, ch] / step) * step
        hsv[:, :, ch] = hsv[:, :, ch] * 0.35 + q * 0.65
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.08, 0, 255)
    out = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    out = cv2.cvtColor(out, cv2.COLOR_BGR2RGB).astype(np.float32)
    mixed = out * strength + rgb.astype(np.float32) * (1 - strength)
    res = np.dstack([np.clip(mixed, 0, 255).astype(np.uint8), a])
    return Image.fromarray(res, 'RGBA')

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    strength = float(sys.argv[3]) if len(sys.argv) > 3 else 0.85
    stylize(Image.open(src), strength).save(dst, quality=92, method=6)
