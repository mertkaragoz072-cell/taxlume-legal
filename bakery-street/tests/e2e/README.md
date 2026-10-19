# Tarayıcı (uçtan uca) testleri

Gerçek tarayıcıda oyunu açıp arayüz üzerinden dener. `npm test` (birim testleri) bunları **çalıştırmaz**; ayrı komutla çalışır:

```sh
PLAYWRIGHT_MODULE=/yol/playwright CHROMIUM_PATH=/yol/chromium npm run test:e2e   # hepsi
npm run test:e2e -- gameplay                                                       # tek dosya
```

- Projeye bağımlılık eklenmez. Playwright çalışma anında aranır (`PLAYWRIGHT_MODULE`, yoksa `import 'playwright'`); `npm i -D playwright` kendi makinende yeterlidir. `CHROMIUM_PATH` boşsa Playwright'ın kendi Chromium'u kullanılır.
- Sunucuyu kendisi başlatır (Node `http`, port otomatik). Testler `window.__street` hata ayıklama kancasını kullanır; bu kanca `localhost` üzerinde açıktır.
- Dosyalar: `smoke` (tüm ekranlar × 4 telefon boyutu: taşma, ≥ 40 px düğme, ≥ 12 px yazı, konsol hatası), `gameplay` (üretim, vitrin ve müşteri satışı, Market, yükseltme, görev, günlük ödül, yeniden yükleme, onaylı sıfırlama), `progress` (XP/seviye, Kasaba, araştırma, keşif), `durability` (yükleme ekranı, görsel hatası, tek sekme sahipliği, hata ayıklama kancası).
