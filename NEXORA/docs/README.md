# docs

Tasarım ve teknik notlar.

## Sprite/animasyon standardı (görseller eklenirken uyulacak)
- Format: şeffaf PNG, `snake_case`, küçük harf, ASCII.
- Karakter kare boyutu: **224×176 px** (erkek karakter sheet'inden; kare başına ortak tuval). Düşmanlar için ayrı ölçü belirlenecek.
- **Pivot:** ayakların orta noktası = `(112, 164)` (alttan 12 px yukarı). Çizim kodu bu noktayı yüzeye oturtur (`render/draw.js → onSurface`).
- Bakış yönü: **sağa**; sola dönüş kodda yansıtılarak yapılır (ayrı sol kare üretilmez).
- Kare sırası: `<anim>_01`, `<anim>_02`, … sıralı; sprite sheet kullanılırsa yanında `sheet.json` (kare adları, sıra, FPS, pivot).
- FPS (öneri): idle 8, run 14, attack 16/16/14, jump 10, hurt 10, death 8, turn 10 (değerler `data/male_animations.json`).
- Oyun içi ölçek: `scale` alanı (erkek: 1.15). Kaynak düşük çözünürlüklü olduğundan büyütme.
- Stil: kalın temiz outline (`#1f2a44`), canlı ama yumuşak renk, hafif cel-shading.

## Kamera ve oynanış (referans: `assets/references/nexora_camera_gameplay_reference.png`)
- **Kamera:** yandan, hafif yukarıdan (≈15–20°). Gezegen çok büyük (`planet.radius` = 2000 birim) olduğundan yüzey ekranda yumuşak bir tepe gibi görünür; dünya hâlâ yuvarlaktır (açı tabanlı).
- **Görüş:** yatayda `camera.visibleWidthUnits` = 700 birim (≈ 8 kahraman boyu; referans 8–12), dikeyde 420 birim; ölçek `min(w/700, h/420)`. Yalnızca yatay ekran hedeflenir (tablet oranlarına kadar uyar).
- **Yerleşim:** kahraman ekranın solunda (`heroScreenX` 0.30), zemin yüksekliği `groundScreenY` 0.64; tepe noktası ekran ortasında → düşmanlar sağdan hafif yokuş aşağı gelir, ekranın hemen dışında doğar (`enemies.spawnOffscreen`).
- **Oran:** kahraman ≈ 98 birim (sprite ölçeği 1.15), goblin ≈ 63 birim (baseScale 1.05) — kahraman düşmandan belirgin büyük. Düşman ölçeği `enemies.baseScale × def.size`; referanstaki oranlar: küçük 1.0×, orta 1.3×, büyük 1.8× (`data/enemies.json` → `size`; şimdilik yalnız goblin).
- **Parallax katmanları** (`src/render/parallax.js`). Sprite varsa: gökyüzü + bulut sprite'ları, iki ada katmanı (`data/world_props.json → islandLayers`); yoksa `data/config.json → parallax` placeholder çizimi. Eski placeholder listesi: 5 gökyüzü+bulut, 4 uzak adalar (0.04), 3 kale/şehir (0.08), 2 dağ (0.16) ve ağaçlar (0.32), 1 zemin detayları (çit, kaya, çalı; yüzeyle birlikte hareket eder), 0 oyun alanı.
- **HUD (referansa göre):** sol üstte portre + kırmızı HP ("120 / 120") + `Lv.` çubuğu (turuncu = XP); sağ üstte coin ve gem; solda ayarlar/envanter/görev düğmeleri **pasif yer tutucu** (sistemleri henüz yok). Gem sayacı da yer tutucu (henüz kazanılmıyor).
- **Hasar yazısı:** büyük kırmızı `-28`; düşman HP çubuğu kırmızı, başın üstünde.
- Referanstaki "saldırı animasyonu" altın hilal: bizim erkek sprite'ları mavi efekt içeriyor; altın efekt yok.

## Yatay (landscape) mod — oyun yalnızca yatay için tasarlandı
- **Kilit:** `manifest.webmanifest` (`orientation: landscape`, `display: fullscreen`); ilk dokunuşta tam ekran + `screen.orientation.lock('landscape')` denenir (Android Chrome). iOS bunu desteklemez → dikey tutulursa oyun **duraklar** ve "Lütfen telefonu yatay çevirin" uyarısı çıkar. Mobil paketlemede (Capacitor vb.) yön yerel ayardan da kilitlenmeli.
- **Joystick:** sol alta **sabit** (güvenli alan payıyla); dokunma alanı ekranın sol %55'i. Sağ taraf yetenek/saldırı düğmeleri için boş bırakıldı. Klavye (A/D, ←/→) da çalışır.
- **HUD:** varsayılan değerler telefon yüksekliğine (≈ 360–440 px) göre sıkı; `min-height: 560px` üstü (tablet) büyütülür. Test edilen boyutlar: 640×360, 740×360, 844×390, 932×430 — taşma yok.
- **Görüş:** `min(w/700, h/420)` ölçeği; yatayda kahraman solda (%30), zemin alt %36.

## Görsel/oynanış yenilemesi (güncel durum)
- **Kamera:** yandan 2D, zoom uzak (`visibleWidthUnits` 860 × `visibleHeightUnits` 500); kahraman ekranın %36'sında, önündeki alan geniş; zemin dev bir yay (R = 2000).
- **Şerit (lane):** kahraman, düşman ve coin yüzey çizgisinin 22 birim önünde (çimin üzerinde) durur (`camera.laneDepth`), ayaklara yumuşak gölge çizilir → zemine basar.
- **Otomatik koşu:** girdi yoksa kahraman sağa koşar (`player.autoRun`, `autoSpeed`), önünde düşman varsa durup savaşır; joystick/A-D elle sürer. **Elle saldırı:** sağ alttaki kılıç düğmesi / Space / J (otomatik saldırı da açık).
- **Düşman grupları:** sağ ekran kenarının dışında 2–4'lü gruplar halinde doğar (`enemies.waveMin/Max`), ekranda en fazla 5; ağırlıklı tür seçimi (`weight`, `minLevel`: ogre seviye 3+). Düşmanlar önlerindeki düşmanın içine girmez (`enemies.separation`). Düşmanın HP barı sprite yüksekliğine göre başının üstünde.
- **Parallax (uzaktan yakına):** gökyüzü+güneş → uzak bulutlar (0.012) → uzak adalar (0.03, %45 sis) → orta adalar/kale (0.07, %18 sis) → ufuk sis bulutları (0.10) → uzak tepe siluetleri (0.18) → yakın ağaç/çalı şeridi (0.36, %42 sis) → zemin + dekor (1.0). Sprite'lar gökyüzü rengine doğru "atmosferik sis" ile soldurulur; ufukta sis bandı zemini arka planla birleştirir. Kod: `src/render/parallax.js`.
- **HUD:** altın çerçeveli portre, HP + `Lv.`/XP, coin + gem, küçük pasif yan düğmeler; sol altta şeffaf cam joystick, sağ altta kırmızı saldırı + iki pasif yetenek düğmesi.

## Görsel polish (en son)
- **Ölçekler:** kahraman ≈ 81 birim (sprite ölçeği 0.95, önceki 1.15'ten ≈ %17 küçük); küçük goblin 68 (≈ %16 küçük), normal goblin 80, **elite ogre 152**. Yan etki: baked saldırı efekti kahramanla birlikte küçüldü; vuruşta düşmanın gövdesinde, düşman boyuna göre ölçeklenen mavi kıvılcım (`hitFx`) çıkar.
- **Zemin teması:** kontur siyah yerine ince (≈ 2.2 birim), koyu yeşil ve yumuşak (hafif dış gölge). Kahraman/düşman/coin şeridi 14 birim önde; ayakların hemen altında küçük yumuşak gölge.
- **Elite/boss:** `data/enemies.json → elite: true` (ogre). Seviye 3+'tan itibaren ilk 22 sn sonra, sonra her ≈ 30 sn'de **bir tane** doğar; elite varken normal düşman üst sınırı 4 → 2. Normal düşman en fazla 4 (gruplar 2–3'lü), sağ ekran kenarının 130 birim dışından girer (aniden belirmez).
- **Gerçek vuruş:** saldırı başlayınca savurma etki anına (`player.hitDelay` 0.16 sn) kadar bekler, hasar o andaki güncel konumlara göre kahramanın baktığı yöndeki vuruş kutusunda (menzil + düşman yarı genişliği) uygulanır. Vurulan düşman geriye yaslanır/ezilir, ölürken yan yatıp solar.
- **Önde dekor:** ön plan kaya/çalıları küçültülüp zeminde ayakların altına (derinlik 66–118) taşındı; hiçbir karakteri örtmez. Ağaç/çit/tabela karakterlerin arkasında kalır.

## Goblin animasyonları (en son)
- Düşmanlar artık statik değil: `data/enemy_animations.json`'daki gerçek kareleri oynatır (walk döngüsü, attack, hurt, death). Durum makinesi `src/game/systems.js` (düşman döngüsü), çizim `src/render/characters.js → drawEnemy`.
- **Saldırı:** temas menzilinde düşman durur, saldırı animasyonunu oynar, hasarı animasyonun etki anında (`impact`) — oyuncu hâlâ menzildeyse — uygular. Hafif düşmanın (knockResist < 0.5) saldırısı vuruşla bölünür; elite bölünmez.
- **Vuruş/ölüm:** vurulunca hurt karesi + beyaz parlama + geri itme; ölünce death karesi, sonra solar.
- **Tür adları:** `goblin_scout` (küçük), `goblin_warrior` (normal), `goblin_brute` (**elite**, eski `ogre_brute`).

## Son polish
- **Oyuncu:** sprite ölçeği 1.05 (≈ %10 büyük, ≈ 89 birim); ayak altında küçük oval gölge; koşarken/saldırırken hafif squash-stretch, hasarda kırmızı parlama + ezilme. Saldırı efekti sprite karelerinin parçası olduğu için oyuncuyla birlikte ölçeklenir.
- **Düşmanlar:** küçük/normal goblin boyları aynı; elite brute %15 küçük (132 → 112 birim). Normal düşman en fazla 3 (gruplar 2–3'lü, aralarında 110–210 birim boşluk, her düşmana ±%16 rastgele hız → sıkışık sabit sıra oluşmaz, `separation` 1.25). Elite seyrek: ilk 40 sn sonra, sonra ≈ 50 sn'de bir; elite varken normal düşman üst sınırı 1.
- **Zemin:** kontur daha ince (≈ 1.6 birim) ve yarı saydam koyu yeşil; ayak gölgeleri daha yumuşak oval.
- **Parallax:** hafifletildi (gökyüzü bulutları 0.009, uzak adalar 0.022, orta adalar 0.052, sis 0.07, tepeler 0.13, ağaç şeridi 0.26, zemin 1.0). Ön plan dekoru karakterlerin altında kalır.
- **HUD:** soldaki 3 menü ikonu daha görünür (opaklık .92, altın ince çerçeve). Ekranda aynı anda en fazla 8 hasar yazısı (ömür 0.55 sn) ve 4 vuruş kıvılcımı.

## Combat polish
- **Saldırı efekti:** gömülü efekt katmanı kılıç ucuna sabitlenip %50 küçültülür (`player.slashFxScale`), %90 opak; gövde/yüz/kılıç tam boy kalır. Vuruş kıvılcımı küçük ve kısa (en fazla 4).
- **Saldırı üst üste binmez:** önceki saldırı animasyonu %90 bitmeden yenisi başlamaz (cooldown 0.62 sn).
- **Elite:** HP 240 (normal goblin 42); normal ekranın 260 birim daha dışından doğar ve normal düşman hayattayken oyuncudan ≈ 190 birim uzakta bekler, sonra ilerler.
- **Mesafe:** düşmanlar oyuncunun içine girmez (temas menzilinin %55'inden yakına girerse geri itilir); ölçülen en yakın mesafe 31 birim. Normal düşman en fazla 3.

## Kahraman seçimi
`ANIMS.hero` aktif kahramanın animasyon verisidir (`core/config.js`). Varsayılan `male`; `?hero=female` veya `data/config.json → player.character`. Kadında tek `attack` animasyonu var (erkekte `attack_1-3` kombo); sistem eksik kombo adında `attack`'a düşer.

## Karakter seçimi
- Açılışta **seçim ekranı** (logo + iki kart: Erkek / Kadın Savaşçı). Seçim sonrası mevcut oyun aynen başlar; Yeniden Başla aynı karakterle devam eder. Son seçim hatırlanır (`localStorage`, kartta altın çerçeve). URL `?hero=male|heroine|female` seçim ekranını atlar (test için).
- Kahramanlar: `male` (kare tabanlı, 3'lü kombo), `heroine` (tek görsel, prosedürel animasyon), `female` (önceki animasyonlu sheet, yalnız `?hero=female`). `ANIMS.hero` aktif kahramandır; `setHero(id)` (core/config.js). Yeni kahraman eklemek: veri dosyası + `HEROES` listesi.

## Kadın savaşçı animasyon sistemi
- Kare tabanlı + prosedürel yedek (animasyon başına). Kurulum ve kurallar: `assets/characters/female/README.md`. Run mesafeye bağlı kare (`player.stride`), tek ölçek/pivot, doğrulama betiği `tools/build_female_animations.py`.

## Yetenekler (data/skills.json)
- Yıldız düğmesi / **E**: *Yıldız Patlaması* (seviye 3'te açılır, bekleme 12 sn, 3× hasar, önünde yarıçap 150 birim, geri iter). Şimşek düğmesi / **Q**: *Mavi Dalga* (bekleme 6 sn, 2× hasar, ileri giden dalga, menzil 380, geçtiği her düşmana bir kez vurur).
- Düğme üstünde bekleme süresi dilimi; hazırken parlar; seviye açılmamışsa gri. Mantık `src/game/skills.js`, çizim `render/effects.js → drawSkillFx`. Yeni yetenek = `skills.json` kaydı + HTML düğmesi.

## Ödül hissi
- **XP:** düşman ölünce başında `+N XP` (mavi) çıkar. **Level-up:** ayaklardan genişleyen altın halka + yükselen ışık çizgileri, portre ve `Lv.` çubuğu "pop" animasyonu, `LEVEL UP!` yazısı.
- **Coin/Gem:** toplanınca ilgili HUD kutusu pop yapar. **Gem** (mor elmas) elite'ten 1–2 adet garanti, normal goblinlerden küçük şansla (`enemies.json → gems / gemChance`) düşer; coin gibi mıknatısla toplanır, HUD gem sayacını artırır.
- Olay kancaları: `src/game/systems.js → events` (onCoin, onGem, onLevelUp, onKill, onHit…). Ses ve kayıt da bu kancalara bağlanır.

## Ses (src/core/audio.js)
- **Harici ses dosyası yok**: tüm efektler (kılıç savurma, vuruş, ölüm, hasar, coin, gem, level-up, iki yetenek, game over, tık) ve sakin bir pentatonik müzik döngüsü Web Audio ile üretilir. Tarayıcı kuralı gereği ses ilk dokunuş/tuşta açılır.
- Soldaki **hoparlör düğmesi** (eski ayar ikonu) veya **M** sesi açar/kapatır; seçim `localStorage` ('nexora_sound') ile hatırlanır. Aynı ses 25–45 ms içinde tekrar çalmaz (yığılma yok). Ses ayarları: `audio.js` içindeki `SFX` tablosu ve `musicGain` (0.16).
- Not: sesler kodla sentezlendiği için profesyonel kayıtlar gibi değildir; gerçek ses dosyaları `audio/sfx`, `audio/music` klasörlerine eklenip `SFX`/müzik yerine yüklenebilir.

## Kayıt (src/core/save.js)
- Yalnızca tarayıcı `localStorage` ('nexora_save_v1'), kahraman başına: seviye, XP, coin, gem, toplam öldürme, en iyi seviye + son seçilen kahraman. Sunucu/harici istek yok.
- **Otomatik kayıt:** 5 sn'de bir, seviye atlayınca, ölünce, sekme gizlenince/kapanınca (yalnız değişiklik varsa yazar). Açılışta seçim kartında `Lv. N · coin` görünür, son oynanan kart altın çerçeveli.
- **Ölünce** seviye/coin/gem kalır; "Yeniden Başla" aynı seviyeden yeni deneme başlatır. Can ve hasar seviyeye göre türetilir (level-up formülüyle aynı).
- Seçim ekranındaki **Kaydı Sil** (iki dokunuş: "Emin misin?") tüm kaydı siler. Bozuk kayıt sessizce yok sayılır. Yeni bir veri alanı eklerken `Save.write/apply` ve sürümü (`KEY`) güncelle.

## Oynanış döngüsü: otomatik ilerle → dalga → güçlen (güncel)
```
otomatik sağa koş → düşman → savaş (otomatik saldırı) → öldür → ilerle → 5 dalga → GÜÇLEN! (3 karttan 1) → yeni dalga …
```
- **Hareket:** joystick YOK. Kahraman sürekli sağa koşar (`player.autoSpeed` × hareket hızı gücü); önünde `engageRange` içinde canlı düşman varsa durup savaşır, bitince devam eder. Saldırı yönü hep sağ. Oyuncunun kontrolü: ⭐ Yıldız Patlaması (Q, 5 sn), ⚡ Mavi Dalga (E, 10 sn), isteğe bağlı elle saldırı, güç seçimi. Bekleme sırasında düğme kararır ve kalan saniye yazar.
- **Dalgalar** (`data/waves.json`, `WaveManager.js`, `EnemySpawner.js`): `intro` ("WAVE n" afişi) → `fight` (düşmanlar **sırayla**, aynı anda en fazla 3 normal) → `complete` ("WAVE COMPLETE" + coin bonusu) → sonraki dalga. Düşman sayısı = min(14, 4 + ⌈0.8·n⌉); HP +%10, hasar +%5 / dalga; goblin savaşçı 2. dalgadan itibaren artan oranda gelir. Ölünce **aynı dalga baştan** başlar (seviye/güçlendirmeler kalır).
- **Her 5 dalgada** (`upgradeEvery`): oyun tamamen **durur**, büyük **"GÜÇLEN!"** başlığı ve 3 rastgele kart (`UpgradeManager.js`, `ui/UpgradeCard.js`). Yalnız biri seçilir; seçilen büyüyüp parlar, diğerleri kaybolur (0.6 sn), güç kalıcı uygulanır, oyun devam eder. 1/2/3 tuşları da çalışır. HUD'da üstte `WAVE 3 / 5` (5'lik blok içindeki sıra), altında dalga no ve kalan düşman.
- **Elite:** her 5. dalganın sonunda `goblin_brute` (geride bekler, normaller bitince ilerler).
- **Boss** (`bossEvery` = 20, `boss.js`): `goblin_boss` (elite sprite'ının 1.7× büyüğü, kırmızı aura, "BOSS" etiketi, HP 700 × dalga ölçeği, geri tepmez). Özel saldırılar: **yer darbesi** (kırmızı uyarı dairesi → 0.9 sn sonra şok dalgası, 1.6× hasar), **%50 canda 2 destek goblin**, **%30 canda öfke** (hızlanır). Ödül: 40–50 coin + 5–6 gem (+60 coin/6 gem bonus), tam iyileşme ve bir sonraki güç seçiminin **EFSANE** (çift güç, çift seviye) olması.

### Güçlendirmeler (`data/upgrades.json`, `PlayerStats.js`)
| Kategori | Güç | Etki / seviye |
|---|---|---|
| Saldırı | ⚔️ Keskin Kılıç | hasar +%20 |
| | ⚡ Hızlı Savaşçı | saldırı hızı +%15 (animasyon da hızlanır, üst sınır ×3) |
| | 🎯 Keskin Göz | kritik şansı +%10 (taban %5, üst sınır %75) |
| | 💥 Ölümcül Darbe | kritik hasar +%25 (taban ×1.5) |
| Savunma | ❤️ Dev Kalp | maks. can +%25 |
| | 🛡️ Zırh | savunma +%15 (alınan hasar ÷ (1+savunma)) |
| | 💚 Yenilenme | +5 HP/sn |
| Yardımcı | 🏃 Rüzgar Ayağı | hareket hızı +%10 (üst sınır ×2.2) |
| | 💰 Altın Eli | coin kazancı +%20 |
| | ✨ Bilgelik | XP kazancı +%20 |
- Aynı güç tekrar çıkabilir; kart "Lv. 2 → 3" gösterir (ilk kez "YENİ · Lv. 1"). Seviyeler `player.upgrades` içinde, kahraman başına **kayıt dosyasında** saklanır (seviye, dalga, güçlendirmeler).
- **Yeni güç eklemek:** `upgrades.json`'a `{id, category, icon, name, stat, per, fmt, text, weight, cap?}` kaydı eklemek yeterli; stat adı `PlayerStats.derived`'in okuduğu `base` alanlarından biri olmalı (yeni stat için `base`'e ve ilgili sistemde okumaya ekle).
- Not: Yenilenme +5 HP/sn spesifikasyona göre; erken oyunda (can ≈ 120) çok güçlüdür — dengeyi `per` değerinden ayarla.

## Faz 6 — Güç havuzu, build'ler, boss ödülü, HUD çipleri
- `data/upgrades.json`: 18 güç (SALDIRI / SAVUNMA / EKONOMİ / ÖZEL / YARDIMCI), her biri `max` seviye ve gerekirse `cap` ile sınırlı; maks seviyedeki güç kart havuzundan çıkar.
- Kart: kategori etiketi, ikon, ad, bonus ("+10%"), seviye satırı ("YENİ - LV.1" / "LV.2 → LV.3"). Epik (boss sonrası) seçimde bonus ve seviye ×2.
- Build'ler (`builds`): üye güçlerin toplam seviyesi eşiğe ulaşınca bonus verir, 2×eşikte iki katı; HUD'da altın çip. Baskın build'in güçleri kartlarda ×1.6 ağırlıkla çıkar.
- Elementler: ateş = yanma, buz = yavaşlatma, yıldırım = zincir; yetenekler element taşır (`skills.json`). Ayarlar: `config.json → player.burn/chill/chain`.
- Boss (dalga 20, 40…): büyük "BOSS DALGASI" afişi, üstte büyük HP çubuğu, ödül `waves.json → boss.reward` (250 coin × boss coin çarpanı), "BOSS YENİLDİ! +250 COIN" afişi, ardından EFSANE güç seçimi.
- HUD çipleri: `src/ui/buffs.js`. Kayıt: bilinmeyen güç id'leri yüklemede atlanır, seviyeler maks'a kırpılır.

## Faz 7 — Görüntü kalitesi
- Canvas yüksek DPI: `View.dpr = min(devicePixelRatio, 3)` (iPhone 3×); her karede `imageSmoothingQuality = 'high'`. Portre/avatar kırpmaları artık en yakın komşu yerine yumuşak ölçekleniyor.
- Boss ölçeği: `goblin_boss.spriteMul 1.3` (normal goblinin ~2 katı, oyuncunun ~1.6 katı). Boss'un dünya içi mini HP barı kaldırıldı; üstteki büyük HP çubuğu (ad + sayı) kullanılıyor. "BOSS DALGASI" afişi küçültüldü ve ekranın üstüne alındı.
- Kaynak kareler (erkek 224×176, goblinler ~170–230 px) ekranda ~2× büyütülüyor; daha keskin görüntü için yüksek çözünürlüklü kaynak çizim gerekir (kod tarafında yeni asset üretilmedi).

## Faz 8 — Bölüm döngüsü
Bölüm = 5 dalga (`data/waves.json → waves`, dalga başına sabit düşman listesi) → 3 kart → BOSS (Goblin Lordu) → ödül + 3 kart → sonraki bölüm.
Bölüm çarpanı: HP ×(1 + 0.4·(bölüm−1)) → ×1, ×1.4, ×1.8…; hasar +%15/bölüm; her 2 bölümde +1 gözcü. Kayıt: `stage`, `wave` (1–5), `boss`; eski kayıtlar (tek sayı) bölüm+dalgaya çevrilir.

## Faz 9 — Profesyonel geliştirme sistemi
- Ekran: "SEVİYE ATLADIN!" / "Bir geliştirme seç"; kart = nadirlik şeridi, madalyon ikon, ad (KILIÇ USTALIĞI), açıklama (Saldırı Hasarı), bonus (+20%), toplam, seviye ("SEVİYE 1 → 2"). Aynı ekranda 3 farklı güç.
- Nadirlik (`data/upgrades.json → rarities`): COMMON/RARE/EPIC/LEGENDARY; kazanılan seviye 1/2/3/5. Normal seçimde 75/25/0/0, boss seçiminde 35/57/8/0 ağırlık. Yeni güç eklemek: `upgrades` listesine bir kayıt (`title`, `desc`, `stat`, `per`, `max`).
- Yetenek bekleme süresi gücü (`skillCooldown`, alt sınır ×0.4). HUD: en fazla 6 çip.

## Faz 10 — Sadeleştirilmiş kart havuzu
Kart havuzu 8 güçle sınırlı (Hasar +10%, Can +20%, Kritik +10%, Saldırı Hızı +15%, Hareket Hızı +20%, Alınan Hasar −10%, Yetenek Soğuma −10%, Altın +20%); diğerleri `upgrades.json`'da `"disabled": true` (silince geri gelir).
Boss sonrası kart ekranı kapalı (`waves.json → bossUpgrade: false`; `true` yapılırsa boss sonrası da 3 kart açılır). Seçimde seçilen karttan karaktere enerji küresi uçar, diğer kartlar küçülüp kaybolur.

## Faz 11 — Yerleşim ve ölçek
Kamera: `visibleHeightUnits 460`, `groundScreenY 0.70`, `heroScreenX 0.37` (zemin boşluğu azaldı). Kahraman sprite ölçeği ×1.085 (+kamera ≈ ×1.18 ekranda), goblinler ×1.03 (+kamera ≈ ×1.12); HP bar boyları buna göre. Spawn: sağ görünür alanın %80'i (`enemies.spawnScreenFrac`), üst üste binmeyi önleyen `spawnMinGap`, 0.3 sn fade-in. Vuruşta hafif sarsıntı; dalga değişince üst "WAVE n / 5" kutusu büyüyüp küçülür.

## Faz 12 — Savaş mesafesi ve performans
Düşman `contactRange` ×1.5 (büyüyen sprite'larla oyuncu–düşman arası küçük, doğal boşluk), hit flash opaklığı 0.8 → 0.5. Uyarlanabilir çözünürlük: kare süresi 90 kare boyunca ortalama >26 ms ise `View.dprCap` 0.5 kademe düşer (3 → 1.25, geri artmaz); `?hq=1` ile kapatılır.

## Faz 13 — Kart sistemi altyapısı (UI yok)
`data/cards.json` (tanımlar) + `src/game/CardSystem.js` (ownedCards / equippedCards, en çok 3 aktif, seviye 1–5: bonus = effectValue × seviye). Bonuslar `PlayerStats.derived()` içinde mevcut statlara eklenir (attack→damageMul, crit→critChance, maxHp→maxHpMul); kaydedilir (`cards`). Test: `?cards=3` (3 kartı Lv.3 verip kuşandırır) veya konsolda `__cards.grantCard('warrior_power'); __cards.equipCard('warrior_power')`. Loglar `[CardSystem]` önekli; kapatmak: `__cards.log = false`.

## Faz 14 — 4 farklı güç sınırı
Oyuncu 4 farklı güç (`upgrades.json → maxDistinct: 4`) seçince kart ekranında yalnız sahip olduğu 4 gücün üst seviyeleri çıkar (maksimumdaki güç çıkmaz; hepsi maksimumdaysa ekran atlanır).

## Faz 15 — Savaş hissi ve boss mekanikleri
- `src/game/fx.js`: hit-stop (vuruş 0.04 sn, kritik 0.07, boss ölümü 0.14; saldırı sayacı akmaya devam eder → saldırı hızı değişmez), slash/kıvılcım, ölüm dumanı, yer tozu, hasar kıvılcımı parçacıkları. Kritik: büyük/pop'layan altın sayı + daha çok kıvılcım. Oyuncu hasar alınca kısa kırmızı kenar parlaması.
- Goblin: saldırıdan önce `enemies.windupSec` (0.18 sn) hazırlık (geri çekilip yükselir); vuruş hazırlığı böler. Ölümde duman parçacığı.
- Goblin Lordu (`boss.js`, ayarlar `waves.json → boss`): durum makinesi idle → windup (telegraph) → dash → recover. Saldırılar: **hammer** (yakın çekiç), **charge** (geri çekil, kırmızı daire + şerit, hücum), **ground smash** (0.7 sn uyarı, geniş şok dalgası). Öfke %50 (arası ×0.8, hız ×1.15, destek çağrısı), delilik %20 (arası ×0.6, hız ×1.35). HP barı yumuşak iner, arkada hasar izi, öfkede renk değişir.
- Kahraman kendi hareket etmediği için "okuyup kaçma" otomatik geri çekilmeyle: `boss.dodge.chance` (0.55) olasılıkla uyarıdan 0.12 sn sonra geri koşar; boss özel saldırıdayken kahraman yerinde bekler.
- Boss ölümü: büyük parçacık patlaması + sarsıntı + hit-stop, "BOSS YENİLDİ! +250 COIN", ardından "WAVE COMPLETE · Bölüm n tamamlandı".

## Faz 16 — Wave ve bölüm ilerlemesi
Bölüm = 5 dalga (3 / 5 / 6 / 8 / 10 goblin, `waves.json → waves`) → kart seçimi → BOSS (Goblin Lord + 3 goblin; giriş: ekran kararır, "BOSS WAVE · GOBLIN LORD GELİYOR!") → "BOSS DEFEATED!" → **BÖLÜM TAMAMLANDI** ekranı (+50 altın, +1 kristal, +XP; `data/chapters.json → reward`) → DEVAM ET → sonraki bölüm.
Dalga ölçeği (`stage.waveScale`): HP ×1/1.15/1.30/1.45/1.65, hasar, hız ve saldırı aralığı da kademeli; boss'a uygulanmaz (kendi statları + bölüm çarpanı). Bölüm adları: MEADOWLANDS → DARK FOREST → FROZEN PEAKS (sonra "… II"). Kayıt: bölüm, dalga, seviye, XP, coin, gem, karakter, güçler; bölüm tamamlama ekranı açıkken kapansa bile yeni bölümden devam eder.

## Faz 17 — Combat polish & denge
Maks can her karede formülden doğrulanır (120 + 15/seviye, × can güçlendirmesi; hatalı değer düzeltilir). Tek vuruş maks canın %35'ini geçmez (`player.maxHitFrac`). Hit-stop 0.05 (kritik 0.08). Düşmanlar oyuncunun içine girmez/arkasına geçmez (`en.side` + `minGap = genişlik/2 + 26`, boss +30). Boss: hasar 22, hammer ×1.4 / charge ×1.2 / smash ×1.6, hitbox'lar dünya birimi yarıçaplarıyla sprite'tan bağımsız. Boss ölümü: slow motion (~1 sn), XP/coin patlaması, ödüller bir kez (gem/coin doğrudan eklenir, yerdekiler görsel).

## Faz 18 — Çarpışma, boss mesafesi ve ödül akışı
Düşmanlar birbirinin içine girmez (oyuncuya sıralı, genişlik payıyla), oyuncunun içine girmez/arkasına geçmez. Boss savaş mesafesi: boss kendi `contactRange/engage/hitRange/hitPad/minGap` ile oyuncudan ~185 birim uzakta durur (ekranda oyuncu %37, boss ~%55); hammer/smash/charge menzilleri buna göre. Boss ölünce sahnedeki diğer düşmanlar ödülsüz temizlenir, HP barı kaybolur; banner "+250 COIN · +300 XP"; boss savaşı sırasında seviye atlandıysa (`waves.json → bossUpgrade: 'ifLevelUp'`) önce kart ekranı, sonra bölüm tamamlama. Hasar yazıları üst üste binmez; çoklu seviye atlama tek "LEVEL UP! ×n" yazısı. Boss giriş overlay'i 1.8 sn.

## Faz 19 — Bug fix: tek seferlik olaylar, ilerleme korunumu, yazı süreleri
LEVEL UP yalnız bir kez (`p.lvShown`; anahtarlı yazı yenilenir, ~1.8 sn); XP yazısı ~1.2 sn, hasar yazısı 0.85 sn; boss yazıları (`tag: 'boss'`) boss ölünce temizlenir; yazılar ekranda en çok 8 ve yukarıda üst sınırda kalır (boss HP barına binmez). Dalga durum bayrakları (`bossDefeated`, `rewardGranted`, `leaving`) her dalgada sıfırlanır; ödül/geçiş tek sefer. Boss ödülü artık canı tam doldurmaz (`healFull: false`) — wave geçişinde can/seviye korunur. Aynı anda en çok `enemies.maxAttackers` (2) düşman saldırır.

## Faz 20 — 6 güç × 4 seviye
Kart havuzu: Saldırı Gücü, Can, Hareket Hızı, Saldırı Hızı, Kritik Şansı, Kritik Hasarı (`upgrades.json → tiers`: seviye başına TOPLAM bonus, artan). Lv1→4: Saldırı +10/20/30/40%, Can +20/35/50/65%, Hareket +20/35/50/65%, Saldırı Hızı +15/30/45/60%, Kritik Şansı +10/20/30/40 puan, Kritik Hasarı +25/45/70/95%. Kart yeni seviyeyi ve toplam bonusu gösterir ("SEVİYE 2 → 3", +32%; "Şu an +20%"). Rarity artık seviye atlatmaz (hepsi +1). Diğer güçler `disabled`.

## Faz 21 — Kilitlenme düzeltmesi ve genel denetim
Hafif düşmanın saldırısı bir vuruşla bölününce 1.6 sn bölünmezlik (`en.noInterrupt`): hızlı vuran oyuncu goblini sonsuza dek kilitleyemez. Denetim: 5 bölümlük (≈33 bin kare) mantık simülasyonu (erkek + kadın), ölüm/yeniden başlama, bozuk/eski kayıt, localStorage yok, karakter seçimi, yetenek/ses, dikey ekran duraklatma, maksimum güç kartı durumu, boss'ta ölüm → yeniden başlama: hata/anomali yok.

## Faz 22 — Harita temaları
Her bölüm kendi haritasını kullanır (chapters.json → theme): DARK FOREST, FROZEN PEAKS, MEADOWLANDS II, DARK FOREST II; MEADOWLANDS mevcut görünümü korur. Tema = gökyüzü renkleri + panorama arka plan şeridi + zemin tonu + o haritanın dekor sprite'ları (`src/render/theme.js`, parallax.js/world.js). Karakter, düşman, HUD, kamera aynı. 5 harita bitince başa döner ("MEADOWLANDS ★").

## Faz 23 — Gezegen plaka zemini (5 gezegen)
Yeni asset sayfasındaki "ZEMİN (SEAMLESS)" plakaları gezegen yüzeyi olarak çevreye dizildi (ayrıntı: `assets/environment/ground/README.md`). Yarıçap 1100, bölüm 4/5 → DESERT RUINS / VOLCANIC REALM temaları (sky/haze/backdrop). Eski dama/çim deseni, toprak lekeleri ve kontur artık yalnız plakası olmayan temalar için yedek. Doğrulama: 5 bölüm ekran görüntüsü, ±π dikişi, erkek+kadın, konsol hatası 0.

## Faz 24 — Karakter–zemin derinliği
- Aktörler (düşman+oyuncu) `render/renderer.js`'te ayrı katmana çizilir; her aktörün ayağına `groundBounce` (source-atop, zeminin yeşil/toprak yansıması) işlenip ana tuvale bindirilir → sprite zemine ait görünür.
- `groundShadow` (draw.js): geniş yumuşak gölge (güneşe göre hafif sağa kayık) + ayakların altında koyu temas gölgesi; tabanlara oturacak şekilde ayarlı.
- Ön plan otları (`world_props.json → decor`, layer front, depth 36–52): ayakların alt kısmını örten çim/çiçek tutamları.
- Ayak hizası `camera.laneDepth` 40 (toprak yolun ortası), koşarken adım tozu (`fx.stepDust`).
- **Faz 24b (profesyonel cila):** (1) güneşten düşen silüet gölgesi (`characters.js → castShadow`: sprite silüeti ayaktan yere yatırılır, sağa uzar; oyuncu/düşman/boss); (2) zemin atmosferik perspektifi (ufukta hafif aydınlık sis, alta doğru koyulaşma — `world.js drawTileGround`); (3) sahne renk derecelendirmesi `drawGrade` (sol üst sıcak ışık + köşe vinyeti); (4) aktör katmanı yalnız karakter bandı (heroY−340…+140 birim) için temizlenip bindirilir (performans).
- **Faz 24c — eşit zemin yüksekliği:** kahraman/yüzey çizgisi artık ekranın üstünden yüzdeyle değil, ekranın ALTINDAN sabit birimle yerleştirilir (`camera.groundBelowUnits` = 138, `core/view.js`). Böylece yüzey çizgisi ile ekran altı arasındaki zemin her ekran oranında aynı yükseklikte (138 birim × ölçek); geniş ekranlarda önceki 0.70 ile aynı sonuç, dar/yüksek ekranlarda zemin kalınlaşıp boşluk bırakmaz.

## Faz 25 — Meadowlands final kontrol (yayın adayı)
Kapsam: yalnız ilk yeşil dünya (Meadowlands; tüm bölümler aynı dünyada ★ zorluk katlanarak döner). Yeni dünya/tema yok.
- **Mantık soak'u** (erkek + kadın, 5 bölüm × (5 dalga + boss), kartlar, bölüm sonu, ölüm/yeniden başla): 0 anomali, 0 konsol hatası, maks. 6 düşman / 90 parçacık / 5 yazı.
- **Doğrulananlar:** kayıt/yükleme (seviye, güçler, dalga, coin/kristal reload sonrası aynı), boss ödülü + bölüm sonu ödülü HUD'a yansır, kart seçimi (3 farklı kart, 4 seviye, üst seviye sunumu), karakter seçimi, ölüm/Oyun Bitti → yeniden başla, bölüm tamamlandı ekranı, sonsuz zemin (±π ve 50 rad), farklı ekran oranlarında eşit zemin yüksekliği.
- **Yeni:** 🎒 Karakter paneli (statlar + edinilen güçler); eskiden pasif "yakında" butonlardı. Açıkken oyun durur (`state.userPause`), Esc/I kısayolu.
- Bilinen sınırlar: gerçek telefon cihaz testi yapılmadı (ortam yazılım çizimi); dekor sprite'ları yumuşatmalı çizilir (yalnız zemin nearest-neighbor); ses efektleri Web Audio sentezi (müzik yok).

- **Faz 26 (grafik cilası):** ufuktaki soluk sis dairesi kaldırıldı (alfa 0.28), zemin çimi üst kenarındaki koyu kesikli çizgi kapatıldı (zemin alt rengi yeşil), mor-mavi taş sprite'ları yüklemede sıcak gri-kahveye çevrildi (core/assets.js warmRock), hasar yazıları daha okunaklı (turuncu-kırmızı, koyu mor kontur).

## Faz 27 — Oynanış + teknik altyapı turu
- **Manuel kaçınma:** düğme / Shift,K,↓ (`data/config.json → dodge`: 0.42 sn sıçrama, 105 birim geri, 1.7 sn bekleme). Süresince dokunulmaz; saldırı tam o sırada isabet edecekse **mükemmel kaçınma** (bekleme sıfırlanır, yavaş çekim, +XP, başarım/görev sayacı).
- **Boss:** öfke fazından itibaren **3'lü çekiç kombosu** (`waves.json → boss.combo`: öne adım, her vuruşta uyarı %15 kısalır); saldırı sonrası "savunmasız" beklemede alınan hasar ×1.25 (`recoverDamageMul`); otomatik geri çekilme şansı 0.55 → 0.30 (artık oyuncunun kendi kaçınması var).
- **Denge:** `tools/tests/balance_sim.js` (pasif vs kaçınan bot). 5 bölümde bölüm ≈ 2 dk, boss 20–40 sn; pasif bot yaklaşık 2 bölümde 1 ölüm, kaçınan bot daha az → değerler değiştirilmedi.
- **Meta (hesap geneli, `data/meta.json`, `src/game/Meta.js`):** 10 başarım, günlük 3 görev (gün tohumlu, ödül elle alınır), kalıcı mağaza (5 ürün: hasar, can, kritik, altın, yenilenme; coin/kristal ile). Panel sekmeleri 🎒: KARAKTER · GÖREVLER · MAĞAZA; başarım/görev bildirimi (toast).
- **Kayıt şema v2:** `Save.migrate` (v1→v2), gelecekteki sürüme dokunmaz, okunamayan kayıt `nexora_save_corrupt` anahtarına yedeklenir.
- **PWA:** `sw.js` (kabuk ağ-öncelikli, görseller önbellek-öncelikli; `tools/build_sw.py` sürüm üretir), kayıt `main.js` içinde (CSP satır içi scripti engeller). Çevrimdışı açılış testi geçti (413 dosya önbellekte).
- **Performans:** statik tam ekran katmanlar önbellekli (gökyüzü/güneş/derecelendirme/zemin sisi), uzak parallax düşük kalite filtre, zemin dilimleri birleştirme + durağan kare önbelleği → kare süresi yazılım çizimde 87 → 35 ms (gerçek cihazda ölçülmeli).
- **Test paketi:** `npm test` (`tools/tests/run_all.js`, 11 test, ≈ 30 sn) + `test:offline` + `balance`. Testler CSP hatasını (SW kaydı) yakaladı.
- **Yayın:** `npm run build:www` → `www/` (≈ 18 MB), `capacitor.config.json`, `store/` (mağaza metni, gizlilik), `docs/RELEASE.md`.
- **Yapılmadı (ayrı ele alınacak):** düşman çeşitliliği (oynanış 2) ve ses/müzik (teknik 2) — ikisi de "2" olduğu için atlandı.

## Faz 28 — Cila ve oyuncu deneyimi turu (5. madde hariç)
- **Kombo zinciri** (`config.json → combo`): son öldürmeden 4 sn içinde yenisi gelirse sürer; 5/10/20/40 zincirde altın+XP +%10/20/35/50; gerçek hasar zinciri bozar. HUD sağ üstte "🔥 ×N KOMBO" + süre çubuğu. **Kusursuz dalga** (`flawless`): dalgada hiç hasar alınmazsa altın (boss: +kristal).
- **Sandık olayı** (`chest`): normal dalga başında %35 şansla önde sandık; yaklaşınca açılır (altın/kristal/can/XP). Başarım + günlük görev sayacı (`chests`).
- **Yetenek ağacı** (`meta.json → skills`, panel YETENEK sekmesi): iki yetenek × (güç +%20, bekleme −%8, alan +%12) × 3 seviye, kristalle, kalıcı; `skills.js` uygular.
- **Rekorlar:** her ölümde skor (öldürme×10 + boss×500 + ulaşılan dalga×50) kaydı, en iyi 5 (`Meta.recordRun`); Oyun Bitti panelinde skor/rekor, KARAKTER sekmesinde liste. (Hikâye modu ★ zorlukla sınırsız sürdüğü için ayrı "sonsuz mod" yerine rekor tablosu.)
- **Hissiyat:** kritik vuruşta mini donma + titreşim, düşük can (≤%30) kırmızı nabız vinyeti + kalp atışı sesi + titreşim, ekran sarsıntısı ayarı.
- **Öğretici** (`ui/Tutorial.js`): ilk oyunda 4 ipucu (otomatik savaş → kaçınma → yetenekler → çanta), dokunarak geçilir, Ayarlar'dan tekrar gösterilir.
- **Ayarlar sekmesi** (`core/settings.js`, kalıcı): ses/müzik/efekt, titreşim, sarsıntı (yok/az/tam), sol el düzeni, büyük düğmeler, renk körü modu (sarı kesikli uyarılar + mavi can çubuğu), düşük efekt modu (çözünürlük ≤1.5×), öğretici, hata günlüğü.
- **Haptik:** `navigator.vibrate` — hasar, kritik, boss ölümü, seviye, kaçınma, sandık, ölüm (titreşim ayarıyla kapanır; iOS Safari desteklemez).
- **Hata günlüğü** (`core/errorlog.js`): yakalanmamış hata/promise son 20 kayıt, Ayarlar'dan panoya kopyala.
- **Düzeltme:** ses sistemi zaten prosedürel müzik içeriyor (önceki notlarda "müzik yok" yazıyordu, yanlıştı).
- Testler: 14/14 (`combo_chest_flawless_runs`, `settings_panel_and_accessibility`, `tutorial_shows_once` eklendi).

## Faz 29 — Bütünlük denetimi
- Tüm paneller (oyun sonu, karakter seçimi, bilgi paneli) tek parşömen tasarımına ve kırmızı kurdele başlığa geçirildi (`.cc-panel` / `.up-card` ile aynı dil).
- Eğitim ipucu (`#hint`) z-index 30'a indirildi; modal katmanlarının (35–40) altında kalır.
- Kaçış butonu ikonu net bir "atılma oku" ile değiştirildi.
- Tüm modüller `node --check`, 14 test, ofline testi ve ekran görüntüleri tekrar doğrulandı; konsol hatası yok.

## Faz 30 — Spot ışıklı öğretici
- `src/ui/Tutorial.js` yeniden yazıldı: 11 adımlı tur (hoş geldin, can/seviye, dalga, coin/elmas, saldırı, 2 yetenek, kaçın, çanta, ses, bitiş).
- Her adımda arka plan bulanıklaşır (`backdrop-filter` + `clip-path` deliği), anlatılan düğme parlayan halkayla açık kalır, yanında parşömen kart çıkar (başlık kurdelesi, açıklama, klavye tuş rozetleri — dokunmatik cihazda gizli, adım noktaları, Atla / İleri).
- Adımlar oyunu durdurur; KAÇIN adımı canlıdır (oyuncu düğmeye basınca ilerler). Güç kartı vb. açılırsa tur geçici gizlenir. Ayarlar → Öğretici ile tekrar izlenir.

## Faz 31 — Modern konuşma balonu
- Öğretici kartı konuşma balonuna dönüştü: oyuncunun karakter portresi "rehber" olarak başlıkta, adım sayacı, kelime kelime beliren metin, vurgulu anahtar kelimeler, ilerleme çubuğu, modern düğmeler ve anlatılan düğmeyi gösteren kuyruk.

## Faz 32 — Evrenler (5 boss = 1 evren)
- `data/chapters.json` artık `worlds` listesi + `stagesPerWorld: 5` taşır. Her bölüm 5 dalga + 1 boss; **5. boss yenilince evren biter**: altın "EVREN TAMAMLANDI!" ekranı (bonus ödül `worldReward`), başarım "Evren Gezgini" (`stat: worlds`), ardından sıradaki evrene geçilir; ilk dalgada "✦ EVREN N · AD ✦" bandı çıkar. Evren listesi bitince başa döner (★), zorluk stage ile artmaya devam eder.
- Evrenler: Meadowlands (I), Emberfall (II, sıcak ton), Frostveil (III, soğuk ton). Özel evren görselleri hazır olana kadar her evren `tint` ile renk derecelendirilir (soft-light + overlay, `drawGrade`); yeni evren eklemek = JSON'a bir satır, görsel seti gelince `theme` alanı doldurulur.
- HUD/seçim ekranı/bölüm sonu metinleri "EMBERFALL · 3/5" biçimine geçti.

## Faz 33 — Evren paketi hattı (assetler için hazırlık)
- `tools/worlds.py new|check|build`: `assets/environment/worlds/<id>/` altına konan `ground.png`, `backdrop.png`, `props/<tall|mid|front|tiny>_*.png` + `world.json` → `world_props.json` (themes/groundTiles), `asset_manifest.json`, `chapters.json` otomatik üretilir; boyut/şeffaflık uyarıları verir. Tam rehber: `assets/environment/worlds/README.md`.
- Eksik parça yedeklenir: evrenin zemini yoksa Meadowlands zemini, görseli hiç yoksa `tint` renk tonu kullanılır (hata yok). Önizleme için `?stage=N` parametresi.
- Sentetik bir test evreniyle (kendi zemin + backdrop + dekor) uçtan uca doğrulandı, ardından silindi.

## Faz 34 — Evrene özgü düşman ve boss çeşitleri
- `data/world_roster.json`: evren id'sine göre `roster` (waves.json'daki goblin_scout/warrior/brute yuvalarının karşılığı), `extras` (2. dalgadan itibaren karışan özel düşmanlar) ve `bosses` (bölüm 1–5 boss türleri; 5. = evren sonu bossu). Tanımsız evren = varsayılan goblin seti.
- Yeni düşmanlar (`data/enemies.json`): Emberfall — Kor İmp (hızlı/zayıf), Kor Muhafız (zırhlı), Kor Canavarı, Patlayıcı İmp (ölünce patlar); Frostveil — Buz Gözcü/Savaşçı/Canavarı (yenilenen, zırhlı), Buz Ezici. Yeni mekanikler: `armor` (hasar azaltma), `regen` (can yenileme), `explode` (ölümde alan hasarı), `tint` (sprite renk kaydırma: hue/sat/light — özel sprite gelene kadar yer tutucu).
- Bosslar: Meadowlands — Goblin Lordu, Goblin Savaş Lordu, Goblin Kralı; Emberfall — Kül Şefi, Kor Devi, Emberfall Hükümdarı; Frostveil — Buz Muhafızı, Kış Avcısı, Donmuş Kral. Her boss `bossCfg` ile genel boss ayarlarını (hammer/smash/charge/combo süreleri, `disable` ile kapalı saldırılar, summonAtHp…) ezer; boss adı HUD ve giriş ekranında görünür.
- Özel düşman/boss görseli geldiğinde: `animFrom`/`tint` yerine kendi sprite+animasyon girişi (data/enemy_animations.json) kullanılır.

## Faz 35 — Meadowlands goblin çeşitleri
- 6 yeni goblin (`data/enemies.json`, `data/world_roster.json → meadowlands.extras`): **Koşucu** (çok hızlı/zayıf), **Mızrakçı** (uzaktan vurur), **Kalkancı** (zırhlı, yavaş), **Çılgın** (canı yarıya inince hızlanır/güçlenir: `rage`), **Şaman** (yakındaki dostları iyileştirir: `heal`), **Bombacı** (ölünce patlar: `explode`). 2. dalgadan itibaren dalga no/2 adet karışır; `minStage` ile zor tipler erken bölümlerde çıkmaz (Bombacı 3. bölümden). Sprite'lar mevcut goblin karelerinin hafif renk/boyut varyantları (yer tutucu).

## Faz 36 — Kılıç görünürlüğü + boy oranı kontrolü
- Sorun: kadın savaşçının saldırısında mavi hilal efekti (`fx_attack_1_slash`) bıçağın üstüne %90 opaklıkla çiziliyor ve bıçağı örtüp "kılıç yok oluyor" gibi görünüyordu. Çözüm: efekt artık gövdeyle birlikte dönen katmanda, kılıcın ARKASINDA ve daha saydam (%70) çiziliyor; bıçak her karede net.
- Boy oranı ölçüldü: kadın kahraman ≈ 97 birim (bekleme kareleri 95.5–96.9, prosedürel kare 96.5 → tutarlı); Goblin Gözcü 70, Savaşçı 82, Canavar 115, Boss 149–165 birim. Oran uygun bulundu, değiştirilmedi.

## Faz 37 — Tam denetim (piksel/hata taraması)
- **Bulunan ve düzeltilen gerçek hata:** Faz 34–35'te `mk()` ile türetilen 14 yeni düşmanın `animFrom` alanı yoktu → animasyon bulunamayınca çizilmiyor (görünmez ama saldırıyordu). Hepsine `animFrom` eklendi; yeni test `every_enemy_has_animations_and_frames` her düşman türünün animasyon + sprite karelerini doğrular. Emberfall düşman tonları turuncu-kırmızıya çekildi (pembe görünüyordu).
- Statik tarama (ESLint no-undef/no-unused): 0 hata; kullanılmayan içe aktarmalar/değişkenler temizlendi. Veri bütünlüğü: manifest yolları, düşman→animasyon, roster→düşman/boss, JSON geçerliliği kontrol edildi.
- Dayanıklılık (soak): 2 kahraman × (bölüm 5/10/15 başlangıcı), 75 sn gerçek süre ≈ 2.5 saatlik oyun; 3 evren + ★ döngüsü (bölüm 22–29'a kadar), 9 boss türünün tamamı, rastgele kaçış/yetenek/saldırı girdisi: 0 istisna, 0 NaN, 0 konsol hatası.
- Arayüz: 568×320, 667×375, 844×390, 932×430, 1024×768 ekranlarda tüm paneller/öğretici/kartlar/evren ekranı taşma denetimi: sorun yok. Bilgi panelindeki fazladan üst boşluk (Faz 29 kurdele dolgusu) giderildi; dar ekranda ayar satırları sarıyor; rekor satırı evren biçiminde ("Evren 2 · 3/5 · W4").
- Öğretici: Enter/→ ilerler, Esc atlar; öğretici sürerken çanta (I) açılmaz. Boss uyarı çemberine koyu dış çizgi eklendi (kırmızı evrende okunurluk).

## Faz 38 — Kadın savaşçı koşu animasyonu (30 kare)
- Kullanıcının verdiği 30 karelik koşu sayfası (`references/nexora_heroine_run_source.png`, alfa kanallı) `tools/extract_heroine_run.py` ile `assets/characters/female/run/run_01..30.png` olarak çıkarıldı: numaralar ve zemin gölgesi temizlendi, boy bekleme karelerine eşitlendi (kafa bandı 62–63 px, toplam 213 px), yer çizgisi satır gölgesinden alınarak zıplama fazları korundu, tuval/pivot bekleme-ölümle aynı (340×235, 170/225).
- `frames.json`: `strideUnits` 2.2 (mesafeye bağlı kare seçimi), `build_female_animations.py` tutarlılık kontrolü temiz. Kalan prosedürel durumlar: attack, hurt.

## Faz 39 — Kadın savaşçı saldırı animasyonu (30 kare, efekt gömülü)
- Kullanıcının verdiği 30 karelik saldırı sayfası (siyah zeminli, ateş hilali/saplama efektli) `tools/extract_heroine_attack.py` ile `attack/attack_01..30.png` olarak çıkarıldı: numaralar silindi, siyah zemin parlama-korumalı alfaya çevrildi (efektler yumuşak şeffaf), boy bekleme/koşuyla eşitlendi.
- Tuval 340→380 px (`tools/widen_heroine_canvas.py`; idle/run/death sağdan dolgulandı, pivot sabit). Kare süreleri `frames.json → durations.attack` (toplam 0.535 sn, saplama kareleri yavaş); `hitDelay` kahraman animasyonundan okunur (`data/config.json → player.hitDelay` yedek); efekt gömülü olduğu için eski hilal çizimi kapalı (`attackFx: baked`).
- Prosedürel (kodla) kalan tek kadın durumu: hurt.

## Faz 40 — Kadın savaşçı hasar alma animasyonu (30 kare) + süre hatası düzeltmesi
- Kullanıcının verdiği 30 karelik hasar sayfası `tools/extract_heroine_hurt.py` ile `hurt/hurt_01..30.png` olarak çıkarıldı (kırmızı ünlem/çizgi efektleri gömülü, numaralar silindi, boy bekleme ile eşit). Kadın savaşçının tüm durumları artık kare tabanlı; kodla çizilen kesme-bebek yalnız ölüm fiziği (ragdoll) yedeği olarak duruyor.
- **Hata düzeltmesi (Faz 39'dan):** animasyon bitişi/saldırı meşguliyeti `kare sayısı/fps` ile hesaplanıyordu; `durations` kullanan animasyonda saldırı 0.53 sn'de bitse de oyun 1.0 sn boyunca saldırı durumunda sayıyor, koşuyu ve yeni saldırıyı geciktiriyordu. `animDuration()` ile düzeltildi; yeni test saldırı/hasar süre eşleşmesini doğrular.

## Faz 41 — Hasar alma geri tepmesi
- `frames.json → recoil.hurt = [7 birim, 0.07 sn, 0.34 sn]`: hasar alınca sprite (gölgesiyle) arkaya 7 birim fırlayıp yumuşakça yerine döner (karelerde yer değiştirme olmadığı için görsel efekt; kahramanın mantıksal konumu değişmez). `build_female_animations.py` alanı `heroine_animations.json`'a yazar, `drawHeroFrames` uygular. Başka animasyon için aynı alan kullanılabilir.
