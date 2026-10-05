# docs

Tasarım ve teknik notlar.

## Sprite/animasyon standardı (görseller eklenirken uyulacak)
- Format: şeffaf PNG, `snake_case`, küçük harf, ASCII.
- Karakter kare boyutu: **224×176 px** (erkek karakter sheet'inden; kare başına ortak tuval). Düşmanlar için ayrı ölçü belirlenecek.
- **Pivot:** ayakların orta noktası = `(112, 164)` (alttan 12 px yukarı). Çizim kodu bu noktayı yüzeye oturtur (`render/draw.js → onSurface`).
- Bakış yönü: **sağa**; sola dönüş kodda yansıtılarak yapılır (ayrı sol kare üretilmez).
- Kare sırası: `<anim>_01`, `<anim>_02`, … sıralı; sprite sheet kullanılırsa yanında `sheet.json` (kare adları, sıra, FPS, pivot).
- FPS: idle 6, run 12, attack 14, jump 10, hurt 8, death 8, turn 8 (değerler `data/male_animations.json`).
- Oyun içi ölçek: `scale` alanı (erkek: 0.6). Kaynak düşük çözünürlüklü olduğundan büyütme.
- Stil: kalın temiz outline (`#1f2a44`), canlı ama yumuşak renk, hafif cel-shading.
