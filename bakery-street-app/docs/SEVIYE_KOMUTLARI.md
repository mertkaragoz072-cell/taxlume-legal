# Eşya seviye görselleri — ChatGPT komutları

Her eşya için **tek komut, tek resim**: aynı resimde 4 versiyon yan yana (soldan sağa seviye 2, 3, 4, 5).
Komutla birlikte `docs/referans/seviye/<id>-seviye1.png` dosyasını (eşyanın oyundaki mevcut hali) ekle.

Gelen resmi bana gönder, ya da kendin ekle:
```
python3 scripts/add_item_level.py <id> sheet ~/Downloads/resim.png
node scripts/gen-assets.mjs
```
Bir versiyon beğenilmezse tek seviye de eklenebilir: `python3 scripts/add_item_level.py <id> 3 resim.png`.

**Masa takımları (Sade, Pastalı, Fincanlı):** masanın ÜSTÜ BOŞ çizilir (vazo, pasta, fincan yok). Masanın üstüne oyun koyar: boş masada takımın süsü (pasta / fincan), müşteri oturunca onun sipariş ettiği ürün.

**Sıra:** önce ilk üç (kafede en çok görünenler), sonra diğerleri.

## 1. Sade Masa Takımı (`tablePlain`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Sade Masa Takımı" eşyasının 1. seviyesi (ahşap yuvarlak masa ve iki sandalye). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 2. Çiçekli Saksı (`plantA`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Çiçekli Saksı" eşyasının 1. seviyesi (toprak saksıda yeşil bitki ve beyaz çiçekler). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 3. Bakır Sarkıt Lamba (`lampA`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Bakır Sarkıt Lamba" eşyasının 1. seviyesi (tavandan sarkan bakır lamba). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 4. Pastalı Masa Takımı (`tableCake`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Pastalı Masa Takımı" eşyasının 1. seviyesi (üstünde çilekli pasta olan masa ve sandalyeler). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 5. Fincanlı Masa Takımı (`tableCup`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Fincanlı Masa Takımı" eşyasının 1. seviyesi (üstünde kahve fincanı olan masa ve sandalyeler). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 6. Pembe Çiçekli Saksı (`plantB`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Pembe Çiçekli Saksı" eşyasının 1. seviyesi (pembe çiçekli saksı). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 7. Sarkık Bitki (`plantC`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Sarkık Bitki" eşyasının 1. seviyesi (sarmaşıklı sarkık bitki saksısı). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 8. Pati Paspası (`matPaw`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Pati Paspası" eşyasının 1. seviyesi (pati desenli kapı paspası). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 9. Koridor Halısı (`rugAisle`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Koridor Halısı" eşyasının 1. seviyesi (yeşil koridor halısı). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 10. Kırmızı Yolluk (`rugRunner`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Kırmızı Yolluk" eşyasının 1. seviyesi (uzun kırmızı yolluk halı). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 11. Raflı Bitki (`shelfPlants`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Raflı Bitki" eşyasının 1. seviyesi (duvar rafında küçük saksı bitkiler). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 12. Ekmek Rafı (`shelfBread`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Ekmek Rafı" eşyasının 1. seviyesi (sepetler ve ekmeklerle dolu duvar rafı). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```

## 13. Bakır Tencere Askısı (`rackPots`)
```
Ekteki resim mobil kedi kafe oyunumdaki "Bakır Tencere Askısı" eşyasının 1. seviyesi (duvara asılı bakır tencere ve kepçeler). AYNI sanat stilinde (sıcak, el çizimi, kalın koyu kahverengi dış hat, yumuşak boyama, sevimli kedi kafe teması), AYNI bakış açısı ve AYNI oranlarda bu eşyanın 4 yükseltilmiş halini TEK resimde, yan yana, aralarında boşluk bırakarak çiz. Soldan sağa:
1) Seviye 2: biraz daha dolgun ve bakımlı, küçük bir ek süs (kurdele, birkaç yaprak ya da küçük çiçek), renkler bir ton canlı.
2) Seviye 3: belirgin şekilde daha güzel, daha kaliteli malzeme (cilalı ahşap, desenli seramik, nakışlı kumaş), iki üç küçük süs.
3) Seviye 4: lüks, pirinç ya da bakır detaylar, zengin desenler, ince oymalar, daha bol içerik.
4) Seviye 5: efsane, altın detaylar, küçük kedi patisi motifi, yumuşak ışıltılar, en görkemli hali.
Dördü de aynı eşya olarak tanınmalı ve aynı boyda olmalı. Düz siyah (#000000) arka plan, gölge yok, yazı ve numara yok, nesneler birbirine değmesin.
```
