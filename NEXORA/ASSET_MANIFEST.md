# NEXORA Asset Manifest

Durum: **klasör yapısı hazır; ayrı kaynak asset görseli yok. Oyun şu an tamamen Canvas placeholder şekilleriyle çalışıyor (`src/`).** Önceki sohbette bir atlas/reference sheet'ten bahsedilmiş ancak dosya bu çalışma alanında mevcut değil; bu nedenle atlas kesilmedi ve herhangi bir görsel ayrı assetmiş gibi kopyalanmadı.

Aşağıdaki dosyalar PNG olarak ayrıca üretilip ilgili klasörlere eklenmeli. Animasyon kareleri bağımsız PNG olarak önerilir; sprite sheet tercih edilirse `sheet.png` ve `sheet.json` (frame adları, sıra, FPS, pivot) birlikte eklenmelidir.

## Marka
- ✅ `assets/logo/nexora_logo.png` — **MEVCUT**. Şeffaf arka planlı ana logo, 1467×737 px, RGBA. Kaynak: `assets/references/nexora_logo_source.png` (1536×1024, siyah arka planlı orijinal). Siyah arka plan çıkarıldı, dış outline korundu. Manifest anahtarı: `nexora_logo`.
- ⏳ `nexora_logo_horizontal.png`, `nexora_logo_mark.png` — henüz yok
- ✅ `assets/app_icon/app_icon_1024.png` — **MEVCUT**. 1024×1024 RGBA. Kaynak: `assets/references/nexora_app_icon_source.png`. Ek varyantlar: `app_icon_1024_opaque.png` (iOS/mağaza, alfasız), `app_icon_adaptive_foreground.png` + `app_icon_adaptive_background.png` (Android adaptive). Ayrıntı: klasör README.

## Oyuncu karakterleri
Hem `assets/characters/male/animations/` hem `assets/characters/female/animations/` için ayrı kareler:
- `idle_01.png`…; `run_01.png`…; `attack_1_01.png`…; `attack_2_01.png`…; `attack_3_01.png`…; `hurt_01.png`…; `death_01.png`…; `jump_01.png`…; `turn_01.png`… (erkek için ✅ mevcut; kadın ⏳ yok)
- Klasördeki README'de frame sayısı, FPS, yön, pivot/zemin hizası ve karakter ölçüleri belgelenmeli.
- `assets/characters/skins/`: her skin için ayrı alt klasör veya `character_variant.png` ve kısa metadata
- `assets/characters/portraits/`: `male_portrait.png`, `female_portrait.png` ve açılacak her ek karakter için portre

## Savaş ve düşman içerikleri
- `assets/weapons/`: silah başına `weapon_<name>.png`; gerekiyorsa elde tutma/pivot metadata'sı
- `assets/enemies/`: her düşman için `enemy_<name>_idle.png`, `enemy_<name>_attack.png`, `enemy_<name>_hurt.png`, `enemy_<name>_death.png` (hareket seti gerekiyorsa ayrıca)
- `assets/bosses/`: boss başına ayrı klasör; idle, move, attack fazları, hurt/death ve varsa faz/geçiş görselleri
- `assets/items/`: her toplanabilir/kullanılabilir nesne için ayrı PNG; isim ve tür metadata'sı

## Dünyalar ve çevre
- `assets/worlds/planets/`: her gezegen için `planet_<name>.png`; ayrıca gerekiyorsa gezegen ikonu ve yüzey/biome görselleri
- `assets/environment/props/`: oyun içindeki her prop, dekor, engel, tile ve arka plan katmanı ayrı PNG; tile setleri için atlas ölçüleri/metadata

## Efektler
- `assets/effects/attacks/`: saldırı başına ayrı `attack_<name>_frame_01.png`…; animasyon sırası ve süre bilgisi
- `assets/effects/particles/`: ayrı particle texture'ları (`particle_<name>.png`) ve varsa flipbook kareleri; oynatım metadata'sı

## UI
- `assets/ui/hud/`: HUD paneli/çubuğu ve parçaları; dinamik metin/çubuklar mümkünse kodla çizilsin
- `assets/ui/buttons/`: normal, hover, pressed, disabled durumları ayrı PNG'ler
- `assets/ui/icons/`: her eylem/kaynak için ayrı ikon PNG
- `assets/ui/windows/`: panel ve pencere görselleri (dokuz dilim kullanılacaksa dilim ölçüleri belgeli)
- `assets/ui/menus/`: ana menü ve oyun içi menü parçaları

## Sonradan eklenecek görsel dosyalar
`assets/references/` içine sadece gerçek atlas/reference dosyalarını, orijinal adını ve kaynak bilgisini koruyarak ekle. Bir sheet geldiğinde içindeki öğeleri otomatik olarak ayrı asset sayma; her kırpımı incele, şeffaf kenarları düzenle ve ayrı dosya olarak dışa aktar. Kaynak referansı ve türetilen dosyaları README'de eşleştir.

## Diğer içerik
Ses ve font klasörleri de hazır. Sesler `audio/music/` ve `audio/sfx/` altında; font lisans bilgisi `fonts/` içinde `README.md` ile kaydedilmeli. Görsel dosyaları şu an mevcut olmadığı için bu klasörlere içerik eklenmedi.

## Kod ↔ asset bağlantısı
- Oyun görselleri `data/asset_manifest.json` içindeki `images` tablosundan yüklenir. Bir PNG diske eklenince buraya anahtarıyla kaydedilir; kayıt yoksa placeholder çizilir. Düşman anahtarı = `data/enemies.json` tür adı (ör. `goblin`).
- Manifest'te kayıtlı tek görsel: `nexora_logo`. Diğer hiçbir dosya var gibi referanslanmadı.
- Sprite ölçü/pivot/FPS standardı: `docs/README.md`.
- Not: `assets/references/` içinde atlas yok; geldiğinde kırpılıp ayrı PNG'lere dönüştürülecek.

## Erkek karakter (MEVCUT — `tools/extract_male_sheet.py` ile üretildi)
- `assets/characters/male/animations/`: 9 animasyon, 84 kare PNG (224×176, pivot 112,164). Ayrıntı: klasör README.
- `assets/effects/attacks/`: 19 saf efekt PNG. `assets/effects/particles/`: 9 toz/kırıntı PNG. Ayrıntı: klasör README'leri.
- Kaynak: `assets/references/nexora_male_sheet_v2_source.png`. Veri: `data/male_animations.json`. Manifest anahtarları: `male_<kare>` (ör. `male_idle_01`), `fx_<efekt>`, `particle_<ad>`.
- Oyunda kullanımda: idle, run, attack_1-3 (kombo), hurt, death. `jump` ve `turn` dosyaları var ama oyun henüz çağırmıyor.
- Eksik: kadın karakter, efektsiz (temiz) saldırı kareleri.

## Dünya ve arka plan (MEVCUT — `tools/extract_world_props.py` ile üretildi)
- `assets/environment/background/clouds/` 6 bulut, `.../islands/` 7 yüzen ada; `assets/environment/props/` 24 prop (ağaç, çalı, kaya, çit, sandık, tabela, saman balyası, çiçek/ot, dikenli sopa). Ayrıntı: klasör README'leri.
- Kaynak: `assets/references/nexora_world_props_source.png` (gerçek alfa kanallı). Üstteki büyük panorama kompozisyonu kesilmedi.
- Veri: `data/world_props.json` (prop yükseklikleri, dekor saçılım kuralları, ada katmanları). Manifest anahtarları: `bg_*`, `prop_*`.
- Zemin: `assets/environment/ground/` → `hill_ground.png` (tam tepe, referans), `ground_tile_grass.png` (oyunda desen olarak döşenir). Kaynak: `assets/references/nexora_world_ground_source.png`.
- Toprak lekeleri: `dirt_patch_01…05.png` (decal, zemine serpilir).
- Eksik: kar/çöl/volkan bölge setleri, yakın parallax ağaç/dağ katmanları.

## Düşmanlar (MEVCUT — `tools/extract_goblins.py`)
- `assets/enemies/<goblin_scout|goblin_warrior|goblin_brute>/`: animasyonlu (walk/attack/hurt/death) + portre. Kaynak: `assets/references/nexora_goblin_sheet_source.png`. Veri: `data/enemy_animations.json`. Ayrıntı: klasör README.
- Eksik: skeleton ve diğer düşman türleri, saldırı/ölüm için ek kareler, boss'a özel yetenek efektleri.

## Kadın karakter (MEVCUT — `tools/extract_female_sheet.py`)
- `assets/characters/female/animations/`: idle 8, run 8, attack 5, hurt 6, death 5 (280×190, pivot 100,180; kaynak: sheet v2) + `layers/` + portre. Efektler: `assets/effects/attacks/female_fx_*.png`. Ayrıntı/sınırlar: klasör README. Seçim: `?hero=female` veya `player.character`.

## Kadın savaşçı — ana asset (MEVCUT)
- `assets/characters/heroine/`: `heroine_main.png` (tek görsel) + `heroine_portrait.png`. Kaynak: `assets/references/nexora_heroine_source.png`. Animasyonlar kodla (prosedürel). Seçim ekranındaki "Kadın Savaşçı" bu karakterdir. Ayrıntı: klasör README.
