"""Softens the hard dark outlines of the supplied furniture pictures: dark pixels along the silhouette take the colour of the nearest
body pixel (slightly darker), thin dark seams inside are lightened, and the silhouette's alpha gets a soft falloff.
usage: python3 scripts/soften-edges.py in.webp out.webp"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def soften(im, edge_px=4.0, dark=100, line_dark=85):
    a = np.array(im.convert('RGBA')).astype(np.float32)
    rgb, al = a[:, :, :3], a[:, :, 3] / 255.0
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    inside = al > 0.5
    dist = ndi.distance_transform_edt(inside)
    # 1. dark silhouette outline -> nearest body colour
    outline = inside & (dist <= edge_px) & (lum < dark)
    good = inside & ~outline & ~((dist <= edge_px + 2) & (lum < dark))
    idx = ndi.distance_transform_edt(~good, return_indices=True)[1]
    near = rgb[idx[0], idx[1]]
    out = rgb.copy()
    out[outline] = near[outline] * 0.88
    # 2. thin dark seams inside (lines up to ~3 px wide): the opening of the dark mask keeps big dark areas, the rest are lines
    darkmask = inside & (lum < line_dark) & (dist > edge_px)
    big = ndi.binary_dilation(ndi.binary_erosion(darkmask, iterations=2), iterations=2) & darkmask
    thin = darkmask & ~big
    thin = ndi.binary_dilation(thin, iterations=1) & inside & (dist > edge_px)
    idx2 = ndi.distance_transform_edt(~(inside & ~thin & ~darkmask), return_indices=True)[1]
    near2 = out[idx2[0], idx2[1]]
    out[thin] = near2[thin] * 0.92
    # smooth the repainted pixels so they do not look speckled
    sm = np.dstack([ndi.gaussian_filter(out[:, :, c], 0.9) for c in range(3)])
    fix = outline | thin
    out[fix] = sm[fix]
    # 3. soft alpha falloff
    soft = ndi.gaussian_filter(al, 0.9)
    new_a = np.where(al > 0.5, np.maximum(soft, 0.0), soft * 0.9)
    new_a = np.clip(new_a * 1.12, 0, 1)
    res = np.dstack([np.clip(out, 0, 255), new_a * 255]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    im = Image.open(src)
    soften(im).save(dst, quality=92, method=6)
