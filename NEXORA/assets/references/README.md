# assets / references

Sadece gerçek atlas/reference dosyaları, orijinal halleriyle. Oyunda doğrudan kullanılmaz; kırpılıp ayrı PNG'lere dönüştürülür.

| Dosya | Kaynak bilgisi | Türetilen |
|---|---|---|
| `nexora_logo_source.png` | Kullanıcı tarafından yüklenen logo, 1536×1024, siyah arka planlı | `../logo/nexora_logo.png` |
| `nexora_app_icon_source.png` | Kullanıcı tarafından yüklenen uygulama ikonu, 1272×1237, şeffaf köşeli | `../app_icon/app_icon_1024.png` |
| `nexora_male_sheet_source.png` | İlk erkek karakter sheet, 852×1846, sıkışık, sahte dama zeminli. **Kullanımdan kalktı** (v2 ile değiştirildi) | — |
| `nexora_male_sheet_v2_source.png` | Erkek karakter sheet v2, 1536×1024, kareler arası boşluklu, sahte dama zeminli (alfa yok) | `../characters/male/animations/*`, `../effects/*` (`tools/extract_male_sheet.py`) |
| `nexora_camera_gameplay_reference.png` | Kamera açısı/oynanış/UI/parallax moodboard'u, 1536×1024. **Asset değil**, tasarım referansı | `docs/README.md` → "Kamera ve oynanış"; `data/config.json` camera/parallax |
| `nexora_world_props_source.png` | Dünya/arka plan seti, 2172×724, gerçek alfa. Üst: panorama kompozisyonu (kesilmedi); alt: tekil bulut/ada/prop sprite'ları | `../environment/background/*`, `../environment/props/*` (`tools/extract_world_props.py`) |
| `nexora_world_ground_source.png` | Tepe zemin sahnesi, 2172×724, sahte dama zeminli RGB (alfa yok) | `../environment/ground/*` (`tools/extract_world_ground.py`) |
| `nexora_female_sheet_source.png` | Kadın savaşçı sheet, 2000×667, siyah zeminli (alfa yok) | `../characters/female/*`, `../effects/attacks/female_fx_*` (`tools/extract_female_sheet.py`) |
