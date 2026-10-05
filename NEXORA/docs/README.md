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
- **Görüş:** yatayda `camera.visibleWidthUnits` = 700 birim (≈ 8 kahraman boyu; referans 8–12), dikeyde 420 birim; ölçek `min(w/700, h/420)`. Yalnızca yatay ekran hedeflenir (tablet oranlarına kadar uyar).
- **Yerleşim:** kahraman ekranın solunda (`heroScreenX` 0.30), zemin yüksekliği `groundScreenY` 0.64; tepe noktası ekran ortasında → düşmanlar sağdan hafif yokuş aşağı gelir, ekranın hemen dışında doğar (`enemies.spawnOffscreen`).
- **Oran:** kahraman ≈ 98 birim (sprite ölçeği 1.15), goblin ≈ 63 birim (baseScale 1.05) — kahraman düşmandan belirgin büyük. Düşman ölçeği `enemies.baseScale × def.size`; referanstaki oranlar: küçük 1.0×, orta 1.3×, büyük 1.8× (`data/enemies.json` → `size`; şimdilik yalnız goblin).
- **Parallax katmanları** (`src/render/parallax.js`). Sprite varsa: gökyüzü + bulut sprite'ları, iki ada katmanı (`data/world_props.json → islandLayers`); yoksa `data/config.json → parallax` placeholder çizimi. Eski placeholder listesi: 5 gökyüzü+bulut, 4 uzak adalar (0.04), 3 kale/şehir (0.08), 2 dağ (0.16) ve ağaçlar (0.32), 1 zemin detayları (çit, kaya, çalı; yüzeyle birlikte hareket eder), 0 oyun alanı.
- **HUD (referansa göre):** sol üstte portre + kırmızı HP ("120 / 120") + `Lv.` çubuğu (turuncu = XP); sağ üstte coin ve gem; solda ayarlar/envanter/görev düğmeleri **pasif yer tutucu** (sistemleri henüz yok). Gem sayacı da yer tutucu (henüz kazanılmıyor).
- **Hasar yazısı:** büyük kırmızı `-28`; düşman HP çubuğu kırmızı, başın üstünde.
- Referanstaki "saldırı animasyonu" altın hilal: bizim erkek sprite'ları mavi efekt içeriyor; altın efekt yok.

## Yatay (landscape) mod — oyun yalnızca yatay için tasarlandı
- **Kilit:** `manifest.webmanifest` (`orientation: landscape`, `display: fullscreen`); ilk dokunuşta tam ekran + `screen.orientation.lock('landscape')` denenir (Android Chrome). iOS bunu desteklemez → dikey tutulursa oyun **duraklar** ve "Lütfen telefonu yatay çevirin" uyarısı çıkar. Mobil paketlemede (Capacitor vb.) yön yerel ayardan da kilitlenmeli.
- **Joystick:** sol alta **sabit** (güvenli alan payıyla); dokunma alanı ekranın sol %55'i. Sağ taraf yetenek/saldırı düğmeleri için boş bırakıldı. Klavye (A/D, ←/→) da çalışır.
- **HUD:** varsayılan değerler telefon yüksekliğine (≈ 360–440 px) göre sıkı; `min-height: 560px` üstü (tablet) büyütülür. Test edilen boyutlar: 640×360, 740×360, 844×390, 932×430 — taşma yok.
- **Görüş:** `min(w/700, h/420)` ölçeği; yatayda kahraman solda (%30), zemin alt %36.

## Görsel/oynanış yenilemesi (güncel durum)
- **Kamera:** yandan 2D, zoom uzak (`visibleWidthUnits` 860 × `visibleHeightUnits` 500); kahraman ekranın %36'sında, önündeki alan geniş; zemin dev bir yay (R = 2000).
- **Şerit (lane):** kahraman, düşman ve coin yüzey çizgisinin 22 birim önünde (çimin üzerinde) durur (`camera.laneDepth`), ayaklara yumuşak gölge çizilir → zemine basar.
- **Otomatik koşu:** girdi yoksa kahraman sağa koşar (`player.autoRun`, `autoSpeed`), önünde düşman varsa durup savaşır; joystick/A-D elle sürer. **Elle saldırı:** sağ alttaki kılıç düğmesi / Space / J (otomatik saldırı da açık).
- **Düşman grupları:** sağ ekran kenarının dışında 2–4'lü gruplar halinde doğar (`enemies.waveMin/Max`), ekranda en fazla 5; ağırlıklı tür seçimi (`weight`, `minLevel`: ogre seviye 3+). Düşmanlar önlerindeki düşmanın içine girmez (`enemies.separation`). Düşmanın HP barı sprite yüksekliğine göre başının üstünde.
- **Parallax (uzaktan yakına):** gökyüzü+güneş → uzak bulutlar (0.012) → uzak adalar (0.03, %45 sis) → orta adalar/kale (0.07, %18 sis) → ufuk sis bulutları (0.10) → uzak tepe siluetleri (0.18) → yakın ağaç/çalı şeridi (0.36, %42 sis) → zemin + dekor (1.0). Sprite'lar gökyüzü rengine doğru "atmosferik sis" ile soldurulur; ufukta sis bandı zemini arka planla birleştirir. Kod: `src/render/parallax.js`.
- **HUD:** altın çerçeveli portre, HP + `Lv.`/XP, coin + gem, küçük pasif yan düğmeler; sol altta şeffaf cam joystick, sağ altta kırmızı saldırı + iki pasif yetenek düğmesi.
