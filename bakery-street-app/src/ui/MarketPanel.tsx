// Market shopping list: price, current stock, quantity stepper and a buy button for each ingredient.
import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useWorld, useRefresh } from "../runtime/context";
import { Btn, Card, Meta, Sheet, Title } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, useU } from "./theme";

export function MarketPanel() {
  const { world, act } = useWorld();
  const game = world.game, u = useU();
  useRefresh();
  const [qty, setQty] = useState<Record<string, number>>({});
  const lock = useRef({ until: 0, seq: 0 });
  const max = game.marketDef.maxPerPurchase as number;
  const get = (id: string) => qty[id] ?? 1;
  const usedBy = (id: string) => (Object.values(game.productsDef) as any[]).filter((p) => id in p.ingredients).map((p) => `${p.icon}${p.ingredients[id]}`).join(" ");

  return (
    <Sheet title="Market" hint={`Malzemeleri burada al; üretim aynı envanteri kullanır. 💰 ${fmt(game.gold)}`} side="right">
      {(game.marketDef.items as string[]).map((id) => {
        const d = game.ingredientsDef[id], q = get(id), total = d.price * q;
        const step = (n: number) => <Pressable key={n} onPress={() => setQty({ ...qty, [id]: Math.max(1, Math.min(max, n)) })} style={{ minWidth: Math.max(44, u * 6), height: Math.max(44, u * 6), borderRadius: u * 1.6, borderWidth: u * 0.35, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", paddingHorizontal: u }}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3) }}>{n}</Text></Pressable>;
        return (
          <Card key={id} left={<EmojiIcon emoji={d.icon} size={u * 7} />}
            right={<Btn label="Satın Al" sub={`💰 ${fmt(total)}`} variant={total > game.gold ? "lack" : "alt"} onPress={() => {
              const now = Date.now();
              if (now < lock.current.until) return;                     // one tap, one purchase
              lock.current.until = now + 450;
              const r = game.purchase(id, q, `ui-${++lock.current.seq}-${now}`);
              if (r.ok) act.toast(`${d.icon} ${d.name} ×${q} alındı · −${fmt(r.cost)} altın`, 1600); else act.warn(r.message);
            }} />}>
            <Title name={d.name} note={`Stok: ${game.ingredients[id]}`} />
            <Meta text={`💰 ${fmt(d.price)} / adet`} />
            <Meta tone="muted" text={`Tarif: ${usedBy(id)}`} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: u * 0.8, flexWrap: "wrap" }}>
              <Pressable onPress={() => setQty({ ...qty, [id]: Math.max(1, q - 1) })} style={{ width: Math.max(44, u * 6), height: Math.max(44, u * 6), borderRadius: u * 1.6, borderWidth: u * 0.35, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.4) }}>−</Text></Pressable>
              <Text allowFontScaling={false} style={{ minWidth: u * 5, textAlign: "center", color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.3) }}>{q}</Text>
              <Pressable onPress={() => setQty({ ...qty, [id]: Math.min(max, q + 1) })} style={{ width: Math.max(44, u * 6), height: Math.max(44, u * 6), borderRadius: u * 1.6, borderWidth: u * 0.35, borderColor: C.brown, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, 3.4) }}>+</Text></Pressable>
              {(game.marketDef.quantities as number[]).map((n) => step(n))}
            </View>
          </Card>
        );
      })}
    </Sheet>
  );
}
