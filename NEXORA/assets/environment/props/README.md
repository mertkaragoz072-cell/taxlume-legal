# assets / environment / props

Yüzeye saçılan dekor sprite'ları (şeffaf PNG, 24 adet). Kaynak: `../../references/nexora_world_props_source.png` (alt şerit); betik: `tools/extract_world_props.py`.

- **Pivot:** sprite'ın **alt orta noktası** `(genişlik/2, yükseklik−1)` = zemine basan nokta. Çizerken pivot yüzeye oturur.
- **Boyut:** kaynak düşük çözünürlüklü (en büyüğü `pine_large` 113×153). Oyunda hedef yüksekliğe (`data/world_props.json → props.<ad>.height`, oyun birimi; kahraman ≈ 98) ölçeklenir, 1.2–1.5× büyütme olur — yumuşak görünür, daha fazla büyütmeyin.
- Oyunda yerleşim `data/world_props.json → decor` kurallarıyla (grup, aralık, ölçek aralığı, derinlik, katman) deterministik saçılır.

| Grup | Dosyalar |
|---|---|
| Ağaç | `pine_large`, `pine_small` |
| Çalı | `bush_01…04`, `bush_large_front` |
| Kaya | `rock_small_01/02`, `rock_medium_01/02`, `rock_large_01/02` |
| Çit/yapı | `fence_long`, `fence_broken`, `signpost`, `haystack` |
| Hazine | `chest_01`, `chest_02` |
| Zemin | `grass_tuft_01/02`, `flower_pink`, `flower_white` |
| Diğer | `club_spiked` (dikenli sopa; dekor kuralında **yok**, büyük düşman silahı olabilir) |

Manifest anahtarı: `prop_<ad>`.
