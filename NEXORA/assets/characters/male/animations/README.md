# assets / characters / male / animations

Erkek karakter (kızıl atkılı kılıç savaşçısı) animasyon kareleri: **84 ayrı, şeffaf PNG**.

- Kaynak: `../../../references/nexora_male_sheet_v2_source.png` (1536×1024, kareler arası boşluklu sheet, sahte dama zeminli). Eski sıkışık sheet (`nexora_male_sheet_source.png`) artık kullanılmıyor.
- Üreten betik: `tools/extract_male_sheet.py` (yeniden çalıştırılabilir; çıktıyı baştan üretir ve manifest'i günceller).
- **Tuval:** 224×176 px, RGBA. **Pivot:** `(112, 164)` = ayakların orta noktası (alttan 12 px yukarı). Tüm kareler bu noktaya göre hizalı; çizerken pivotu yüzeydeki konuma koy.
- **Yön:** sağa bakar. Sola dönüş kodda yatay yansıtılarak yapılır.
- **Oyun içi ölçek:** `1.15` (`data/male_animations.json` → `scale`).
- Kare sırası: dosya numarası = oynatım sırası (`_01` ilk). Kare süresi = 1/FPS.

| Animasyon | Kare | FPS | Döngü | Dosyalar |
|---|---|---|---|---|
| `idle` | 11 | 8 | evet | `idle_01` … `idle_11` |
| `run` | 11 | 14 | evet | `run_01` … `run_11` |
| `attack_1` | 9 | 16 | hayır | `attack_1_01` … `attack_1_09` |
| `attack_2` | 9 | 16 | hayır | `attack_2_01` … `attack_2_09` |
| `attack_3` | 4 | 14 | hayır | `attack_3_01` … `attack_3_04` |
| `jump` | 9 | 10 | hayır | `jump_01` … `jump_09` |
| `hurt` | 9 | 10 | hayır | `hurt_01` … `hurt_09` |
| `death` | 9 | 8 | hayır | `death_01` … `death_09` |
| `turn` | 13 | 10 | hayır | `turn_01` … `turn_13` |

Sheet satırları: IDLE→`idle`, RUN→`run`, ATTACK 1/2/3→`attack_1/2/3`, JUMP→`jump`, HIT→`hurt`, DEATH→`death`, TURN→`turn` (öne bakıştan sırtına dönüş). FPS değerleri sheet'te belirtilmediği için benim önerimdir.

## Notlar / sınırlar
- Kaynakta gerçek alfa yok; zemin otomatik silindi. Karakter kenarları temiz; mavi parlamalarda hafif yumuşak halo var.
- **Efektler karelere gömülü** (`attack_*`): kılıç izi/hilal karakterle aynı karede. Efektsiz karakter + ayrı efekt katmanı yok.
- `attack_1` sheet'te 9 kare + büyük hilal; hilal `assets/effects/attacks/attack_1_slash.png`. `attack_2_09` karakter+büyük hilal birlikte.
- `attack_3` sheet'te 4 karakter karesi + 4 saf patlama (`assets/effects/attacks/attack_3_burst_01…04.png`); `attack_3_04` yer patlamasıyla birlikte.
- `jump_07…09` kareleri toz bulutunu içerir (karakterin arkasında, karenin parçası).
- Kaynak düşük çözünürlüklü (karakter ≈ 85 px); büyütmeyin.
