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
