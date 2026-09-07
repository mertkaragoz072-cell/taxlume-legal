# Golden Town — Store Listing Copy

Draft copy for the App Store (App Store Connect) and Google Play Console.
Character counts are noted next to length-limited fields — trim further if
a store's actual limit differs slightly from what's listed here.

---

## App Store (Apple)

**App Name** (30 char max): `Golden Town` (11)

**Subtitle** (30 char max): `Town Economy & Inflation Sim` (29)

**Promotional Text** (170 char max, editable without a new build):

> Trade across a growing world of towns, automate your strategy, and
> prestige your way to a mythic trading empire while inflation looms.

**Keywords** (100 char max, comma-separated, no spaces):
```
economy,inflation,tycoon,trading,market,strategy,town,business,finance,automation,prestige
```

**Description** (4000 char max):

```
You're the mayor of a growing town — and its economy is entirely in your
hands.

Buy and sell bread, milk, wood, iron, cloth, and more in a living market
where every trade moves the price. Sell too much and prices crash; buy too
much and they spike. Watch the Town Price Index closely: let inflation run
wild and hyperinflation will end your run.

GROW YOUR TOWN
• Send caravans to trade with neighboring towns, a whole metropolis of
  luxury goods, and — for the truly dedicated — legendary and mythic
  trading partners reachable only by prestiging again and again
• Unlock new goods over time as your town develops
• Research upgrades, hire workers, and invest in property
• Expand your storage and lock in guaranteed bulk deliveries once you're
  moving serious volume
• Set up automatic buy/sell rules that trade for you while you're away

MANAGE YOUR MONEY
• Borrow from the bank when you need capital — but interest adds up
• Bet on where prices are headed with forward contracts, or lock in a
  guaranteed future price with bulk delivery contracts
• Balance taxes carefully: too much makes villagers unhappy and speeds up
  inflation

BUILD A LEGACY
• Prestige once you've grown enough for permanent bonuses and skill
  points — keep going to earn Legendary Points and unlock a mythic tier
  of trade
• Take on optional harder-mode modifiers after your first prestige for an
  extra reward
• Chase a new weekly challenge every real week, daily quests, seasonal
  price events, dozens of achievements, and a daily login streak
• Back up your progress any time with a simple save code

Golden Town is completely free to play — no ads, no in-app purchases, no
account required. Everything happens locally on your device. Play in
Turkish or English, switch anytime.

Can you out-manage inflation and build the richest town around?
```

---

## Google Play

**Title** (30 char max): `Golden Town` (11)

**Short description** (80 char max):
```
Build your town's economy, trade smart, and keep inflation under control.
```
(75 chars)

**Full description** (4000 char max): same text as the App Store
description above.

---

---

## Türkçe (App Store & Google Play)

**Uygulama Adı**: `Golden Town`

**Alt Başlık / Kısa Açıklama** (App Store altyazı, 30 karakter):
`Kasaba Ekonomisi ve Enflasyon` (30)

**Play Store kısa açıklama** (80 karakter):
```
Kasabanın ekonomisini yönet, akıllıca ticaret yap, enflasyonu kontrol altında tut.
```

**Anahtar kelimeler**:
```
ekonomi,enflasyon,simülasyon,ticaret,piyasa,strateji,kasaba,iş,tycoon,finans,otomasyon
```

**Açıklama** (her iki mağaza için):

```
Büyüyen bir kasabanın belediye başkanısın — ve ekonomisi tamamen senin
elinde.

Ekmek, süt, odun, demir, kumaş ve daha fazlasını canlı bir piyasada al sat;
her işlem fiyatı etkiler. Çok satarsan fiyat çöker, çok alırsan fırlar.
Kasaba Fiyat Endeksi'ni yakından takip et: enflasyonu kontrolden
çıkarırsan hiperenflasyon oyunu bitirir.

KASABANI BÜYÜT
• Komşu kasabalara, lüks ürünlerle dolu bir metropole ve — gerçekten
  kararlıysan — art arda prestij yaparak ulaşabileceğin efsanevi ve mitik
  ticaret ortaklarına kervanlar gönder
• Kasaban geliştikçe zamanla yeni ürünler açılır
• Araştırma yap, işçi tut, mülke yatırım yap
• Depolama kapasiteni büyüt, ciddi hacimlerde ticaret yapmaya başlayınca
  garantili toptan teslimat sözleşmeleri yap
• Sen yokken senin yerine alım satım yapacak otomatik kurallar kur

PARANI YÖNET
• İhtiyaç olduğunda bankadan kredi çek — ama faiz birikir
• Vadeli işlemlerle fiyatların nereye gideceğine bahse gir, ya da toptan
  teslimat sözleşmeleriyle gelecekteki fiyatı garantile
• Vergiyi dikkatli ayarla: çok fazla vergi köylüleri mutsuz eder ve
  enflasyonu hızlandırır

BİR MİRAS BIRAK
• Yeterince büyüyünce Prestij yaparak kalıcı bonuslar ve yetenek puanları
  kazan — devam edersen Efsane Puanı kazanıp mitik bir ticaret katmanı
  açarsın
• İlk prestijinden sonra isteğe bağlı zorluk modifikatörleriyle daha
  zorlu bir koşuya karşılık ekstra ödül kazan
• Her gerçek hafta yeni bir haftalık meydan okuma, günlük görevler,
  mevsimsel fiyat etkinlikleri, onlarca başarım ve günlük giriş serisi
  seni bekliyor
• İlerlemeni istediğin an basit bir kodla yedekle

Golden Town tamamen ücretsizdir — reklam yok, uygulama içi satın alma yok,
hesap gerektirmez. Her şey cihazında yerel olarak gerçekleşir. Türkçe ya
da İngilizce oyna, istediğin zaman değiştir.

Enflasyonu yönetip en zengin kasabayı sen mi kuracaksın?
```

---

## Screenshots

Five 1290×2796px screenshots (Apple's 6.7"/6.9" App Store size, also well
within Google Play's limits) are checked into `store-assets/screenshots/`:

1. `01-market.png` — the market, mid-trade, with a price chart
2. `02-trade.png` — a caravan en route on the road banner, plus the
   neighboring-town/metropolis/legendary/mythic trading tiers
3. `03-town.png` — town rank, tax policy, and the Prestige panel
4. `04-research.png` — the research tree
5. `05-achievements.png` — Hall of Fame, lifetime stats, and net worth
   history

Captured from a save with some progress (a couple of prestiges, a few
goods owned, an active caravan) rather than a brand-new game, so they
show what the game becomes rather than an empty starting state. No
preview video is included — that still needs to be recorded separately.

## Notes

- Both stores' descriptions claim "no ads, no in-app purchases, no account
  required" and "everything happens locally on your device" — verified
  true against the codebase (see `PRIVACY.md`) as of this writing. If that
  ever changes (ads, IAP, or a backend get added), update this copy and
  `PRIVACY.md` together.
- Category suggestion: Games → Simulation (App Store) / Simulation (Play
  Store).
- Age rating: no violence, gambling-style mechanics are limited to a
  cosmetic "forward contract" price bet with in-game currency only (no
  real-money wagering) — should qualify for the lowest tier on both
  stores, but confirm against each store's own questionnaire.
