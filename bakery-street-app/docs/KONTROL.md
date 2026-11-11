# Kontrol raporu (cihaz dışı)

Bu liste, telefonda oynamadan yapılabilen kontrollerin ne olduğunu ve ne olmadığını açıkça söyler.

## Yapılanlar (otomatik, tekrar çalıştırılabilir)
- `npm test`: 331 test. Oyun mantığı, kayıt (v12, eski kayıtlar), ekonomi, müşteri/sipariş, hedefler, albüm, hava, bonuslar, kasa kutusu.
- `tests/fuzz.test.js`: 12 farklı rastgele oyuncu × 400 adım (üretim, mağaza, geliştirme, görev, servis, saat ileri/geri, kaydet + yeniden yükle). Her adımdan sonra: altın/stok/sayaçlar sonlu ve eksi değil, her masada tek müşteri, açık siparişin sahibi var, kayıt JSON'a çevrilebilir; kayıttan yüklenen oyun aynı durumda.
- `tests/simulation.test.js`: robot oyuncu 3-4 gün oynar; kazanç ve satış payı makul bantlarda, bonuslar ekonomiyi %15-30'dan fazla değiştirmez.
- `tests/scene-long.test.js`: kafe sahnesi (müşteri, garson, şef) sanal 20 dakikaya kadar koşar: kalabalık kuyruk, her masa sayısı, stoksuz kafe. Kimse 8 sn'den uzun "yürürken" yerinde kalamaz, garson bir servis adımında 30 sn'den uzun kalamaz. Eski garson hatası geri gelirse bu test kırmızıya döner (denendi).
- `scripts/ui-smoke.cjs`: web derlemesinde tıklayarak 28 adım oynar (günlük ödül, üretim, satın alma, tüm menü girişleri, kafe adı, sıfırlama, fotoğraf modu, alt menü, 30 sn servis). Tarayıcı gerektirdiği için `npm test`'e dahil değil; nasıl çalıştırılacağı dosyanın başında.
- `npx tsc --noEmit`, `npx expo export --platform ios/android`: tipler ve paketleme.
- Web önizlemesinde (Chromium, 393×852 ve 360×640) her ekran: açılış, Günlük Ödül, Görevler, Albüm, İstatistikler, Ayarlar, Mağaza'nın 7 sekmesi, Kasaba, 6 makine paneli, Market, Kitapçı, Keşif; hepsi hatasız (konsolda sayfa hatası yok). Tam dolu (her şey satın alınmış, 4. aşama) kafe, yeniden yükleme sonrası kalıcılık, gerçek tıklamayla: günlük ödül, üretim, satın alma, menü girişleri, kafe adı yazma, sıfırlama (vazgeç / onayla).

## Yapılamayanlar (yalnızca telefonda görülebilir)
- Açılışın gerçekten çalışması (TestFlight build'i), kare hızı, dokunma hissi, ses ve titreşim, klavyenin Ayarlar'daki kafe adı alanını kapatıp kapatmadığı, emoji simgelerinin görünümü (web önizlemesinde bazı emoji kutu olarak çıkabilir).
- Ekonomi dengesi gerçek oyuncuyla: robot ortalama bir oyuncudur.
