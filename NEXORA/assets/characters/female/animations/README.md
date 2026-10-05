# assets / characters / female / animations

Kadın savaşçı (kırmızı bandanalı, kılıçlı). Kaynak: `../../../references/nexora_female_sheet_v2_source.png` (1500×500, **gerçek alfa kanallı**, kareler birbirine yakın). İlk (siyah zeminli) sheet `nexora_female_sheet_source.png` **kullanımdan kalktı** (saç kenarları bozuktu). Betik: `tools/extract_female_sheet.py`.

| Animasyon | Kare | FPS | Döngü |
|---|---|---|---|
| `idle` | 8 | 8 | evet |
| `run` | 8 | 14 | evet |
| `attack` | 5 | 7 | hayır (kare 3–5'te mavi hilal) |
| `hurt` | 6 | 9 | hayır |
| `death` | 5 | 6 | hayır |

- **Tuval:** 280×190 RGBA, **pivot** `(100, 180)` = ayakların orta noktası, sağa bakar. Oyun içi ölçek `0.86` (≈ 90 birim, erkekle aynı boy).
- `layers/attack_NN_body|fx.png`: gömülü mavi efektin gövdeden ayrılmış türevleri (oyunda efekt %50 küçültülür); `data/female_animations.json → fxAnchor`.
- **Seçim:** varsayılan erkek; kadın için `?hero=female` veya `data/config.json → player.character`.
- **Sınırlar:** idle_08/attack_03 gibi birkaç karenin sol kenarında komşu kareden taşan çok ince kılıç ucu kalmış olabilir. Sheet'te `turn`/`jump` yok; saldırı tek animasyon. `death` karelerinde kılıç gövdeden ayrık (kaynakta öyle).
- Portre: `../portraits/female_portrait.png` (148×141; HUD'da daire içine sığdırılır). Efektler: `assets/effects/attacks/female_fx_*.png`. Manifest: `female_<kare>`, `femalebody_/femalefx_<kare>`, `female_portrait`.
