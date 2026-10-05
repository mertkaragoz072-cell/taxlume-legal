# docs

Tasarım ve teknik notlar.

## Sprite/animasyon standardı (görseller eklenirken uyulacak)
- Format: şeffaf PNG, `snake_case`, küçük harf, ASCII.
- Karakter kare boyutu: **224×176 px** (erkek karakter sheet'inden; kare başına ortak tuval). Düşmanlar için ayrı ölçü belirlenecek.
- **Pivot:** ayakların orta noktası = `(112, 164)` (alttan 12 px yukarı). Çizim kodu bu noktayı yüzeye oturtur (`render/draw.js → onSurface`).
- Bakış yönü: **sağa**; sola dönüş kodda yansıtılarak yapılır (ayrı sol kare üretilmez).
- Kare sırası: `<anim>_01`, `<anim>_02`, … sıralı; sprite sheet kullanılırsa yanında `sheet.json` (kare adları, sıra, FPS, pivot).
- FPS (öneri): idle 8, run 14, attack 16/16/14, jump 10, hurt 10, death 8, turn 10 (değerler `data/male_animations.json`).
- Oyun içi ölçek: `scale` alanı (erkek: 1.15). Kaynak düşük çözünürlüklü olduğundan büyütme.
- Stil: kalın temiz outline (`#1f2a44`), canlı ama yumuşak renk, hafif cel-shading.

## Kamera ve oynanış (referans: `assets/references/nexora_camera_gameplay_reference.png`)
- **Kamera:** yandan, hafif yukarıdan (≈15–20°). Gezegen çok büyük (`planet.radius` = 2000 birim) olduğundan yüzey ekranda yumuşak bir tepe gibi görünür; dünya hâlâ yuvarlaktır (açı tabanlı).
- **Görüş:** yatayda `camera.visibleWidthUnits` = 700 birim (≈ 8 kahraman boyu; referans 8–12), dikeyde 420 birim; ölçek `min(w/700, h/420)`. Portre ve yatay ekranlara uyar.
- **Yerleşim:** kahraman ekranın solunda (`heroScreenX` 0.30), zemin yüksekliği `groundScreenY` 0.64; tepe noktası ekran ortasında → düşmanlar sağdan hafif yokuş aşağı gelir, ekranın hemen dışında doğar (`enemies.spawnOffscreen`).
- **Oran:** kahraman ≈ 98 birim (sprite ölçeği 1.15), goblin ≈ 63 birim (baseScale 1.05) — kahraman düşmandan belirgin büyük. Düşman ölçeği `enemies.baseScale × def.size`; referanstaki oranlar: küçük 1.0×, orta 1.3×, büyük 1.8× (`data/enemies.json` → `size`; şimdilik yalnız goblin).
- **Parallax katmanları** (`src/render/parallax.js`). Sprite varsa: gökyüzü + bulut sprite'ları, iki ada katmanı (`data/world_props.json → islandLayers`); yoksa `data/config.json → parallax` placeholder çizimi. Eski placeholder listesi: 5 gökyüzü+bulut, 4 uzak adalar (0.04), 3 kale/şehir (0.08), 2 dağ (0.16) ve ağaçlar (0.32), 1 zemin detayları (çit, kaya, çalı; yüzeyle birlikte hareket eder), 0 oyun alanı.
- **HUD (referansa göre):** sol üstte portre + kırmızı HP ("120 / 120") + `Lv.` çubuğu (turuncu = XP); sağ üstte coin ve gem; solda ayarlar/envanter/görev düğmeleri **pasif yer tutucu** (sistemleri henüz yok). Gem sayacı da yer tutucu (henüz kazanılmıyor).
- **Hasar yazısı:** büyük kırmızı `-28`; düşman HP çubuğu kırmızı, başın üstünde.
- Referanstaki "saldırı animasyonu" altın hilal: bizim erkek sprite'ları mavi efekt içeriyor; altın efekt yok.
