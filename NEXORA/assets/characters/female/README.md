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

## Ölüm = kare tabanlı (kullanıcı assetleri, güncel)
Kaynak `references/nexora_heroine_death_source.png` (10 kare: üstte 6 — vuruş, acı, yaylanma, diz çökme, öne düşme; altta 4 — yere yatış, kılıç düşmüş, sersem yıldızlar, ölü). `tools/extract_heroine_death.py` kareleri ayırır (komşu kareden taşan parçaları siler), ortak tuval (447×287) ve pivot (223,277: ayak/zemin) ile `death/death_01..10.png` yazar; `frames.json` (scale 0.365 → ayakta ≈ 96 birim, fps 8, `dx` geriye kayma) ile `tools/build_female_animations.py` çalıştırılır. Diğer animasyonlar (idle/run/attack/hurt) prosedürel kalır. Ölümde 4./5./6. karelerde yer tozu, 5.'de sarsıntı. Karelerin karakteri `heroine_main`'den farklı çizilmiş (bandana yok, gri göz); ölüm klasörü silinirse ragdoll fiziği (`src/game/ragdoll.js`) devreye girer.
