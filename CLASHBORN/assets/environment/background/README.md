# assets / environment / background

Arka plan parallax sprite'ları (şeffaf PNG). Kaynak: `../../references/nexora_world_props_source.png`; betik: `tools/extract_world_props.py`. Pivot: **merkez** (yüzeye basmaz, havada durur).

| Klasör | Dosyalar | Boyut (px) |
|---|---|---|
| `clouds/` | `cloud_01…06` | 120–262 × 31–117 |
| `islands/` | `island_01…07` (01: kaleli büyük ada, 06: evli ada) | 67–170 × 95–192 |

- Oyunda: bulutlar gökyüzü katmanında kendi hızıyla kayar; adalar `data/world_props.json → islandLayers` ile iki parallax katmanında (uzak 0.03, orta 0.07; uzak olan %85 saydam) çizilir.
- Manifest anahtarları: `bg_cloud_01…`, `bg_island_01…`.
- Kaynak panoramadaki büyük tepe/kompozisyon (üst yarı) **kesilmedi**; referans olarak kaldı (zemin oyunda prosedürel çizilir, renkler panoramaya göre ayarlandı).
