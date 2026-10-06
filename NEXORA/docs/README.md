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
