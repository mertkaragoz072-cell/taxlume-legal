# Fırın & Kafe — yalnızca iOS ve Android (yerel uygulama)

WebView yok, tarayıcı yok. Oyun tamamen yerel çalışır:

- **Sahneler** (sokak, kafe, market/kitapçı, keşif haritası) `@shopify/react-native-skia` ile çizilir. `src/engine/ctx2d.ts`, oyunun çizim kodunun kullandığı Canvas 2D komutlarını (yol, gradyan, kırpma, resim, yazı, karışım modları, blur) Skia'ya çeviren ince bir katmandır; böylece sahne kodu (`src/scene`, `src/buildings`, `src/characters`) web sürümüyle aynı kalır.
- **Arayüz** (üst çubuk, menü, paneller, bildirim) React Native bileşenleridir (`src/ui`), renkler `src/palette.js`'ten gelir.
- **Oyun kuralları** (`src/game`, `src/data`) saf JS'tir, bağımsız birim testleri `tests/` altındadır.
- **Kayıt**: oyun kendi (eşzamanlı) depolama arayüzüne yazar; `src/runtime/storage.ts` bunu bellekte tutup `AsyncStorage`'a (debounce ile, uygulama arka plana gidince hemen) yazar.
- **Ses**: web sürümünün canlı sentezlediği efektler ve müzik `scripts/gen-sounds.mjs` ile WAV dosyalarına çevrildi (`assets/sounds`), `expo-audio` çalar. **Titreşim**: `expo-haptics`.
- Yatay mod kilitli, durum çubuğu gizli, çentik/güvenli alanlar `react-native-safe-area-context` ile.

## Geliştirme

```bash
npm ci
npm run typecheck        # TypeScript
npm test                 # oyun mantığı testleri (241)
npm start                # Expo; Expo Go yerine development build gerekir (Skia yerel modül)
node scripts/gen-assets.mjs   # assets/game altına resim ekleyip çıkarınca (Metro için resim listesi)
node scripts/gen-sounds.mjs   # sesleri yeniden üretir
```

Ekran görüntüsü almak için (yalnızca geliştirme): `npm run web:wasm && npx expo export --platform web`; Skia'nın web çalışma zamanı kullanılır. Gerçek uygulama web'e yayınlanmaz.

## TestFlight'a yükleme (Golden Town ile aynı hat: Expo + EAS Build, Mac gerekmez)

Gerekenler: Apple Developer Program üyeliği (99 USD/yıl), Expo hesabı (ücretsiz).

```bash
git clone https://github.com/mertkaragoz072-cell/taxlume-legal.git
cd taxlume-legal/bakery-street-app
npm ci
npm install -g eas-cli
eas login
eas init                  # app.json'a extra.eas.projectId yazar → COMMIT et
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Skia yerel modül olduğu için Expo Go çalışmaz; EAS build (veya `eas build --profile development`) kullanılır. İlk build'de Apple ID'ni sorar, sertifika ve provisioning profile'ı EAS oluşturur. 10–25 dk sürer. Build App Store Connect'te göründükten sonra TestFlight'ta iç test için inceleme gerekmez; dış test için Apple kısa bir beta incelemesi yapar.

Android: `eas build --profile production --platform android`, sonra Play Console iç test. Keystore'u yedekle.

### App Store Connect kaydı

| Alan | Değer |
|---|---|
| Platform | iPhone ve iPad (`supportsTablet: true`, tam ekran yatay) |
| Ad | Fırın & Kafe |
| Bundle ID | `com.firinkafe.app` (sonradan değişmez) |
| SKU | firin-kafe-1 |
| Dil | Türkçe |
| Kategori | Oyunlar → Simülasyon |
| Fiyat | Ücretsiz |
| Yaş sınırı | 4+ |
| Gizlilik | "Veri toplanmıyor": hesap, analitik, reklam ve ağ çağrısı yok |
| İhracat uyumu | İkilide cevaplanmış (`usesNonExemptEncryption: false`) |

Gizlilik politikası adresi gerekir (repodaki `privacy.html` bu oyuna göre uyarlanmalı).

## Dürüst durum

- **Gerçek cihazda hiç çalıştırılmadı.** Doğrulananlar: TypeScript denetimi, 241 oyun mantığı testi, iOS ve Android için `expo export` (Metro + Hermes paketleri), ve Skia'nın web çalışma zamanında alınan ekran görüntüleri (sokak, kafe, market, keşif, tüm paneller). Yerel Skia'da performans (kare hızı), `PictureRecorder` her kare yeni resim üretmesinin maliyeti, ses ve dokunma hissi ilk TestFlight'ta telefonda kontrol edilmeli.
- Gökyüzü kenar renkleri sabit tonlar (resim piksellerini geri okumuyoruz); fark küçük.
- Yazı tipi Nunito (web'deki Trebuchet'e yakın, yuvarlak).
- `../bakery-street` (eski web sürümü) yerinde duruyor; oyun kuralları iki yerde kopya olduğu için yeni özellikler `bakery-street-app`'e eklenmeli. Web sürümü artık dağıtılmıyor, silinebilir.

## Mobil optimizasyon (yapılanlar)

- **Çizim:** tek `Paint` ve tek `Path` her karede sıfırlanarak yeniden kullanılır (şekil başına çöp yok); gradyan shader'ları değerlerine göre önbelleğe alınır; blur filtresi bir kez üretilir. Sokak ve kafe duvar/zemin katmanları ekran boyutu başına bir kez çizilir.
- **Uyarlanabilir kalite:** kare çizimi uzun süre 22 ms'yi aşarsa önce 30 fps sınırı, sonra çözünürlük (en düşük %60) düşürülür. Piksel bütçesi tavanı ve dpr ≤ 2 sınırı sürüyor.
- **Pil:** uygulama arka plandayken ne çizilir ne de sahne güncellenir; müzik duraklar.
- **Android:** geri tuşu açık paneli, sonra sahneyi kapatır (sokakta uygulamadan çıkar); `androidWarmup` ve `opaque` Skia görünümü.
- **Dokunma ve yazı:** tüm düğmeler en az 44 dp; sistem yazı boyutu ayarı yerleşimi bozmaz (`allowFontScaling={false}`); çentik/güvenli alanlar uygulanır.
- Ölçüm sınırı: geliştirme ortamında GPU yoktur; kare süresi ölçümleri yalnızca JS tarafındaki kayıt maliyetini gösterir (sokak ~2 ms, kafe ~3 ms medyan). Gerçek kare hızı telefonda ölçülmeli.

## Tablet (iPad ve Android tabletler)

- `app.json`: `supportsTablet: true`; yatay mod kilitli, iPad'de çoklu görev bölünmüş görünümü kapalı (`requireFullScreen`).
- **Sokak:** 4:3 ekranlarda gökyüzü üstte uzar. Panorama ile gökyüzü arasında görünen koyu çizgi, `destination-in` karışım modunun çizim katmanında eksik olmasından kaynaklanıyordu (telefonlarda da küçük bir hataydı); düzeltildi. Panorama kenar renkleri artık resmin gerçek piksellerinden okunuyor.
- **Kafe:** 4:3'te oda yakınlaştırılır (zoom 0.8 → ~0.85, merkez kapıya doğru kayar), üstteki boş duvar azalır; telefon görünümü aynı kalır.
- **Keşif haritası:** 4:3'te harita tam yükseklik ile telefondaki "sığdır" arasında ortalanır (yaklaşık yarı yarıya yakınlaştırılır, sola hizalı); işaretçiler sağ paneli kapatmaz, üstteki bulanık şerit küçülür.
- **Arayüz:** boyutlar ekran yüksekliği/genişliğinden türetilen birimle ölçeklenir; 1024×768 ve 1366×1024'te paneller, üst çubuk ve menü ekran görüntüsüyle kontrol edildi.
- Gerçek iPad/tablet cihazında denenmedi.

## Cafe look

The cafe is built from the separate supplied pieces (wall, floor, oven, counter, showcase, coffee machine, storage, sign, tables, windows, door, shelf, rack, beam), each depth-sorted with the baker, waiter and guests. (An attempt to use one reference picture as the whole back wall was reverted: it made the room flat and unlayered.)
