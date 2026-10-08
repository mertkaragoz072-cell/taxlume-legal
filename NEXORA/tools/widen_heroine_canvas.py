"""Kadın savaşçı tuvalini sağa genişletir (saldırıdaki uzun kılıç/ateş efekti 340 px tuvale sığmıyor): idle/run/death kareleri sağdan şeffaf dolgu ile
WIDTH px'e getirilir, pivot (170,225) AYNI kalır (sol/üst/alt değişmez); death_frames_info.json → canvas güncellenir. Tekrar çalıştırmak güvenlidir (zaten geniş olanlara dokunmaz).
Çıkarma betikleri (extract_heroine_idle/run/death.py) 340 px üretir; onlardan sonra bu betik, sonra extract_heroine_attack.py, sonra build_female_animations.py çalıştırılır."""
import os, glob, json
from PIL import Image
WIDTH = 380
ROOT = os.path.join(os.path.dirname(__file__), '..'); CH = os.path.join(ROOT, 'assets/characters/female'); ip = os.path.join(CH, 'death_frames_info.json')
info = json.load(open(ip)); n = 0
for an in ('idle', 'run', 'death'):
    for f in glob.glob(os.path.join(CH, an, f'{an}_[0-9]*.png')):
        im = Image.open(f).convert('RGBA')
        if im.width < WIDTH:
            cv = Image.new('RGBA', (WIDTH, im.height), (0, 0, 0, 0)); cv.paste(im, (0, 0)); cv.save(f); n += 1
info['canvas'][0] = max(info['canvas'][0], WIDTH); json.dump(info, open(ip, 'w')); print('genişletilen kare', n, 'tuval', info['canvas'])
