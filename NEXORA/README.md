# NEXORA

Claude için proje ve asset kökü. Bu klasör, oyunun kaynak kodunu ve üretime hazır oyun dosyalarını düzenli biçimde barındırmak için hazırlandı.

## Asset kuralları

- Her oyun asseti ayrı, anlamlı adlandırılmış dosya olmalı; ör. `assets/characters/male/animations/idle.png`.
- Atlas, moodboard veya reference sheet tekil sprite/ikon dosyası değildir. Kaynağı `assets/references/` altında sakla ve içerikleri doğru kırpma/temizleme ile ayrı PNG'lere dönüştürmeden oyunda kullanma.
- Transparan olması gereken sprite, ikon, logo ve efektleri PNG olarak dışa aktar. UI veya tile atlası kullanılıyorsa ayrıca ölçüleri ve frame düzenini açıklayan metadata ekle.
- Henüz üretilmemiş dosyalar için sahte görsel üretme; ilgili klasördeki README ve `ASSET_MANIFEST.md` durum bilgisini güncelle.
- Dosya adlarında küçük harf, ASCII ve `snake_case` kullan. Animasyonları kare kare veya açıkça belgelenmiş sprite sheet olarak tut.

## Yapı

- `assets/`: oyun içi ve marka görselleri
- `audio/`: müzik ve ses efektleri
- `fonts/`: lisansı uygun yazı tipleri
- `src/`: oyun kaynak kodu
- `data/`: oyun verileri, denge ve içerik tanımları
- `docs/`: tasarım ve teknik notlar

Eksik dosyaların listesi ve önerilen adları `ASSET_MANIFEST.md` içindedir.

## Güvenlik / yerel çalışma
- Oyun **tamamen yerel**: harici URL, iframe, `window.open`, WebView, analitik veya CDN yok; tüm dosyalar `assets/`, `data/`, `src/` altından yüklenir. `index.html` içindeki Content-Security-Policy (yalnız `'self'`) bunu tarayıcı seviyesinde zorlar.
- Oyun hiçbir pencere/sekme açmaz. Açılışta yalnızca oyun (ve karakter seçimi) görünür.
- Çalıştırma: proje kökünde yerel sunucu (`python3 -m http.server 8080`), sonra **Chrome/Edge/Firefox'ta elle** `http://localhost:8080` aç. `index.html`'e çift tıklamayı kullanma: Windows'ta `.html` başka bir uygulamaya (ör. bir Adobe ürünü) atanmışsa dosya orada açılabilir ve oyun zaten `file://` ile çalışmaz.
