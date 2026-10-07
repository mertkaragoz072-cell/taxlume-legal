"""Kadın savaşçı ölüm kareleri: references/nexora_heroine_death_source.png (2172x724, şeffaf, 3 satır x 10 sütun = 30 kare, soldan sağa/üstten alta) ->
assets/characters/female/death/death_01..30.png (aynı tuval). Kareler ızgara hücrelerinden kesilir; her hücrenin köşesindeki NUMARA etiketleri (küçük gri/beyaz bileşenler)
ve komşu kareden taşan kenar kırıntıları silinir. Yatay konum hücreye göre (karakterin kare içindeki kayışı korunur), dikey: gövde bileşeninin altı ortak zemin çizgisine hizalanır.
Çalıştır: python3 tools/extract_heroine_death.py && python3 tools/build_female_animations.py"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..')
im = Image.open(os.path.join(ROOT, 'references/nexora_heroine_death_source.png')).convert('RGBA'); arr = np.array(im); A = arr[:, :, 3] > 110      # düşük alfalı (sayfada kalan) hayalet/halo kırıntıları dışarıda kalsın
ROW_Y = [(0, 268), (268, 548), (548, im.height)]
def labels(ry0, ry1):                                     # numara etiketleri: küçük gri bileşenler; sol kenarları = hücre başlangıcı
    sub = A[ry0:ry1]; rgb = arr[ry0:ry1, :, :3].astype(int); lab, n = ndi.label(ndi.binary_dilation(sub, iterations=1)); xs = []
    for k, s in enumerate(ndi.find_objects(lab), 1):
        m = (lab == k) & sub; w = s[1].stop - s[1].start; h = s[0].stop - s[0].start
        if m.sum() < 4 or w > 44 or h > 38 or m.sum() >= 1200: continue
        mean = rgb[m].mean(0)
        if abs(mean[0] - mean[1]) < 14 and abs(mean[1] - mean[2]) < 14: xs.append(s[1].start)
    return sorted(xs)
frames = []
for (ry0, ry1) in ROW_Y:
    lx = labels(ry0, ry1); assert len(lx) == 10, f'satır etiketi {len(lx)} (10 bekleniyordu)'
    sub = A[ry0:ry1].copy(); rgb = arr[ry0:ry1, :, :3].astype(int)
    # etiketleri sil
    lab0, n0 = ndi.label(ndi.binary_dilation(sub, iterations=1))
    for k, s_ in enumerate(ndi.find_objects(lab0), 1):
        m = (lab0 == k) & sub; w = s_[1].stop - s_[1].start; h = s_[0].stop - s_[0].start
        if m.sum() < 4 or (w <= 44 and h <= 38 and m.sum() < 1200 and abs(rgb[m].mean(0)[0] - rgb[m].mean(0)[1]) < 14 and abs(rgb[m].mean(0)[1] - rgb[m].mean(0)[2]) < 14): sub[m] = False
    # tohumlar: aşınmış (erode) maskenin en büyük bileşenleri, her hücreden (etiket sol kenarı..sonraki etiket) bir tane
    markers = np.zeros(sub.shape, np.int32); seeds = []                  # (merkez x, maske)
    for it, mn in ((9, 3000), (2, 300)):                                # kalın karelerde güçlü aşınma; ince (yatan) karelerde hafif aşınmayla eksikler tamamlanır
        core = ndi.binary_erosion(sub, iterations=it); cl, cn = ndi.label(core)
        for i in range(cn):
            m = cl == i + 1
            if m.sum() < mn: continue
            cx = ndi.center_of_mass(m)[1]
            if all(abs(cx - sx) > 120 for sx, _ in seeds): seeds.append((cx, m))
    seeds.sort(key=lambda t: t[0]); NEED = 9 if ry0 == ROW_Y[2][0] else 10     # 3. satırda 10 numara var ama 9 çizim var ('26' etiketli kare kaynak sayfada yok)
    assert len(seeds) == NEED, f'{len(seeds)} tohum ({NEED} bekleniyordu): satır {ry0}'
    for rank, (_, m) in enumerate(seeds, 1): markers[m] = rank
    dist = ndi.distance_transform_edt(sub); inp = (255 - np.clip(dist / max(dist.max(), 1) * 255, 0, 255)).astype(np.uint8)
    ws = ndi.watershed_ift(inp, markers); ws[~sub] = 0
    if ry0 == ROW_Y[2][0]:                                   # 3. satır: yatan kareler birbirine çok yakın → çekirdekler arası en boş sütundan dikey kesim (watershed kareyi kesiyor)
        cnt = sub.sum(0); ext = [(np.where(m.any(0))[0].min(), np.where(m.any(0))[0].max()) for _, m in seeds]; cuts = [0]
        for (a0, a1), (b0, b1) in zip(ext[:-1], ext[1:]):
            lo, hi = (a1 - 8, b0 + 8) if b0 > a1 else ((a1 + b0) // 2 - 8, (a1 + b0) // 2 + 8)
            cuts.append(min(range(lo, hi + 1), key=lambda c: cnt[c]))
        cuts.append(sub.shape[1]); ws = np.zeros_like(ws)
        for i in range(len(seeds)): ws[:, cuts[i]:cuts[i + 1]] = np.where(sub[:, cuts[i]:cuts[i + 1]], i + 1, 0)
    # küçük bağsız parçalar (yıldız/patlama/toz): en yakın tohuma ait olur (watershed zaten bağlı olanları dağıtır; bağsızlar 0 kalır)
    rest = sub & (ws == 0)
    if rest.any():
        ids, (iy, ix) = ndi.distance_transform_edt(ws == 0, return_indices=True)[0], ndi.distance_transform_edt(ws == 0, return_indices=True)[1]
        near = ws[iy, ix]; ws[rest] = near[rest]
    rgb_sub = rgb
    for c in range(len(seeds)):
        keep = ws == c + 1; ys, xs = np.where(keep)
        thick = ndi.binary_opening(keep, iterations=3)                           # kalın kısımlar (ince dış çizgi/hayalet çerçeveler elenir)
        tl, tn = ndi.label(thick); tsz = ndi.sum(thick, tl, range(1, tn + 1)); mainm = tl == (int(np.argmax(tsz)) + 1)
        dm = ndi.distance_transform_edt(~mainm); thick_ok = mainm.copy()
        for k in range(1, tn + 1):                                               # ana gövde dışındaki kalın parçalar: gövdeye değiyorsa (≤6 px) kalır; sarı/turuncu küçük parçalar (yıldız/patlama) 90 px'e kadar kalır
            m = tl == k
            if m.sum() < 3 or k == int(np.argmax(tsz)) + 1: continue
            r_, g_, b_ = rgb_sub[m].mean(0); yy, xx = np.where(m)
            yel = r_ > 170 and b_ < 90 and np.ptp(xx) < 110 and np.ptp(yy) < 110
            if (dm[m].min() <= 6 and m.sum() >= 1500) or (dm[m].min() <= 90 and yel): thick_ok |= m     # küçük gri/kırmızı kırıntılar (komşu kare kılıç ucu vb.) atılır
        near = ndi.binary_dilation(thick_ok, iterations=5)                       # gövdenin kendi ince çizgisi/saç tutamı: kalın bölgenin 5 px çevresi
        base = keep & near
        sep = keep & ~near; slab, sn = ndi.label(sep, structure=np.ones((3, 3))); keep = base.copy(); dmain = ndi.distance_transform_edt(~mainm)
        for k in range(1, sn + 1):                                               # kalan ayrık parçalar: yalnız gövdeye yakın sarı/turuncu (yıldız, vuruş patlaması) ve küçük hareket çizgileri
            m = (slab == k) & sep
            if m.sum() < 3: continue
            r_, g_, b_ = rgb_sub[m].mean(0)
            yy, xx = np.where(m)
            if dmain[m].min() <= 90 and r_ > 170 and b_ < 90 and np.ptp(xx) < 110 and np.ptp(yy) < 110: keep |= m
        if ry0 != ROW_Y[2][0]:                                                   # üst satırlar: gövdenin solunda kalan ince çıkıntılar (soldaki karenin kılıç ucu) atılır
            xm = np.where(thick_ok.any(0))[0].min(); keep[:, :max(0, xm - 6)] = False
        ys, xs = np.where(keep); body = ndi.find_objects(mainm.astype(int))[0]
        frames.append(dict(cx0=0, ry0=ry0, keep=keep, x0=xs.min(), x1=xs.max() + 1, y0=ys.min(), y1=ys.max() + 1, bodybottom=body[0].stop))
H = max(f['y1'] - f['y0'] for f in frames) + 20; mx = 30
Wc = int(max(f['x1'] - f['x0'] for f in frames) + 2 * mx)
out_dir = os.path.join(ROOT, 'assets/characters/female/death'); os.makedirs(out_dir, exist_ok=True)
for f in os.listdir(out_dir):
    if f.startswith('death_'): os.remove(os.path.join(out_dir, f))
GROUND = H - 10; xmin = 0
for i, f in enumerate(frames, 1):
    sub = arr[f['ry0']:f['ry0'] + f['keep'].shape[0], f['cx0']:f['cx0'] + f['keep'].shape[1]].copy(); sub[~ndi.binary_dilation(f['keep'], iterations=3)] = 0                 # düşük alfalı halo kırıntıları (komşu karelerden) sadece kare silüetinin 3 px çevresinde kalır
    crop = Image.fromarray(sub[f['y0']:f['y1'], f['x0']:f['x1']], 'RGBA')
    cv = Image.new('RGBA', (Wc, H + 0), (0, 0, 0, 0)); ypos = GROUND - (f['bodybottom'] - f['y0'])      # gövde alt kenarı zemin çizgisinde
    cx = np.where(np.array(crop)[:, :, 3] > 40)[1].mean(); cv.alpha_composite(crop, (int(Wc // 2 - cx), int(ypos))); cv.save(os.path.join(out_dir, f'death_{i:02d}.png'))
f1 = frames[0]; low = f1['keep'][int(f1['y1'] - 0.2 * (f1['y1'] - f1['y0'])):f1['y1']]; fx = np.where(low.any(0))[0]
PIVX = Wc // 2
print('tuval', (Wc, H), 'pivot', (PIVX, GROUND), 'ayakta boy', f1['y1'] - f1['y0'], 'kare', len(frames))
json.dump({'canvas': [int(Wc), int(H)], 'pivot': [int(PIVX), int(GROUND)], 'frames': len(frames), 'standingHeightPx': int(f1['y1'] - f1['y0'])}, open(os.path.join(ROOT, 'assets/characters/female/death_frames_info.json'), 'w'))
