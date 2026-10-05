# assets / characters / female / animations

Kadın savaşçı (kırmızı bandanalı, kılıçlı) — kullanıcının verdiği sheet'ten (`../../../references/nexora_female_sheet_source.png`, 2000×667, **siyah zeminli, gerçek alfa yok**). Betik: `tools/extract_female_sheet.py` (yeniden çalıştırılabilir; manifest ve `data/female_animations.json` güncellenir).

| Animasyon | Kare | FPS | Döngü |
|---|---|---|---|
| `idle` | 9 | 8 | evet |
| `run` | 9 | 14 | evet |
| `attack` | 5 | 7 | hayır (3. ve 4. karede mavi hilal, 5. kare yukarı çapraz kesik) |
| `hurt` | 5 | 9 | hayır |
| `death` | 5 | 6 | hayır |

- **Tuval:** 340×240 RGBA, **pivot** `(130, 230)` = ayakların orta noktası. Sağa bakar. Oyun içi ölçek `0.58` (≈ 89 birim, erkekle aynı boy).
- **Zemin çıkarma:** siyah zemin flood-fill ile silindi; mavi efektler siyah üzerinde parlama olduğu için alfa = parlaklık, renk parlaklığa bölünerek geri kazanıldı.
- `layers/attack_NN_body.png` + `_fx.png`: saldırıdaki gömülü mavi efekt gövdeden ayrılmış türev katmanlar (oyunda efekt %50 küçültülür). `data/female_animations.json → fxAnchor`: kılıç efekt çıkış noktası (yalnız efekt içeren 3 karede).
- **Kahraman seçimi:** varsayılan erkek. Kadın için URL `?hero=female` ya da `data/config.json → player.character = "female"`.
- **Sınırlar:** kaynakta saçın koyu kenarı siyah zemine yakın olduğundan saç dış hattı bazı karelerde hafif tırtıklı/ince; `attack_03` ve `attack_04` sol kenarında komşu kareden kalma küçük kılıç/saç parçası görülebilir. Sheet'te `turn`/`jump` yok. Saldırı tek animasyon (erkekteki 3'lü kombo yok). `death` karelerinde kılıç gövdeden ayrık duruyor (kaynakta öyle).
- Portre: `../portraits/female_portrait.png` (HUD'da gösterilir). Manifest anahtarları: `female_<kare>`, `femalebody_/femalefx_<kare>`, `female_portrait`.
