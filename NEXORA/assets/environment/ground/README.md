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
