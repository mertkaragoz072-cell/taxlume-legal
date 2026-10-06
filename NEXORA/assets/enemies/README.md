# assets / enemies

Üç goblin düşman — **animasyonlu**, kullanıcının verdiği goblin sprite sheet'inden (`../references/nexora_goblin_sheet_source.png`, 1536×1024, gerçek alfa kanallı). Betik: `tools/extract_goblins.py` (yeniden çalıştırılabilir; çıktıyı baştan üretir, `data/enemy_animations.json` ve manifest'i günceller).

| Klasör | Düşman | Rol | Oyundaki boy (kahraman ≈ 81) | Kareler |
|---|---|---|---|---|
| `goblin_scout/` | Kılıç + kalkan goblin | küçük, hızlı | 68 birim | walk 4, attack 4, hurt 1, death 1 |
| `goblin_warrior/` | Gürzlü goblin | normal | 80 birim | walk 5, attack 3, hurt 2, death 1 |
| `goblin_brute/` | Çekiçli zırhlı goblin | **ELITE/boss** (seyrek, tek) | 132 birim | walk 3, attack 4, hurt 1, death 1 |

- Dosyalar: `<anim>_NN.png` (ör. `walk_01.png`) + `portrait.png` (sheet'teki yüksek çözünürlüklü büyük portre; şu an oyunda kullanılmıyor, elite girişi/UI için).
- **Tuval ve pivot:** tür başına ortak tuval (`data/enemy_animations.json` → `canvas`, `pivot`). Pivot = **ayakların orta noktası** (tuval alt kenarından 8 px yukarı). Kareler **sağa bakar**; oyuncuya dönük çizim için kodda yansıtılır.
- **Ölçek:** `scale` = hedef boy ÷ yürüme karesinin gövde yüksekliği (px→birim), betikte hedefler `TYPES[...].target`.
- **FPS:** walk 8 (brute 6), attack 9–10 (brute 8), hurt/death 6–8. Saldırı hasarı animasyonun `impact` anında (0.5; brute 0.62) uygulanır.
- **Animasyon eşlemesi (sheet'ten):** gürz/kılıç goblin: ilk kareler yürüme döngüsü, sonra savurma, 1–2 hasar kare, son kare yatan ölü; brute: 3 yürüme, 4 saldırı (kaldırma → yere vurma + ateş), 1 hasar, 1 ölü.
- **Notlar/sınırlar:** efektler (altın/mavi yay, kıvılcım, ateş) karelere gömülü. Sheet'te kareler birbirine yaslandığı için bazı kenar efekt parçaları kesilmiş/atılmıştır; `goblin_scout` attack_4 kendi içinde kopuk bir kılıç parçası içerir. Sheet'teki yer gölgesi atıldı (oyun kendi gölgesini çizer). Kaynak çözünürlüğü kahramanla benzer (~90–110 px).
- Manifest anahtarları: `enemy_<tür>_<anim>_NN`, `enemy_<tür>_portrait`.

## Not (goblin_scout)
`attack_02.png` sopalı savaşçı goblinden gelen yanlış bir kareydi; saldırı animasyonundan çıkarıldı (dosya durur, kullanılmıyor). Saldırı sırası: attack_04 → attack_03 → attack_01. `death_01.png` içindeki varil/sopa kareye ait değil; kılıçlı goblin için uygun ölüm karesi gelince değiştirilecek (kaynak sayfa: normal goblin "Ölüm" satırı).
