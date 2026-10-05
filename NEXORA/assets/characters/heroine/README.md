# assets / characters / heroine

**Kadın savaşçı — ana oyun asseti** (kullanıcının yüklediği tek görsel). Kaynak: `../../references/nexora_heroine_source.png` (1536×1024, gerçek alfa). Karakter yeniden çizilmedi; sadece kırpıldı.

| Dosya | Açıklama |
|---|---|
| `heroine_main.png` | Karakter, şeffaf, kırpılmış, 638×455 (kaynağın %50'si). Sağa bakar. |
| `heroine_portrait.png` | Yüz/üst gövde kırpımı, 256×256 (HUD ve seçim ekranında daire içinde). |

- **Pivot:** ayakların orta noktası `(278, 452)`; ölçek `0.198` → kafa-ayak ≈ 89 oyun birimi (erkekle aynı). `data/heroine_animations.json`.
- **Animasyon prosedürel** (tek görsel olduğu için): idle nefes/sallanma, run sekme + öne eğilme, attack ileri atılma + kılıç ucundan küçük mavi hilal, hurt geri savrulma + kırmızı parlama, death arkaya devrilme. Kod: `src/render/characters.js → drawProceduralHero`. Gerçek animasyon kareleri gelince bu karakter için `male`/`female` gibi kare tabanlı veri eklenir.
- Savaş sistemi erkekle ortak (aynı saldırı menzili, hasar, can, geri tepme). Saldırı zamanlaması: 0.45 sn animasyon, hasar 0.16 sn'de.
- Manifest anahtarları: `heroine_main`, `heroine_portrait`.
- Not: `?hero=female` önceki **animasyonlu sheet** kahramanını (kare tabanlı) açan geliştirme alternatifidir; seçim ekranında yalnız erkek ve bu kadın savaşçı vardır.
