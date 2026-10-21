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
- Üst arayüz: avatar + seviye/XP, altın, Görevler / Günlük Ödül / Ayarlar. Alt menü: Fırın & Kafe, Kasaba, Keşif. Henüz çalışmayan Posta, Mağaza, + butonları, elmas ve enerji göstergeleri gizlidir (`src/config.js` → `NAV`, `HUD_BUTTONS`, `HUD_SHOW`; elmas verisi ve kayıtlar korunur).
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
- Her gün ilk girişte panel kendiliğinden açılır; **Günlük Ödül** butonuyla da açılır (butonda ödül hazırken kırmızı nokta). Ödül alınınca bildirim çıkar.
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

## Adım 9: Kasaba ve bina açma

- **Kasaba** menü butonu (veya kapalı Kitapçı'ya dokunmak) Kasaba ekranını açar: Fırın & Kafe, Market, Kitapçı ve bir "Boş Arsa" (yakında). Durumlar: **Açık** (yeşil), **Açılabilir** (seviye yeterli) ve **Kilitli** (seviye yetersiz / henüz alınamaz). Her kartta koşullar ✓/✗ ile ve maliyet gösterilir. Fırın ve Market kartlarındaki "Git" mevcut ekranlara geçirir.
- Veri: `src/data/economy.js` → `TOWN` (binalar), `TOWN_UNLOCKS` (altın + minimum seviye, geliştirme basamakları), `TOWN_REWARDS` (XP ödülleri) ayrı tablolardır. Mantık `src/game/town.js`.
- **Kitapçı:** 5.000 altın + seviye 3 ile açılır (+150 XP). Açıldıktan sonra 2 geliştirme basamağı vardır: Raflar (3.000 altın, seviye 5, +100 XP), Okuma Köşesi (8.000 altın, seviye 8, +200 XP). Henüz ürün/gelir sistemi yoktur ve **hiç gelir üretmez**.
- Yetersiz altın/seviyede işlem engellenir, eksik koşul yazılır, altın düşmez. Açma tek adımdır; açık bina ikinci kez alınamaz, tekrar eden geliştirme dokunuşu reddedilir.
- Görev "Kasaba büyüyor" (bir bina aç) eklendi; XP, `Progression` üzerinden verilir (seviye atlama ödülleri dahil).
- Kayıt sürümü 7: `town {opened, levels}`. Eski kayıtlarda yalnızca Fırın ve Market açıktır. Fırın & Kafe ve Market ekonomisi değişmedi.

## Adım 10: Kitapçı araştırma merkezi

Kitapçı kitap satmaz; kalıcı bonus veren bir **araştırma merkezidir** (kitap satışı / stoğu / satın alması yoktur). Sokaktaki Kitapçı'ya dokununca veya Kasaba ekranındaki Kitapçı kartından ("Git" / "Görüntüle") Kitapçı ekranı açılır (Market ile aynı yatay düzen, "◀ Kitapçıdan Çık" ile geri dönülür). Kitapçı kapalıysa ekran açılma koşullarını (seviye, altın) ve "Kitapçı'yı Aç" butonunu gösterir.

Tüm sayılar `src/data/economy.js` → `RESEARCH` tablosundadır (maliyetler `costs`, bonuslar `values`; hepsi 5 seviye). Mantık `src/game/research.js`.

| Araştırma | Etki (5. seviyede) | Nerede uygulanır (tek yer) | Gereken Kitapçı gelişimi |
|---|---|---|---|
| Fırıncılık Bilgisi | üretim süresi −%25 | `Game.duration()` (hız yükseltmesiyle çarpılır) | – |
| Verimli Üretim | malzeme maliyeti −%25 | `Game.startProduction()`: tüketilen malzemelerin altın değerinin payı iade edilir (tarifler tam sayı kalır) | – |
| Usta Satıcı | satış geliri +%25 | `Game.saleIncome()` (vitrin ve müşteri teslimi; siparişte saklanan fiyat taban fiyat kalır) | – |
| Kasaba Kültürü | görev XP'si +%50 | `Progression.award('quest')` | 1 |
| Usta Ekipmanları | Fırın & Kafe yükseltmeleri −%25 | `Game.nextCost()` / `buyUpgrade()` (Kitapçı ve Market fiyatları etkilenmez) | 2 |

Maliyetler: 1.500–30.000 (Fırıncılık), 1.200–26.000 (Verimli Üretim), 2.000–40.000 (Usta Satıcı), 1.800–36.000 (Kasaba Kültürü), 2.500–48.000 (Usta Ekipmanları). Her satın alma XP verir (40 + 20 × seviye). Altın yalnızca başarılı satın almada düşer; tekrar dokunuş ve maksimum seviye reddedilir.

Kayıt sürümü 8: `research {levels}`. Eski kayıtlarda tüm araştırmalar 0. seviyedir. Açılma durumu Kitapçı'nın (kayıtlı) açık/gelişim seviyesinden türetilir.

## Adım 11: Keşif sistemi

- **Keşif** menü butonu (artık kilitsiz) harita ekranını açar: solda el çizimi tarzı parşömen harita (resim dosyası yok, canvas ile çizilir) ve bölge işaretleri, sağda her bölgenin açıklaması, gereken seviye/ilerleme, süresi ve olası ödüllerini gösteren panel. İşarete dokunmak ilgili kartı seçer. Geri butonu sokağa döner. Keşif ödülü hazırken menüdeki Keşif butonunda kırmızı nokta çıkar.
- Ayarlar `src/data/economy.js` → `EXPLORE` (süre, seviye, "önce şu bölgeyi bitir" koşulu, ödül aralıkları ve olasılıkları). Mantık `src/game/exploration.js`.

| Bölge | Seviye / koşul | Süre | Ödüller |
|---|---|---|---|
| Yeşil Çayırlar | 1 (başlangıçta açık) | 1 dk | 80–140 altın, 20–35 XP, un 2–4, yumurta (%50) |
| Orman Yolu | 4 + Çayırlar 1× | 5 dk | 300–520 altın, 60–95 XP, süt, şeker (%70), tereyağı (%40) |
| Eski Harabeler | 8 + Orman 1× | 15 dk | 900–1500 altın, 170–260 XP, tereyağı, çekirdek (%80), nadir 2–5 elmas (%40) |

- Aynı anda tek keşif; bitmiş ama alınmamış keşif de yeni başlatmayı engeller. Süre sistem saatiyle (`Date.now`) hesaplanır, oyun kapalıyken de ilerler; dönüşte "tamamlandı" bildirimi ve ödül butonu çıkar. Saat geri alınırsa sayım bugünden devam eder.
- Ödül keşif **başlarken** bir kez çekilir ve keşifle birlikte kaydedilir (yenilemek yeniden çekmez). Alma tek adımdır: altın / elmas / malzeme / XP mevcut oyuncu, envanter ve seviye sistemine eklenir, keşif silinir; ikinci dokunuş veya eski kimlikli istek reddedilir.
- Görev "Kaşif" (bir keşfi tamamla ve ödülü al) eklendi; görev XP'si Kasaba Kültürü araştırmasından yararlanır. Diğer araştırmalar (satış geliri, üretim süresi, yükseltme fiyatı) keşif ödülüne uygulanmaz çünkü keşif bunlarla ilgili bir sistem değildir.
- Kayıt sürümü 9: `exploration {active, done, nextId}`; eski kayıtlarda keşif yoktur.

## Kalite turu: Grup A + B

- Çalışmayan arayüz (Posta, Mağaza, `+`, enerji, elmas göstergesi) gizlendi; sahte kırmızı noktalar kaldırıldı. Kırmızı nokta yalnızca bekleyen görev ödülü / günlük ödül varken çıkar. "Etkinlik" düğmesi **Günlük Ödül** oldu.
- **Vitrin satışı** `src/data/economy.js` → `SALES.showcaseRate` (0.7) kadar öder; müşteri siparişi tam fiyat öder (müşteri ≈ %43 daha kârlı). Usta Satıcı bonusu ikisine de uygulanır.
- Okunabilirlik: arayüz yazıları ≥ 12 px, dokunma alanları ≥ 40 px; tuval etiketleri (kafe isim levhaları, sipariş balonları, harita) de ≥ 12 px ekran pikseli. Kısa yatay ekranlarda ikincil ipucu satırları gizlenir. Kafede sağ kenardaki "Geliştirmeler" gibi etiketler ekran içine alınır.

## Kalite turu: Grup C (ekonomi)

- **Vitrin / müşteri dengesi** (`economy.js` → `SALES.showcaseNetShare = 0.8`): vitrinden satış, malzeme maliyetini geri öder ve müşteri siparişinin **net** kârının %80'ini verir (≈ %20 daha az net). Ekmek 27 (net 11 / müşteri 14), kruvasan 54 (23 / 29), pasta 108 (48 / 60), kahve 31 (14 / 17). Fiyatlar ve maliyetler tek yerden (`PRODUCTS`, `INGREDIENTS`) okunur; Usta Satıcı bonusu her iki satışa da bir kez uygulanır.
- **Kahve** dengelendi: 16 sn, 34 altın (saniye başına net kâr 1,9 → 1,06; fırın ürünleri 0,70–0,80).
- **Keşif ödülleri:** süre arttıkça dakika başına ödül artar (altın ≈ 70 → 120 → 150, XP ≈ 18 → 24 → 30). Çayırlar 50–90 altın / 14–22 XP; Orman 450–750 / 100–140; Harabeler 1.800–2.700 / 400–500. Keşifte risk mekaniği yoktur; "risk" yalnızca uzun sürede başka keşif yapamamaktır.
- **Yuvarlama:** Verimli Üretim iadesi artık en yakın tam altına yuvarlanır (eskiden yukarı) ve malzeme maliyetini aşmaz. Satış / satın alma miktarları tam sayı olmak zorundadır (NaN, küsurat, negatif reddedilir). Altın değerleri hep tam sayıdır ve bildirimlerde binlik ayraçla gösterilir.
- **Boş Arsa** kartı Kasaba'dan gizlendi (veri duruyor, `hidden: true`).

## Kalite turu: Grup C-2 (kalan ekonomi riskleri)

- **Satış formülü** (`Game.unitEconomics`, tek hesap yeri): `müşteri = round(fiyat × (1 + Usta Satıcı))`, `maliyet = malzeme değeri − Verimli Üretim iadesi`, `müşteri net = müşteri − maliyet`, `vitrin = müşteri − round(müşteri net × (1 − 0,8))`. Yani vitrin, **araştırma bonusları uygulandıktan sonraki** net kârın %80'ini verir (her araştırma seviyesinde ±0,5 altın içinde). Vitrin satışı, müşteri teslimi, paneller ve sipariş çipleri aynı fonksiyonu kullanır; bonus yalnızca bir kez uygulanır.
- **Vitrin kapasitesi:** stok + devam eden üretim hiçbir yoldan (çoklu üretim, çevrimdışı tamamlanma, müşteri/vitrin satışı) kapasiteyi aşmaz; testle doğrulandı. Bir saatlik simülasyonda gelir, satış kanalından çok **üretim kapasitesi** tarafından sınırlanır (başlangıç ≈ 5k, orta ≈ 11k, tam yükseltme ≈ 30k altın/saat; müşteriyi hiç görmemek yalnızca %2–6 kayıp).
- **Araştırma geri ödemesi** (aktif üretimde, aşama başına ≈ 5 saat): Usta Satıcı 2.300 / 3.400 / 4.700 / 6.500 / 9.000 (eskiden 2.000–40.000), Verimli Üretim 1.300 / 2.000 / 2.800 / 3.900 / 5.400 (eskiden 1.200–26.000). Kayıtlı araştırma seviyeleri ve altın etkilenmez.
- **Seviye 10–30:** XP, seviye ve ödül hesapları parçalara ayrılmış her XP akışında, kayıt/yükleme sonrası ve maksimum seviyede doğrulandı; her seviye ödülü yalnızca bir kez verilir. Yeni ödül veya içerik eklenmedi.

## Kalite turu: Grup D (dayanıklılık)

- **Çok sekme koruması** (`src/game/tabguard.js`): en yeni sekme oyunun sahibi olur. Eski sekme durdurulur, kayıt yazmaz ve "Oyun başka bir sekmede açık" uyarısı gösterir; **Bu sekmede devam et** sahipliği geri alır ve en son kaydı yeniden yükler. Eski "başka sekmenin kaydını canlı birleştirme" davranışı kaldırıldı (müşteri ve üretim durumlarını karıştırıyordu).
- **Yükleme ekranı:** görseller yüklenirken ilerleme çubuğu görünür. Görsel eksik/yavaşsa (12 sn) oyun yedek çizimlerle başlar ve bildirim gösterir. Açılış hatasında boş ekran yerine "Yeniden yükle" mesajı çıkar; kayıt silinmez.
- **Beklenmeyen hatalar** sessizce bırakılmaz: 15 sn'de bir "ilerleme kayıtlı" bildirimi gösterilir.
- **Hata ayıklama kancası** (`window.__street`) yalnızca `localhost`/`127.0.0.1` üzerinde veya `?debug` ile açılır; yayında kapalıdır.

## Testler (Grup E)

- **Birim testleri:** `npm test` — oyun mantığı, ekonomi, kayıt, sekme koruması, varlık yükleme (DOM gerektirmez, saniyeler içinde biter).
- **Tarayıcı testleri:** `npm run test:e2e` — gerçek tarayıcıda tüm ekranlar × 4 telefon boyutu (taşma, ≥ 40 px düğme, ≥ 12 px yazı, konsol hatası), çekirdek oyun döngüsü, ilerleme sistemleri ve dayanıklılık senaryoları. Proje bağımlılığı eklenmez; Playwright ve Chromium yolu ortam değişkenleriyle verilir. Ayrıntı: `tests/e2e/README.md`.
- Her kalite turu sonunda ikisi de çalıştırılır; ekran boyutu/okunabilirlik regresyonlarını yalnızca e2e yakalar.

## Asset turu: kullanılmayan prop'lar ve kafe iç mekânı hazırlığı

- `assets/props/` içindeki 26 prop'un tamamı artık yüklenir (`PROPS` listesi, `src/assets.js`). Sokakta: taş ve altın bariyerler, saksılar, fıçılı çiçek, orta plandaki bina diplerinde (`midground.js` → `STREET_PROPS`). Market ekranında: çeşme, kasalar, fıçılar, el arabası; Kitapçı ekranında: üçlü lamba, ahşap bank, mavi/yeşil saksılar, tahta, kovalar (`src/scene/scene-props.js`).
- Kafe iç mekânı için "bırak ve çalışsın" altyapı: `assets/interior/README.md` ve `INTERIOR_ART`. Bir parça dosyası eklenip adı listeye yazılınca sahne kodla çizileni bırakır, görseli kutusuna oturtur; fırın ateşi ve vitrin stoğu üstüne çizilmeye devam eder.

## Kafe iç mekânı yerleşimi (derinlik planı)

Tek zemin, basamak yok; arkadan öne (`src/scene/interior-layout.js`): **arka duvar** (`FLOOR_Y` çizgisi; fırın ve depo duvara yaslı, tabela duvarda, raflar ve lambalar `decor()`), **mutfak zemini** (fırıncı `STAFF_LANE_Y`'de duvarla tezgâhlar arasında çalışır; tezgâhlar alt gövdesini örter, baş ve omuzları görünür), **servis hattı** (üretim tezgâhı, vitrin, kahve makinesi; ön kenarı `COUNTER_Y`), **müşteri zemini** (müşteriler vitrinin önünde `SERVICE_LINE_Y`'de bekler, garson `WAITER_LANE_Y`'de yalnızca salonda gezer, en önde masalar) ve **ön katman** (halı, büyük bitkiler). Çizim sırası `DRAW_ORDER`. Fırıncı `src/scene/interior-staff.js`'te dekoratiftir (mantık/kayıt yok). Garson (`assets/characters/waiter.webp`, 8 kare yürüyüş) yalnızca salonda (`WAITER_LANE_Y`) rastgele gezer; dekoratiftir.

## Oyun hissi turu (ışık, gölge, derinlik, canlılık)

- **Ortak renk derecelendirmesi** (`gradeScreen` in `src/util.js`): tüm ekranlarda (sokak, kafe, Market/Kitapçı, Keşif) en sonda sıcak bir çarpım tonu, vinyet ve alt kenarda hafif kararma; farklı çizilen parçaları tek bir ışık altında birleştirir.
- **Kafe:** tavana doğru kararan duvar, zemin tonunun sakinleştirilmesi (çarpım), duvar-zemin birleşiminde ve tezgâh önlerinde temas gölgesi, her mobilyanın altında geniş yumuşak + sıkı koyu gölge (ışık sol üstten), lamba ışık havuzları, ışıkta süzülen toz, vitrin camında periyodik parlama, boştaki fırında kor ışığı, çalışan kahve makinesinde buhar, ön plan bitkilerinde hafif bulanıklık (derinlik netliği), bekleyen karakterlerde nefes alma hareketi.

## Karakter ölçüleri

Sokak karakterleri `SCALE` (0,78 → 0,9, `src/characters/sprites.js`) ile ~%15 büyüdü. Kafede insanlar mobilyalarla orantılı olsun diye ayrıca `PERSON_SCALE = 1,4` (`src/scene/interior-layout.js`) ile çizilir: misafir ≈ 205 px, tezgâh 150 px, sandalye ≈ 130 px. Sipariş balonları, tıklama alanı, kuyruk (`SERVICE_LINE_Y`) ve garson hattı bu ölçüye göre ayarlıdır; vitrinin stok ikonları kuyruktaki başların üstünde kalacak şekilde yukarı alındı.

## Ürün ve malzeme ikonları

10 ikon (`assets/icons/<id>.webp`, 256 px: ekmek, kruvasan, pasta, kahve, un, tereyağı, şeker, yumurta, süt, çekirdek; `ICON_IDS` in `src/assets.js`). Oyun verisi (`economy.js`) düz emoji tutar (yedek/test); `src/ui/icon-swap.js` bir MutationObserver ile arayüzdeki ürün/malzeme emojilerini (paneller, bildirimler, çipler, tarifler) resimle değiştirir, kafe sahnesi (`drawIcon`) vitrin, sipariş balonu, üretim çubuğu ve "+1" belirtilerinde resmi çizer. Yeni bir ürün eklenirse ikon adı `ICON_IDS`'e yazılır; ikon yoksa emoji görünmeye devam eder.

## Currency / status icons

`assets/icons/` also holds ten UI pictures: `coin, xp, gem, gift, lock, timer, check, arrow, basket` (`UI_ICON_IDS` in `src/assets.js`).
`src/ui/icon-swap.js` maps 💰 ✨ 💎 🎁 🔒 ⏱ ✅ ⬆️ 🛒 🧾 to them in every panel/toast; the HUD coin, the "+N" sale pops, the upgrades sign and the Keşif lock/gift badges use them on canvas.
`drawIcon` keeps the picture's aspect ratio. Game data still holds the emoji (fallback).

## Cafe tables (crowd grows with upgrades)

New upgrade **Kafe masaları** (`UPGRADES.cafeTables`, costs 1.800 / 6.500): the cafe starts with 2 tables and gets a 3rd and 4th (the interior has room for 4, `CAFE.tables`).
Arrival gaps scale with the open tables (`CAFE.baseTables` = 2 tables → 26–42 s; 4 tables → half that), so more tables mean proportionally more guests.
Tables open in the order Masa 1, 2, 3, 4 (middle first). Old saves load at level 0; no progress is lost.

## Airy cafe interior (camera and layout)

The interior camera is zoomed out (`CAM` in `interior-layout.js`: zoom 0.8, centred on world x 718, floor front edge 64 px above the screen bottom), so the room has air on both sides and more wall/floor shows. Everything still works in world coordinates; `InteriorScene.toWorld/toScreen` convert pointer positions, and the e2e `tapDesign` helper uses them inside the cafe.
Layout, back to front: oven, prep counter, showcase, coffee station and storage in a row against the wall (~80 px apart); an open corridor (waiter lane y 535, guests' service line y 565); the tables (up to 4, 100 px of floor between them) at the front on the same floor.
Guests walk along the service line and only turn into a table gap when level with it (no cutting across tables); the waiter shows only while there are guests; a new guest never has the same look as someone already inside.
Name tags appear only for the selected/pressed area; machine progress bars are small and sit on top of the object. The order chips no longer wrap into a second row.

## Colour palette (art-direction standard)

`src/palette.js` is the single source: six base colours (cream #F5E6C8, vanilla #E8D2A8, honey #C99A61, terracotta #B85F3B, dark brown #795238, soft green #7D9855) plus tones mixed from them (`paper`, `creamLight`, `honeyLight/Dark`, `terracottaLight/Pale/Dark`, `brownDark` = text/outline ink, `greenLight/Pale/Dark/Deep`).
Canvas code uses `PAL.<token>`; CSS uses `var(--<token>)` (the palette block in the `:root` of style.css is generated from the file and `tests/palette.test.js` fails if they drift).
Use: walls cream/vanilla, floor and wood honey, oven/accents/warnings terracotta, progress and positive buttons soft green, text and outlines dark brown. Characters, food, item icons and the supplied art keep their natural colours; the scene only grades them (cream wall wash, vanilla/honey floor wash, softer vignette, brown shadows).

### Upgrade, research and quest icons

`u-oven, u-speed, u-showcase, u-tables` (🔥 ⚡ 🗄️ 🪑), `r-knowledge, r-efficient, r-seller, r-culture, r-equipment` (📖 🧺 🏷️ 🎭 🛠️) and `q-target, q-line, q-explorer` (🎯 🏭 🧭) are swapped in by `icon-swap.js` wherever those emoji appear (matching ignores the U+FE0F variation selector).

### Places, regions and order-bar icons

`b-bakery, b-market, b-bookshop, b-plot` (the Kasaba cards use them directly), `r-meadow, r-forest, r-ruins` (🌿 🌲 🏛️ in Keşif), `o-guests, o-waiting, o-order` (👥 ⏳ 🧾 in the order bar and quests). The supplied sheet had a baked-in chequerboard; it was removed by flood-filling the neutral grey from the edges (and the enclosed pockets of the crane and the hourglass).

### HUD and menu pictures

`hud-quests, hud-events, hud-settings, hud-avatar, nav-cafe, nav-town, nav-explore, hud-back` replace the old SVGs (`src/ui/icons.js` now builds them with `pic(name)`), including the back button's arrow.

### App icon

`assets/app/logo.webp` is the transparent logo on the loading screen. `assets/app/` also holds the app icon (1024 master, 512/192 for the manifest, 180 apple-touch, 48/32 favicons), cut from the supplied artwork with its rounded frame removed (the platforms round the corners themselves). `manifest.webmanifest` + the `<link>`s in index.html make it installable with the right icon, name and colours.
