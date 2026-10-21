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

### Cafe parallax

The cafe camera sways sideways by up to 24 world px; planes move by different shares of it: wall 0.25, wall decoration and lamps 0.5, kitchen furniture and the baker 0.8, floor level (tables, guests, waiter, tags, bubbles) 1.1, front plants 1.7. It follows the finger while touching and otherwise eases into a slow idle sway, so the depth shows without touching. Taps are corrected per plane (`InteriorScene.shift/planeOf/hitTest`). The cached wall/floor layer is drawn 60 px wider than the screen so no edge shows.

### Softer edges on the furniture pictures

`scripts/soften-edges.py` (already applied to assets/game/interior/* except wall and floor, and assets/game/props/*): dark outline pixels along the silhouette take the nearest body colour (slightly darker, smoothed), thin dark seams inside are lightened, and the alpha edge falls off softly. Characters, buildings and icons were left as they are (eyes and faces need their dark lines). Rerun the script on a new picture before adding it.

### Grounding the furniture

Cafe furniture throws its own silhouette across the floor (tinted dark brown, flattened to 20% depth, leaning right at 0.55 per unit of height, blurred once and cached per piece in `InteriorScene.castShadow`), plus a tight dark line where the base touches the floor and a faint wider occlusion pool. Light comes from the upper left, matching the window light.

### Scattered tables

The four tables no longer sit in one row: they are at different depths (front edges y 732 / 732 / 786 / 798 after the sizes in `AREAS`), slightly different sizes, and two are mirrored (`flip`), so the room reads like a real cafe floor. Guests still use the same lane and the gap beside their table; the access gaps stay clear.

### Tables as separate pieces

`assets/game/interior/table.webp` was cut into `table.webp` (table only), `chair-left.webp` and `chair-right.webp` (connected-component split of the original picture, colour-graded: cushions toned from bright red to a matte terracotta, specular highlights calmed, light from the left). `InteriorScene.tableSet` draws them separately: each table has its own chair offsets and tilt (`CHAIRS`), the chair a guest uses is pulled out while they walk up and slid in when they sit, and each chair throws its own shadow. A served item rests on a small saucer on the tabletop.

### Game look instead of photographic

- `scripts/stylize.py` (applied once to every picture under assets/game except icons and the app icon; the originals are in git history): edge-preserving smoothing removes fine texture and noise, colour is posterised in soft steps, saturation lifted ~8%. Strength 0.85 (0.9 town backdrop, 0.6 Keşif map).
- Photographic effects removed: film grain, heavy vignette and warm multiply (now 0.1-0.12), sun shafts on the street, dust motes and bokeh, the blurred "depth of field" corner plants in the cafe.

### New customer characters (reference-quality art)

Eight newly drawn characters replace the old walk strips: girl_basket, boy_cap, boy_backpack, grandma, oldman, girl_red, boy_redcap (new), girl_glasses (replaces girl_hat). They are single standing pictures (`frames: 1` in `SHEETS`); `drawSprite` makes the walk by moving the picture (two bounces per cycle, a small lean, squash and stretch). Chef and waiter are still the old sheets until new art arrives. A real walk cycle or a seated pose can replace any of these by supplying a multi-frame strip.
