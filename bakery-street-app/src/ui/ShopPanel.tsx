// The shop (Mağaza): ingredients plus everything else the player buys with gold. All rules live in game/shop.js and game/game.js; this only
// shows the catalogue (preview, name, price, gate, effect, state) and forwards taps. Opens over the café so a purchase can be watched.
import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SHOP_CATEGORIES } from "../data/economy.js";
import { ASSET_MODULES } from "../generated/assetModules";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn, Card, Chip, Meta, Sheet, Title } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, useU } from "./theme";

export type ShopTab = "goal" | "ingredients" | "equipment" | "furniture" | "recipes" | "expansion" | "special";
const TABS: { id: ShopTab; name: string }[] = [{ id: "goal", name: "Hedef" }, ...(SHOP_CATEGORIES as { id: ShopTab; name: string }[])];
const SPECIAL_EMOJI: Record<string, string> = { vip: "👑", spring: "🌸", cozy: "❄️" };
const TIER_BG = ["", "", "#F1D8AE", "#F6E19A", "#D6EAF2"];
const COND_LABEL: Record<string, string> = { level: "Seviye", spent: "Harcanan altın", items: "Mağaza eşyası", upgrades: "Geliştirme", tables: "Masa", recipes: "Tarif", research: "Araştırma" };

/** What the picture of an item is: the café art for furniture and equipment, the product picture (or emoji) for recipes, an emoji for special content. */
function Preview({ d, game }: { d: any; game: any }) {
  const u = useU(), size = u * 9.6;
  const tier = d.kind === "equipment" && d.tier > 1 ? d.tier : 0;
  const src = d.art?.image ? ASSET_MODULES[`assets/interior/${d.art.image}.webp`] : undefined;
  let body: React.ReactNode;
  if (src) body = <Image source={src} style={{ width: size * 0.9, height: size * 0.9, resizeMode: "contain" }} />;
  else if (d.kind === "recipe") body = <EmojiIcon emoji={game.productsDef[d.recipe]?.icon ?? "🍞"} size={size * 0.8} />;
  else body = <Text allowFontScaling={false} style={{ fontSize: size * 0.6 }}>{SPECIAL_EMOJI[d.art?.icon] ?? "⭐"}</Text>;
  return (
    <View style={{ width: size, height: size, borderRadius: u * 2, backgroundColor: TIER_BG[tier] || C.vanilla, borderWidth: u * 0.3, borderColor: tier ? C.honeyDark : C.vanillaDark, alignItems: "center", justifyContent: "center" }}>
      {body}
      {tier ? <Text allowFontScaling={false} style={{ position: "absolute", bottom: -u * 0.2, color: C.honeyDark, fontFamily: FONT.bold, fontSize: fs(u, 2) }}>{"★".repeat(tier - 1)}</Text> : null}
    </View>
  );
}

let lastTab = { n: -1, tab: "goal" as ShopTab };       // the tab in use survives the sheet sliding away to show a new piece (it is mounted again afterwards)

export function ShopPanel({ request, onClose }: { request: { tab: ShopTab; n: number }; onClose: () => void }) {
  const { world, act } = useWorld();
  const { game, shop } = world, u = useU();
  useRefresh();
  const [tab, setTabState] = useState<ShopTab>(lastTab.n === request.n ? lastTab.tab : request.tab);
  const setTab = (t: ShopTab) => { lastTab = { n: request.n, tab: t }; setTabState(t); };
  useEffect(() => { if (lastTab.n !== request.n) { lastTab = { n: request.n, tab: request.tab }; setTabState(request.tab); } }, [request.n, request.tab]);   // the goal chip / a link asks for a tab
  const lock = useRef({ until: 0, seq: 0 });
  const stage = shop.stage();

  const buy = (d: any) => {
    const now = Date.now();
    if (now < lock.current.until) return;                                          // one tap, one purchase
    lock.current.until = now + 450;
    const r = shop.buy(d.id, `shop-${++lock.current.seq}-${now}`);
    if (!r.ok) { act.warn(r.message); return; }
    act.sfx("buy"); act.buzz([30, 40, 30]);
    const next = shop.nextGoal();
    act.toast(`✅ ${d.name} alındı · −${fmt(r.cost)} altın${r.xp ? ` · +${fmt(r.xp)} XP` : ""}${next.item ? `\nSıradaki hedef: ${next.item.name}` : ""}`, 3000);
    if (d.kind === "decor" || d.kind === "upgrade" || d.line === "waiting" || d.kind === "special") act.peek(2800);   // the sheet slides away so the new piece can be seen
  };

  const items = (cat: string) => (shop.list(cat) as any[]).slice().sort((a, b) => {
    const rank = (v: any) => (v.status === "owned" ? 3 : v.status === "locked" ? 2 : v.missingGold > 0 ? 1 : 0);
    return rank(a) - rank(b) || a.price - b.price;
  });
  const dot = (id: string) => id !== "goal" && id !== "ingredients" && (shop.list(id) as any[]).some((v) => v.status === "ready" && v.missingGold === 0);

  const tabs = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: u * 0.8 }} contentContainerStyle={{ gap: u * 0.8, paddingHorizontal: u * 1.2, paddingVertical: u * 0.4 }}>
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} onPress={() => { act.sfx("tap"); setTab(t.id); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: Math.max(40, u * 5.4), paddingHorizontal: u * 2.2, borderRadius: 99, borderWidth: u * 0.35, borderColor: on ? C.honeyDark : C.brown, backgroundColor: on ? C.honey : C.cream, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 2.8) }}>{t.name}</Text>
            {dot(t.id) ? <View style={{ position: "absolute", right: -u * 0.2, top: -u * 0.2, width: u * 2, height: u * 2, borderRadius: 99, backgroundColor: C.terracotta, borderWidth: u * 0.25, borderColor: C.paper }} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <Sheet title="Mağaza" hint={`💰 ${fmt(game.gold)} · Aşama ${stage.id}: ${stage.name}`} side="right" onClose={onClose} header={tabs}>
      {tab === "goal" ? <GoalTab go={setTab} /> : tab === "ingredients" ? <Ingredients /> : items(tab).map((v) => <ItemCard key={v.def.id} v={v} onBuy={buy} />)}
    </Sheet>
  );
}

function ItemCard({ v, onBuy }: { v: any; onBuy: (d: any) => void }) {
  const { world, act } = useWorld();
  const { game, shop } = world, u = useU();
  const d = v.def, owned = v.status === "owned", locked = v.status === "locked", short = v.missingGold > 0;
  const shared = d.slot && ["tableTop", "theme"].includes(d.slot);
  let button: React.ReactNode;
  if (owned) button = d.slot && shared && !v.placed ? <Btn label="Yerleştir" variant="alt" onPress={() => { shop.place(d.slot, d.id); act.sfx("tap"); act.peek(2200); }} /> : <Btn label={d.slot ? "✓ Yerleştirildi" : "✓ Alındı"} disabled />;
  else if (locked) button = <Btn label="Kilitli" sub={v.missing.map((m: any) => m.text).join(" · ")} variant="lack" onPress={() => act.warn(shop.blockReason(d.id).message)} />;
  else button = <Btn label={short ? "Altın yetersiz" : "Satın Al"} sub={short ? `${fmt(v.missingGold)} eksik` : `💰 ${fmt(v.price)}`} variant={short ? "lack" : "alt"} onPress={() => (short ? act.warn(shop.blockReason(d.id).message) : onBuy(d))} />;
  return (
    <Card tone={owned ? "open" : locked ? "locked" : undefined} left={<Preview d={d} game={game} />} right={button}>
      <Title name={d.name} note={owned ? "Alındı" : `${fmt(v.price)} altın`} />
      {v.effectText ? <Meta tone={owned ? "ok" : undefined} text={v.effectText} /> : null}
      <Meta tone="muted" text={d.desc} />
      {!owned && v.conditions.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.6 }}>
          {v.conditions.map((c: any, i: number) => <Chip key={i} ok={c.ok} text={`${c.ok ? "✅" : "🔒"} ${c.text}`} />)}
        </View>
      ) : null}
    </Card>
  );
}

function GoalTab({ go }: { go: (t: ShopTab) => void }) {
  const { world, act } = useWorld();
  const { game, shop } = world, u = useU();
  const stage = shop.stage(), next = shop.nextStage(), goal = shop.nextGoal();
  const reward = (r: any) => (r ? [r.gold ? `💰 ${fmt(r.gold)}` : "", r.xp ? `✨ ${fmt(r.xp)} XP` : ""].filter(Boolean).join(" · ") : "");
  const appeal = shop.appeal(), tip = Math.round(shop.tipChance() * 100), flow = Math.round((1 - shop.arrivalFactor()) * 100), vip = shop.vip();
  return (
    <>
      <Card tone="open">
        <Title name={`Aşama ${stage.id} — ${stage.name}`} />
        <Meta text={stage.note} />
        {next ? (
          <>
            <Meta tone="next" text={`Sonraki: Aşama ${next.id} — ${next.name}`} />
            {(shop.stageProgress(next) as any[]).map((p) => <Bar key={p.key} value={p.have / p.need} color={p.ok ? C.green : C.honey} text={`${p.ok ? "✓ " : ""}${COND_LABEL[p.key]} ${fmt(p.have)}/${fmt(p.need)}`} />)}
            <Meta tone="reward" text={`Aşama ödülü: ${reward(next.reward)}`} />
          </>
        ) : <Meta tone="ok" text="En yüksek aşamadasın: Ünlü Kedi Kafesi!" />}
      </Card>
      <Card right={goal.item ? <Btn small label="Göster" variant="alt" onPress={() => go((goal.item.category === "expansion" ? "expansion" : goal.item.category) as ShopTab)} /> : undefined}>
        <Title name="Sıradaki hedef" note={goal.kind === "ready" ? "Hazır!" : goal.kind === "save" ? "Biriktir" : goal.kind === "level" ? "Kilitli" : ""} />
        <Meta text={goal.text} />
        {goal.item ? <Bar value={goal.progress} color={goal.kind === "ready" ? C.green : C.honey} text={goal.kind === "level" ? "Seviye / aşama gerekli" : goal.kind === "ready" ? "Altın yeterli" : `${fmt(Math.min(game.gold, goal.price))}/${fmt(goal.price)}`} /> : null}
      </Card>
      <Card>
        <Title name="Kafe çekiciliği" note={`${appeal} puan`} />
        <Meta text={`Müşteri akışı +%${flow} · Bahşiş ihtimali %${tip}${vip ? ` · VIP misafir %${Math.round(vip.chance * 100)}` : ""}`} />
        <Meta tone="muted" text="Mağazadan aldığın mobilya ve dekorlar çekicilik puanı verir: misafirler daha sık gelir ve bahşiş bırakır." />
      </Card>
      <Card right={<View style={{ gap: u * 0.6 }}><Btn small label="Kasaba" variant="alt" onPress={() => act.openOverlay("town")} /><Btn small label="Kitapçı" variant="alt" onPress={() => act.go("bookshop")} /></View>}>
        <Title name="Kasaba ve araştırma" />
        <Meta text="Yeni binalar açmak ve Kitapçı'da kalıcı araştırmalar almak da altın harcamanın yolları." />
      </Card>
    </>
  );
}

/** The market shopping list (ingredients): stock is shown against the storeroom's capacity and a purchase can never go over it. */
function Ingredients() {
  const { world, act } = useWorld();
  const { game } = world, u = useU();
  const [qty, setQty] = useState<Record<string, number>>({});
  const lock = useRef({ until: 0, seq: 0 });
  const cap = game.ingredientCap() as number, max = game.marketDef.maxPerPurchase as number;
  const get = (id: string) => qty[id] ?? 1;
  const usedBy = (id: string) => (Object.entries(game.productsDef) as [string, any][]).filter(([pid, p]) => id in p.ingredients && game.isUnlocked(pid)).map(([, p]) => `${p.icon}${p.ingredients[id]}`).join(" ");
  const sq = (extra?: any) => ({ minWidth: Math.max(44, u * 6), height: Math.max(44, u * 6), borderRadius: u * 1.6, borderWidth: u * 0.35, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center" as const, justifyContent: "center" as const, ...extra });
  return (
    <>
      <Meta tone="muted" text={`Depo her malzemeden ${cap} adet tutar${cap < 500 ? "; daha fazlası için Ekipman'dan depoyu geliştir." : "."}`} />
      {(game.marketDef.items as string[]).map((id) => {
        const d = game.ingredientsDef[id], room = Math.max(0, cap - game.ingredients[id]), q = Math.max(1, Math.min(get(id), Math.min(max, Math.max(1, room)))), total = d.price * q;
        const setQ = (n: number) => setQty({ ...qty, [id]: Math.max(1, Math.min(max, Math.max(1, room), n)) });
        return (
          <Card key={id} left={<EmojiIcon emoji={d.icon} size={u * 7} />}
            right={<Btn label={room < 1 ? "Depo dolu" : "Satın Al"} sub={room < 1 ? undefined : `💰 ${fmt(total)}`} variant={room < 1 || total > game.gold ? "lack" : "alt"} onPress={() => {
              const now = Date.now();
              if (now < lock.current.until) return;
              lock.current.until = now + 450;
              const r = game.purchase(id, q, `ui-${++lock.current.seq}-${now}`);
              if (r.ok) { act.sfx("buy"); act.toast(`${d.icon} ${d.name} ×${q} alındı · −${fmt(r.cost)} altın`, 1600); } else act.warn(r.message);
            }} />}>
            <Title name={d.name} note={`Stok: ${game.ingredients[id]}/${cap}`} />
            <Meta text={`💰 ${fmt(d.price)} / adet`} />
            <Meta tone="muted" text={`Tarif: ${usedBy(id)}`} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: u * 0.8, flexWrap: "wrap" }}>
              <Pressable onPress={() => setQ(q - 1)} style={sq({ width: Math.max(44, u * 6) })}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.4) }}>−</Text></Pressable>
              <Text allowFontScaling={false} style={{ minWidth: u * 5, textAlign: "center", color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3) }}>{q}</Text>
              <Pressable onPress={() => setQ(q + 1)} style={sq({ width: Math.max(44, u * 6) })}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.4) }}>+</Text></Pressable>
              {(game.marketDef.quantities as number[]).map((n) => <Pressable key={n} onPress={() => setQ(n)} style={sq({ paddingHorizontal: u })}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3) }}>{n}</Text></Pressable>)}
            </View>
          </Card>
        );
      })}
    </>
  );
}
