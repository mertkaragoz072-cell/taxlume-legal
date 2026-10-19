# Kafe iç mekânı asset'leri (opsiyonel, "bırak ve çalışsın")

Bu klasöre aşağıdaki adlarla **WebP (saydam arka planlı, duvar/zemin hariç)** koyup adını `src/assets.js` içindeki `INTERIOR_ART` listesine ekleyince oyun, ilgili parçayı kodla çizilen yerine kullanır. Listede olmayan parça eski çizimle kalır (gereksiz istek / 404 olmaz).

| Dosya | Ne | Yerleştiği kutu (tasarım px) | Not |
|---|---|---|---|
| `oven.webp` | Fırın | 310 × 310 | Çalışırken üstüne ateş parıltısı eklenir |
| `counter.webp` | Üretim tezgâhı | 330 × 150 | |
| `showcase.webp` | Satış vitrini | 330 × 230 | Cam alanı boş olsun; stok ikonları üstüne çizilir |
| `coffee.webp` | Kahve makinesi | 175 × 250 | |
| `storage.webp` | Depo (sandık/çuval) | 95 × 150 | |
| `upgrades.webp` | Geliştirmeler tabelası | 100 × 140 | Üstüne "0/15" yazılmaz; sayaç ayrı çizilir |
| `table.webp` | Masa (+ isteğe bağlı sandalyeler) | 230 × 170 | 3 masada da aynı görsel kullanılır |
| `chair.webp` | Sandalye | — | Şimdilik kullanılmıyor (masa görseline dahilse gerekmez) |
| `wall.webp` | Duvar (yatay döşenebilir) | 1400 × ~385 | `floor.webp` ile **birlikte** konmalı |
| `floor.webp` | Zemin (yatay döşenebilir) | 1400 × ~310 | `wall.webp` ile birlikte |

Görsel, kutuya oranı bozulmadan sığdırılır ve alt kenara oturtulur. Önerilen boyut: kutunun 2–3 katı piksel (ör. fırın için ~800 × 800).
