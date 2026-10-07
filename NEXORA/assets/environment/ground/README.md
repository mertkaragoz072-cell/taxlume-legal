# assets / environment / ground

Dünya zemini görselleri. Kaynak: `../../references/nexora_world_ground_source.png` (2172×724, sahte dama zeminli RGB); betik: `tools/extract_world_ground.py` (dama zemini flood-fill ile silinir).

| Dosya | Açıklama |
|---|---|
| `hill_ground.png` | Tam tepe sahnesi, şeffaf, 2139×359 (çalılar, kayalar, toprak lekeleri dahil). Oyunda **doğrudan çizilmiyor** (dünya yuvarlak ve sürekli döndüğü için tek parça tepe dönmez); referans/landmark olarak duruyor. |
| `ground_tile_grass.png` | 384×80 **dikişsiz** çim dokusu (tepeden kayasız/çalısız/topraksız bir bölge kırpılıp 4 ayna kopyasıyla döşendi). Oyunun zemin deseni. |

- Oyunda: `ground_tile` gezegenin yerel koordinatlarında `repeat` desen olarak döşenir, gezegenle birlikte döner (zemin yürüdükçe kayar). Ölçek ve opaklık: `data/config.json → planet.groundTexture`. Üstüne derinlik gölgesi (yüzeyden aşağı koyulaşır) ve parlama bandı çizilir.
- Manifest anahtarları: `ground_hill`, `ground_tile`.
| `dirt_patch_01…05.png` | Tepeden ayrılmış turuncu/kahve **toprak lekesi decal'ları** (yumuşak kenarlı, şeffaf; 122–365 px geniş). Eğimli olanlar yatay hizalandı. |

- Toprak lekeleri dokuya gömülmedi (ayna döşemede zikzak oluşturuyordu); bunun yerine yüzeye rastgele **serpilir** (`data/config.json → planet.decals`: aralık, ölçek, derinlik, genişlik, opaklık). Manifest anahtarları: `ground_dirt_01…05`.
- Sınırlar: lekeler tepeden renk eşiğiyle ayrıldığı için kenarlarında hafif sarı-yeşil halo olabilir; `dirt_patch_03` altında ince koyu bir çizgi kırıntısı var.

## Gezegen plaka zemini (`tiles/`)
Kaynak: `references/nexora_planet_sheet_source.png` (1536×1024, 5 gezegen); betik: `tools/extract_planet_ground.py`. Her gezegenden 5 "seamless" plaka: `<tema>_01..05.png` (meadow, forest, frozen, desert, volcanic; 50–220 px geniş, 43–78 px yüksek, yanlardan 5–6 px kırpılmış). Bilgi: `tiles/tiles.json`. Manifest anahtarı `gt_<ad>`.
- Oyunda (`src/render/world.js → drawTileGround`): kalınlığı benzer plakalar tohumlu rastgele sırayla gezegen çevresine (2πR) dizilir, toplam genişlik çevreye tam oturacak ölçeklenir (iki yandan sonsuz, ±π dikişi yok). Plakalar üst kenardan hizalanır, 8 birimlik dilimlerle yüzeye teğet döndürülür (kavis), altına tema rengine doğru koyulaşan dolgu gelir. Ayaklar (`laneDepth` 14) plakanın üst yüzüne basar; `lift` plaka üstünün yüzey çizgisine göre yüksekliği.
- Veri: `data/world_props.json → groundTiles.<tema>` (`tiles`, `scale` birim/px, `lift`, `deep`), `sliceWidth`, `extend`. Gezegen yarıçapı 2000 → **3000** (1100 ve 1700 fazla yuvarlaktı; neredeyse düz) (daha belirgin yuvarlak yüzey; tüm mesafeler açı×R olduğundan oynanış aynı).
- Bölümler: 1 MEADOWLANDS (meadow), 2 DARK FOREST (forest), 3 FROZEN PEAKS (frozen), 4 DESERT RUINS (desert), 5 VOLCANIC REALM (volcanic). desert/volcanic: gökyüzü + arka plan panosu (`themes/<id>/backdrop.png`) var, dekor (props) henüz yok.

### Yeşil dünya zemini (güncel)
Yeşil dünyanın zemini artık kullanıcının verdiği şeffaf sahne görselinden: `tiles/meadow_ground.png` (**2172×204**, pivot yok — üst kenardan hizalanır). Kaynak `references/nexora_meadow_ground_source.png`, betik `tools/make_meadow_ground.py` (ağaç/çit/fener kısmı kesilir; çim + toprak yol + yosunlu kaya yüzü bandı alınır). Eski 5 plaka (`meadow_01..05`) silindi.
- Döşeme: `groundTiles.meadow.mirror = true` → plaka ve yatay ayna kopyası **dönüşümlü** dizilir (birleşimler simetrik, dikiş yok); `scale` 0.55 birim/px (≈1195 birim geniş, ≈112 kalın), `lift` 14 (ayaklar çim/yol bandına basar), `deep` #4a3524.
