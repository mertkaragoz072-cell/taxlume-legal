# Fırın & Kafe — Ana Sokak (Adım 1 / 1.1)

Yatay (landscape) mobil oyunun ana sokak ekranı. HTML5 Canvas + vanilla JS (ES modules) + CSS; bağımlılık ve build adımı yok.

## Çalıştırma

ES modülleri `file://` ile çalışmaz, bu yüzden küçük bir statik sunucu gerekir:

```bash
cd bakery-street
python3 -m http.server 8765     # veya: npx serve .
# tarayıcıda http://localhost:8765 — telefonda aynı ağdan <bilgisayar-ip>:8765
```

Telefonu yatay tutun (dikeyde "yatay çevirin" uyarısı görünür).

## Dosya yapısı

| Yol | Görev |
| --- | --- |
| `index.html`, `style.css` | Sayfa, HUD/menü stilleri, dikey ekran uyarısı |
| `src/main.js` | Canvas boyutlandırma, ana döngü, dokunma girişi, UI bağlama, `enterScene()` kancası |
| `src/config.js` | Tasarım ölçüleri (1400×800), metinler, geçici oyuncu verisi, menü tanımları |
| `src/assets.js` | Görsel kaydı (`MANIFEST`); gerçek PNG yolu yazılınca prosedürel çizimin yerine geçer |
| `src/scene/street-scene.js` | Katmanlı sahne, animasyon, bina hit-test ve dokunma efekti |
| `src/scene/backdrop.js` · `pavement.js` · `midground.js` · `foreground.js` · `sides.js` | Gökyüzü/kasaba, kaldırım, ön plan, yan binalar |
| `src/scene/structure.js` · `plants.js` · `furniture.js` · `goods.js` · `signs.js` (`parts.js` hepsini toplar) | Çatı/duvar/vitrin/tente, çiçek-saksı, lamba-bank, market ürünleri, tabelalar |
| `src/buildings/bakery.js` · `bookshop.js` · `market.js` | Üç bina (her biri kendi `draw`, `bounds`, `lights`) |
| `src/characters/person.js` · `crowd.js` | Karakter çizimi, yürüyenler, garson, masadaki müşteriler |
| `src/ui/hud.js` · `nav.js` · `icons.js` · `toast.js` | Üst arayüz, 4 butonlu alt menü, SVG ikonlar, bildirim |
| `src/data/economy.js` | **Tüm denge sayıları**: malzemeler, ürünler (süre, tarif, fiyat), istasyonlar, başlangıç stoğu |
| `src/game/game.js` | Üretim / stok / altın mantığı (DOM'suz, Node'da test edilir) |
| `src/scene/interior-scene.js` · `interior-layout.js` | Fırın & Kafe iç mekânı ve alan yerleşimi |
| `src/ui/panels.js` | Üretim, vitrin (satış) ve depo (malzeme alma) paneli |
| `src/game/customers.js` | Müşteri, masa ve sipariş mantığı (DOM'suz, testli) |
| `src/scene/interior-customers.js` | Müşterilerin sahnedeki görünümü (yürüme, balon) |
| `src/ui/orders.js` | Sol alttaki sipariş çubuğu (sayaçlar + teslim butonları) |
| `src/scene/market-scene.js` · `src/ui/market.js` | Market ekranı ve alışveriş listesi |
| `tests/game.test.js` | Mantık testleri (`npm test`) |

## Çalışan özellikler

- Sahne açılır açılmaz canlı: bulutlar, 3 yürüyen karakter, garson, kahve buharı, titreyen lamba ışıkları.
- Ölçekleme: 1400×800 tasarım alanı ekrana sığdırılır; uzun telefonlarda yan taraflar ek dükkânlarla, tabletlerde üst taraf gökyüzüyle dolar. 667×375, 844×390, 915×412, 1180×820 ve 2400×1080'de test edildi (taşma ve konsol hatası yok).
- Fırın & Kafe'nin **tamamı** (çatıdan basamağa) dokunulabilir: basılınca hafif küçülür, bırakınca yaylanır, parlar, kıvılcım çıkar ve "Kafe iç mekânı yakında!" bildirimi görünür. Alt menüdeki "Fırın & Kafe" aynı geri bildirimi verir.
- Üst arayüz: avatar + seviye/XP, altın, elmas, enerji (+ butonlarıyla), Görevler/Posta/Etkinlik/Ayarlar. Alt menü: yalnızca Fırın & Kafe, Kasaba, Keşif, Mağaza; diğer üçü şimdilik "Yakında" der.
- Kafe iç mekânına geçiş için `main.js` içindeki `enterScene('cafe')` kancası hazır (sahne arayüzü: `resize / update / render / hitTest`).

## Geçici (placeholder) görseller

Tamamı kodla çizilmiştir: binalar, çatılar, tabelalar, ürünler, karakterler, uzak kasaba, ağaçlar, kaldırım ve tüm SVG ikonlar (`ui/icons.js`, avatar dahil). Gerçek görseller `assets/` altına konup `src/assets.js` içindeki `MANIFEST` yolları doldurularak (bakery, bookshop, market, town-backdrop) değiştirilebilir; ikonlar için `icons.js` içindeki SVG'ler `<img>` ile değiştirilebilir.

## Bilinçli olarak yapılmayanlar

Kafe iç mekânı, üretim sistemi, market satın alma ve şehir geliştirme bu aşamada yok.

## 1.1 görsel iyileştirmeler

- Çatılarda kiremit başına gölge/ışık, sundurma tahtaları ve saçak gölgesi; taş duvarda tek tek eğimli tuğlalar, köşe taşları, ahşapta damar ve çivi; vitrinlerde cam yansıması, perde saçağı, pervaz; tentelerde kıvrım gölgesi; ayrıntılı kapılar ve tabelalar.
- Karakterler yeniden çizildi (gözler, kaşlar, saç stilleri, gözlük, kıyafet detayları); yürüyenler, garson, dükkâncı ve masadaki müşteriler birbirinden ayırt edilir.
- Kaldırım taşları eğimli/lekeli, ağaç gölgeleri, çiçekler gerçek taç yapraklı, ayrıntılı saksı/bank/lamba.
- Alt menü ~%15 alçaltıldı, üst çubuk sıkılaştırıldı (667×375 … 2400×1080 ve 1024×768'de hiçbir öğe taşmıyor).
- Fırın & Kafe dokunma geri bildirimi: yaylanma + parlama + genişleyen halka + kıvılcım + bildirim.

## Adım 2: iç mekân ve üretim

- Sokakta Fırın & Kafe'ye (veya alt menüdeki Fırın & Kafe'ye) dokununca kısa bir geçişle iç mekân açılır; sol altta **◀ Sokak** ile dönülür. Diğer binalar değişmedi.
- İç mekânda ayrı alanlar: **Fırın**, **Üretim Tezgâhı**, **Satış Vitrini**, **Kahve Makinesi**, **Depo** ve 3 **Masa** (masalar yalnızca yerleşim; müşteri sistemi sonraki adım).
- Ürünler: Ekmek, Kruvasan, Pasta (fırın), Kahve (kahve makinesi). Her makine aynı anda tek iş yapar. Üretim başlarken malzeme düşer, süre bitince ürün stoğa girer; kalan süre hem panelde hem makinenin üstünde görünür.
- Malzeme yetmezse veya makine meşgulse üretim başlamaz, açık bir uyarı çıkar. Depo'dan malzeme altınla alınır; vitrinden ürün satılınca altın artar. Altın üst çubukta anlık güncellenir.
- Sayıları değiştirmek için yalnızca `src/data/economy.js`.

Test: `npm test` (14 mantık testi, bağımlılık yok). Oynanış akışı tarayıcıda Playwright ile de denendi.

Henüz yok (bilerek): müşteri yapay zekâsı, otomatik satış, kasaba genişletme, yükseltmeler, kayıt/yükleme (ilerleme sayfa yenilenince sıfırlanır). İç mekân görselleri geçici, kodla çizilmiştir.

## Adım 2.1: kayıt sistemi

Kalıcı kaydedilenler (tarayıcı `localStorage`, anahtar `bakery-street:save`, sürüm 1):
- altın,
- tüm malzeme stokları,
- tüm ürün stokları,
- devam eden üretimler (hangi ürün + **gerçek başlangıç zamanı**).

Her işlemden sonra (üretim başlatma, tamamlama, satın alma, satış) otomatik kaydedilir; sayfa gizlenince/kapanınca ayrıca kaydedilir. Zaman `Date.now()` ile hesaplanır: uygulama kapalıyken de üretim ilerler, açılınca biten ürünler stoğa eklenir ve "Sen yokken hazırlananlar" bildirimi çıkar. Üretim süresi kayda yazılmaz, ürün tablosundan okunur.

Güvenlik: kayıt anlık bir görüntüdür (malzeme düşme + üretim aynı anda yazılır), bu yüzden bir üretim iki kez tamamlanamaz ve malzeme iki kez düşmez. Yazma hatasında oyun devam eder, kırmızı bir uyarı gösterilir ve sonraki işlemde yeniden denenir. Bozuk kayıt `bakery-street:save.corrupt` anahtarına yedeklenir ve oyuncuya bildirilir; yedeklenemezse veya kayıt daha yeni sürümdense üzerine yazılmaz. Başka sekmede yapılan kayıt otomatik alınır.

Bilinen sınır: cihaz saati ileri alınırsa üretim hızlanır (sunucu olmadığı için engellenemez). Saat geri alınırsa üretim durmaz, geri sayım şimdiden yeniden başlar.

## Adım 3: müşteri, sipariş ve satış

- **Müşteriler** (yalnızca iç mekân açıkken; ayrıntı aşağıda 3.1) `src/data/economy.js` içindeki `CAFE` ayarına göre 14–26 sn arayla gelir (ilk müşteri ~4 sn sonra). 3 masa vardır; boş masa yoksa en fazla 3 kişi girişte sırada bekler (⏳), masa boşalınca sırayla oturur. Sabırları biterse (kuyrukta 45 sn, sipariş için 100 sn) ödemeden ayrılır, siparişi iptal olur, masa boşalır.
- **Sipariş:** oturan müşteri ekmek, kruvasan, pasta veya kahveden birini ister (ağırlıklar ayarlanabilir). Her siparişte ürün, o anki fiyat ve durum (`open` / `paid` / `cancelled`) tutulur. Müşterinin üstünde ürün + fiyat + sabır çubuğu balonu görünür; stokta yoksa kırmızı ve "stok yok" yazar.
- **Satış:** müşteriye (veya sol alttaki sipariş çubuğundaki düğmeye) dokununca teslim edilir: stok −1, altın +fiyat, sipariş `paid`, müşteri ayrılır, masa boşalır. Stok yoksa satış olmaz ("Stokta Ekmek yok. Önce üret."). Bu tek adımda yapılır; aynı sipariş ikinci kez satılamaz/ödenmez.
- **Görünürlük:** sol altta `👥 müşteri · ⏳ bekleyen · 🧾 açık sipariş` sayaçları ve her sipariş için bir düğme (açık yeşil = stok var, kırmızı = stok yok). Bu çubuk yan panellerin dışında olduğu için üretim paneli açıkken de kullanılabilir.
- **Kayıt (sürüm 2):** müşteriler, masalar ve siparişler de kaydedilir. Uygulama kapalıyken müşteri simülasyonu çalışmaz ve beklerken geçen süre sabra yazılmaz; açılışta tutarsız kayıtlar (geçersiz ürün, aynı masada iki kişi, ödenmiş siparişi bekleyen müşteri, sahipsiz sipariş…) onarılır ve oyuncuya bildirilir. Sürüm 1 kayıtları boş kafe ile yüklenir.
- **Geçici görseller:** müşteriler mevcut yürüme sprite'larıdır (oturma karesi yok, masanın yanında ayakta dururlar).

Test: `npm test` (50 test).

## Adım 3.1: müşteri döngüsü düzeltmeleri

- Müşteri gelişleri, sipariş süreleri ve sabır sayaçları **yalnızca iç mekân açıkken** ilerler (`Cafe.setActive`). Sokağa dönünce her şey donar; geri girince kaldığı yerden devam eder (geçen süre için toplu müşteri üretilmez, sabır azalmaz). Uygulama sokak ekranında açılır ve kafe duraklıdır; duraklama durumu kaydedilmez.
- Masa doluluğu müşterilerden türetilir: bir masada en fazla bir müşteri olur ve ayrılınca masa hemen boşalır (rastgele 900 adımlık benzetim testi bunu her adımda doğrular).
- Görsel: oturan müşteri masanın solunda durur, kuyruk girişte (sağda) ayrı noktalardadır; konumlar `interior-layout.js` içinde testlidir.
- Satış, stok ve altın mantığına dokunulmadı.

## Adım 4: Market ve malzeme envanteri

- Sokakta **Market** binasına dokununca Market ekranı açılır (kısa geçişle); sol altta **◀ Marketten Çık** ile sokağa dönülür. Kitapçı hâlâ pasiftir.
- Ürünler: un, süt, yumurta, şeker, kahve çekirdeği ve **tereyağı** (kruvasan ve pasta tarifleri tereyağı kullandığı için eklendi; listeden çıkarmak `src/data/economy.js` → `MARKET.items`). Her satırda fiyat, mevcut stok, alınabilir miktar, hangi tarifte kaç adet kullanıldığı, − / + miktar seçici, hazır 1·5·10 düğmeleri ve toplam fiyatlı **Satın Al** düğmesi vardır.
- Satın alma `Game.purchase` ile tek adımda yapılır: altın −fiyat×miktar, stok +miktar. Altın yetmezse hiçbir şey değişmez ve "Yetersiz altın: X gerekli, Y var." çıkar; düğme kırmızıya döner. Hızlı çift/üçlü dokunuş tek satın alma sayılır (arayüz kilidi + tekrar edilen istek kimliği engeli).
- **Tek envanter:** Market, Depo paneli ve üretim aynı `game.ingredients` nesnesini kullanır; ayrı stok yoktur. Tarifler Market'ten alınan malzemeyle çalışır, eksik malzemede üretim başlamaz ve hiçbir şey düşmez.
- Altın ve stok, mevcut kayıt sistemiyle (her işlemde) kalıcıdır.
- Depo paneli (iç mekân) duruyor; aynı envantere bağlı olduğu için çakışma yoktur.

Test: `npm test` (75 test).

## Adım 5: Fırın & Kafe geliştirmeleri

İç mekânda sağ üstteki **Geliştirmeler** tabelasına dokununca panel açılır (ad, seviye, şimdiki ve sonraki seviye etkisi, altın maliyeti, **Geliştir** ve **◀ Geri** düğmeleri). Üç geliştirme, her biri 5 satın alınabilir seviye (sayılar `src/data/economy.js` → `UPGRADES`):

| Geliştirme | Seviye 0 → 5 etkisi | Maliyetler (altın) | Gerçek etkisi |
| --- | --- | --- | --- |
| 🔥 Fırın kapasitesi | aynı anda 1 → 2 → 3 → 4 → 5 → 6 ürün | 800 · 2.500 · 6.000 · 12.000 · 25.000 | Fırın aynı anda bu kadar iş yürütür (kahve makinesi 1 kalır); her iş kendi sayacı ve malzemesiyle |
| ⚡ Üretim hızı | süre ×1 → .9 → .8 → .7 → .6 → .5 | 600 · 2.000 · 5.000 · 10.000 · 22.000 | Tüm ürünlerin hazırlanma süresi çarpılır; başlamış işler eski süresini korur |
| 🗄️ Satış vitrini | her üründen 10 → 15 → 20 → 30 → 40 → 60 adet | 400 · 1.200 · 3.000 · 7.000 · 15.000 | Stok (+ hazırlanmakta olanlar) sınıra ulaşınca üretim başlamaz ("Vitrin dolu…"); sınırın üstündeki mevcut stok silinmez |

Güvenlik: altın yalnızca başarılı satın almada düşer; yetmezse hiçbir şey değişmez; son seviyede düğme devre dışıdır; düğme gördüğü seviyeyi gönderir, seviye değiştiyse işlem reddedilir (çift dokunuş tek seviye alır) ve istek kimliği tekrarı yok sayılır. Seviyeler, altın, stok ve çok işli üretim kayıtla birlikte kalıcıdır (kayıt sürümü 3; eski kayıtlar otomatik taşınır).

Test: `npm test` (103 test).

## Adım 6: görevler ve ödüller

- Üst menüdeki **Görevler** butonu her ekranda bir panel açar (görev adı, koşul, ilerleme çubuğu `n/hedef`, ödül). Tamamlanan görevde **Ödülü Al** çıkar; ödül alınınca düğme "✓ Alındı" olur ve görev listenin sonuna iner. Ödül bekleyen görev varken butonda kırmızı nokta görünür; görev tamamlanınca bildirim çıkar.
- Görevler (`src/data/economy.js` → `QUESTS`): ilk ekmeği üret · ilk ürünü sat · Market'ten malzeme al · toplam 5 ürün sat · bir geliştirme al · toplam 10 ürün üret. Ödüller altın ve/veya malzemedir (ör. 100 altın; 150 altın + 4 un).
- **Olaylara bağlı:** ilerleme, oyunun kalıcı ömür boyu sayaçlarından (`Game.stats`: üretilen/satılan ürün, Market alımı, geliştirme) hesaplanır. Üretim tamamlanması, vitrinden satış, müşteri teslimi, Market alımı ve başarılı geliştirme bu sayaçları kendi işlemiyle birlikte (aynı kayıtta) artırır; reddedilen işlem saymaz. Depo'dan alınan malzeme "Market" görevine sayılmaz.
- **Ödül toplama** tek adımdır (işaret + altın + malzeme, aynı altın ve envanter); ikinci kez alınamaz, yenilemeden sonra da alınamaz. Sayaçlar ve alınan ödüller kayıt sürümü 4 ile kalıcıdır; eski kayıtlar sıfır sayaçla yüklenir.

Test: `npm test` (126 test).

## Adım 7: günlük ödül ve ayarlar

**Günlük ödül** (`src/data/economy.js` → `DAILY`, mantık `src/game/daily.js`):
- Her gün ilk girişte panel kendiliğinden açılır; **Etkinlik** butonuyla da açılır (butonda ödül hazırken kırmızı nokta). Ödül alınınca bildirim çıkar.
- 7 günlük döngü: 1) 200 altın · 2) 6 un + 3 süt · 3) 300 altın · 4) 5 elmas · 5) 3 tereyağı + 3 şeker + 4 yumurta · 6) 500 altın · 7) 20 elmas + 1000 altın. Altın, elmas ve malzeme mevcut altın / elmas / envanter verisine eklenir (elmas artık kalıcıdır ve üst çubuktaki sayıyı günceller).
- **Aynı gün ikinci kez alınamaz.** Gün, cihazın yerel takvim tarihidir (gece yarısı değişir; yaz saati uygulaması gün hesabını bozmaz).
- **Kaçırılan gün kuralı:** son ödülden ertesi gün gelirsen döngü bir sonraki güne geçer (7. günden sonra 1. gün); bir veya daha fazla takvim günü atlarsan döngü **1. günden yeniden başlar** (panel bunu açıkça yazar). Tarih bir gün geri giderse (saat dilimi) bugün alınmış sayılır; birden fazla gün geri giderse (saat elle değiştirildi) oyuncu kilitlenmesin diye ödül yeniden açılır ve döngü 1. günden başlar.
- Son ödül tarihi ve döngü günü kayıtla (sürüm 5) birlikte tek anlık görüntüde saklanır.

**Ayarlar** (Ayarlar butonu → panel, `src/game/settings.js`): ses efektleri, müzik, titreşim aç/kapat. Ayrı bir anahtarda (`bakery-street:settings`) saklanır; ilerleme sıfırlansa bile korunur. Ses, tarayıcıdaki WebAudio ile üretilir (dosya yok); tarayıcı kuralı gereği ilk dokunuştan sonra başlar. Titreşim desteklemeyen cihazda düğme devre dışıdır ve hata oluşmaz.
- **İlerlemeyi sıfırla** her zaman iki adımlı onay ister ("Emin misin?" → "Evet, sıfırla" / "Vazgeç"); eski kayıt `bakery-street:save.before-reset` anahtarına yedeklenir, yedek yazılamazsa sıfırlama yapılmaz. Ayarlara dokunmaz.

Test: `npm test` (162 test; tarih testleri UTC, İstanbul, New York, Auckland, Lord Howe saat dilimlerinde de çalıştırıldı).

## Adım 8: oyuncu seviyesi ve XP

Ayarlar `src/data/economy.js` (`XP`, `LEVELS`, `LEVEL_REWARD`), mantık `src/game/progression.js`.
- **XP kaynakları:** üretim tamamlanınca (ekmek 5, kruvasan 8, pasta 20, kahve 4), her başarılı satışta adet başına (3 / 5 / 12 / 3; vitrin ve müşteri teslimi), görev ödülü alınınca (40; "10 ürün üret" 80), yükseltme satın alınca (50 + 25 × alınan seviye). Başarısız / reddedilen işlem XP vermez.
- **Gereken XP:** seviye L → L+1 için `100 + 50·(L−1) + 10·(L−1)²`. Maksimum seviye 30; orada XP durur. Tek eylemle birden çok seviye atlanabilir, her seviye ödülü ayrı ayrı verilir.
- **Seviye ödülü** (bir kez): `100 + 50·(seviye−1)` altın; her 3. seviyede ayrıca 4 un + 2 süt + 2 yumurta. Ödül `rewardedLevel` ile korunur, aynı seviye ikinci kez ödeme yapmaz. Birden çok seviye tek bildirimde özetlenir.
- Üst çubukta "Lv. N", XP çubuğu ve "xp / gereken" yazısı bulunur.
- Kayıt sürümü 6: `progression {level, xp, rewardedLevel}`. Eski kayıtlar 1. seviye, 0 XP ile açılır (mevcut ilerleme silinmez). Geçersiz değerlerde kayıt bozuk sayılır ve yedeklenir.

| Seviye | Sonraki için XP | Toplam XP |
|---|---|---|
| 1→2 | 100 | 100 |
| 2→3 | 160 | 260 |
| 3→4 | 240 | 500 |
| 4→5 | 340 | 840 |
| 5→6 | 460 | 1300 |
| 6→7 | 600 | 1900 |
| 7→8 | 760 | 2660 |
| 8→9 | 940 | 3600 |
| 9→10 | 1140 | 4740 |
| 10→11 | 1360 | 6100 |
| 15→16 | 2760 | 16900 |
| 20→21 | 4660 | 36200 |
| 25→26 | 7060 | 66500 |
| 29→30 | 9340 | 100340 |

Test: `npm test` (191 test).
