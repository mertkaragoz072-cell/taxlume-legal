# Codemagic → TestFlight kurulumu (CLASHBORN)

Yapılandırma dosyası depo kökünde: `codemagic.yaml` (iş akışı `clashborn-ios`).

## Bir kerelik kurulum
1. **App Store Connect API anahtarı:** App Store Connect → Users and Access → Integrations → Team Keys → anahtar oluştur (rol: *App Manager*). `.p8` dosyasını indir (bir kez indirilir), Issuer ID ve Key ID'yi not et.
2. **Codemagic'e ekle:** Teams → Personal/Team → Integrations → App Store Connect → anahtarı ekle. Adı `codemagic` olsun (farklıysa `codemagic.yaml` içindeki `app_store_connect:` satırını değiştir).
3. **Apple ID (sayı):** App Store Connect → uygulama → App Information → *Apple ID*. `codemagic.yaml` içindeki `APP_STORE_APPLE_ID` değerine yaz (derleme numarasını otomatik artırmak için).
4. **Bundle ID:** `com.nexora.game` (Apple Developer'da kayıtlı). Mağaza adı "Clashborn Legends", ana ekran adı CLASHBORN.
5. Codemagic'te depoyu ekle (`taxlume-legal`), dal `claude/mobile-2d-game-prototype-e7wqdl` (veya birleştirdiğin dal), iş akışı `clashborn-ios`, *Start new build*.
6. İmzalama: ilk derlemede Codemagic dağıtım sertifikası ve profili otomatik oluşturur (API anahtarı sayesinde).

## Sonra
Derleme bitince build TestFlight'ta işlenir (10–30 dk). App Store Connect → TestFlight'tan iç test grubuna ekle.

## Notlar
- İkon: `assets/app_icon/app_icon_1024_opaque.png`. Yeni CLASHBORN ikonunu bu dosyanın üstüne yaz (1024×1024, alfasız).
- Oyun yataydır; Info.plist yönü derleme sırasında ayarlanır.
