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

## 1-2. Derleme ve TestFlight (Codemagic)

Diğer oyunlarla aynı hat; adımlar `docs/CODEMAGIC.md` içinde. Özet: App Store Connect'te uygulama kaydı (bir kerelik) → Codemagic'te `firin-kafe-ios` iş akışını başlat → TestFlight'ta iç test grubuna ekle.

**Önce telefonda dene.** Bu oyun şimdiye kadar yalnızca tarayıcıda (Skia web) çalıştırıldı. Gerçek cihazda bakılacaklar:

- Uygulama çökmeden açılıyor mu, dikey ekran kilitli mi.
- Üst çubuk ve alt gezinme çentik / ana ekran çubuğuyla çakışıyor mu.
- Kare hızı (kafede 4 masa dolu, üretim sürerken), ses, dokunma ve titreşim.
- Kayıt: uygulamayı arka plana atıp dönünce ilerleme duruyor mu.
- Kediler masada oturup yiyor mu, şef fırına ekmek koyuyor mu, garson tepsi bırakıyor mu.

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
