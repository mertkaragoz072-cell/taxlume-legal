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
