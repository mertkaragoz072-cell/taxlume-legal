# assets / characters / female — kadın savaşçı (hero id: `heroine`)

| Yol | İçerik |
|---|---|
| `heroine_main.png`, `heroine_portrait.png` | ana görsel (kullanıcının yüklediği, **görünüm değişmez**) ve portre; kaynak `../../references/nexora_heroine_source.png` |
| `idle/ run/ attack/ hurt/ death/` | **gerçek animasyon kareleri için hazır klasörler** (şu an boş) |
| `frames.json` (opsiyonel) | pivot, ölçek, FPS, `strideUnits`, `attackFx`, `swordTip`, `impact` |
| `animations/`, `layers/`, `portraits/` | **eski** kare tabanlı kadın sheet (`?hero=female` geliştirme alternatifi); yeni sistemle ilgisi yok |

## Nasıl çalışır
- Her animasyon için **klasör doluysa kareler** oynar, **boşsa prosedürel hareket** (tek görsel) kullanılır. Karışık olabilir (ör. sadece `run/` dolu).
- Oyun içi ölçek ve pivot **tüm animasyonlarda tek** (`data/heroine_animations.json → framed`): karakter boyutu değişmez, ayaklar sabit pivotta zemine basar. Ölçek verilmezse idle gövde boyu ≈ 89 birim (erkekle aynı) olacak şekilde otomatik hesaplanır.
- **Run** karesi zamana değil kat edilen mesafeye bağlıdır (`strideUnits` birimde bir kare) → hareket yönü/hızıyla senkron, ayak kaymaz. Durunca idle'a geçer.
- **Attack**: `impact` (0–1) anında hasar uygulanır; efekt `attackFx: "overlay"` ise oyunun mavi hilali kılıç ucuna (`swordTip`, kareye özel `swordTipFrames`) çizilir, `"baked"` ise efekt karelerde gömülüdür.
- **Hurt / Death**: kombat sistemi tetikler (`hurt` bitince idle/run; `death` son karede kalır). Kare sayısı × FPS = süre.
- `tools/build_female_animations.py` kareleri doğrular: boyut tutarsızlığı, ayak çizgisi kayması, gövde x kayması, ayak–pivot uyuşmazlığı için UYARI verir.

Önceki sürümde (`heroine` klasörü) duran ana görsel ve portre bu klasöre taşındı.
