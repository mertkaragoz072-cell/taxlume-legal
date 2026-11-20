// Café-life panels: the dish of the day and the special order (both shown in Görevler), guest letters and achievements (menu entries).
// The rules live in game/life.js and game/achievements.js; these only show state and forward taps.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn, Card, Meta, Sheet, Title } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, TYPE, useU } from "./theme";

const hm = (ms: number) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`; };

/** Dish of the day: one tap on a product picks it for today. */
export function DishCard() {
  const { world, act } = useWorld();
  const { game, life } = world, u = useU();
  if (!life) return null;
  const dish = life.dish() as string | null;
  const ids = (Object.keys(game.productsDef) as string[]).filter((id) => game.isUnlocked(id));
  return (
    <Card tone={dish ? undefined : "ready"} left={<EmojiIcon emoji="📋" size={u * 7} />}>
      <Title name="Günün Menüsü" note={dish ? "bugün için seçildi" : "bugün seçilmedi"} />
      <Meta text={dish ? `${game.productsDef[dish].icon} ${game.productsDef[dish].name}: daha sık sipariş edilir, +%${Math.round(life.cfg.menu.share * 100)} kazandırır. Gün içinde değiştirebilirsin.` : "Bugün öne çıkarmak istediğin ürünü seç: daha sık sipariş edilir ve biraz daha çok kazandırır."} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.8 }}>
        {ids.map((id) => {
          const on = id === dish, d = game.productsDef[id];
          return (
            <Pressable key={id} onPress={() => { const r = life.setDish(id); if (r.ok) { act.sfx("tap"); act.toast(`📋 Günün menüsü: ${d.icon} ${d.name}`, 1800); } else act.warn(r.message); }}
              accessibilityRole="button" accessibilityLabel={`Günün menüsü: ${d.name}`} accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: u * 0.6, paddingHorizontal: u * 1.4, borderRadius: 99, borderWidth: u * 0.35, borderColor: on ? C.green : C.honeyLight, backgroundColor: on ? C.greenPale : C.paper, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <EmojiIcon emoji={d.icon} size={u * 4.4} />
              <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{on ? "✓ " : ""}{d.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/** The special order board: one optional bigger order, delivered from stock. */
export function SpecialOrderCard() {
  const { world, act } = useWorld();
  const { game, life } = world, u = useU();
  useRefresh(1000);
  if (!life) return null;
  const o = life.special() as any;
  if (!o) return <Card tone="locked" left={<EmojiIcon emoji="📦" size={u * 7} />}><Title name="Özel Sipariş" /><Meta tone="muted" text={`Seviye ${life.cfg.orders.minLevel}'de açılır: kasabadan büyük siparişler gelir.`} /></Card>;
  if (o.resting) return <Card tone="locked" left={<EmojiIcon emoji="📦" size={u * 7} />}><Title name="Özel Sipariş" /><Meta tone="muted" text={`Yeni sipariş yakında: ${hm(o.left)}`} /></Card>;
  return (
    <Card tone={o.ready ? "ready" : undefined} left={<EmojiIcon emoji="📦" size={u * 7} />}
      right={<Btn label={o.ready ? "Teslim Et" : "Hazırla"} sub={`💰 ${fmt(o.reward)}`} variant={o.ready ? "go" : "alt"} onPress={() => {
        if (!o.ready) { act.warn(`Eksik: ${o.items.filter((i: any) => i.have < i.need).map((i: any) => `${i.need - i.have} ${game.productsDef[i.id].name}`).join(", ")}. Vitrinde biriktir, sonra teslim et.`, 2800); return; }
        const r = life.deliverSpecial(); if (r.ok) act.toast(`📦 ${r.who}: sipariş teslim edildi · +${fmt(r.gold)} altın`, 2600); else act.warn(r.message);
      }} />}>
      <Title name={`Özel Sipariş · ${o.who}`} note={`${hm(o.left)} kaldı`} />
      {o.items.map((i: any) => <Bar key={i.id} value={i.have / i.need} color={i.have >= i.need ? C.green : C.honey} text={`${game.productsDef[i.id].icon} ${game.productsDef[i.id].name} ${i.have}/${i.need}`} />)}
      <Meta tone="muted" text="İsteğe bağlı: süre dolarsa ceza yok, biraz sonra yeni sipariş gelir. Ürünler vitrin stoğundan verilir." />
    </Card>
  );
}

/** Guest letters (menu entry "Mektuplar"). Opening a letter marks it read and pays its gift. */
export function LettersPanel() {
  const { world, act } = useWorld();
  const { life } = world, u = useU();
  useRefresh();
  const list = (life?.letters ?? []) as any[];
  return (
    <Sheet title="Mektuplar" hint={list.length ? `${life.unread()} yeni · müşterilerin sana yazdıkları` : "Henüz mektup yok. Müşterilerin bazen kısa bir not bırakır."} onClose={() => act.openOverlay(null)}>
      {list.map((l) => {
        const fresh = !l.read || (l.gift && !l.claimed);
        return (
          <Card key={l.id} tone={fresh ? "ready" : undefined} left={<EmojiIcon emoji={l.gift && !l.claimed ? "🎁" : fresh ? "💌" : "✉"} size={u * 7} />}
            right={fresh ? <Btn small label={l.gift && !l.claimed ? "Hediyeyi Al" : "Okundu"} sub={l.gift && !l.claimed ? `💰 ${fmt(l.gift)}` : undefined} onPress={() => { const r = life.open(l.id); if (r.ok && r.gold) act.toast(`🎁 ${l.from}: +${fmt(r.gold)} altın`, 2000); }} /> : undefined}>
            <Title name={l.from} />
            <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.regular, fontSize: fs(u, TYPE.body), fontStyle: "italic" }}>“{l.text}”</Text>
          </Card>
        );
      })}
    </Sheet>
  );
}

/** Achievements (menu entry "Başarımlar"): finished ones first, then the closest. */
export function AchievementsPanel() {
  const { world, act } = useWorld();
  const { achievements } = world, u = useU();
  useRefresh();
  const all = (achievements?.list() ?? []) as any[];
  const rank = (a: any) => (a.complete && !a.claimed ? 0 : a.claimed ? 2 : 1);
  const list = all.slice().sort((a, b) => rank(a) - rank(b) || b.progress / b.def.target - a.progress / a.def.target);
  return (
    <Sheet title="Başarımlar" hint={`${all.filter((a) => a.claimed).length}/${all.length} başarım tamamlandı`} onClose={() => act.openOverlay(null)}>
      {list.map((a) => (
        <Card key={a.def.id} tone={a.claimed ? "locked" : a.complete ? "ready" : undefined} left={<EmojiIcon emoji={a.def.icon} size={u * 7} />}
          right={a.claimed ? <Btn small label="✓ Alındı" disabled /> : a.complete ? <Btn small label="Ödülü Al" onPress={() => { const r = achievements.claim(a.def.id); if (r.ok) act.toast(`🏅 ${a.def.name}: +${fmt(r.gold)} altın${r.gems ? ` · +${r.gems} 💎` : ""}`, 2400); else act.warn(r.message); }} /> : undefined}>
          <Title name={a.def.name} />
          <Meta text={`${fmt(a.def.target)} ${a.def.text}`} />
          <Bar value={a.progress / a.def.target} color={a.complete ? C.green : C.honey} text={`${fmt(a.progress)}/${fmt(a.def.target)}`} />
          <Meta tone="reward" text={`Ödül: 💰 ${fmt(a.def.gold)}${a.def.gems ? ` · 💎 ${a.def.gems}` : ""}`} />
        </Card>
      ))}
    </Sheet>
  );
}

/** Weekly theme (a named week around the star product, with one shared goal). */
export function ThemeCard() {
  const { world, act } = useWorld();
  const { game, life } = world, u = useU();
  const t = life?.weekTheme() as any;
  if (!t) return null;
  const d = game.productsDef[t.product];
  return (
    <Card tone={t.claimed ? "locked" : t.complete ? "ready" : undefined} left={<EmojiIcon emoji={d.icon} size={u * 7} />}
      right={t.claimed ? <Btn label="✓ Alındı" disabled /> : t.complete ? <Btn label="Ödülü Al" onPress={() => { const r = life.claimTheme(); if (r.ok) act.toast(`🎉 ${t.name}: +${fmt(r.gold)} altın`, 2400); else act.warn(r.message); }} /> : undefined}>
      <Title name={`🎉 ${t.name}`} note="Pazartesi yenilenir" />
      <Meta text={`Bu hafta ${fmt(t.target)} ${d.name} sat: kasaba seninle kutluyor.`} />
      <Bar value={t.progress / t.target} color={t.complete ? C.green : C.honey} text={`${fmt(t.progress)}/${fmt(t.target)}`} />
      <Meta tone="reward" text={`Ödül: 💰 ${fmt(t.gold)}`} />
    </Card>
  );
}

/** Weekend market: on Saturdays and Sundays products sell at the guest price (a daily limit). */
export function WeekendCard() {
  const { world, act } = useWorld();
  const { game, life } = world, u = useU();
  if (!life) return null;
  const open = life.weekendOpen() as boolean, left = life.weekendLeft() as number;
  const ids = (Object.keys(game.productsDef) as string[]).filter((id) => game.isUnlocked(id) && game.products[id] > 0);
  if (!open) return <Card tone="locked" left={<EmojiIcon emoji="🧺" size={u * 7} />}><Title name="Hafta Sonu Pazarı" /><Meta tone="muted" text="Cumartesi ve pazar Kasaba'da tezgâh kurulur: vitrindeki ürünler müşteri fiyatına satılır." /></Card>;
  return (
    <Card tone="ready" left={<EmojiIcon emoji="🧺" size={u * 7} />}>
      <Title name="Hafta Sonu Pazarı" note={`bugün ${left} satış hakkı`} />
      <Meta text="Vitrindeki ürünler müşteri fiyatına satılır (vitrinden satıştan daha kârlı)." />
      {ids.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.8 }}>
        {ids.map((id) => {
          const d = game.productsDef[id];
          return <Btn key={id} small variant={left > 0 ? "go" : "busy"} label={`${d.icon} ${d.name} ×${game.products[id]}`} sub={`💰 ${fmt(game.unitEconomics(id).customer)}`} onPress={() => { const r = life.sellWeekend(id, 1); if (r.ok) act.toast(`🧺 ${d.name} satıldı · +${fmt(r.gold)} altın`, 1400); else act.warn(r.message); }} />;
        })}
      </View> : <Meta tone="muted" text="Vitrin boş: önce biraz ürün hazırla." />}
    </Card>
  );
}

/** One button that collects every finished quest, daily / weekly goal, theme and achievement. */
export function CollectAll() {
  const { world, act } = useWorld();
  const { quests, goals, life, achievements } = world;
  const n = quests.claimable().length + goals.claimable().length + (life?.weekTheme()?.complete && !life.weekTheme().claimed ? 1 : 0) + (achievements?.claimable().length ?? 0);
  if (n < 2) return null;
  return <Btn label={`🎁 Hazır ödüllerin hepsini al (${n})`} onPress={() => {
    let gold = 0, gems = 0;
    for (const q of quests.claimable()) { const r = quests.claim(q.def.id); if (r.ok) gold += r.reward?.gold ?? 0; }
    for (const g of goals.claimable()) { const r = g.id.startsWith("w") ? goals.claimWeekly() : goals.claim(g.id); if (r.ok) gold += r.gold ?? 0; }
    const t = life?.weekTheme(); if (t?.complete && !t.claimed) { const r = life.claimTheme(); if (r.ok) gold += r.gold; }
    for (const a of achievements?.claimable() ?? []) { const r = achievements.claim(a.def.id); if (r.ok) { gold += r.gold; gems += r.gems; } }
    act.toast(`🎁 Hepsi alındı: +${fmt(gold)} altın${gems ? ` · +${gems} 💎` : ""}`, 2600);
  }} />;
}

/** A new branch: requirements, what stays, the permanent bonus, and a confirmation. */
export function BranchCard() {
  const { world, act } = useWorld();
  const { branch, saves } = world, u = useU();
  const [ask, setAsk] = React.useState(false);
  if (!branch) return null;
  const miss = branch.missing() as string[], share = Math.round(branch.cfg.share * 100);
  return (
    <Card tone={miss.length ? "locked" : "ready"} left={<EmojiIcon emoji="🏪" size={u * 7} />}
      right={miss.length ? undefined : ask
        ? <View style={{ gap: u * 0.6 }}><Btn small variant="lack" label="Evet, şubeyi aç" onPress={() => { setAsk(false); const r = saves.openBranch({ confirmed: true }); if (r.ok) { world.scenes.interior.snap(); act.openOverlay(null); act.toast(`🏪 ${r.count}. şube açıldı! Her satış artık kalıcı +%${r.count * share}`, 4200); } else act.warn(r.message, 3600); }} /><Btn small variant="alt" label="Vazgeç" onPress={() => setAsk(false)} /></View>
        : <Btn label="Yeni Şube Aç" onPress={() => setAsk(true)} />}>
      <Title name="Yeni Şube" note={branch.count ? `${branch.count} şube · satışlar +%${branch.count * share}` : undefined} />
      <Meta text={ask ? "Emin misin? Altın, stok, makineler, geliştirmeler, tarifler, kasaba, araştırma ve seviye baştan başlar. Eski kayıt yedeklenir." : `Kafeni büyüttün! Yeni bir şubede baştan başla: her şube bütün satışlara kalıcı +%${share} katar (en çok ${branch.cfg.max} şube).`} />
      <Meta tone="muted" text="Korunanlar: dekorasyon (seviyeleriyle), müşteri dostlukları ve hikâyeleri, mektuplar, anı defteri, başarımlar, elmaslar ve kafenin adı." />
      {miss.length ? <Meta tone="bad" text={`Gerekli: ${miss.join(" · ")}`} /> : null}
    </Card>
  );
}

/** Memory book (menu entry "Anı Defteri"): the café's story, newest first. */
export function MemoriesPanel() {
  const { world, act } = useWorld();
  const { life } = world, u = useU();
  useRefresh();
  const list = (life?.memories ?? []) as any[];
  const when = (t: number) => { const d = new Date(t); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
  return (
    <Sheet title="Anı Defteri" hint={list.length ? "Kafenin hikâyesi, en yeniden eskiye" : "Henüz anı yok. İlk satışın ilk sayfa olacak."} onClose={() => act.openOverlay(null)}>
      {list.map((m, i) => (
        <Card key={`${m.t}-${i}`} left={<EmojiIcon emoji={m.icon} size={u * 6} />}>
          <Title name={m.text} note={m.t ? when(m.t) : undefined} />
        </Card>
      ))}
    </Sheet>
  );
}

/** A guest's story inside the album card: the current step and its button. */
export function StoryLine({ look }: { look: string }) {
  const { world, act } = useWorld();
  const { life } = world, u = useU();
  if (!life || !world.album.entry(look)) return null;
  const s = life.story(look) as any;
  if (s.finished) return <Meta tone="reward" text={`📗 ${s.title}: hikâye tamamlandı`} />;
  const step = s.steps[s.next];
  return (
    <View style={{ gap: u * 0.5 }}>
      <Meta tone={step.done ? "reward" : undefined} text={`📗 ${s.title} · ${s.next + 1}/3: ${step.text} (${step.have}/${step.need})`} />
      {step.done ? <Btn small label="Bölümü tamamla" sub={`💰 ${fmt(step.gold)}`} onPress={() => { const r = life.claimStory(look); if (r.ok) act.toast(r.finished ? `📗 ${s.title} tamamlandı · +${fmt(r.gold)} altın · bir mektup geldi` : `📗 ${s.title}: yeni bölüm · +${fmt(r.gold)} altın`, 2600); else act.warn(r.message); }} /> : null}
    </View>
  );
}

const HELP: [string, string, string][] = [
  ["🥐", "Üretim", "Fırına, kahve makinesine ya da tezgâha dokun ve ürün seç. Makine meşgulken 3 ürünü sıraya ekleyebilirsin; sırası gelen kendiliğinden başlar, sen oyunda olmasan da."],
  ["☕", "Servis", "Müşteri oturunca sipariş balonu çıkar. Ürün vitrinde varsa garson götürür; acelen varsa müşteriye dokunup kendin servis et. Bazı müşteriler iki ürünlü set menü ister."],
  ["📋", "Günün menüsü", "Görevler'den her gün bir ürün seç: o gün daha sık sipariş edilir ve biraz daha çok kazandırır."],
  ["💛", "Dostluk ve hikâyeler", "Aynı müşteriye servis ettikçe dostluk kalpleri dolar: her kalp ödül ve daha çok bahşiş getirir. Albümde her müşterinin 3 bölümlük hikâyesi var."],
  ["💌", "Mektuplar", "Müşteriler arada bir not bırakır, bazılarında küçük bir hediye olur. Menü › Mektuplar."],
  ["🎩", "Gizemli eleştirmen", "Arada bir sıradan görünen bir misafir aslında eleştirmendir. İyi ve hızlı servis edersen büyük ödül verir."],
  ["📦", "Özel sipariş ve pazar", "Görevler'deki özel siparişleri vitrinden teslim et. Hafta sonları pazar tezgâhında ürünler müşteri fiyatına satılır."],
  ["🛍", "Mağaza", "Ekipman, dekorasyon, tarif ve genişleme al. Dekorasyonu 5 seviyeye kadar yükselt; kafe daha çekici olur, daha çok müşteri gelir."],
  ["🗺", "Keşif ve Kasaba", "Keşfe kedi gönder, dönünce ödülünü al. Kasaba'da binaları aç; meydandaki kedileri sevmeyi unutma."],
  ["🏪", "Yeni şube", "Son aşamaya ve en üst seviyeye ulaşınca yeni bir şube açıp baştan başlayabilirsin; her şube satışlara kalıcı bonus katar."],
];

/** "Nasıl Oynanır": every system in one short paragraph. */
export function HelpPanel() {
  const { act } = useWorld();
  const u = useU();
  return (
    <Sheet title="Nasıl Oynanır" hint="Acele yok: kafeni kendi hızında büyüt." onClose={() => act.openOverlay(null)}>
      {HELP.map(([icon, name, text]) => (
        <Card key={name} left={<EmojiIcon emoji={icon} size={u * 6} />}>
          <Title name={name} />
          <Meta text={text} />
        </Card>
      ))}
    </Sheet>
  );
}

/** Lines of the end-of-day summary card ("Dün ..."). */
export function summaryLines(world: any, s: any): string[] {
  const { game } = world, best = s.best ? game.productsDef[s.best] : null;
  return [
    `${fmt(s.sold)} ürün sattın, ${fmt(s.made)} ürün hazırladın.`,
    `Kazanç: 💰 ${fmt(s.earned)} altın`,
    ...(best ? [`En sevilen: ${best.icon} ${best.name}`] : []),
    ...(s.hearts > 0 ? [`${s.hearts} yeni dostluk kalbi 💛`] : []),
    ...(s.critics > 0 ? ["Gizemli eleştirmeni ağırladın 🎩"] : []),
    "Bugün de güzel bir gün olsun!",
  ];
}
