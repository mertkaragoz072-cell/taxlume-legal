# Tasarım ilkesi

Oyunun amacı: **sanat tasarımı** ve oyuncuya **sakin bir ortamda kafe işletme hissi** yaşatmak.

- Animasyonlar basit kalır. Karakterler adım adım yürümez: yürürken baktıkları yöne göre (önden, arkadan, yandan) tek bir pozda durur, hafifçe yaylanıp sallanarak süzülürler; yürüdükleri belli olur, o kadar (`SIMPLE_WALK`, `src/characters/sprites.js`).
- Ortam sakin: az ama anlamlı geri bildirim. Her olağan olay (bir satış, biten bir ürün) mesaj, titreşim veya parıltı yağmuru üretmez; altın sayaca süzülür, "+1" makineden yükselir, o kadar.
- Sevimli konuşma balonları kalır: müşteriler, şef ve garson kısa, nazik cümleler söyler ("Burası çok huzurlu", "Taze çıktı!", "Afiyet olsun!"). Krem renkli, ince kenarlı, küçük kalpli; yumuşakça belirip söner. Aynı anda en fazla iki balon, ikisi aynı anda başlamaz; oda zaten konuşuyorsa yeni gelen sadece gülümser.
- Mesaj (toast), titreşim ve büyük kart yalnızca oyuncunun yaptığı ya da kazandığı önemli şeyler için: satın alma, ödül, aşama, seviye.
- Hareketler yavaş ve yumuşak: hızlı titreşen, zıplayan, yanıp sönen göstergeler yerine hafif salınım. Süreler `src/ui/motion.ts`'de.
- Yeni bir özellik eklerken soru: "Bu, kafede sakin bir gün geçiriyormuş hissini artırıyor mu, yoksa bölüyor mu?"

## Dekorasyonun sabit yerleri

Her dekorasyonun kendi yeri var (`slot`, src/data/economy.js; konumlar src/scene/interior-layout.js DECOR_SLOTS). Satın alınınca hemen oraya konur;
taşıma, kaldırma ve depo yok. Böylece iki eşya hiçbir zaman üst üste gelmez. Sadece tema (Bahar / Kış) aynı anda bir tane açık olur ve Mağaza'dan değiştirilir.

- Koridor, yukarıdan aşağı: Sarkık Bitki → Kırmızı Yolluk → Bakır Lamba → Koridor Halısı → İkinci Bakır Lamba → kapı önünde Pati Paspası.
  Lambalar halıların arasındaki boşlukta durur, kabloları kısa ve solar.
- Sağ duvar panosu: Raflı Bitki (üst), Ekmek Rafı (alt). Bakır Tencere Askısı: yazı tahtası ile raflar arasında, geliştirme panosunun üstünde.
- Köşeler: Çiçekli Saksı (sol), Pembe Çiçekli Saksı (sağ).
- Masalar: Sade Masa Takımı masaları yeniler. Pastalı ve Fincanlı takımlar boş masaların üstünü süsler; ikisi de varsa masalar sırayla paylaşılır.
- 5. seviye görsellerin etrafındaki serbest parıltılar temizlendi (scripts/strip_sparkles.py): dört masa ve koridor aynı anda parıldayınca ekran yorucu oluyordu.
