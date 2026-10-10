# audio — müzik ve ses efektleri

Oyun şu an **tüm sesleri kodla üretiyor** (Web Audio sentezi; müzik rastgele pentatonik). Gerçek dosyalar buraya konunca oyun otomatik onları kullanır; eksik olan her yuva için eski sentez ses çalmaya devam eder.

**Ekleme akışı:** dosyaları aşağıdaki isimlerle `audio/music/` ve `audio/sfx/` içine koy → `python3 tools/audio.py` (→ `data/audio_manifest.json`) → `python3 tools/audio.py --check` eksikleri listeler.

## Müzik (`audio/music/`) — `.m4a` veya `.mp3`, ≈128 kbps, kesintisiz döngü
| Dosya | Ne zaman çalar |
|---|---|
| `menu.mp3` | karakter seçim ekranı |
| `battle.mp3` / `battle_<evrenId>.mp3` | normal dalgalar (evrene özel varsa o, yoksa genel) |
| `boss.mp3` / `boss_<evrenId>.mp3` | boss dalgası |
| `victory.mp3` | bölüm/evren tamamlanınca bir kez, bitince savaş müziğine döner |
| `gameover.mp3` | ölünce bir kez |
Evren id'leri: `meadowlands`, `emberfall`, `frostveil` (yeni evren: `tools/worlds.py new`). Müzik `<audio>` ile akıtılır, 0.8 sn çapraz geçişle değişir; arka plana geçince durur.

## Efektler (`audio/sfx/`) — `.mp3`/`.m4a`/`.wav` (iOS `.ogg` çalmaz), mono, ≤ 2 sn; `ad.ext` veya varyantlar `ad_1.ext`, `ad_2.ext`… (rastgele seçilir, ±%4 perde)
`slash` kılıç savurma · `hit` düşmana vuruş · `kill` düşman ölümü · `hurt` oyuncu hasarı · `heartbeat` düşük can · `coin` · `gem` · `levelup` · `skill1` (dalga) · `skill2` (patlama) · `gameover` · `click` arayüz
Yeni yuvalar (dosya yoksa eski sesle çalar): `dodge` · `perfect_dodge` · `boss_telegraph` (saldırı uyarısı) · `boss_slam` · `boss_charge` · `boss_death` · `wave_clear` · `chapter_clear` · `card_show` · `card_pick` · `chest`

## Üretim için istek metinleri (Suno/Udio müzik, ElevenLabs/benzeri efekt) — kısa örnekler
- Müzik battle: "Epic upbeat fantasy adventure battle loop, orchestral with driving drums, bright heroic melody, 120 bpm, seamless loop, instrumental, painterly cartoon RPG style, 90 seconds"
- Müzik boss: "Intense dark orchestral boss battle loop, heavy percussion, brass stabs, ominous choir, 140 bpm, seamless loop, instrumental, 90 seconds"
- Müzik menu: "Warm calm fantasy menu theme, harp and strings, hopeful, seamless loop, instrumental, 60 seconds"
- Müzik victory: "Short triumphant fantasy victory fanfare, brass and strings, 6 seconds"
- Efekt: "Sword slash whoosh, short, bright, game sound effect, 0.4 seconds" · "Heavy hammer ground slam with rumble, 1 second" · "Coin pickup chime, 0.3 seconds" · "Goblin boss warning roar, 1 second"
