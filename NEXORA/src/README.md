# src

Oyun kaynak kodu (vanilla JS, ES modülleri, HTML5 Canvas). Motor/framework yok.

```
src/
  main.js            giriş: veri + asset yükle, döngüyü başlat (requestAnimationFrame, delta time)
  core/              config.js (data/*.json yükleyici), assets.js, input.js, view.js, util.js
  game/              state.js (paylaşılan durum), systems.js (update mantığı)
  render/            renderer.js (çizim sırası), world.js, characters.js, effects.js, draw.js
  ui/hud.js          DOM HUD + Game Over
  styles/main.css
```

- Dünya modeli: her şey gezegen yüzeyinde **açı (radyan)** ile konumlanır; kamera yandan bakar, dev gezegenin yüzeyi ekranda yumuşak bir tepe görünür, kahraman solda durur (`core/view.js`, ayrıntı: `docs/README.md`).
- Arka plan: `render/parallax.js` (katmanlar `data/config.json → parallax`).
- Tüm sayısal değerler `data/config.json` ve `data/enemies.json` içindedir; kodda sabit yok.
- Yeni düşman: `data/enemies.json`'a kayıt ekle (çizim için `render/characters.js` → `drawEnemy`; sprite varsa otomatik kullanılır).
- Oyuncu animasyonu: `data/male_animations.json` + `game/systems.js` (durum makinesi: death > hurt > attack_1-3 kombo > run/idle) + `render/characters.js` (kare seç, pivot'a çiz). Sprite yoksa placeholder.
- Sprite: `Assets.get(anahtar)` varsa çizilir, yoksa Canvas placeholder. Anahtarlar `data/asset_manifest.json`'dan gelir.

## Çalıştırma
ES modülleri ve JSON `file://` ile çalışmaz; proje kökünde yerel sunucu aç:

```
cd NEXORA && python3 -m http.server 8080   # → http://localhost:8080
```
Kontrol: A/D veya ←/→; mobilde sol alttaki sabit joystick (ekranın sol %55'i). Oyun yalnızca yatay hedeflenir; dikey tutulursa duraklar ve çevirme uyarısı çıkar.
