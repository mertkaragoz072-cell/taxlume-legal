# Ekonomi ve gelişim sistemi (Mağaza, aşamalar, hedefler)

Bu belge oyuna eklenen "altın harca → dünyada gör → yeni hedef" döngüsünü anlatır. Mevcut sistemler (üretim, stok, geliştirmeler, araştırma, görevler, günlük ödül, keşif, kasaba, müşteriler, kayıt) yeniden yazılmadı; yeni parçalar onlara bağlandı.

## Parçalar

| Parça | Dosya | Ne yapar |
|---|---|---|
| Veri (tek yer) | `src/data/economy.js` (`SHOP_ITEMS`, `STAGES`, `RECIPES`, `STORAGE`, `APPEAL`) | Bütün fiyatlar, seviye/aşama kapıları, etkiler. Başka dosyada fiyat yok. |
| Para katmanı | `Game.spend()` (`src/game/game.js`) | Altın düşmenin TEK yolu: yetmiyorsa reddeder, harcanan toplamı (`stats.goldSpent`) sayar. Geliştirme, malzeme, kasaba, araştırma ve mağaza hepsi bunu çağırır. |
| Mağaza mantığı | `src/game/shop.js` (`Shop`) | Katalog, kapılar, atomik satın alma, yerleştirme, ekipman kademeleri, aşamalar, hedef, kayıt doğrulama. |
| Müşteri bağlantısı | `src/game/customers.js` | Bekleme alanı kapasitesi, çekicilikle gelen müşteri sıklığı, bahşiş, VIP misafir, kilitli tarifin sipariş edilmemesi. |
| Mağaza ekranı | `src/ui/ShopPanel.tsx` | Sekmeler (Hedef, Malzeme, Ekipman, Mobilya, Tarifler, Genişletme, Özel), önizleme, fiyat, kapı, etki, satın al. Kafenin üstünde açılır; satın alınca panel kısa süre çekilir ve yeni parça görülür. |
| Sahne katmanı | `src/scene/interior-decor.js` (`DecorLayer`) | Satın alınanları kafe sahnesinde çizer (aşağıda). |
| Hedef çipi | `GoalPill` (`src/ui/Chrome.tsx`) | Üst çubuğun altında küçük, sakin bir çip: sıradaki hedef ve ne kadar kaldığı. Dokununca mağaza o sekmede açılır. |

## Kategoriler ve içerik

* **Ekipman** (5 hat × 3 kademe): fırın (hız), kahve makinesi (eşzamanlı iş + hız), hamur tezgâhı (malzeme iadesi), vitrin (kapasite), depo (malzeme kapasitesi). Bir hattın en yüksek alınan kademesi geçerlidir; kademeler toplanmaz, birbirinin yerini alır.
* **Mobilya / dekor** (12 parça): paspas, saksılar, halılar, lambalar, raflar, masa süsü (pasta ya da fincan). Her yerleştirilen parça "çekicilik" puanı verir.
* **Tarifler** (6): Simit, Latte, Kurabiye, Mocha, Muffin, Waffle. Alınana kadar üretilemez ve müşteri sipariş etmez; alınınca üretim panellerinde, vitrinde, sipariş balonlarında ve satışta çalışır. XP ve sipariş ağırlığı tanımlıdır.
* **Genişletme**: 3. ve 4. masa (mevcut `cafeTables` geliştirmesi: fiyat tek listeden, mağazadan ve tabeladan aynı durum), Bekleme Köşesi / Geniş Bekleme Alanı (dışarıda bekleyen misafir sayısı +1/+2, halat ve direkler sahneye eklenir), Koridor ve Duvar Dekor Alanı (bölümler açılır: cilalı koridor, duvara ahşap pano; ilgili dekorlar bunları ister).
* **Özel**: VIP Misafirler / Ünlü Ziyaretçiler (altın taçlı ve ışıklı misafir, daha çok öder), Bahar ve Kış Köşesi temaları (yaprak/kar yağar; tek seferde biri yerleştirilir).
* **Malzeme**: eski market listesi artık mağazanın ilk sekmesi; depo kapasitesi gösterilir ve aşılamaz.
* **Kasaba / araştırma**: yeniden yazılmadı. Hedef sekmesinden bağlantı var; harcanan altın ve araştırma sayısı aşama koşullarına girer.

Hepsi başlangıçta açık değil: seviye (1-13), önceki kademe/tarif, aşama (2-4) ve bölüm (koridor/duvar) kapılarıyla kademeli açılır. 54.320 başlangıç altınıyla seviye 1'de yalnız 3 şey alınabilir (Pati Paspası, Çiçekli Saksı, Simit Tarifi).

## Etkiler: her biri tek yerde uygulanır

| Etki | Nerede uygulanır | Çift uygulama neden olmaz |
|---|---|---|
| Üretim hızı (fırın/kahve kademesi) | `Game.duration()` | Geliştirme × araştırma × ekipman: üç ayrı kaynak, çarpım; ekipmanda yalnız en yüksek kademe |
| Eşzamanlı iş (kahve) | `Game.capacity()` / kayıtta `maxCapacity()` | Yalnız en yüksek kademe; kayıt bu üst sınıra göre doğrulanır |
| Vitrin kapasitesi | `Game.showcaseLimit()` | Geliştirme + yalnız en yüksek vitrin kademesi |
| Malzeme iadesi (hamur tezgâhı) | `Game.ingredientRebate()` | Araştırma iadesiyle TEK toplamda; iade ürünün malzeme değerini aşamaz |
| Depo kapasitesi | `Game.buyIngredient()` / `ingredientCap()` | Satın alma aşamaz; görev/seviye/günlük ödül sınırı yok sayar (ödül asla kaybolmaz) |
| Bekleme yeri | `Cafe.queueCap()` | Yalnız en yüksek kademe |
| Çekicilik → müşteri sıklığı, bahşiş | `Cafe.nextInterval()`, `Cafe.deliver()` | Yalnız yerleştirilmiş parçalar sayılır; masa süsü/tema tek slot |
| VIP | `Cafe.arrive()` (bayrak, kayıtlı), `Cafe.deliver()` | Çarpan bir kez; bahşiş ayrı |

Bahşiş ve VIP için rastgele sayı yalnız ilgili ürün varken çekilir; ürün yokken mevcut davranış (ve testlerdeki tohumlu dizi) aynen kalır.

## Sahnede görünürlük

* Dekor **yuvalara** (`DECOR_SLOTS`, `interior-layout.js`) yerleşir: koridor (halılar, lambalar, saksı), servis alanı kenarları (saksılar), giriş paspası, sağ duvar (raflar). Hepsi yürüme şeritlerinin dışındadır. Yerleştirme durumu kayıtlıdır; yeniden açınca aynı yerde.
* Yeni masa: mevcut masa mantığıyla açılır; müşteri sistemi o masayı kullanır.
* Ekipman kademesi: gerçek sanat gelene kadar **yedek görünüm**: büyüme (%3/%6/%9), bakır → altın → kristal tonu, parlama ve istasyonun önünde yıldızlı pirinç plaka. Yeni ekipman ilk kullanıldığında (ilk üretim/satış/malzeme alımı) ışık hüzmesi ve isim animasyonu bir kez oynar (kayıtlı).
* Satın alınca: parça yay şeklinde "pop" ile belirir, halka ve parıltı çıkar, adı yazılır; mağaza paneli kısa süre çekilir.
* Resim yoksa her parça için çizilmiş bir yedek (saksı, halı, lamba, raf) çizilir; satın alma sahneye eklenemese bile altın düşüp eşya kaybolmaz çünkü sahne yalnız kayıtlı durumu okur.
* Aşama arttıkça kafenin ışığı biraz daha sıcak olur.

## Aşamalar ve hedefler

| Aşama | Adı | Koşullar (hepsi) | Ödül |
|---|---|---|---|
| 1 | Küçük Kafe | başlangıç | — |
| 2 | Gelişen Kafe | seviye 4 · 4.000 altın harcanmış · 3 mağaza eşyası · 2 geliştirme | 1.500 altın, 150 XP |
| 3 | Popüler Kafe | seviye 8 · 25.000 harcanmış · 10 eşya · 3 masa · 3 tarif | 6.000 altın, 400 XP |
| 4 | Ünlü Kedi Kafesi | seviye 13 · 90.000 harcanmış · 22 eşya · 4 masa · 5 tarif · 4 araştırma | 25.000 altın, 1.200 XP |

Aşama bir kez ve yalnız tüm koşullar sağlanınca ilerler; ödül bir kez ödenir. "Hedef" sekmesi her koşulun ilerleme çubuğunu ve sıradaki hedefi gösterir. Sıradaki hedef: kapıları açık ama altını yetmeyen en ucuz ürün (çip ilerlemesi = altın/fiyat); hepsi alınabiliyorsa en ucuzu "alınabilir"; hiçbiri açık değilse en yakın seviye/aşama kapısı.

Üç yeni görev de sistemi bağlar: "Kafeni süsle" (1 eşya), "Gelişen kafe" (5 eşya), "Büyük yatırım" (5.000 altın harca).

## Kayıt (sürüm 10)

`shop: { owned, placed, introduced, stage }` ve `stats.goldSpent`, `stats.shopBought`; müşterilerde `vip`. Eski kayıtlar (v1–v9) bu alanlar olmadan yüklenir: altın, ilerleme ve her şey korunur, mağaza boş başlar. Bozuk/yabancı veri onarılır (bilinmeyen kimlikler atılır, sahipli bir dekor hep yerleştirilir, aşama sınırlanır); bekleme alanı kapasitesi kayıttaki mağaza durumuna göre denetlenir (yüklemede misafir kırpılmaz). `Shop.buy()` bir hata alırsa altın ve durum geri yüklenir.

## Denge

`node scripts/balance-shop.mjs` aşağıdaki tabloyu üretir. Model: 4 temel ürün, ortalama sipariş geliri, masa sayısına göre müşteri akışı; geri ödeme sütunu orta oyun senaryosuyla (3 masa, fırında 3 eşzamanlı iş, tüm makineler dolu) hesaplanır ve yalnız geliri doğrudan etkileyen ürünler için verilir (vitrin/depo/tarif/bekleme alanı değeri başka yerden gelir).

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
| matPaw | furniture | 350 | 1 | 1 | 7 | 5.6 | appeal +1 |
| plantA | furniture | 450 | 1 | 1 | 9 | 3.6 | appeal +2 |
| rugAisle | furniture | 700 | 2 | 1 | 13 | 5.6 | appeal +2 |
| shelfPlants | furniture | 1.100 | 3 | 1 | 21 | 5.8 | appeal +3 |
| plantB | furniture | 900 | 4 | 1 | 17 | 4.7 | appeal +3 |
| lampA | furniture | 1.200 | 4 | 1 | 23 | 4.7 | appeal +4 |
| shelfBread | furniture | 1.800 | 5 | 1 | 35 | 9.4 | appeal +3 |
| tableCake | furniture | 2.200 | 5 | 1 | 42 | 8.6 | appeal +4 |
| tableCup | furniture | 2.200 | 5 | 1 | 42 | 8.6 | appeal +4 |
| rugRunner | furniture | 1.600 | 6 | 1 | 31 | 8.4 | appeal +3 |
| plantC | furniture | 1.500 | 6 | 1 | 29 | 7.9 | appeal +3 |
| lampB | furniture | 2.400 | 8 | 1 | 46 | 9.3 | appeal +4 |
| recipeSimit | recipes | 600 | 1 | 1 | 12 | — | net 1.20 gold/s, 30 per sale |
| recipeLatte | recipes | 900 | 3 | 1 | 17 | — | net 1.27 gold/s, 28 per sale |
| recipeKurabiye | recipes | 1.500 | 4 | 1 | 29 | — | net 1.40 gold/s, 63 per sale |
| recipeMocha | recipes | 2.400 | 6 | 1 | 46 | — | net 1.70 gold/s, 51 per sale |
| recipeMuffin | recipes | 3.200 | 7 | 1 | 62 | — | net 1.64 gold/s, 90 per sale |
| recipeWaffle | recipes | 6.500 | 10 | 3 | 125 | — | net 1.78 gold/s, 116 per sale |
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

Catalogue total: 328.700 gold
```

İlk alımlar yaklaşık 7-12 siparişlik gelire denk gelir; orta kademeler 1-5 saatlik, büyük kademeler 8-25 saatlik hedeflerdir. Gerçek ödeme veya zorunlu harcama yoktur.

## Testler

`tests/shop.test.js` (29 test): ek masa dikey dilimi (fiyat, düşüş, sahnede açılma, müşterinin kullanması, yeniden açınca kalma), seviye kapısı, yetersiz altın, işlem anında yeniden doğrulama, çift satın alma, tek ödeme katmanı, yarım kalan işlemin geri alınması, kademelerin birbirinin yerini alması, kapasite/vitrin/depo/iade, tarif kilidi ve açılması, dekor-çekicilik-bahşiş-VIP, bekleme alanı, aşamalar ve hedef, kayıt doğrulama ve v9 geriye uyumu, ilk kullanım tanıtımı, katalog tutarlılığı. `tests/scene-smoke.test.js`: hiçbir resim yokken tüm katalog alınır, çizilir ve misafirler ödemeye devam eder.

## Bilinen eksikler (sanat gerektirenler)

Bkz. `docs/EKSIK_ASSETLER.md`: ekipman kademeleri için gerçek resimler (şimdi renk tonu + plaka), yeni tarif ikonları (şimdi `scripts/make_recipe_icons.py` yedekleri), VIP/özel misafir görünümleri (şimdi taç + ışık), yeni sandalye/mobilya çeşitleri (kullanılmayan `chair-front/back` dışında yeni resim yok), yeni iç mekân bölümleri için resimler.
