"""Kadın savaşçı koşu (run) kareleri: references/nexora_heroine_run_source.png (1500x750, ALFA KANALLI, 3 satır x 10 sütun = 30 kare, numaralar kare altında, zemin gölgesi var) ->
assets/characters/female/run/run_01..30.png (şeffaf; sadece karakter — numara ve zemin gölgesi YOK, oyun kendi gölgesini çizer).
Yöntem: (1) alfa>25 bileşenleri: büyük = karakter (30 adet), küçük gri/beyaz = numara (atılır), karaktere yakın küçük renkli parçalar (saç/şerit) kalır;
(2) zemin gölgesi: karakterin çekirdeği (alfa>=200) dışında kalan yarı saydam (alfa<130) bölge silinir (çekirdeğe 1 px'den yakın kenar yumuşaklığı korunur);
(3) ölçek: kafa bandı (kırmızı bandana) yüksekliği bekleme karelerininkiyle eşitlenir → bekleme/ölüm ile aynı boy; (4) hizalama: yer çizgisi = satırın gölge merkezi + 13 px (gölge elipsi her satırda sabit yükseklikte → zıplama/uçuş
fazları korunur), x = gölge merkezi (gölge botlarla örtüşen 2 karede komşu karelerin göreli değeri); tuval 340x235, pivot (170,225) — bekleme/ölümle aynı. Çalıştır: python3 tools/extract_heroine_run.py && python3 tools/build_female_animations.py"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.join(os.path.dirname(__file__), '..'); CH = os.path.join(ROOT, 'assets/characters/female')
info = json.load(open(os.path.join(CH, 'death_frames_info.json'))); Wc, Hc = info['canvas']; PX, PY = info['pivot']
im = np.array(Image.open(os.path.join(ROOT, 'references/nexora_heroine_run_source.png')).convert('RGBA')); al = im[..., 3].astype(np.float32)
H, W = al.shape; yy, xx = np.indices(al.shape)
lum = 0.3 * im[..., 0] + 0.59 * im[..., 1] + 0.11 * im[..., 2]; sat = im[..., :3].max(2).astype(int) - im[..., :3].min(2).astype(int)
lab, n = ndi.label(al > 25); objs = ndi.find_objects(lab); area = ndi.sum(al > 25, lab, range(1, n + 1))
big = [(i + 1, objs[i]) for i in range(n) if area[i] > 9000]; assert len(big) == 30, f'30 karakter bekleniyordu, {len(big)}'
small = [(i + 1, objs[i]) for i in range(n) if area[i] <= 9000 and area[i] > 40]
cy = lambda c: (c[1][0].start + c[1][0].stop) / 2; cx = lambda c: (c[1][1].start + c[1][1].stop) / 2
big.sort(key=cy); rows = [sorted(big[i * 10:(i + 1) * 10], key=cx) for i in range(3)]
def red_head(a, mask):                                            # bandana (baş bandı) yüksekliği/genişliği
    core = mask & (a[..., 3] >= 200); ys, xs = np.where(core); top, bot = ys.min(), ys.max()
    red = (a[..., 0] > 170) & (a[..., 1] < 70) & (a[..., 2] < 70) & core; red[top + int((bot - top) * 0.30):] = False
    y2, x2 = np.where(red); return (y2.max() - y2.min() + 1), (x2.max() - x2.min() + 1)
idle = [np.array(Image.open(os.path.join(CH, f'idle/idle_{k:02d}.png')).convert('RGBA')) for k in (1, 8, 15, 22, 29)]
ih = float(np.median([red_head(a, np.ones(a.shape[:2], bool))[0] for a in idle]))
rh = float(np.median([red_head(im, lab == c[0])[0] for r in rows for c in r]))
SC = ih / rh
# yer çizgisi (satır başına) ve gölge x'i
recs = []
for ri, row in enumerate(rows):
    for ci, (k, s) in enumerate(row):
        m = lab == k; core = m & (al >= 200); ys, xs = np.where(core); top, bot = ys.min(), ys.max()
        sh = m & (al < 175) & (al > 12) & (lum < 95); sh[:top + int((bot - top) * 0.75)] = False
        w = al * sh; t = float(w.sum()); recs.append(dict(k=k, row=ri, sx=float((xx * w).sum() / t), sy=float((yy * w).sum() / t), t=t, core=core, m=m))
gy_row = [float(np.median([r['sy'] for r in recs if r['row'] == ri and r['t'] > 40000])) + 13 for ri in range(3)]
frames = []
for r in recs:
    k, m, core = r['k'], r['m'], r['core']
    keep = m.copy()
    for sm, _ in small:                                           # karaktere yakın renkli küçük parçalar kalır (saç telleri); numara (gri/beyaz) atılır
        sm_m = lab == sm
        if sat[sm_m].mean() > 55 and ndi.binary_dilation(core, iterations=14)[sm_m].any(): keep |= sm_m; core = core | (sm_m & (al >= 200))
    near1 = ndi.binary_dilation(core, iterations=1); near3 = ndi.binary_dilation(core, iterations=3)
    keep &= near1 | (near3 & (al >= 130))                         # gölge yarı saydamdır (alfa ≈ 90-110); çekirdeğe çok yakın kenar yumuşaklığı korunur
    ys, xs = np.where(keep & (al > 12)); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = im[y0:y1, x0:x1].copy(); sub[..., 3] = np.where(keep[y0:y1, x0:x1], sub[..., 3], 0)
    frames.append(dict(img=Image.fromarray(sub, 'RGBA'), ax=r['sx'] - x0, gy=gy_row[r['row']] - y0, ok=r['t'] > 40000, rec=r))
rel = [f['ax'] for f in frames if f['ok']]
for i, f in enumerate(frames):                                    # gölgesi botlara karışan kareler: komşuların göreli x'i
    if not f['ok']: f['ax'] = (frames[i - 1]['ax'] + frames[(i + 1) % 30]['ax']) / 2
out = os.path.join(CH, 'run'); os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.startswith('run_'): os.remove(os.path.join(out, f))
clipped = 0
for i, f in enumerate(frames, 1):
    im2 = f['img']; w, h = im2.size; im2 = im2.resize((max(1, round(w * SC)), max(1, round(h * SC))), Image.LANCZOS)
    cv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0)); ox, oy = int(round(PX - f['ax'] * SC)), int(round((PY - 1) - f['gy'] * SC))
    if ox < 0 or oy < 0 or ox + im2.width > Wc or oy + im2.height > Hc: clipped += 1
    cv.alpha_composite(im2, (ox, oy)); cv.save(os.path.join(out, f'run_{i:02d}.png'))
print('run kare', len(frames), 'ölçek', round(SC, 3), 'tuval', (Wc, Hc), 'taşan', clipped)
