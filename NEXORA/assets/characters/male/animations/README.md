# assets / characters / male / animations

Erkek karakter (kızıl atkılı kılıç savaşçısı) animasyon kareleri. Her kare **ayrı, şeffaf PNG**.

- Kaynak: `../../../references/nexora_male_sheet_source.png` (852×1846, sahte dama zeminli tek sheet).
- Üreten betik: `tools/extract_male_sheet.py` (yeniden çalıştırılabilir; çıktıyı baştan üretir).
- **Tuval:** 224×176 px, RGBA. **Pivot:** `(112, 164)` = ayakların orta noktası (alttan 12 px yukarı). Tüm kareler bu noktaya göre hizalıdır; çizerken pivotu yüzeydeki konuma koy.
- **Yön:** sağa bakar. Sola dönüş kodda yatay yansıtılarak yapılır.
- **Oyun içi ölçek:** `0.6` (`data/male_animations.json` → `scale`); karakter ≈ 85 oyun birimi yüksekliğinde.
- Kare sırası: dosya numarası = oynatım sırası (`_01` ilk). Kare süreleri sabit: 1/FPS.

| Animasyon | Kare | FPS | Döngü | Dosyalar |
|---|---|---|---|---|
| `idle` | 8 | 6 | evet | `idle_01` … `idle_08` |
| `run` | 8 | 12 | evet | `run_01` … `run_08` |
| `attack_1` | 6 | 14 | hayır | `attack_1_01` … `attack_1_06` |
| `attack_2` | 7 | 14 | hayır | `attack_2_01` … `attack_2_07` |
| `attack_3` | 4 | 14 | hayır | `attack_3_01` … `attack_3_04` |
| `jump` | 7 | 10 | hayır | `jump_01` … `jump_07` |
| `hurt` | 6 | 8 | hayır | `hurt_01` … `hurt_06` |
| `death` | 6 | 8 | hayır | `death_01` … `death_06` |
| `turn` | 8 | 8 | hayır | `turn_01` … `turn_08` |

Sheet'teki satırlar: IDLE→`idle`, RUN→`run`, ATTACK 1/2/3→`attack_1/2/3`, JUMP→`jump`, HIT→`hurt`, DEATH→`death`, etiketsiz son karakter satırı→`turn` (öne bakıştan sırtına dönüş; etiketsizdi, adı tahmindir).

## Bilinen kalite sınırları (kaynak sheet'ten kaynaklı)
- Kaynakta gerçek alfa yok; zemin otomatik silindi. Kenarlar genelde temiz ama mavi parlamalarda hafif bulanık/yarı saydam halo var.
- **Efektler karelere gömülü** (`attack_*`): saldırı kareleri kılıç izi/parlamayı içerir. Sheet'te efektler komşu karelerle iç içe olduğu için bazı kare kenarlarında efekt **dikdörtgen kesikle** biter (en belirgin: `attack_2_03`…`attack_2_06`). Düzgün hâli için efektsiz karakter + ayrı efekt katmanı yeniden üretilmeli.
- `attack_3` sheet'te 4 karakter karesi + 2 saf patlama; `attack_3_04` patlamayla birlikte. Saf kısımlar `assets/effects/attacks/attack_3_burst_*.png`.
- `attack_1` ve `attack_2` sonunda sheet'teki büyük hilal efekti: `attack_1_slash.png` ayrı efekt; `attack_2_07` karakter+hilal birlikte.
- `hurt_*` ve `death_*` karelerinde birkaç küçük kopuk piksel kırıntısı olabilir.
- `jump_*` karelerinde sheet'teki toz bulutları **yok** (gri/bej tozlar gri dama zeminden güvenilir ayrılamadı).
- Kaynak düşük çözünürlüklü (karakter ≈ 85 px); büyütmeyin.
