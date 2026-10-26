# Ekonomi ve gelişim sistemi

Altın kazanma, harcama, satın alınanların dünyada görünmesi ve aşama hedefleri. Mevcut sistemler (üretim, stok, geliştirmeler, araştırma, görevler, günlük ödül, keşif, kasaba, müşteriler, kayıt) yeniden yazılmadı; yeni parçalar onlara bağlandı. Tüm sayılar `src/data/economy.js` içinde; başka dosyada fiyat/denge değeri yok.

## 1. Tek para katmanı

| | Nerede | Kural |
|---|---|---|
| Altın düşme | `Game.spend(amount, label)` | Yetmiyorsa, negatif/NaN ise reddeder; harcanan toplamı (`stats.goldSpent`) ve işlem geçmişini günceller. Geliştirme, malzeme, kasaba, araştırma ve mağaza hepsi bunu çağırır. |
| Altın ekleme | `Game.earn(amount, source, label)` | Yalnız tam, sonlu, pozitif tutar (≤ 1e9); diğerleri yok sayılır. `stats.goldEarned` ve işlem geçmişi güncellenir. Satış, bahşiş, vitrin satışı, malzeme iadesi, görev/günlük/keşif/seviye/aşama ödülü hepsi bunu çağırır. |
| Geçmiş | `Game.ledger` (son 40, bellekte) | Mağaza → Hedef sekmesinde "Son altın hareketleri". |

* Müşteri satışı ürünün listelenmiş fiyatını öder (araştırma bonusu bir kez, VIP çarpanı bir kez, bahşiş ayrı). Vitrinden satış daha az öder (müşterinin net kârının %20'si kesilir) ama malzeme maliyetinden fazladır. Testle doğrulanır (`tests/economy-integration.test.js`).
* Üst çubuk altın sayısı değişimi 0,3 sn'de akıcı gösterir ve altında `+N / −N` çipi çıkar; satışta dünyada `+X altın` yazısı ve altınlar kasaya uçar.
* Başlangıç altını (54.320) ve kayıtlı altınlar olduğu gibi korunur.

### Sınırsız / hileli altın kapıları
| Kaynak | Önlem |
|---|---|
| Çift tıklama / tekrar | Satın almalar `requestId` + "zaten alındı" + "seviye değişti" kontrolleriyle; görev, günlük, keşif ödülü tek adımda "alındı" işaretlenir; seviye ödülü `rewardedLevel`, aşama ödülü `stage` ile bir kez. |
| Keşif (tekrarlanan, bedava) | Günlük altın bütçesi `EXPLORE_LIMIT` (4.000): bütçe bitince keşfin altını %20 öder (XP/malzeme/elmas etkilenmez); bütçe takvim gününe bağlı, saat geri alınınca sıfırlanmaz, kayıtlıdır. Ekranda kalan bütçe yazar. |
| Günlük ödül | Son alım gerçek zamanı (`lastAt`) kaydedilir; saat bunun gerisine alınırsa "ödül kilitli" (eskiden gün-1 ödülü yeniden alınabiliyordu). 400 günden fazla ileriden kalma (yanlış saat) kayıt yok sayılır, oyuncu kilitlenmez. Saati ileri almak çevrimdışı tespit edilemez (sunucu gerekir). |
| Negatif altın | `spend`/`earn` korumaları; kayıtta negatif/sonlu olmayan altın bozuk kayıt sayılır (yedeklenir, yeni oyun). |
| Başarısız işlem | `Shop.buy` hata alırsa altın, istatistik, geçmiş ve sahiplik geri yüklenir. |

## 2. Ürünler ve tarifler

Her ürünün fiyatı, malzemeleri (maliyet = malzeme fiyatlarından türer) ve süresi ayrı alanlardır. Mevcut 4 ürün aynen kaldı. Yeni 6 tarif `RECIPES` (mağazadan açılır; alınana kadar üretilemez, sipariş edilmez):

| Ürün | İstasyon | Süre | Maliyet | Fiyat | Net/müşteri | Net/sn |
|---|---|---|---|---|---|---|
| Ekmek | fırın | 20 | 16 | 30 | 14 | 0,70 |
| Simit | fırın | 25 | 22 | 46 | 24 | 0,96 |
| Kruvasan | fırın | 40 | 31 | 60 | 29 | 0,73 |
| Kurabiye | fırın | 45 | 42 | 78 | 36 | 0,80 |
| Muffin | fırın | 55 | 40 | 90 | 50 | 0,91 |
| Pasta | fırın | 75 | 60 | 120 | 60 | 0,80 |
| Waffle | fırın | 80 | 54 | 122 | 68 | 0,85 |
| Kahve | kahve | 16 | 17 | 34 | 17 | 1,06 |
| Latte | kahve | 22 | 24 | 46 | 22 | 1,00 |
| Mocha | kahve | 30 | 29 | 58 | 29 | 0,97 |

Tasarım: saniye başına net kazanç dar bir bantta (0,7–1,06), müşteri başına net kazanç ise süreyle artar (uzun tarif = daha çok kazandıran sipariş). Yani vitrinden elle satan oyuncu için hızlı tarifler, müşteri sayısı sınırlı olduğunda (çok masa, dekor çekiciliği) pahalı tarifler değerlidir; hiçbiri her açıdan en iyisi değildir. Testler bunu korur (`recipe choice is real`). Üretim panelinde her kartta süre, müşteri geliri, malzeme maliyeti ve net kazanç yazar; kilitli tarifler de maliyet/net bilgisiyle ve "Mağazada aç" düğmesiyle listelenir.

Açma koşulları (mağazada görünür): seviye, önceki tarif (Simit → Kurabiye → Muffin → Waffle; Latte → Mocha), Waffle için Aşama 3.

## 3. Ekipman: seviyeye göre görünüm ve gerçek etki

5 hat × 3 kademe: fırın (üretim süresi %8/16/25), kahve makinesi (+1/+2/+3 eşzamanlı kahve ve hız), hamur tezgâhı (malzeme iadesi %5/10/15), vitrin (+10/25/50 ürün), depo (malzeme kapasitesi 120/250/500; başlangıç 60). Kademeler birbirinin yerini alır, toplanmaz. Kayıtlıdır.

**Görünüm**: her kademenin kendi resmi tanımlıdır (`EQUIPMENT_ART`, `assets/game/interior/<istasyon>-t<kademe>.webp`). Dosya varsa sahne o resmi çizer (en yakın alt kademenin resmi de kullanılır). **Dosya yoksa hiçbir şey uydurulmaz**: istasyon mevcut resmini korur ve altında kademe rozeti (yıldızlı pirinç plaka) görünür; yeni ekipmanın ilk kullanımında kısa tanıtım animasyonu oynar. Renk tonu/büyütme yedeği kaldırıldı. Eksik resim listesi: `node scripts/list-missing-art.mjs`.

```
| station | tier | file | item | state |
|---|---|---|---|---|
| oven | 2 | oven-t2.webp | Taş Fırın Pro | MISSING |
| oven | 3 | oven-t3.webp | Altın Fırın | MISSING |
| oven | 4 | oven-t4.webp | Usta Taş Fırın | MISSING |
| coffee | 2 | coffee-t2.webp | Barista Kahve Makinesi | MISSING |
| coffee | 3 | coffee-t3.webp | Espresso Pro | MISSING |
| coffee | 4 | coffee-t4.webp | Kristal Espresso Bar | MISSING |
| showcase | 2 | showcase-t2.webp | Cam Pasta Vitrini | MISSING |
| showcase | 3 | showcase-t3.webp | Panoramik Vitrin | MISSING |
| showcase | 4 | showcase-t4.webp | Kristal Vitrin | MISSING |
| storage | 2 | storage-t2.webp | Geniş Depo Rafları | MISSING |
| storage | 3 | storage-t3.webp | Soğuk Depo | MISSING |
| storage | 4 | storage-t4.webp | Büyük Ambar | MISSING |
| counter | 2 | counter-t2.webp | Mermer Hamur Tezgâhı | MISSING |
| counter | 3 | counter-t3.webp | Usta Hamur Tezgâhı | MISSING |
| counter | 4 | counter-t4.webp | Şef Tezgâhı | MISSING |

15 of 15 tier pictures are missing; those stations keep their plain picture with a level badge.
```

Gerçek resmi eklemek: ChatGPT komutları `docs/EKSIK_ASSETLER.md` (E12) → gelen resim için `python3 scripts/add_equipment_tier.py oven 2 resim.png` (siyah zemini siler, kırpar, yüksekliği mevcut resme göre ayarlar) → `node scripts/gen-assets.mjs`. Başka bir şey değiştirmek gerekmez.

## 4. Dekorasyon (ayrı kategori) ve yerleştirme modu

Mağaza → **Dekorasyon**: Masa & Sandalye (masa takımları: pastalı, fincanlı, sade), Bitki & Çiçek (3 saksı), Aydınlatma (2 sarkıt lamba), Halı & Paspas (koridor halısı, yolluk, paspas), Raf & Duvar (bitki rafı, ekmek rafı, bakır tencere askısı). Bölümleri açan "Koridor/Duvar Dekor Alanı" Genişletme sekmesindedir.

* Satın alınan parça kafede ilk boş uygun yuvaya yerleşir ve hemen görünür (halka, parıltı, "pop" animasyonu; mağaza sayfası kısa süre çekilir).
* **Yerleştirme modu**: kartta *Taşı / Kaldır / Yerleştir*. Parça kendi türündeki yuvalar arasında taşınır (sol köşe, sağ köşe, koridor girişi, raf yerleri…); dolu yuvadaki parça takas edilir ya da depoya kalkar; kaldırılan parça sahipliğini korur (depoda), çekicilik vermez. Üç duvar parçası iki yere yarışır, seçim oyuncunundur.
* Aynı parça ikinci kez alınamaz (tasarım gereği tek parça; yuva sayısı sınırlı).
* Yerleşim kayda yazılır (`shop.placed`, `shop.stored`); yeniden açınca aynı yerde. Bozuk/eski kayıt onarılır: sahip olunan parça asla kaybolmaz.
* Yedek çizim: resim yoksa saksı/halı/lamba/raf için çizilmiş basit yedek; satın alma sahneye eklenemese bile altın düşüp eşya kaybolmaz çünkü sahne yalnız kayıtlı durumu okur.

Yeni sandalye çeşidi, duvar lambası ve yeni iç mekân bölümü resimleri yoktur (bkz. eksik asset).

## 5. Aşamalar

Koşullar gerçek verilerden hesaplanır (`Shop.measure`): seviye, harcanan altın, satılan ürün, ekipman geliştirme, tarif, mağaza eşyası, geliştirme, masa, araştırma. Bütün koşullar sağlanınca aşama bir kez ilerler ve ödül bir kez ödenir.

| Aşama | Koşullar | Ödül | Kafede görünüm |
|---|---|---|---|
| 1 Küçük Kafe | başlangıç | — | sade |
| 2 Gelişen Kafe | seviye 4 · 4.000 harcama · 25 satış · 1 ekipman · 1 tarif · 3 eşya · 2 geliştirme | 1.500 altın, 150 XP | duvarda ahşap isim tabelası, biraz daha sıcak ışık |
| 3 Popüler Kafe | seviye 8 · 25.000 · 150 satış · 4 ekipman · 10 eşya · 3 masa · 3 tarif | 6.000 altın, 400 XP | renkli tabela + iki yana flama |
| 4 Ünlü Kedi Kafesi | seviye 13 · 90.000 · 600 satış · 9 ekipman · 22 eşya · 4 masa · 5 tarif · 4 araştırma | 25.000 altın, 1.200 XP | altın çerçeveli tabela, yıldızlar, parıltı |

Aşama geçişinde halka/kıvılcım, tabelanın belirmesi ve toast (ödül + sıradaki aşama) gösterilir. Yeni içerik: `stage:` kapılı ürünler (3. ve 4. kademe ekipmanlar, Waffle, VIP, temalar). Tabela/flama vektör çizimdir (resim değil).

## 6. Arayüz

* Satın alma düğmesi: maliyet; kartta "Kazanım: …" ve "Altın: 54.320 → 51.120"; yetmiyorsa "Altın yetersiz · N altın eksik" ve `Altın: x / fiyat`; kilitliyse gereken koşul. Satın alınan kart yeşil parlar ve kısa zıplar, üst çubukta `−N` çipi, toast'ta kalan altın ve sıradaki hedef.
* Kartların sırası sekme açılırken belirlenir ve satın alma sırasında kaymaz.
* Dar ekran (320×568'e kadar denendi): mağaza sayfası kısa ekranlarda yükselir, uzun kilit metinleri düğmeye değil kart içine yazılır.
* Üst çubuğun altında sakin bir hedef çipi; mağaza bildirimleri toast'larla sınırlı, sürekli pop-up yok.

## 7. Kayıt (sürüm 11) ve geçiş

Eklenenler: `stats.goldEarned`, `daily.lastAt`, `exploration.goldDay`, `shop.stored` (öncekiler: `shop`, `stats.goldSpent/shopBought`, müşteri `vip`). **Hepsi isteğe bağlıdır**: v1–v10 kayıtları bu alanlar olmadan yüklenir; altın, ilerleme, üretim, görevler, mağaza sahipliği ve yerleşim korunur, yeni sayaçlar 0'dan başlar. `tests/economy-integration.test.js` bir v10 kaydını yükleyip doğrular.

## 8. Denge tablosu

`node scripts/balance-shop.mjs` üretir (model: temel ürünlerin ortalama siparişi, masa sayısına göre müşteri akışı; geri ödeme yalnız geliri doğrudan etkileyen ürünler için).

```
Average order (base 4 products): 52.0 gold gross, 25.5 net. Guests/min with 2 tables: 1.76, 3: 2.65, 4: 3.53.
Customer net income with 2 / 3 / 4 tables: 45 / 67 / 90 gold per minute.

| item | category | price | level | stage | orders to afford | payback (h) | note |
|---|---|---|---|---|---|---|---|
| ovenT2 | equipment | 3.200 | 3 | 1 | 62 | 4.6 | oven 8% faster |
| ovenT3 | equipment | 12.000 | 7 | 2 | 231 | 7.9 | oven 16% faster |
| ovenT4 | equipment | 40.000 | 12 | 3 | 769 | 15.0 | oven 25% faster |
| coffeeT2 | equipment | 3.800 | 3 | 1 | 73 | 1.7 | +1 parallel coffee job (60% utilised) |
| coffeeT3 | equipment | 14.000 | 7 | 2 | 269 | 3.1 | +2 parallel coffee job (60% utilised) |
| coffeeT4 | equipment | 44.000 | 13 | 3 | 846 | 6.4 | +3 parallel coffee job (60% utilised) |
| counterT2 | equipment | 2.400 | 2 | 1 | 46 | 5.6 | 5% of oven ingredient spend back |
| counterT3 | equipment | 9.500 | 6 | 2 | 183 | 11.1 | 10% of oven ingredient spend back |
| counterT4 | equipment | 30.000 | 12 | 3 | 577 | 23.4 | 15% of oven ingredient spend back |
| showcaseT2 | equipment | 2.000 | 2 | 1 | 38 | — |  |
| showcaseT3 | equipment | 8.000 | 5 | 2 | 154 | — |  |
| showcaseT4 | equipment | 26.000 | 11 | 3 | 500 | — |  |
| storageT2 | equipment | 1.800 | 2 | 1 | 35 | — |  |
| storageT3 | equipment | 7.000 | 5 | 2 | 135 | — |  |
| storageT4 | equipment | 22.000 | 10 | 3 | 423 | — |  |
| matPaw | decor | 350 | 1 | 1 | 7 | 5.6 | appeal +1 |
| plantA | decor | 450 | 1 | 1 | 9 | 3.6 | appeal +2 |
| rugAisle | decor | 700 | 2 | 1 | 13 | 5.6 | appeal +2 |
| shelfPlants | decor | 1.100 | 3 | 1 | 21 | 5.8 | appeal +3 |
| plantB | decor | 900 | 4 | 1 | 17 | 4.7 | appeal +3 |
| lampA | decor | 1.200 | 4 | 1 | 23 | 4.7 | appeal +4 |
| shelfBread | decor | 1.800 | 5 | 1 | 35 | 9.4 | appeal +3 |
| tableCake | decor | 2.200 | 5 | 1 | 42 | 8.6 | appeal +4 |
| tableCup | decor | 2.200 | 5 | 1 | 42 | 8.6 | appeal +4 |
| rugRunner | decor | 1.600 | 6 | 1 | 31 | 8.4 | appeal +3 |
| plantC | decor | 1.500 | 6 | 1 | 29 | 7.9 | appeal +3 |
| lampB | decor | 2.400 | 8 | 1 | 46 | 9.3 | appeal +4 |
| tablePlain | decor | 500 | 2 | 1 | 10 | 8.0 | appeal +1 |
| rackPots | decor | 1.400 | 4 | 1 | 27 | 7.3 | appeal +3 |
| recipeSimit | recipes | 600 | 1 | 1 | 12 | — | net 0.96 gold/s, 24 per sale |
| recipeLatte | recipes | 900 | 3 | 1 | 17 | — | net 1.00 gold/s, 22 per sale |
| recipeKurabiye | recipes | 1.500 | 4 | 1 | 29 | — | net 0.80 gold/s, 36 per sale |
| recipeMocha | recipes | 2.400 | 6 | 1 | 46 | — | net 0.97 gold/s, 29 per sale |
| recipeMuffin | recipes | 3.200 | 7 | 1 | 62 | — | net 0.91 gold/s, 50 per sale |
| recipeWaffle | recipes | 6.500 | 10 | 3 | 125 | — | net 0.85 gold/s, 68 per sale |
| areaAisle | expansion | 1.500 | 2 | 1 | 29 | — |  |
| areaWall | expansion | 1.200 | 3 | 1 | 23 | — |  |
| table3 | expansion | 1.800 | 2 | 1 | 35 | 1.3 | 3. table |
| table4 | expansion | 6.500 | 4 | 1 | 125 | 4.8 | 4. table |
| waitingA | expansion | 2.500 | 3 | 1 | 48 | — | +1 waiting place (no income of its own) |
| waitingB | expansion | 9.000 | 8 | 2 | 173 | — | +2 waiting place (no income of its own) |
| vip1 | special | 9.000 | 8 | 3 | 173 | — |  |
| vip2 | special | 30.000 | 13 | 4 | 577 | — |  |
| themeSpring | special | 5.000 | 6 | 2 | 96 | 15.4 | appeal +5 |
| themeCozy | special | 5.000 | 6 | 2 | 96 | 15.4 | appeal +5 |

Catalogue total: 330.600 gold
```

## 9. Testler

`tests/shop.test.js` (mağaza mantığı), `tests/economy-integration.test.js` (bütünleşik: satış gerçek fiyatı ödüyor, harcamalar doğru miktarda, tarif/eşya üretim + sipariş sisteminde açılıyor, ekipman etkileri, yeniden açınca durum, v10 geçişi, hedefler gerçek veriden, negatif altın / çift satın alma / çift ödül / saat geri alma / keşif bütçesi, sahnede kademe resmi yoksa mevcut resim, aşamaya göre tabela), `tests/scene-smoke.test.js` (resim yokken tüm katalog çizilir).

## 10. Eksik / yedek olanlar

Bkz. `docs/EKSIK_ASSETLER.md`. Özet: 15 ekipman kademe resmi (E12), yeni tarif ikonları (yedek: `scripts/make_recipe_icons.py`), yeni sandalye/masa çeşitleri, duvar lambası, yeni iç mekân bölümleri, VIP kedi görünümleri; aşama tabelası/flamalar ve bekleme direkleri vektör çizim.
