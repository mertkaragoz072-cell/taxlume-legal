# docs

Tasarım ve teknik notlar.

## Sprite/animasyon standardı (görseller eklenirken uyulacak)
- Format: şeffaf PNG, `snake_case`, küçük harf, ASCII.
- Karakter/düşman kare boyutu: **256×256 px** (chibi; ayak hizası alt kenardan 16 px yukarıda).
- **Pivot:** ayakların orta noktası = `(128, 240)`. Çizim kodu bu noktayı yüzeye oturtur (`render/draw.js → onSurface`).
- Bakış yönü: **sağa**; sola dönüş kodda yansıtılarak yapılır (ayrı sol kare üretilmez).
- Kare sırası: `<anim>_01`, `<anim>_02`, … sıralı; sprite sheet kullanılırsa yanında `sheet.json` (kare adları, sıra, FPS, pivot).
- Önerilen FPS: idle 6, run 10, attack 14, hurt tek kare, death 10.
- Stil: kalın temiz outline (`#1f2a44`), canlı ama yumuşak renk, hafif cel-shading.
