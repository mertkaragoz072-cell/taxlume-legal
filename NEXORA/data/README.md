# data

Oyun verisi ve denge değerleri (JSON). Kod bu dosyaları `fetch` ile yükler (`src/core/config.js`).

| Dosya | İçerik |
|---|---|
| `config.json` | gezegen, oyuncu, level, düşman spawn/ölçekleme, loot, HUD değerleri |
| `enemies.json` | düşman tipleri (anahtar = tür adı; hp, damage, speed, xp, coins, renkler) |
| `male_animations.json` | erkek karakter: tuval, pivot, ölçek, animasyonlar (kare adları, FPS, döngü); `tools/extract_male_sheet.py` üretir |
| `asset_manifest.json` | çalışma zamanında yüklenecek görseller: `{ "images": { "anahtar": "assets/.../dosya.png" } }` — sadece diskte var olan dosyalar yazılır; logo, erkek karakter kareleri (`male_*`) ve efektler (`fx_*`) |

Henüz yok (ileride): boss, silah, upgrade, görev, mağaza, gezegen tanımları.
