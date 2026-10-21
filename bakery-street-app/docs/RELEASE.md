# Yayın rehberi — Fırın & Kafe 1.0.0 (TestFlight)

Golden Town ile aynı hat: Expo + EAS Build, Mac gerekmez. Konsolların sorduğu her değer sırayla burada.

## 0. Yasal sayfaları yayınla

Gizlilik adresi, App Store Connect gönderiminden önce açılıyor olmalı. GitHub Pages bu depoyu `master` kökünden yayınlar; dal birleşene kadar iki adres de 404 verir.

```bash
git checkout master && git merge claude/bakery-street-step1
git push origin master
```

Sonra tarayıcıda açıp gerçekten yüklendiğini kontrol et:

- https://mertkaragoz072-cell.github.io/taxlume-legal/firin-kafe-privacy.html
- https://mertkaragoz072-cell.github.io/taxlume-legal/firin-kafe-support.html

(Pages'in yenilenmesi birkaç dakika sürebilir.)

## 1. Derleme

EAS derlemeyi Expo'nun bulutunda yapar ama projeyi diskinden yükler; depo yerelde olmalı. Node 22, npm 10.

```bash
git clone https://github.com/mertkaragoz072-cell/taxlume-legal.git
cd taxlume-legal/bakery-street-app
npm ci                         # install değil ci: kilit dosyasından kurar
npm install -g eas-cli
eas login                      # Expo hesabın (Apple veya Google değil)
eas init                       # uygulamayı bir EAS projesine bağlar, yalnızca ilk sefer
eas build --profile production --platform ios
```

`eas init`, `app.json` içine `extra.eas.projectId` yazar. **Bunu commit et.** Yoksa bir sonraki bilgisayar ikinci bir EAS projesi açar ve derleme numaraları baştan başlar.

İlk derlemede imza bilgisi sorulur, ikisine de cevap "EAS halletsin":

- **iOS:** Developer Program'daki Apple ID ile giriş yap. Dağıtım sertifikasını ve provisioning profile'ı EAS oluşturur.
- **Android:** EAS bir yükleme anahtarı (keystore) üretir ve saklar. Bu anahtar Google Play'in uygulamayı tanıma yoludur; kaybedersen aynı kayda güncelleme gönderemezsin. Oluştuğu gün yedekle: `eas credentials` → Android → keystore'u indir.

Derleme 10–25 dakika sürer. `eas.json` içinde `appVersionSource: "remote"` ve `autoIncrement` var; derleme numaralarını bundan sonra EAS tutar.

## 2. TestFlight'a gönder

```bash
eas submit --profile production --platform ios
```

İlk seferde App Store Connect'te uygulamayı oluşturman istenir (aşağıdaki tablo). Derleme App Store Connect'te göründükten sonra TestFlight'ta iç test (kendi hesabın ve ekibin) için inceleme gerekmez; dış test için Apple kısa bir beta incelemesi yapar.

**Önce telefonda dene.** Bu oyun şimdiye kadar yalnızca tarayıcıda (Skia web) çalıştırıldı. Gerçek cihazda bakılacaklar:

- Uygulama çökmeden açılıyor mu, dikey ekran kilitli mi.
- Üst çubuk ve alt gezinme çentik / ana ekran çubuğuyla çakışıyor mu.
- Kare hızı (kafede 4 masa dolu, üretim sürerken), ses, dokunma ve titreşim.
- Kayıt: uygulamayı arka plana atıp dönünce ilerleme duruyor mu.
- Paneller (alt sayfa) açılıp kapanıyor, kaydırma çalışıyor.

## 3. App Store Connect

| Alan              | Değer                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Platform          | iOS, iPhone + iPad (`supportsTablet: true`), dikey                      |
| Ad                | Fırın & Kafe                                                           |
| Bundle ID         | com.firinkafe.app                                                      |
| SKU               | firin-kafe-1                                                           |
| Birincil dil      | Türkçe                                                                 |
| Kategori          | Oyunlar → Simülasyon. İkincil: Strateji                                |
| Fiyat             | Ücretsiz                                                               |
| Yaş sınırı        | 4+ — şiddet, küfür, kullanıcı içeriği, kumar yok                       |
| İhracat uyumu     | İkilide cevaplı (`usesNonExemptEncryption: false`), soru çıkmamalı      |
| İçerik hakları    | Üçüncü taraf içerik içermez, göstermez, erişmez                        |
| Gizlilik URL'si   | https://mertkaragoz072-cell.github.io/taxlume-legal/firin-kafe-privacy.html |
| Destek URL'si     | https://mertkaragoz072-cell.github.io/taxlume-legal/firin-kafe-support.html |

**Uygulama gizliliği: "Veri Toplanmıyor".** Her kategoriye hayır de. Uygulamada hesap, analitik, reklam ve ağ çağrısı yok; gizlilik sayfası, mağaza açıklaması ve bu cevap aynı şeyi söylemeli.

`requireFullScreen: true` olduğu için iPad çoklu görev (Split View) desteği istenmez.

Ekran görüntüleri: `docs/STORE_LISTING.md` içindeki liste; iPhone 6,7" için 1290×2796 dikey.

## 4. Google Play (sonra)

```bash
eas build --profile production --platform android
```

Paket `com.firinkafe.app`; kategori Oyunlar → Simülasyon; reklam yok; veri güvenliği: veri toplanmıyor, paylaşılmıyor. Keystore'u yedekle.
