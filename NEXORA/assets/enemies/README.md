# assets / enemies

Düşman sprite'ları — **referans moodboard'un "KARAKTER VE NESNELERİN BOYUT ORANI" panelinden** çıkarıldı (`../references/nexora_camera_gameplay_reference.png`), böylece kahramanla aynı sanat stilinde. Betik: `tools/extract_enemies.py` (düz lacivert panel zemini flood-fill ile silinir, ince boy çizgileri atılır, 2× Lanczos büyütülür, hafif keskinleştirme + renk canlandırma).

| Dosya | Düşman | Oyundaki boy (kahraman ≈ 98) | Boyut (px) |
|---|---|---|---|
| `enemy_goblin_scout_idle.png` | Küçük goblin (kalkan + kılıç) | 70 birim (≈ %70) | 118×106 |
| `enemy_goblin_warrior_idle.png` | Orta goblin (mızrak) | 100 birim (≈ aynı boy) | 134×146 |
| `enemy_ogre_brute_idle.png` | Büyük ogre (dikenli sopa) | 168 birim (≈ 1.7×) | 248×194 |

- **Tek statik poz**: kaynakta animasyon karesi yok. Oyunda prosedürel canlandırma: yürürken sekme/ezilme/sallanma, vuruşta beyaz parlama, ölümde yan yatıp solma. Yürüme/saldırı/ölüm kareleri gerçek sprite sheet olarak sonradan eklenebilir (`enemy_<ad>_attack.png` vb.).
- **Yön:** sprite'lar **sola** bakar (kahramana doğru); sağa dönüş kodda yansıtılır. **Pivot:** alt orta (ayaklar).
- **Sınırlar:** kaynak düşük çözünürlüklü (55–100 px) olduğundan 2× büyütme bulanıklık/yumuşaklık getirir; dış hat kaynağa göre biraz inceldi. Skeleton ve diğer moodboard düşmanları arka planla iç içe olduğu için çıkarılamadı.
- Manifest anahtarları: `enemy_goblin_scout`, `enemy_goblin_warrior`, `enemy_ogre_brute`. Veri: `data/enemies.json`.
