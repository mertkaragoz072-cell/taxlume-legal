# Eksik assetler — ChatGPT komutları (kopyala-yapıştır)

Karakter komutlarında ilgili referans şeridini (`docs/refs/`) ekle. Arayüz komutlarında kafe referans görselini ekle.
Gelen sayfada: 30 kare, numaralar altta, düz siyah arka plan, kareler aynı boyda. Bozuksa aynı komutla yeniden üret.

## Durum
| Asset | Durum |
|---|---|
| Boş oda, mutfak ekipmanı, masa/sandalye/halı | HAZIR, oyunda |
| 8 müşteri kedi: 30 karelik yürüme + önden/arkadan | HAZIR, oyunda |
| Şef: sepetle yürüme (22 kare) | HAZIR (E1; sayfanın son 6 karesinde numaralar ayaklara binmişti, kullanılmadı) |
| Garson: tepsiyle yürüme | HAZIR ama kısa (E2; sayfanın son satırında ayaklar kırpılmıştı, yalnız 10 karelik temiz bir döngü alındı; daha uzun döngü için sayfayı alt kenar boşluğuyla yeniden ürettir) |
| Garson: boş elle yürüme | HAZIR (E3; 22 karelik döngü, son satırda numara kalıntısı olduğu için 3.-24. kareler alındı) |
| Şef: hamur yoğurma (E4) | HAZIR (17 karelik döngü) |
| Şef: fırına ürün koyma (E5) | HAZIR (30 kare, tek seferlik) |
| Şef: kahve hazırlama (E6) | HAZIR (24 kare, tek seferlik; sayfanın son satırında numaralar kareye yapışık olduğu için 25-30. kareler alınmadı) |
| Şef: sevinç sıçraması (E7) | EKSİK |
| Garson: tepsiyi masaya uzatma | HAZIR (E8; 24 kare, tek seferlik) |
| 8 müşteri kedi: oturup yeme | 7/8 HAZIR. EKSİK: yalnız siyah kırmızı atkılı kedi (E9) |
| Ürün, malzeme ve durum ikonları (E11) | HAZIR, oyunda |
| Arayüz öğeleri (E10): rozet, menü, alt menü, kapatma, panel çerçevesi | HAZIR, oyunda (yeşil/kiremit düğmeler ve geniş panel çerçevesi kaydedilmedi) |

## Eksik animasyonlar için şimdilik kodla yapılmış yedek hareketler
Gerçek animasyon sayfaları gelene kadar bunlar çalışır; sayfa gelince ilgili satırdaki yedek kaldırılır.
| Eksik | Şimdiki yedek (kod) | Gerçeği için gereken |
|---|---|---|
| Kasada ödeme | Kedi yemeği bitirip kalkarken 3 altın, masadan vitrin tezgâhındaki kasaya yay çizerek uçar; tezgâh sıçrar, kıvılcım çıkar, "+N" yazısı kasada belirir (`CustomerLayer.pay`) | Kasaya yürüyüp ödeme yapan kedi sayfası (+ kasa/para çekmecesi resmi) |
| Garson tepsisindeki ürün (resimde hep fincan + pasta) | Garsonun başının üstünde, gerçekten taşıdığı ürünün ikonu küçük bir balon içinde sallanır (`drawWaiter`) | Boş tepsili kareler + ürün katmanı, ya da ürün başına tepsi sayfası |
| Masayı toplama | Tabak söner, masa kıvılcımla parlar (`tableFree`) | Garsonun tabağı alma animasyonu |
| Sabrı biten müşterinin yüzü | Sabrı %30'un altına inince kedi yana doğru titrer, azaldıkça hızlanır (`CustomerLayer.shake`) | Somurtkan/sinirli yüz kareleri |
| Şef sevinç sıçraması (E7) | Mevcut sevinç kareleri + zıplama | E7 sayfası |

## Ekonomi sistemi için eksik sanat (şimdilik kodla yedeklenmiş)
| Eksik | Şimdiki yedek | Gerçeği için gereken |
|---|---|---|
| Ekipman kademeleri (fırın, kahve makinesi, hamur tezgâhı, vitrin, depo × 3 kademe = 15 resim) | **Hiçbir şey uydurulmaz**: mevcut resim korunur, altında kademe rozeti (yıldızlı plaka) görünür | Aşağıdaki E12 komutlarıyla 15 resim (`docs/EKONOMI.md` listesi; `node scripts/list-missing-art.mjs`) |
| 6 yeni tarifin ikonları | `scripts/make_recipe_icons.py` ile çizilmiş basit ikonlar | ChatGPT ile diğer ikonlarla aynı stilde 256 px simit, latte, kurabiye, mocha, muffin, waffle |
| VIP / nadir misafir görünümü | Altın taç + altın ışık | Ayrı kedi sayfaları (örn. şapkalı/atkılı özel kediler) |
| Yeni mobilya çeşitleri (sandalye, farklı masa, bank) | Yok: yalnız eldeki resimler (saksı, lamba, raf, halı, masa süsü) | Yeni sandalye/masa/bank resimleri |
| Yeni iç mekân bölümleri (teras, ikinci salon) | Koridor cilası ve duvar panosu (vektör) | Bölüm resimleri + sahne düzeni |
| Bekleme alanı direkleri/halatı | Vektör (pirinç direk, kırmızı halat) | İstenirse resim |

## E12: Ekipman kademeleri (15 resim, her biri AYRI komut)
Her komutta ilgili İSTASYONUN mevcut resmini (`assets/game/interior/oven.webp`, `coffee.webp`, `showcase.webp`, `storage.webp`, `counter.webp`) referans olarak ekle. Gelen resim: tek nesne, düz siyah (#000000) arka plan. Sonra her resim için:
```
python3 scripts/add_equipment_tier.py <istasyon> <kademe> ~/Downloads/resim.png     # örn. oven 2 ...
node scripts/gen-assets.mjs                                                          # bir kez, dosyalar eklendikten sonra
```
Dosya adları: `oven-t2/t3/t4`, `coffee-t2/t3/t4`, `showcase-t2/t3/t4`, `storage-t2/t3/t4`, `counter-t2/t3/t4` (.webp). Oyun resmi aynı taban çizgisi ve merkezle çizer; başka bir kod değişikliği gerekmez.

HER KOMUTUN BAŞINA şunu ekle: "Ekteki resim oyunun mevcut [İSTASYON] resmidir. AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısıyla (hafif yukarıdan, önden), AYNI yükseklik/genişlik oranına yakın ve AYNI zemin çizgisinde, bu istasyonun YÜKSELTİLMİŞ bir sürümünü çiz. Renk paleti sıcak krem, bal, kiremit, kahverengi ve yumuşak yeşil olsun; yeni kademede daha değerli malzemeler (pirinç, altın, mermer, cam) görünsün ama aynı istasyon olduğu belli olsun. Düz siyah (#000000) arka plan, gölge yok, yalnızca tek nesne, kenarlarda en az 40 piksel boşluk, kesilmemiş, metin/yazı yok."

* **Fırın 2 (Taş Fırın Pro)**: "Tuğla fırın; kapı kemerinde parlak PİRİNÇ çerçeve, pirinç baca kapağı, daha düzgün dizilmiş tuğlalar, yanında asılı bakır kepçe ve maşa, ateş biraz daha parlak, tabanda küçük odun yığını."
* **Fırın 3 (Altın Fırın)**: "Çift katlı tuğla kemerli fırın; kemer ve kapı çerçevesi ALTIN kaplama, yanlarda altın sütunlar, baca altın başlıklı, mavi-krem seramik süs şeridi, geniş ağızda parlak ateş ve ekmekler."
* **Fırın 4 (Usta Taş Fırın)**: "Beyaz mermer ve altın detaylı usta fırını; oymalı kemer, üstünde küçük kedi başı kabartması, altın baca, yanlarda altın aletler ve küçük bir tabela, ateş çok parlak."
* **Kahve makinesi 2 (Barista)**: "Krom çift kollu espresso makinesi, yanında cam çekirdek hazneli değirmen, üstte sıralı fincanlar, küçük basınç göstergesi."
* **Kahve makinesi 3 (Espresso Pro)**: "Bakır borulu üç kollu espresso makinesi, manometreler, parlak krom gövde, yanında iki değirmen, üstte fincan rafı."
* **Kahve makinesi 4 (Kristal Espresso Bar)**: "Cam/kristal paneli ve altın detayları olan dört kollu lüks espresso barı, yükselen buhar bulutu, yanda kristal çekirdek kavanozları."
* **Vitrin 2 (Cam Pasta Vitrini)**: "Kavisli camlı üç raflı pasta vitrini, ahşap taban, raflarda sıralı kruvasan, pasta ve kurabiyeler, ince fiyat etiketleri."
* **Vitrin 3 (Panoramik Vitrin)**: "Daha geniş, altın çerçeveli panoramik camlı vitrin, içeriden aydınlatmalı dört raf, kubbeli pasta fanusları ve bol ürün."
* **Vitrin 4 (Kristal Vitrin)**: "Kristal cam paneller ve mermer tabanlı, altın süslemeli lüks vitrin; ışıklı raflar, tepsilerde nefis pastalar, kubbeli fanuslar."
* **Depo 2 (Geniş Depo Rafları)**: "İki katlı geniş ahşap depo rafları; un çuvalları, süt şişeleri, yumurta kasaları, kavanozlar ve ahşap kutular dolu."
* **Depo 3 (Soğuk Depo)**: "Ahşap ve çelik karışımı depo; yanında küçük soğutucu dolap kapısı, etiketli kavanozlar, süt ve tereyağı rafları, düzenli kasalar."
* **Depo 4 (Büyük Ambar)**: "Üç katlı büyük ahşap ve demir ambar rafı; bol çuval, fıçı, kasa ve etiketli kavanoz, altın etiket tabelası."
* **Tezgâh 2 (Mermer Hamur Tezgâhı)**: "Mermer üstlü hamur hazırlama tezgâhı, üstünde hamur, merdane, un ve kase; alt rafta sepetler."
* **Tezgâh 3 (Usta Hamur Tezgâhı)**: "Çelik ayaklı, mermer üstlü büyük usta tezgâhı; duvara asılı çelik aletler, hamur teknesi, tartı."
* **Tezgâh 4 (Şef Tezgâhı)**: "Altın detaylı mermer şef tezgâhı; üstünde hazır hamur işleri, bakır tartı ve kase, küçük kedi şef şapkası süsü."

## Sıra (görünürlüğe göre)
E9 (masadaki kediler yarım duruyor, en çok göze çarpan) → E1, E2, E3 → E4–E8 → E10, E11.

## Ortak kurallar (her karakter komutunun içinde var)
HER KOMUTUN SONUNA şunu ekle (son satırda numaralar ayaklara biniyordu): "Numaralar her hücrenin en altında olsun, kedinin ayaklarına ASLA değmesin: ayaklar ile numara arasında en az 25 piksel boşluk bırak. Sayfanın en alt satırında da aynı boşluk olsun, kedi ve numara kesilmesin; görselin alt kenarında en az 60 piksel boş siyah alan bırak."

Sağa bakış, 6×5 ızgara, 1–30 numara, düz siyah (#000000) arka plan, aynı boy, aynı ayak çizgisi, kedi hücrenin ortasında, gölge yok, kusursuz döngü.

## E9: Müşteri kedi oturup yeme (8 kedi için aynı komut, her kedinin kendi şeridiyle)
```
Ekteki referans şeritteki kediyle BİREBİR aynı karakter (aynı renk, desen, aksesuar, çizim stili, kontur ve oranlar). Bu kedi için OTURARAK YEME animasyonu çiz: kedi bir sandalyede oturuyormuş gibi (sandalye ve masa ÇİZME, sadece kedi), kameraya dönük hafif 3/4, önündeki görünmez masadan bir pasta/ekmek parçası alıp yiyor, yanakları mutlu hareket ediyor, ara sıra gözlerini kapatıp gülümsüyor, bacakları oturur pozda aşağı sarkıyor, kuyruk yavaş sallanıyor. Kedinin tamamı (baş, gövde, bacaklar, kuyruk) görünsün. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, oturma noktası (kalçanın alt kenarı) her karede aynı yatay çizgide, kedi her karede kendi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü (30. kare 1. kareye geçerken fark edilmesin). Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E1: Şef kedi, sepetle yürüme
```
Ekteki referans şeritteki şef kediyle BİREBİR aynı karakter (aynı turuncu tüy, beyaz şef şapkası, kırmızı fular, çizim stili, kontur, oranlar). Bu kedi için ELİNDE EKMEK SEPETİYLE YÜRÜME animasyonu çiz: kedi SAĞA doğru yürüyor, hafif kameraya dönük 3/4 görünüm, iki patisiyle ekmek dolu sepeti tutuyor, iki ayak adımı net, kuyruk adımla sallanıyor, gövde hafifçe sekiyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E2: Garson kedi, tepsiyle yürüme
```
Ekteki referans şeritteki garson kediyle BİREBİR aynı karakter (aynı tüy rengi, yeşil önlük, çizim stili, kontur, oranlar). Bu kedi için ELİNDE KAHVE VE PASTA TEPSİSİYLE YÜRÜME animasyonu çiz: kedi SAĞA doğru yürüyor, hafif kameraya dönük 3/4 görünüm, tepsiyi iki patisiyle sabit tutuyor (tepsideki fincan ve pasta sallanmıyor), iki ayak adımı net, kuyruk adımla sallanıyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E3: Garson kedi, boş elle yürüme
```
Ekteki referans şeritteki garson kediyle BİREBİR aynı karakter (aynı tüy rengi, yeşil önlük, çizim stili, kontur, oranlar). Bu kedi için BOŞ ELLE YÜRÜME animasyonu çiz: kedi SAĞA doğru yürüyor, hafif kameraya dönük 3/4 görünüm, kolları rahat sallanıyor, iki ayak adımı net, kuyruk sallanıyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E4: Şef kedi, hamur yoğurma
```
Ekteki referans şeritteki şef kediyle BİREBİR aynı karakter (aynı turuncu tüy, beyaz şef şapkası, kırmızı fular, çizim stili, kontur, oranlar). Bu kedi için HAMUR YOĞURMA animasyonu çiz: kedi kameraya dönük (hafif 3/4), önünde görünmez bir tezgâh var (tezgâhı, masayı ve hamuru ÇİZME, sadece kedi), iki patisiyle aşağıya bastırıp çekiyor, başı ve gövdesi ritimle hafifçe eğiliyor, kuyruk sallanıyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E5: Şef kedi, fırına ürün koyma
```
Ekteki referans şeritteki şef kediyle BİREBİR aynı karakter (aynı turuncu tüy, beyaz şef şapkası, kırmızı fular, çizim stili, kontur, oranlar). Bu kedi için FIRINA ÜRÜN KOYMA animasyonu çiz: kedi SAĞA dönük, uzun bir fırın küreğinin üstünde ekmek var, kediyi sağdaki görünmez bir fırına doğru uzanıyor, ekmeği sürüyor, küreği geri çekiyor, alnını siliyor (fırını ÇİZME, sadece kedi ve küreği). 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E6: Şef kedi, kahve hazırlama
```
Ekteki referans şeritteki şef kediyle BİREBİR aynı karakter (aynı turuncu tüy, beyaz şef şapkası, kırmızı fular, çizim stili, kontur, oranlar). Bu kedi için KAHVE HAZIRLAMA animasyonu çiz: kedi SAĞA dönük, görünmez bir kahve makinesinin koluna uzanıp çeviriyor, bir fincanı alıp bakıyor, kokusunu çekip mutlu oluyor (makineyi ÇİZME, sadece kedi ve fincan). 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E7: Şef kedi, sevinç sıçraması
```
Ekteki referans şeritteki şef kediyle BİREBİR aynı karakter (aynı turuncu tüy, beyaz şef şapkası, kırmızı fular, çizim stili, kontur, oranlar). Bu kedi için SEVİNÇ SIÇRAMASI animasyonu çiz: kedi kameraya dönük, bir ürün hazır oldu; çömelip hazırlanıyor, iki patisini havaya kaldırarak zıplıyor, havada gülüyor, yere iniyor, yumuşak sekiyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, YERDEKİ ayak çizgisi her karede aynı (havada kareler çizginin yukarısında olur), kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E8: Garson kedi, tepsiyi masaya uzatma
```
Ekteki referans şeritteki garson kediyle BİREBİR aynı karakter (aynı tüy rengi, yeşil önlük, çizim stili, kontur, oranlar). Bu kedi için SİPARİŞİ MASAYA UZATMA animasyonu çiz: kedi SAĞA dönük, elinde kahve ve pasta tepsisi var, tepsiyi öne uzatıp sağdaki görünmez bir masaya bırakıyor (masayı ÇİZME), tepsiyi geri çekip gülümsüyor ve hafifçe selam veriyor. 30 kare, 6 sütun × 5 satır ızgara, kareler soldan sağa ve yukarıdan aşağıya sırayla, her karenin altında 1'den 30'a numara. Arka plan düz siyah (#000000). Tüm kareler AYNI boyda, ayaklar her karede aynı yatay çizgide, kedi hücresinin ortasında, kareler birbirine değmesin, gölge yok. Kusursuz döngü. Çizim stili ekteki gibi: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi kontur, kamera yukarıdan 45° açıyla.
```

## E10: Arayüz öğeleri (kafe referans görseliyle)
```
Mobil bir kedi kafe tycoon oyununun arayüz öğeleri. Stil: ekteki referans kafe görselindeki arayüzle BİREBİR aynı: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi (#5a3a28) kontur, krem ve ahşap kahve tonları, yeşil ve kiremit vurgu. Düz önden görünüm (perspektif yok). Arka plan düz beyaz, öğeler arasında boşluk, üzerinde YAZI YOK (yazıları kodla ekleyeceğiz). Öğeler: (1) kedi kulaklı yuvarlak seviye rozeti, boş; (2) iki boş uzun sayaç hapı, birinde altın para, diğerinde yıldız ikonu; (3) kare menü düğmesi, üç çizgili; (4) alt menü için 4 adet yuvarlak köşeli krem-ahşap düğme, her birinde ikon: ekmek sepeti (Fırın & Kafe), küçük ev (Kasaba), katlanmış harita (Keşif), tezgâhlı dükkân (Mağaza); (5) aynı 4 düğmenin SEÇİLİ hâli: biraz büyük, kalın çerçeveli, kulaklı; (6) alt sayfa panel çerçevesi: krem içli, ahşap kenarlı, üst orta kenarında küçük başlık şeridi, boş; (7) büyük yeşil düğme ve büyük kiremit düğme, boş; (8) yuvarlak kapatma düğmesi (çarpı); (9) kart arka planı: krem, ince ahşap çerçeveli, boş.
```

## E11: Ürün ve malzeme ikonları (kafe referans görseliyle)
```
Mobil bir kedi kafe tycoon oyunu için ürün ve malzeme ikonları. Stil: ekteki referans kafe görselindeki ürünlerle BİREBİR aynı: sevimli, yumuşak pastel cel boyama, ince yumuşak koyu kahverengi (#5a3a28) kontur. Düz önden hafif yukarıdan görünüm. Arka plan düz beyaz, öğeler arasında boşluk, YAZI YOK. 10 ikon, her biri ayrı: ekmek somunu, kruvasan, çilekli pasta dilimi, kahve fincanı (buhar çıkıyor), un çuvalı, tereyağı bloğu, şeker küpleri, yumurta, süt şişesi, kahve çekirdekleri torbası. Ayrıca 4 küçük durum ikonu: altın para, yıldız, kilit, hediye kutusu.
```
