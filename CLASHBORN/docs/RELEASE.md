# CLASHBORN — Yayın kontrol listesi

## Her yayın öncesi (otomatik)
```bash
cd CLASHBORN
export NODE_PATH=<playwright'ın node_modules yolu>     # npm i -D playwright yeterli
npm test                 # 18 test: açılış, kayıt göçü/yedek, savaş, kaçınma, kartlar, boss, meta, evrenler/roster, düşman animasyonları, öğretici, ölüm, soak
npm run test:offline     # SW kaydı → önbellek → ağ kesik açılış
npm run balance          # (opsiyonel) pasif vs kaçınan bot: bölüm başı ölüm / süre
npm run build:www        # sw.js sürümünü günceller + www/ paketi (≈ 18 MB, yalnızca çalışan dosyalar)
```
`build:sw` her kod/veri değişikliğinden sonra çalışmalı: önbellek sürümü içerik özetidir, eski önbellek otomatik silinir.

## Android (Capacitor)
```bash
npm i                    # @capacitor/*
npx cap add android      # bir kez
npm run cap:sync         # www/ → android/
npx cap open android     # Android Studio: imzala (keystore), AAB üret
```
- Yatay kilit: AndroidManifest `android:screenOrientation="sensorLandscape"`; tam ekran: `capacitor.config.json` + `StatusBar` gizle.
- Simge: `assets/app_icon/app_icon_adaptive_foreground.png` + `..._background.png`; paket kimliği `com.nexora.game` (değiştirilebilir).

## iOS → TestFlight (macOS + Xcode gerekir; bu ortamda yapılamaz)
Ön koşullar: Mac, Xcode (güncel), **Apple Developer Program** üyeliği (99 $/yıl), Node.js.
1. `cd CLASHBORN && npm i && npm run build:www` (testler yeşil olmalı)
2. `npx cap add ios` (bir kez) → `npm run cap:sync` (www/ → ios/App/App/public)
3. `npx cap open ios` → Xcode:
   - **App** hedefi → *Signing & Capabilities*: Team = Apple Developer hesabın, Bundle Identifier = benzersiz (örn. `com.seninadin.nexora`; `capacitor.config.json → appId` ile aynı yap, sonra `npx cap sync`).
   - *General* → Display Name `CLASHBORN`, Version `1.0.0`, Build `1`; *Deployment Info* → iPhone, Device Orientation: **yalnız Landscape Left + Right** (portre işaretini kaldır), "Requires full screen" açık.
   - Info.plist: `UIStatusBarHidden` = YES, `UIViewControllerBasedStatusBarAppearance` = NO; `ITSAppUsesNonExemptEncryption` = NO (ihracat sorusunu atlar).
   - Simge: `Assets.xcassets → AppIcon` içine 1024×1024 PNG (`assets/app_icon/` kaynaklarından; **alfa kanalsız**, köşe yuvarlatması olmadan).
4. Cihaz seç = **Any iOS Device (arm64)** → menü *Product → Archive*.
5. Organizer açılınca *Distribute App → App Store Connect → Upload* (otomatik imza).
6. https://appstoreconnect.apple.com → *My Apps → +* → Yeni Uygulama (aynı Bundle ID, ad, dil, SKU). Yükleme işlendikten sonra (10–30 dk) **TestFlight** sekmesinde build görünür; "Missing Compliance" çıkarsa şifreleme sorusunu *Hayır* yanıtla.
7. *Internal Testing* → grup oluştur, kendi Apple ID'ni (App Store Connect kullanıcısı) ekle → anında test (inceleme yok). Dış test için *External Testing* + Apple'ın kısa Beta incelemesi (≈1 gün); gizlilik politikası URL'si gerekir (`store/privacy_policy.md` bir sayfada yayınlanmalı).
8. iPhone'da **TestFlight** uygulamasını yükle → davet/kabul → CLASHBORN'yı yükle.
- Güncelleme: kod değişince `npm run cap:sync` → Xcode'da **Build numarasını artır** → Archive → Upload.
- Sık hatalar: "No signing certificate" (Team seçilmemiş), "Invalid icon" (alfa/boyut), "Missing Compliance", yükleme sonrası build görünmüyor (işleniyor, bekle). Ses: Safari ilk dokunuştan önce sesi açmaz (oyun ilk dokunuşta açıyor); yatay kilit Info.plist ile sağlanır.
- Mac yoksa: bulut Mac (MacinCloud vb.) veya Codemagic / GitHub Actions macOS runner / Ionic Appflow ile derleme yapılabilir (Apple hesabı + imza sertifikaları yine gerekir).

## Mağaza
- Metinler: `store/store_listing.md`; gizlilik: `store/privacy_policy.md` (yayınlanacak bir URL'ye konmalı; e-posta/tarih doldurulmalı).
- Veri güvenliği formu: veri toplanmıyor, paylaşılmıyor; reklam/analitik yok; satın alma yok.
- Yaş derecelendirmesi: hafif fantezi şiddeti (çizgi film goblin dövüşü).

## Bilinen eksikler (yayın öncesi bakılmalı)
- Gerçek cihaz testi yapılmadı (bu ortamda yazılım çizim); kare süresi telefonda ölçülmeli (`?fps` göstergesi yok → Chrome DevTools Performance).
- Ses: tüm efektler VE müzik Web Audio ile üretiliyor (harici dosya yok; Ayarlar'da müzik/efekt ayrı kapatılır). Gerçek müzik dosyası/profesyonel ses tasarımı ayrıca ele alınacak (teknik madde 2).
- Kadın karakter tüm durumları kare tabanlı (kullanıcı çizimleri); erkek karakter eski sheet ve portre düşük çözünürlük.
- 3 evren (Meadowlands gerçek görsel; Emberfall/Frostveil renk tonlu yer tutucu — `tools/worlds.py` ile gerçek görseller eklenir); evre listesi bitince ★ zorlukla döner. Evrene özel düşman/boss sprite'ları yer tutucu (renk kaydırmalı).
