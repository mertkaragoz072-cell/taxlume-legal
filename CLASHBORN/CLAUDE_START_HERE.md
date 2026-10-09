# Claude için proje başlangıç talimatı

Bu `CLASHBORN` klasörünü proje kökü olarak kullan. Önce `README.md` ve `ASSET_MANIFEST.md` dosyalarını oku. Oyunun kodunu `src/` içine, içerik/veri tanımlarını `data/` içine, yeni görselleri ise `assets/` altında türüne uygun klasöre kaydet.

Mevcut asset dosyalarını ve referansları incele. `assets/references/` içindeki bir atlası tek tek oyun assetleri gibi varsayma; gerçek ayrı PNG dosyaları oluştur ve her birini ilgili klasöre yerleştir. Dosya yoksa varmış gibi referans verme; `ASSET_MANIFEST.md` ve ilgili klasör README'sini güncelle. Dosya isimlerinde küçük harf ve `snake_case` kullan. Sprite/animasyon ölçülerini, kare sırasını, FPS ve pivot bilgisini belgeleyerek tutarlı bir stil sürdür.
