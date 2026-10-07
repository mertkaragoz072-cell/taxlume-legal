# NEXORA — Yayın kontrol listesi

## Her yayın öncesi (otomatik)
```bash
cd NEXORA
export NODE_PATH=<playwright'ın node_modules yolu>     # npm i -D playwright yeterli
npm test                 # 11 test: açılış (2 kahraman), kayıt göçü/yedek, savaş, kaçınma, kartlar, boss akışı, meta, ölüm/yeniden başla, 2 bölüm soak
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
- iOS: `npx cap add ios` (macOS + Xcode gerekir; iOS tam ekran/yatay kilit için Info.plist `UIInterfaceOrientationLandscape*`).

## Mağaza
- Metinler: `store/store_listing.md`; gizlilik: `store/privacy_policy.md` (yayınlanacak bir URL'ye konmalı; e-posta/tarih doldurulmalı).
- Veri güvenliği formu: veri toplanmıyor, paylaşılmıyor; reklam/analitik yok; satın alma yok.
- Yaş derecelendirmesi: hafif fantezi şiddeti (çizgi film goblin dövüşü).

## Bilinen eksikler (yayın öncesi bakılmalı)
- Gerçek cihaz testi yapılmadı (bu ortamda yazılım çizim); kare süresi telefonda ölçülmeli (`?fps` göstergesi yok → Chrome DevTools Performance).
- Ses: tüm efektler VE müzik Web Audio ile üretiliyor (harici dosya yok; Ayarlar'da müzik/efekt ayrı kapatılır). Gerçek müzik dosyası/profesyonel ses tasarımı ayrıca ele alınacak (teknik madde 2).
- Kadın karakter koşu/saldırı/hasar çizim kareleri yok (prosedürel); erkek portre düşük çözünürlük.
- Tek dünya (Meadowlands); bölümler ★ zorlukla döner.
