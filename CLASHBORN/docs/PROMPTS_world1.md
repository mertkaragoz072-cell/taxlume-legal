# Dünya 1 tamamlama — kopyala-yapıştır istek paketi

## 1) Müzik (Suno / Udio) → `audio/music/` (`.mp3`, sonra `python3 tools/audio.py`)
- `menu.mp3`: Warm calm fantasy menu theme, harp and soft strings, hopeful and magical, seamless loop, instrumental, 60 seconds
- `battle_meadowlands.mp3`: Upbeat heroic fantasy adventure battle loop, driving drums, bright brass melody, folk flute, sunny meadow feeling, 120 bpm, seamless loop, instrumental, 90 seconds
- `boss_meadowlands.mp3`: Intense dark orchestral boss battle loop, heavy war drums, brass stabs, ominous low choir, goblin horde feeling, 140 bpm, seamless loop, instrumental, 90 seconds
- `victory.mp3`: Short triumphant fantasy victory fanfare, brass and strings, 6 seconds, instrumental
- `gameover.mp3`: Short sad defeated fantasy sting, slow descending strings, 5 seconds, instrumental

## 2) İki yeni boss (3. ve 4. bölüm) — önce tasarım, sonra 4 sayfa (yürüme/saldırı/hasar/ölüm; hasar atlanabilir)
Boss A (3. bölüm) tasarım: Full-body character design of a goblin warlock boss for a 2D fantasy action game: tall wiry green goblin with a huge feathered bone headdress, glowing purple eyes, ragged dark-purple robe with skull charms, holding a twisted wooden staff topped with a floating purple fire orb. Ready stance, facing RIGHT, full body visible. Pure black background, polished hand-painted cartoon style, bold clean outlines, rich colors.
Boss B (4. bölüm) tasarım: Full-body character design of a goblin bomber chief boss: round fat green goblin in scorched leather armor with goggles on a spiked helmet, a bandolier of round black bombs across the chest, a huge lit bomb in one hand and a giant wooden mallet in the other. Ready stance, facing RIGHT, full body visible. Pure black background, polished hand-painted cartoon style, bold clean outlines, rich colors.
Sayfa metinleri: önceki bosslarla aynı kalıp (30 kare, 6×5, siyah zemin, kareler arası geniş boşluk, numaralı). Sihirbaz saldırısı: staff raised, purple fire orb flares, magic pulse smashed into the ground. Bombacı saldırısı: lifts the huge bomb and slams it down, a small fireball inside the cell.

## 3) Özel goblinler (Kalkancı, Şaman, Bombacı) — tasarım + 4 sayfa (hasar/ölüm kısa tutulabilir)
- Kalkancı: Stocky goblin in wooden-and-iron armor holding a huge round tower shield and a short sword.
- Şaman: Thin goblin with a feathered bone headdress, tattered robes, a bone staff with a glowing green orb.
- Bombacı: Small hyper goblin with goggles, a satchel of round black bombs, one lit bomb in hand.

## 5) Ses efektleri (ElevenLabs / benzeri) → `audio/sfx/` (`.mp3`/`.wav`, mono, ≤2 sn; çeşitli: `slash_1.mp3`, `slash_2.mp3`…)
slash: Sword slash whoosh, short and bright, 0.4 s · hit: Blade hitting a goblin, punchy thud, 0.3 s · kill: Goblin defeated grunt with poof, 0.5 s · hurt: Hero hurt grunt, short, 0.4 s · coin: Coin pickup chime, 0.3 s · gem: Magical gem sparkle, 0.5 s · levelup: Rising magical level-up chime, 1 s · skill1: Blue energy wave whoosh, 0.7 s · skill2: Heavy ground burst explosion, 1 s · dodge: Quick air dash whoosh, 0.3 s · perfect_dodge: Bright time-slow shimmer, 0.6 s · boss_telegraph: Low warning horn, 0.8 s · boss_slam: Giant hammer ground slam with rumble, 1 s · boss_charge: Heavy charging stomp rush, 0.8 s · boss_death: Boss defeated roar and collapse, 1.5 s · wave_clear: Short victory ding, 0.8 s · chapter_clear: Triumphant short fanfare, 2 s · card_show: Card swoosh reveal, 0.5 s · card_pick: Satisfying card select, 0.4 s · chest: Wooden chest opening with sparkle, 0.8 s
