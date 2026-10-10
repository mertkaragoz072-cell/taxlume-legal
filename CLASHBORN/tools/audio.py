"""Ses dosyalarını tarar, data/audio_manifest.json üretir (oyun bunu okur; dosya yoksa sentez sesi çalar).
Kullanım: python3 tools/audio.py            → audio/music ve audio/sfx içindeki .mp3 .m4a .ogg .wav dosyalarını listeler
          python3 tools/audio.py --check    → eksik ses yuvalarını yazdırır (yalnız bilgi)
İsimlendirme (küçük harf, snake_case):
  audio/music/<slot>.mp3 | <slot>_<evrenId>.mp3     slot: menu, battle, boss, victory, gameover   (evrenId: meadowlands, emberfall, frostveil …)
  audio/sfx/<ad>.ogg | <ad>_1.ogg, <ad>_2.ogg …      ad: aşağıdaki SFX listesi (varyantlar rastgele seçilir)
Önerilen biçim: müzik .m4a/.mp3 (≈128 kbps, döngü noktasında sessizlik/ayrı kuyruk yok), efektler .ogg/.mp3/.wav (mono, 44.1 kHz, ≤ 2 sn). iOS .ogg çalmaz → .m4a/.mp3 kullanın."""
import os, re, sys, json
ROOT = os.path.join(os.path.dirname(__file__), '..')
EXT = ('.mp3', '.m4a', '.ogg', '.wav')
SFX_NAMES = ['slash', 'hit', 'kill', 'hurt', 'heartbeat', 'coin', 'gem', 'levelup', 'skill1', 'skill2', 'gameover', 'click',      # sentez yedeği olanlar
             'dodge', 'perfect_dodge', 'boss_telegraph', 'boss_slam', 'boss_charge', 'boss_death', 'wave_clear', 'chapter_clear', 'card_show', 'card_pick', 'chest']   # yeni yuvalar: dosya yoksa eski sesle çalar
MUSIC_SLOTS = ['menu', 'battle', 'boss', 'victory', 'gameover']
worlds = [w['id'] for w in json.load(open(os.path.join(ROOT, 'data/chapters.json')))['worlds']]
def scan(d):
    p = os.path.join(ROOT, 'audio', d); return sorted(f for f in os.listdir(p) if f.lower().endswith(EXT)) if os.path.isdir(p) else []
music, sfx = {}, {}
for f in scan('music'):
    k = os.path.splitext(f)[0]
    if k.startswith('.'): continue
    base = k.split('_')[0]
    if base not in MUSIC_SLOTS: print('! müzik adı tanınmıyor:', f, '(slot:', ', '.join(MUSIC_SLOTS), ')'); continue
    if k != base and k[len(base) + 1:] not in worlds: print('! evren id yok:', f, '(', ', '.join(worlds), ')'); continue
    music[k] = f'audio/music/{f}'
for f in scan('sfx'):
    k = os.path.splitext(f)[0]; m = re.match(r'^(.*?)(?:_(\d+))?$', k); name = m.group(1)
    if name not in SFX_NAMES: print('! efekt adı tanınmıyor:', f, '(', ', '.join(SFX_NAMES), ')'); continue
    sfx.setdefault(name, []).append(f'audio/sfx/{f}')
json.dump({'music': music, 'sfx': sfx}, open(os.path.join(ROOT, 'data/audio_manifest.json'), 'w'), indent=2, ensure_ascii=False); open(os.path.join(ROOT, 'data/audio_manifest.json'), 'a').write('\n')
print(f'{len(music)} müzik, {sum(len(v) for v in sfx.values())} efekt dosyası ({len(sfx)} ad) → data/audio_manifest.json')
if '--check' in sys.argv or not music and not sfx:
    print('Eksik müzik yuvaları:', ', '.join(s for s in MUSIC_SLOTS if s not in music) or '—', '| evrene özel:', ', '.join(f'{s}_{w}' for w in worlds for s in ('battle', 'boss') if f'{s}_{w}' not in music and s not in music))
    print('Eksik efektler (sentez çalar):', ', '.join(n for n in SFX_NAMES if n not in sfx) or '—')
