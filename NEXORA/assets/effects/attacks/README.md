# assets / effects / attacks

Erkek karakter sheet'inden çıkarılan saf efektler (şeffaf PNG, mavi enerji; ayak pivotu yok, merkezden çizilir). Her dosya kırpılmış tek görsel; boyutlar farklı.

| Dosya | Açıklama |
|---|---|
| `attack_1_slash.png` | Saldırı 1 sonu büyük hilal |
| `attack_3_burst_01.png`, `attack_3_burst_02.png` | Saldırı 3 yer patlaması (2 kare, sırayla) |
| `effect_slash_arc_01…07.png` | EFFECTS satırı: kılıç hilalleri (sheet sırası, soldan sağa) |
| `effect_burst_01…04.png` | EFFECTS 2. satır: patlama/diken efektleri; `_01` birkaç diken grubunu birleşik içerir; halka ve bazı parçalar bu satırdan başka dosyada olabilir |
| `effect_weapon_streak_01…07.png` | WEAPON FX satırı: okumsu izler, yıldız patlaması, halka |

- Adlar sheet sırasına göredir; oyun içi anlamı (hangi hit/yetenek) henüz atanmadı. Birkaç `effect_burst_*` dosyası komşu efektle birleşik çıkmış olabilir.
- Animasyon sırası/süresi kaynakta belirtilmediği için **belgelenmedi**; kullanılacağı zaman tanımlanacak.
- Kaynak: `../../references/nexora_male_sheet_source.png`; betik: `tools/extract_male_sheet.py`.
- Sheet'teki gri/bej toz ve kırıntı efektleri çıkarılamadı (bkz. `particles/README.md`). Halka efekti ve ikinci satırın bazı parçaları hâlâ `effect_burst_*` ile `effect_slash_arc_*` arasında dağınık olabilir.
