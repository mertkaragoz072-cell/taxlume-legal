# assets / characters / female / death

Kadın savaşçı **death** kareleri buraya konur — şu an **boş** (oyun bu animasyon için tek görselle prosedürel hareket kullanır).

- Dosya adı: `death_01.png`, `death_02.png`, … (iki haneli, sıralı; `death_1.png` de olur, sayıya göre sıralanır).
- Şeffaf PNG (RGBA), **tüm animasyonlardaki tüm kareler AYNI tuval boyutunda**, karakter **sağa** bakar.
- Ayakların orta noktası her karede **aynı pikselde** olmalı (varsayılan pivot: tuval alt ortası, alttan 12 px yukarı; `../frames.json` ile değiştirilir). Kareleri kırpma (trim) — tuval sabit kalsın, yoksa kayma/jitter olur.
- Ekledikten sonra: `python3 tools/build_female_animations.py` (doğrular + oyuna bağlar). Ayrıntı: `../README.md`.
