# assets / characters / female — kadın savaşçı (hero id: `heroine`)

| Yol | İçerik |
|---|---|
| `heroine_main.png`, `heroine_portrait.png` | ana görsel (kullanıcının yüklediği, **görünüm değişmez**) ve portre; kaynak `../../references/nexora_heroine_source.png` |
| `idle/ run/ attack/ hurt/ death/` | **gerçek animasyon kareleri için hazır klasörler** (şu an boş) |
| `frames.json` (opsiyonel) | pivot, ölçek, FPS, `strideUnits`, `attackFx`, `swordTip`, `impact` |
| `animations/`, `layers/`, `portraits/` | **eski** kare tabanlı kadın sheet (`?hero=female` geliştirme alternatifi); yeni sistemle ilgisi yok |

## Nasıl çalışır
- Her animasyon için **klasör doluysa kareler** oynar, **boşsa prosedürel hareket** (tek görsel) kullanılır. Karışık olabilir (ör. sadece `run/` dolu).
- Oyun içi ölçek ve pivot **tüm animasyonlarda tek** (`data/heroine_animations.json → framed`): karakter boyutu değişmez, ayaklar sabit pivotta zemine basar. Ölçek verilmezse idle gövde boyu ≈ 89 birim (erkekle aynı) olacak şekilde otomatik hesaplanır.
- **Run** karesi zamana değil kat edilen mesafeye bağlıdır (`strideUnits` birimde bir kare) → hareket yönü/hızıyla senkron, ayak kaymaz. Durunca idle'a geçer.
- **Attack**: `impact` (0–1) anında hasar uygulanır; efekt `attackFx: "overlay"` ise oyunun mavi hilali kılıç ucuna (`swordTip`, kareye özel `swordTipFrames`) çizilir, `"baked"` ise efekt karelerde gömülüdür.
- **Hurt / Death**: kombat sistemi tetikler (`hurt` bitince idle/run; `death` son karede kalır). Kare sayısı × FPS = süre.
- `tools/build_female_animations.py` kareleri doğrular: boyut tutarsızlığı, ayak çizgisi kayması, gövde x kayması, ayak–pivot uyuşmazlığı için UYARI verir.

Önceki sürümde (`heroine` klasörü) duran ana görsel ve portre bu klasöre taşındı.

## Kesme-bebek animasyonu (Nim'siz, kredisiz)
`render/characters.js → drawProceduralHero`: ana görsel 3 katmana bölünür (arka bacak, ön bacak, gövde+saç/pelerin; kesim y=365, 26 px binme payı). **Koşu:** bacaklar kalça etrafında kat edilen mesafeyle (stride/62) senkron döner ve kalkar, gövde kalçadan eğilip sekir (ayak kaymaz). **Saç/pelerin/eşarp:** sol sütunlar 8 px'lik şeritlerle sinüs dalgası bükmesi. **Saldırı:** gövde kalçadan geri yaslanıp savrulur + hayalet izler + mavi hilal. **Hasar:** geri savrulma + kırmızı parlama. **Ölüm:** geri fırlama, havada dönüş, yere çarpıp sekme, yan yatış; kılıç ayrı katman olarak elinden düşer. Nim'le gerçek kare animasyonu üretimi kredi bitince (4 kredi) ertelendi; `assets/characters/female/{idle,run,attack,hurt,death}/` klasörleri dolarsa kare tabanlı sistem otomatik devralır.

## Ölüm = fizik simülasyonu (ragdoll)
`src/game/ragdoll.js` (güncelleme: `systems.js updatePlayerAnim`) + `render/characters.js drawHeroRagdoll`. Ölümde 5 cisim simüle edilir: **gövde** (baş+gövde+kollar; dışbükey kabuk, katı cisim: yerçekimi 1250, zemin teması, sekme 0.28, sürtünme 0.7), **2 bacak** ve **saç/pelerin kuyruğu** (menteşeli sarkaç, mafsal sınırı, ucu zemini geçmez), **kılıç** (ayrı katı cisim; ileri fırlar, sekip yerde durur). Başlangıç: geri fırlama (-215, -290 birim/sn) + dönme. Darbelerde yer tozu (`fx.groundDust`) ve sarsıntı, durunca (`rest`) donar. "Oyun Bitti" paneli 1.9 sn gecikmeyle açılır. Erkek karakter (kare tabanlı) etkilenmez.

## Ölüm = kare tabanlı (30 FPS, güncel)
Kaynak `references/nexora_heroine_death_source.png` (2172×724, şeffaf; numaralı 30 etiketli sayfa, 3 satır). **Sayfada yalnız 29 çizim var** ('26' etiketli kare yok; 3. satırda 9 kare) → 29 kare. `tools/extract_heroine_death.py`: numara etiketlerini siler, kareleri distance-transform watershed ile ayırır (3. satır: çekirdekler arası dikey kesim), hayalet/halo kırıntılarını atar, yıldız/vuruş patlamasını korur; ortak tuval (340×235), gövde alt kenarı = zemin, pivot (170,225). `frames.json`: **fps 30** (≈0.97 sn), scale 0.455 (ayakta ≈ 96 birim), `dx` (geriye kayma), `dust` kare/parçacık/yayılma, `shake`. `python3 tools/extract_heroine_death.py && python3 tools/build_female_animations.py`. Ölüm klasörü boşaltılırsa ragdoll fiziği (`src/game/ragdoll.js`) devreye girer. "Oyun Bitti" paneli 1.4 sn gecikmeyle.

## Bekleme (idle) = kare tabanlı, 30 FPS (güncel sayfa)
Kaynak `references/nexora_heroine_idle_source.png` (1774×887, siyah arka planlı, 3×10 = 30 kare, numarasız, gölgesiz). `tools/extract_heroine_idle.py`: kenardan flood-fill ile saf siyah arka plan silinir; kapalı kalan büyük saf siyah boşluklar (bacak arası) da arka plandır, karakterin koyu çizgileri/gözleri/siyah taytları korunur; kenarda siyah matte çözülüp yumuşak alfa verilir (koyu hale yok); küçük renkli parçalar (kırmızı şerit uçları) yakınsa karaktere eklenir; satır/sütun sırasıyla 1→30. Ölüm karesiyle aynı tuval (340×235), pivot (170,225), boy ölüm duruşuyla eşit; botlar yatayda pivota hizalı. `frames.json`: **fps.idle = 30**, loop → 30 kare × 1/30 sn = 1 sn. 30→1 geçişinin kare farkı ortalamanın biraz üstünde (≈10.3 / 6.8): hafif bir sıçrama olabilir. Oyun kendi zemin gölgesini çizer. Koşu/saldırı/hasar hâlâ ana görselden prosedürel.
