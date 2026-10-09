# assets / environment / worlds — evren (universe) paketleri

Her evren kendi klasöründe yaşar: `worlds/<id>/`. Görselleri koyun, sonra **`python3 tools/worlds.py build`** çalıştırın — oyun verisi (`data/world_props.json`, `data/asset_manifest.json`, `data/chapters.json`) otomatik üretilir. Elle JSON düzenlemek gerekmez.

## Yeni evren eklemek
```
python3 tools/worlds.py new <id> "EVREN ADI"     # klasör + world.json şablonu
# görselleri koy (aşağıdaki tablo)
python3 tools/worlds.py check                     # doğrulama raporu (uyarılar)
python3 tools/worlds.py build                     # oyun verisini üret
npm run build:www                                 # (yayın paketi) — sw.js sürümü de yenilenir
```
Önizleme: `index.html?hq=1&nosw&stage=6` → 2. evren (stage 6–10), `stage=11` → 3. evren … (her evren 5 bölüm = 5 boss). Evrenler `world.json → order` sırasıyla dizilir; liste bitince başa döner (★).

## Dosyalar (hepsi isteğe bağlı — olmayan parça Meadowlands'ten / renk tonundan yedeklenir)
| Dosya | Açıklama |
|---|---|
| `ground.png` | Yürüme zemini şeridi. Önerilen: **şeffaf PNG, ≥1000 px geniş (meadow: 2172×248), üst kenar yürüme yüzeyi**, yatay ayna döşemeye uygun (kenarları birbirine benzesin). Yürüme şeridinde (üst ~60 px) taş/engel olmasın. Ölçek: `ground.scale` (birim/px, meadow 0.9). |
| `backdrop.png` | Arka plan panoraması (yatay, genişlik ≥ 2× yükseklik, üst kenarı gökyüzüne karışır). Boyut/hız: `backdrop.height` (birim), `backdrop.speed`. `sky`/`haze` renkleri yalnız backdrop varken kullanılır. |
| `props/<önek>_<ad>.png` | Dekor sprite'ları: **şeffaf RGBA, alt orta = zemine basan nokta** (pivot otomatik [genişlik/2, yükseklik]). Önek yerleşimi belirler: `tall_` büyük (≈520 birimde bir, arkada) · `mid_`/ön eksiz orta (≈230, arkada) · `front_` ön plan (≈700, karakterin ÖNÜNDE) · `tiny_` zemin örtüsü (≈85, arkada). Boyut: px × `propScale`; tek tek ezmek için `world.json → props.<ad>: {height, pivot}`. |
| `world.json` | `name`, `order`, `tint` (görsel yokken renk tonu `[r,g,b,a]`; kendi görselleri tamamlanınca `null`), `sky` (4 renk), `haze`, `sun`, `clouds`, `ground{scale,lift,deep,mirror}`, `backdrop{height,speed}`, `propScale`, `props`. |

## Kurallar
- Dosya adları küçük harf + alt çizgi (snake_case). Her evren için **sprite boyutu/pivot/ölçek** değerlerini `world.json`'a not düşün (ölçek ve pivot oradadır).
- Dış URL yok; yalnız diskteki PNG'ler manifeste girer. Eksik dosya hata vermez (Meadowlands'e düşer).
- Şu an `emberfall` ve `frostveil` **görselsiz** (yalnız renk tonu). Gerçek görselleri koyunca `tint`'i `null` yapın, ya da klasörü silin / `order`'ı değiştirin.
- Evrene özel düşman/boss görseli veya müzik şimdilik yok (ortak kullanılır); gerekirse sonraki adım olarak eklenir.
