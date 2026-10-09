# assets / app_icon

> **Not:** ikon görselleri hâlâ eski adı (NEXORA yazısı) taşır; CLASHBORN yazılı yeni ikon/logo gelince `app_icon_1024.png` ve `app_icon_1024_opaque.png` yeniden üretilmeli (alfasız, 1024×1024).

Tümü 1024×1024 px. Kaynak: `../references/nexora_app_icon_source.png` (1272×1237, şeffaf köşeli, kare değil).

| Dosya | Kullanım |
|---|---|
| `app_icon_1024.png` | RGBA, orijinal yuvarlatılmış köşeli ikon (şeffaflık korunarak kareye ortalandı). Önizleme/web için. |
| `app_icon_1024_opaque.png` | **iOS/App Store ve genel mağaza ikonu.** Tam kare, **alfasız** RGB. Çerçeve/parlama kenarı kırpıldı; köşeler ve kenar boşlukları gökyüzü gradyanıyla (`#2882e1`→`#aae1fa`) yumuşatılarak dolduruldu. OS köşeleri kendisi yuvarlar. |
| `app_icon_adaptive_foreground.png` | **Android adaptive icon ön katman.** Şeffaf; `../logo/nexora_logo.png` 640 px genişlikte ortalı (güvenli alan: orta 66% daire ≈ 676 px). |
| `app_icon_adaptive_background.png` | **Android adaptive icon arka katman.** Opak dikey gökyüzü gradyanı (`#2f8fe8`→`#bfeaff`). |

Notlar:
- Opak sürümde sol/sağ kenarda yapraklar kırpma nedeniyle hafif soluk görünür; ikon küçültüldüğünde fark edilmez. Daha temiz sonuç için kaynak sanatın kare ve kenar boşluklu yeniden üretilmesi gerekir.
- Android ön katman wordmark içindir (ikondaki ada/kristal sahnesi değil); istenirse sahne katmanlara ayrılıp yeniden yapılabilir.
- Diğer boyutlar (180, 192, 512 vb.) paketleme aşamasında bu dosyalardan türetilecek.
