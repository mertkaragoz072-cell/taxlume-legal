# assets / logo

Oyun adı **CLASHBORN**. Eski "NEXORA" yazılı logo (`nexora_logo.png`) kaldırıldı; seçim ekranında şimdilik CSS ile çizilen altın yazı logosu kullanılıyor (`index.html → .sel-logo`, `src/styles/main.css`).

- Yeni resmî logo gelince: şeffaf PNG olarak buraya `clashborn_logo.png` koy, `data/asset_manifest.json`'a ekle, `index.html`'deki `<div class="sel-logo">` yerine `<img class="sel-logo" src="assets/logo/clashborn_logo.png" alt="CLASHBORN">` yaz.
- Uygulama ikonu (`assets/app_icon/`) da eski logoyu içerir; yeni ikon 1024×1024, alfa kanalsız PNG olmalı (bkz. `app_icon/README.md`).
