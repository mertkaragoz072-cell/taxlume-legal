"""Düşman animasyon sayfasından kare çıkarma (yüksek kare sayılı, kullanıcı çizimi sayfalar).
Kullanım: python3 tools/extract_enemy_sheet.py <tür> <anim> <kaynak.png> [--cols 6] [--rows 5] [--fps 30] [--stride 55] [--loop] [--target 70] [--impact 0.47] [--vis 0.45] [--ref-frames 19-30]
  <tür>: goblin_scout | goblin_warrior | goblin_brute | goblin_boss …   <anim>: walk | attack | hurt | death
Kaynak: SİYAH arka planlı, numaralı (kare altında) sayfa, cols×rows kare (öntanımlı 6×5 = 30), sağa bakan karakter.
Yöntem (extract_heroine_attack.py ile aynı): mx>=14 bileşenleri → büyük = karakter, küçük gri/beyaz = numara (atılır); alfa = katı gövde (mx>=45, delikler dolu) + efekt için yumuşak eşik (siyah matte çözülür);
ölçek (birim/px) = hedef boy (--target, öntanımlı mevcut yürüme boyu) ÷ ortanca kare boyu; kareler özgün çözünürlükte kalır (yeniden örnekleme yok).
Hizalama: x = bandana/baş merkezi (kırmızı bileşen yoksa gövde merkezi), y = botların alt kenarı (ortak yer çizgisi); tuval ortak, pivot (W/2, H-8).
Çıktı: assets/enemies/<tür>/hd/<anim>_NN.png, manifest 'enemy_<tür>_hd_<anim>_NN', data/enemy_animations.json → anims.<anim> (frames, fps, loop, pivot, scale, canvas[, strideUnits]).
Oyun kodu (drawEnemy) animasyon düzeyindeki pivot/scale'i kullanır → eski düşük çözünürlüklü kareler yanında çalışır."""
import os, sys, json, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ap = argparse.ArgumentParser(); ap.add_argument('type'); ap.add_argument('anim'); ap.add_argument('src')
ap.add_argument('--cols', type=int, default=6); ap.add_argument('--rows', type=int, default=5); ap.add_argument('--fps', type=float, default=30)
ap.add_argument('--stride', type=float, default=0); ap.add_argument('--loop', action='store_true'); ap.add_argument('--target', type=float, default=0); ap.add_argument('--impact', type=float, default=0); ap.add_argument('--vis', type=float, default=0); ap.add_argument('--ref-frames', default=''); ap.add_argument('--grid', action='store_true'); ap.add_argument('--land', type=int, default=0)
a = ap.parse_args(); N = a.cols * a.rows
ROOT = os.path.join(os.path.dirname(__file__), '..')
rgb = np.array(Image.open(os.path.join(ROOT, a.src) if not os.path.isabs(a.src) else a.src).convert('RGB')).astype(np.float32); H, W = rgb.shape[:2]
mx = rgb.max(2); sat = mx - rgb.min(2); yy, xx = np.indices((H, W))
lab, n = ndi.label(mx >= 14, structure=np.ones((3, 3), bool)); area = ndi.sum(mx >= 14, lab, range(1, n + 1)); objs = ndi.find_objects(lab)
thr = 0.35 * float(np.median(sorted(area)[-N:]))
big = [(i + 1, objs[i]) for i in range(n) if area[i] > thr]; assert len(big) == N, f'{N} karakter bekleniyordu, {len(big)} bulundu (alanlar: {sorted(int(x) for x in area)[-(N + 4):]})'
small = [(i + 1, objs[i]) for i in range(n) if 30 < area[i] <= thr]
cy = lambda c: (c[1][0].start + c[1][0].stop) / 2; cx = lambda c: (c[1][1].start + c[1][1].stop) / 2
big.sort(key=cy); rows = [sorted(big[r * a.cols:(r + 1) * a.cols], key=cx) for r in range(a.rows)]; order = [c for r in rows for c in r]
recs = []
for k, (i, s) in enumerate(order, 1):
    m = lab == i; keep = m.copy()
    for sm, _ in small:
        smm = lab == sm
        if sat[smm].mean() > 70 and ndi.binary_dilation(m, iterations=16)[smm].any(): keep |= smm
    solid = ndi.binary_fill_holes(keep & (mx >= 45)); solid = ndi.binary_dilation(solid, iterations=1) & (mx >= 22) | solid
    soft = np.clip((mx - 8) / 40.0, 0, 1); alpha = np.where(solid, 1.0, soft) * ndi.binary_dilation(keep, iterations=4)
    col = np.where((alpha[..., None] > 0.02) & (~solid[..., None]), np.clip(rgb / np.maximum(alpha[..., None], 0.06), 0, 255), rgb)
    ys, xs = np.where(alpha > 0.02); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    body = alpha > 0.6; yb, xb = np.where(body); top, bot = yb.min(), yb.max()
    red = body & (rgb[..., 0] > 150) & (rgb[..., 1] < 70) & (rgb[..., 2] < 70) & (yy < top + (bot - top) * 0.4)
    ax = float(xx[red].mean()) if red.sum() > 150 else float(xb.mean())
    rb = body & (rgb[..., 0] > 150) & (rgb[..., 1] < 70) & (rgb[..., 2] < 70) & (yy < top + (bot - top) * 0.45); l2, k2 = ndi.label(rb)
    bh = 0
    if k2: j = 1 + int(np.argmax(ndi.sum(rb, l2, range(1, k2 + 1)))); ys2 = np.where(l2 == j)[0] if False else np.where((l2 == j).any(1))[0]; bh = ys2.max() - ys2.min() + 1      # bandana yüksekliği (ölçek eşlemesi için)
    recs.append(dict(img=np.dstack([col, alpha * 255])[y0:y1, x0:x1].astype(np.uint8), ax=ax - x0, bot=bot + 1 - y0, h=bot - top + 1, bh=bh, x0=x0, y0=y0, abs_bot=bot + 1))
if a.grid:                                                  # düşme/ölüm gibi gövdenin yer değiştirdiği animasyonlar: kare konumu sayfa ızgarasına göre korunur (x = hücre merkezi, yer = 1. karenin zemin çizgisi, satır ofsetiyle)
    cw, ch = W / a.cols, H / a.rows; g1 = recs[0]['abs_bot']
    for k, r in enumerate(recs):
        row, col = divmod(k, a.cols); r['ax'] = (col + 0.5) * cw - r['x0']; r['bot'] = row * ch + g1 - r['y0']
hmed = float(np.median([r['h'] for r in recs]))
meta_p = os.path.join(ROOT, 'data/enemy_animations.json'); E = json.load(open(meta_p)); T = E[a.type]
def old_walk_h():
    ims = [Image.open(os.path.join(ROOT, 'assets/enemies', a.type, f'walk_{i:02d}.png')) for i in range(1, len(T['anims']['walk']['frames']) + 1)]
    return round(T['scale'] * float(np.median([im.getbbox()[3] - im.getbbox()[1] for im in ims])), 1)
target = a.target or T.get('hdTarget') or old_walk_h()
if a.anim == 'walk' and not T.get('hdTarget'): T['hdTarget'] = target                     # ilk yüksek çözünürlüklü yürüme: hedef boy kaydedilir (sonraki durumlar bandana boyuyla eşlenir)
scale = target / hmed
walk = T['anims'].get('walk', {})
if a.anim != 'walk' and walk.get('frames') and str(walk['frames'][0]).startswith(f'enemy_{a.type}_hd_walk'):      # diğer durumlar: bandana boyu yürüme karesininkine eşitlenir → durumlar arası boy tutarlı
    wk = [np.array(Image.open(os.path.join(ROOT, 'assets/enemies', a.type, 'hd', f'walk_{i:02d}.png')).convert('RGBA')) for i in (1, 8, 15, 22)]
    def band(arr):
        al = arr[..., 3] > 150; ys, xs = np.where(al); t0, b0 = ys.min(), ys.max(); r = al & (arr[..., 0] > 150) & (arr[..., 1] < 70) & (arr[..., 2] < 70); r[int(t0 + (b0 - t0) * 0.45):] = False
        l, k = ndi.label(r); j = 1 + int(np.argmax(ndi.sum(r, l, range(1, k + 1)))); yy_ = np.where((l == j).any(1))[0]; return yy_.max() - yy_.min() + 1
    wband = float(np.median([band(w) for w in wk])); rs, re_ = (int(x) for x in a.ref_frames.split('-')) if a.ref_frames else (1, N)                  # ölçek ölçümü yalnız bu karelerden (baş yan yatık karelerde bandana boyu yanıltır)
    rband = float(np.median([r['bh'] for r in recs[rs - 1:re_] if r['bh']]))
    if wband and rband: scale = walk['scale'] * wband / rband
L = max(r['ax'] for r in recs); R = max(r['img'].shape[1] - r['ax'] for r in recs); Hh = max(r['bot'] for r in recs) + max(r['img'].shape[0] - r['bot'] for r in recs)
Wc = int(2 * max(L, R) + 8); Hc = int(max(r['img'].shape[0] for r in recs) + 16); PXc, PYc = Wc // 2, Hc - 8
out = os.path.join(ROOT, 'assets/enemies', a.type, 'hd'); os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.startswith(a.anim + '_'): os.remove(os.path.join(out, f))
man_p = os.path.join(ROOT, 'data/asset_manifest.json'); man = json.load(open(man_p))
for k in [k for k in man['images'] if k.startswith(f'enemy_{a.type}_hd_{a.anim}_')]: del man['images'][k]
keys = []
for i, r in enumerate(recs, 1):
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); im = Image.fromarray(r['img'], 'RGBA'); ox, oy = int(round(PXc - r['ax'])), int(round(PYc - r['bot']))
    cv.alpha_composite(im, (max(ox, 0), max(oy, 0)), (max(-ox, 0), max(-oy, 0))); fn = f'{a.anim}_{i:02d}.png'; cv.save(os.path.join(out, fn))
    key = f'enemy_{a.type}_hd_{a.anim}_{i:02d}'; man['images'][key] = f'assets/enemies/{a.type}/hd/{fn}'; keys.append(key)
man['images'] = dict(sorted(man['images'].items())); json.dump(man, open(man_p, 'w'), indent=2, ensure_ascii=False); open(man_p, 'a').write('\n')
anim = {'frames': keys, 'fps': a.fps, 'loop': a.loop, 'canvas': [Wc, Hc], 'pivot': [PXc, PYc], 'scale': round(scale, 4)}
old = T['anims'].get(a.anim, {})
if a.land: anim['landFrame'] = a.land                          # ölüm: gövdenin yere çarptığı kare (toz)
if a.vis: anim['visDur'] = a.vis                              # hasar animasyonu: tüm kareler bu sürede (sn) oynar (gerçek sersemleme süresinden bağımsız)
if a.impact: anim['impact'] = a.impact
elif 'impact' in old: anim['impact'] = old['impact']
if a.stride: anim['strideUnits'] = a.stride / N
T['anims'][a.anim] = anim; json.dump(E, open(meta_p, 'w'), indent=2); open(meta_p, 'a').write('\n')
print(f'{a.type}/{a.anim}: {N} kare, tuval {Wc}x{Hc}, pivot ({PXc},{PYc}), ölçek {scale:.4f} (hedef boy {target} birim / ortanca kare boyu {hmed:.0f} px)')
