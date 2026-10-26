// The panels opened from the cafe's stations: recipes for the oven / coffee machine / production counter, the showcase (sell),
// the storeroom (buy ingredients) and the upgrades. All rules live in game/game.js; this only shows state and forwards taps.
import React from "react";
import { Text, View } from "react-native";
import { BUY_AMOUNTS } from "../data/economy.js";
import { formatTime } from "../game/game.js";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn, Card, Chip, Meta, Pips, Sheet, Title } from "./kit";
import { EmojiIcon } from "./icons";
import { C, FONT, fmt, fs, useU } from "./theme";

const TITLE: Record<string, string> = { oven: "Fırın", coffee: "Kahve Makinesi", counter: "Üretim Tezgâhı", showcase: "Satış Vitrini", storage: "Depo · Malzeme Al", upgrades: "Geliştirmeler" };
const HINT: Record<string, string> = {
  oven: "Hamur işlerini fırında pişir.",
  coffee: "Kahveyi makinede hazırla.",
  counter: "Tüm ürünlerin tarifleri. Üretim ilgili makinede başlar.",
  showcase: "Vitrinden satış, müşteri siparişinden daha az net kazanç sağlar. Siparişleri teslim etmek daha kârlı.",
  storage: "Üretim için malzeme satın al.",
  upgrades: "Fırın & Kafe için kalıcı geliştirmeler. Etkiler üretim ve vitrine hemen uygulanır.",
};

export function CafePanel({ id, side }: { id: string; side: "left" | "right" }) {
  const { world, act } = useWorld();
  const game = world.game;
  useRefresh(200);
  const u = useU();
  const stationNote = game.stationsDef[id] ? ` Aynı anda en fazla ${game.capacity(id)} ürün hazırlanır.` : "";

  const products = (Object.entries(game.productsDef) as [string, any][]).filter(([pid, d]) => game.isUnlocked(pid) && (id === "counter" || d.station === id));
  return (
    <Sheet title={TITLE[id]} hint={HINT[id] + stationNote} side={side} lowered={side === "left"} onClose={act.closePanel}>
      {id === "showcase" ? <Showcase /> : id === "storage" ? <Storage /> : id === "upgrades" ? <Upgrades /> : products.map(([pid, d]) => <Recipe key={pid} pid={pid} d={d} />)}
      {id === "oven" || id === "coffee" || id === "counter" ? (Object.entries(game.productsDef) as [string, any][]).filter(([pid, d]) => !game.isUnlocked(pid) && (id === "counter" || d.station === id)).map(([pid, d]) => <LockedRecipe key={pid} pid={pid} d={d} />) : null}
      {id === "upgrades" ? <Btn label="◀ Geri" variant="alt" onPress={act.closePanel} style={{ alignSelf: "stretch" }} /> : null}
    </Sheet>
  );
}

function Recipe({ pid, d }: { pid: string; d: any }) {
  const { world, act } = useWorld();
  const game = world.game, u = useU();
  const jobs = game.jobsOf(d.station), mine = jobs.filter((j: any) => j.product === pid);
  const cap = game.capacity(d.station), full = jobs.length >= cap;
  const soon = mine.length ? mine.reduce((a: any, b: any) => (game.remainingOf(a) <= game.remainingOf(b) ? a : b)) : null;
  const lack = !full && (game.missingFor(pid).length > 0 || game.committed(pid) >= game.showcaseLimit());
  const label = full ? (cap > 1 ? "Dolu" : mine.length ? "Hazırlanıyor" : "Meşgul") : "Üret";
  const dur = game.duration(pid), eco = game.unitEconomics(pid);
  return (
    <Card left={<EmojiIcon emoji={d.icon} size={u * 7} />} right={<Btn label={label} variant={full ? "busy" : lack ? "lack" : "go"} onPress={() => { const r = game.startProduction(pid); if (!r.ok) act.warn(r.message); }} />}>
      <Title name={d.name} note={`Stok: ${game.products[pid]}/${game.showcaseLimit()}`} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.6 }}>
        {Object.entries(d.ingredients as Record<string, number>).map(([ing, need]) => {
          const def = game.ingredientsDef[ing], have = game.ingredients[ing];
          return <Chip key={ing} ok={have >= need} text={`${def.icon} ${def.name} ${need} (${have})`} />;
        })}
      </View>
      <Meta text={`⏱ ${formatTime(dur)}${dur < d.time ? ` (${formatTime(d.time)})` : ""} · 💰 ${fmt(eco.customer)} müşteri · ${game.stationsDef[d.station].name}`} />
      <Meta tone="muted" text={`Malzeme maliyeti ${fmt(eco.cost)} · net kazanç ${fmt(eco.customerNet)} (saniyede ${(eco.customerNet / dur).toFixed(2).replace(".", ",")})`} />
      {soon ? <Bar value={1 - game.remainingOf(soon) / soon.duration} text={`Kalan: ${formatTime(game.remainingOf(soon))}${mine.length > 1 ? ` (×${mine.length})` : ""}`} /> : null}
    </Card>
  );
}

/** A recipe the player has not bought yet: what it would earn and what it takes to unlock it (the shop item holds the price and the gates). */
function LockedRecipe({ pid, d }: { pid: string; d: any }) {
  const { world, act } = useWorld();
  const game = world.game, shop = world.shop, u = useU();
  const item = (shop.items as any[]).find((i) => i.recipe === pid), v = item ? shop.view(item.id) : null, eco = game.unitEconomics(pid);
  return (
    <Card tone="locked" left={<EmojiIcon emoji={d.icon} size={u * 7} />} right={<Btn label="Mağazada aç" sub={v ? `💰 ${fmt(v.price)}` : undefined} variant="lack" onPress={() => { act.closePanel(); act.openShop("recipes"); }} />}>
      <Title name={d.name} note="Kilitli tarif" />
      <Meta text={`⏱ ${formatTime(game.duration(pid))} · 💰 ${fmt(eco.customer)} müşteri · maliyet ${fmt(eco.cost)} · net ${fmt(eco.customerNet)}`} />
      {v && v.missing.length ? <Meta tone="muted" text={`Gerekli: ${v.missing.map((m: any) => m.text).join(" · ")}`} /> : <Meta tone="reward" text="Altının yetiyorsa Mağaza'dan açabilirsin." />}
    </Card>
  );
}

function Showcase() {
  const { world, act } = useWorld();
  const game = world.game, u = useU();
  return (
    <>
      {(Object.entries(game.productsDef) as [string, any][]).filter(([pid]) => game.isUnlocked(pid)).map(([pid, d]) => (
        <Card key={pid} left={<EmojiIcon emoji={d.icon} size={u * 7} />}
          right={<View style={{ gap: u * 0.6 }}>
            <Btn small label="Sat" onPress={() => { const r = game.sellProduct(pid, 1); if (!r.ok) act.warn(r.message); }} />
            <Btn small variant="alt" label="Hepsi" onPress={() => { const r = game.sellProduct(pid, game.products[pid] || 1); if (!r.ok) act.warn(r.message); }} />
          </View>}>
          <Title name={d.name} note={`Stok: ${game.products[pid]}/${game.showcaseLimit()}`} />
          <Meta text={`💰 ${fmt(game.showcaseIncome(pid))} / adet`} />
        </Card>
      ))}
    </>
  );
}

function Storage() {
  const { world, act } = useWorld();
  const game = world.game, u = useU();
  return (
    <>
      {(Object.entries(game.ingredientsDef) as [string, any][]).map(([id, d]) => (
        <Card key={id} left={<EmojiIcon emoji={d.icon} size={u * 7} />}
          right={<View style={{ gap: u * 0.6 }}>{(BUY_AMOUNTS as number[]).map((q) => <Btn key={q} small label={`+${q}`} sub={`${fmt(d.price * q)}`} onPress={() => { const r = game.buyIngredient(id, q); if (!r.ok) act.warn(r.message); }} />)}</View>}>
          <Title name={d.name} note={`Stok: ${game.ingredients[id]}${Number.isFinite(game.ingredientCap()) ? `/${game.ingredientCap()}` : ""}`} />
          <Meta text={`💰 ${fmt(d.price)} / adet`} />
        </Card>
      ))}
    </>
  );
}

function Upgrades() {
  const { world, act } = useWorld();
  const game = world.game, u = useU();
  return (
    <>
      {(Object.entries(game.upgradesDef) as [string, any][]).map(([id, up]) => {
        const lvl = game.upgrades[id], max = game.maxLevel(id), cost = game.nextCost(id), maxed = cost === null;
        const gate = up.minLevels?.[lvl] as number | undefined, gated = !maxed && !!gate && world.progression.level < gate;
        return (
          <Card key={id} left={<EmojiIcon emoji={up.icon} size={u * 7} />}
            right={<Btn label={maxed ? "Maksimum" : gated ? `Seviye ${gate}` : "Geliştir"} sub={maxed ? undefined : `💰 ${fmt(cost)}`} disabled={maxed} variant={gated || (!maxed && game.gold < cost) ? "lack" : "go"}
              onPress={() => { const r = game.buyUpgrade(id, lvl); if (r.ok) act.toast(`${up.icon} ${up.name} seviye ${r.level} · −${fmt(r.cost)} altın`, 2200); else act.warn(r.message); }} />}>
            <Title name={up.name} note={`Seviye ${lvl}/${max}`} />
            <Pips level={lvl} max={max} />
            <Meta text={`Şu an: ${up.describe(up.values[lvl])}`} />
            <Meta tone="next" text={maxed ? "Maksimum seviye" : `Sonraki: ${up.describe(up.values[lvl + 1])}`} />
            {!maxed ? <Meta tone={game.gold < cost ? "bad" : "muted"} text={game.gold < cost ? `Altın: ${fmt(game.gold)} / ${fmt(cost)} · ${fmt(cost - game.gold)} eksik` : `Altın: ${fmt(game.gold)} → ${fmt(game.gold - cost)}`} /> : null}
          </Card>
        );
      })}
    </>
  );
}
