# NEXORA Asset Manifest

Durum: **klasör yapısı hazır; ayrı kaynak asset görseli yok. Oyun şu an tamamen Canvas placeholder şekilleriyle çalışıyor (`src/`).** Önceki sohbette bir atlas/reference sheet'ten bahsedilmiş ancak dosya bu çalışma alanında mevcut değil; bu nedenle atlas kesilmedi ve herhangi bir görsel ayrı assetmiş gibi kopyalanmadı.

Aşağıdaki dosyalar PNG olarak ayrıca üretilip ilgili klasörlere eklenmeli. Animasyon kareleri bağımsız PNG olarak önerilir; sprite sheet tercih edilirse `sheet.png` ve `sheet.json` (frame adları, sıra, FPS, pivot) birlikte eklenmelidir.

## Marka
- `assets/logo/nexora_logo.png` — şeffaf arka planlı ana logo; gerekirse `nexora_logo_horizontal.png`, `nexora_logo_mark.png`
- `assets/app_icon/app_icon_1024.png` — kare uygulama ikonu; platform boyutları sonradan türetilebilir

## Oyuncu karakterleri
Hem `assets/characters/male/animations/` hem `assets/characters/female/animations/` için ayrı kareler:
- `idle_01.png`…; `run_01.png`…; `attack_1_01.png`…; `attack_2_01.png`…; `attack_3_01.png`…; `hurt.png`; `death_01.png`…
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
- Şu an manifest'te **hiç görsel kayıtlı değil**; hiçbir dosya var gibi referanslanmadı.
- Sprite ölçü/pivot/FPS standardı: `docs/README.md`.
- Not: `assets/references/` içinde atlas yok; geldiğinde kırpılıp ayrı PNG'lere dönüştürülecek.
