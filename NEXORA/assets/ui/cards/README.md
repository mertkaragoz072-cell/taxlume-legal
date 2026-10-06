# Geliştirme kartı görselleri
Kullanıcının kart sayfasından (6×2) kesilmiş 12 kart. Boyut ≈ 320×370 px (kaynakta bu çözünürlükte), şeffaf arka plan (siyah zemin kaldırıldı), pivot yok (CSS kartı).
Başlık, ikon ve alt yazı görselin içinde; bonus ("+20%") ve seviye satırı görselden silinip oyunda dinamik yazılıyor (renk: `data/upgrades.json → artText`).

| Dosya | Güç (`id`) |
|---|---|
| card_attack_damage | attackDamage |
| card_max_hp | maxHp |
| card_attack_speed | attackSpeed |
| card_crit_chance | critChance |
| card_damage_taken | damageTaken |
| card_skill_damage | skillDamage |
| card_skill_cooldown | skillCooldown |
| card_coin_gain | coinGain |
| card_xp_gain | xpGain |
| card_range | range |
| card_move_speed | moveSpeed |
| card_weapon_power | (henüz bir güce bağlı değil) |

Bir güce kart bağlamak: ilgili güce `"art": "assets/ui/cards/<dosya>.png"` ve `"artText": [dolgu, kontur]` ekle. Kartı olmayan güçler kod ile çizilen kartı kullanır.
