// Quest, daily reward, settings, town, research and exploration panels.
import { weeklyProduct } from "../game/events.js";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { NAME_MAX } from "../game/profile.js";
import { timings } from "../runtime/startup";
import { formatDuration } from "../game/exploration.js";
import { EXPLORE_LIMIT } from "../data/economy.js";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn, Card, Chip, Meta, Pips, Sheet, Title } from "./kit";
import { EmojiIcon, GameIcon, Rich } from "./icons";
import { C, FONT, fmt, fs, useU, TYPE } from "./theme";
import { BranchCard, CollectAll, DeliveryCard, LuckCard, PopularityCard, DishCard, SpecialOrderCard, ThemeCard, WeekendCard } from "./LifePanels";
import { askPermission } from "../runtime/notify";

const fmtReward = (game: any, r: any) => [
  r.gold ? `💰 ${fmt(r.gold)}` : "",
  r.gems ? `💎 ${r.gems}` : "",
  ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ×${n}`),
].filter(Boolean).join(" · ");
export const formatReward = fmtReward;

// ---------------------------------------------------------------------------------------------------------------- quests
/** A small soft label (weather, rating, star product). */
function InfoPill({ text }: { text: string }) {
  const u = useU();
  return <View style={{ paddingHorizontal: u * 1.2, paddingVertical: u * 0.4, borderRadius: 99, backgroundColor: "rgba(201,154,97,.18)", borderWidth: u * 0.25, borderColor: "rgba(201,154,97,.45)" }}><Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{text}</Text></View>;
}
/** A section heading inside a panel: title, a fine line, a note on the right. */
function Section({ title, note }: { title: string; note?: string }) {
  const u = useU();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: u, marginTop: u * 0.6, paddingRight: u * 1.2 }}>
      <Text allowFontScaling={false} style={{ color: C.terracottaDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.body) }}>{title}</Text>
      <View style={{ flex: 1, height: u * 0.3, borderRadius: 99, backgroundColor: "rgba(201,154,97,.4)" }} />
      {note ? <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>{note}</Text> : null}
    </View>
  );
}
/** A goal or quest as a compact row: a round icon, the name with its reward, what to do and a slim progress bar; a big button only when it can be collected. */
function GoalRow({ icon, name, text, progress, target, reward, complete, claimed, onClaim, big }: { icon: string; name: string; text: string; progress: number; target: number; reward: string; complete: boolean; claimed: boolean; onClaim: () => void; big?: boolean }) {
  const u = useU(), f = Math.max(0, Math.min(1, progress / target)), ready = complete && !claimed;
  return (
    <View style={{ padding: u * 1.3, gap: u * 0.9, borderRadius: u * 2.2, backgroundColor: ready ? "#F4F8E8" : claimed ? "rgba(255,248,234,.6)" : "#FFFCF5", borderWidth: u * (ready ? 0.45 : 0.3), borderColor: ready ? C.green : big ? C.honey : "#EAD9B8", opacity: claimed ? 0.65 : 1,
      shadowColor: "#5E3A20", shadowOpacity: claimed ? 0 : 0.12, shadowRadius: u * 0.8, shadowOffset: { width: 0, height: u * 0.4 } }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: u * 1.2 }}>
        <View style={{ width: u * 9, height: u * 9, borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: ready ? C.greenPale : "#F6E8CC", borderWidth: u * 0.3, borderColor: ready ? C.green : "#E2C69B" }}>
          <EmojiIcon emoji={icon} size={u * 5.6} />
        </View>
        <View style={{ flex: 1, gap: u * 0.4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: u * 0.8 }}>
            <Text allowFontScaling={false} numberOfLines={1} style={{ flex: 1, color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }}>{name}</Text>
            <View style={{ paddingHorizontal: u * 1, paddingVertical: u * 0.25, borderRadius: 99, backgroundColor: claimed ? C.greenPale : "#FBEFD6", borderWidth: u * 0.25, borderColor: claimed ? C.greenLight : "#E8C98E" }}>
              <Rich text={claimed ? "✓ Alındı" : reward} size={fs(u, TYPE.small)} style={{ color: claimed ? C.greenDark : C.honeyDark, fontFamily: FONT.bold }} />
            </View>
          </View>
          <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.small) }}>{text}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: u * 0.8 }}>
            <View style={{ flex: 1, height: u * 1.6, borderRadius: 99, backgroundColor: "#EFE1C6", overflow: "hidden" }}>
              <View style={{ width: `${f * 100}%`, height: "100%", borderRadius: 99, backgroundColor: complete ? C.green : C.honey }} />
            </View>
            <Text allowFontScaling={false} style={{ minWidth: u * 9, textAlign: "right", color: complete ? C.greenDark : C.brown, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{fmt(Math.min(progress, target))}/{fmt(target)}</Text>
          </View>
        </View>
      </View>
      {ready ? <Btn label="🎁 Ödülü Al" onPress={onClaim} /> : null}
    </View>
  );
}
export function QuestPanel() {
  const { world, act } = useWorld();
  const { game, quests, goals } = world, u = useU();
  useRefresh();
  const [tab, setTab] = useState<"today" | "goals" | "quests">("today");
  const todays = goals.list() as any[];
  const week = goals.weekly() as any;
  const rating = world.cafe.rating() as { stars: number; total: number };
  const rainy = world.cafe.weather() === "rain";
  const star = world.cafe.cfg.bonuses?.event ? weeklyProduct(game) as string | null : null;
  const rank = (s: any) => (s.claimed ? 2 : s.complete ? 0 : 1);
  const list = (quests.list() as any[]).slice().sort((a, b) => rank(a) - rank(b));
  const done = list.filter((s) => s.claimed).length;
  const life = world.life, theme = life?.weekTheme(), del = life?.deliveryState();
  const badgeToday = [life?.luckReady(), life?.special()?.ready, theme?.complete && !theme.claimed, del?.state === "back"].filter(Boolean).length;
  const badgeGoals = (goals.claimable() as any[]).length;
  const badgeQuests = quests.claimable().length;
  const rewardText = (r: any) => [r.gold ? `💰 ${fmt(r.gold)}` : "", ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ${game.ingredientsDef[id].name} ×${n}`)].filter(Boolean).join(" · ");
  return (
    <Sheet title="Görevler" full onClose={() => act.openOverlay(null)} header={
      <View style={{ paddingHorizontal: u * 1.6, gap: u * 1.1, paddingBottom: u * 0.4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: u * 0.6 }}>
          <InfoPill text={rainy ? "🌧 Yağmurlu" : "☀ Hava açık"} />
          <InfoPill text={`★ ${rating.stars.toFixed(1).replace(".", ",")}`} />
          {star ? <InfoPill text={`⭐ ${game.productsDef[star].name} haftası +%${Math.round(world.cafe.cfg.bonuses.event.share * 100)}`} /> : null}
        </View>
        <View style={{ flexDirection: "row", padding: u * 0.5, gap: u * 0.4, borderRadius: 99, backgroundColor: "#8A5A36", borderWidth: u * 0.35, borderColor: "#5E3A20" }}>
          {([["today", "☀", "Bugün", badgeToday], ["goals", "🎯", "Hedefler", badgeGoals], ["quests", "📜", "Görevler", badgeQuests]] as [typeof tab, string, string, number][]).map(([id, icon, label, count]) => {
            const on = tab === id;
            return (
              <Pressable key={id} onPress={() => { act.sfx("tap"); setTab(id); }} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ flex: 1, minHeight: Math.max(44, u * 7), borderRadius: 99, backgroundColor: on ? C.cream : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: u * 0.5, transform: [{ scale: pressed ? 0.96 : 1 }],
                  shadowColor: "#3B2412", shadowOpacity: on ? 0.3 : 0, shadowRadius: u * 0.5, shadowOffset: { width: 0, height: u * 0.3 } })}>
                <Text allowFontScaling={false} style={{ fontSize: fs(u, TYPE.body) }}>{icon}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: on ? C.brownDark : "#FFF1D8", fontFamily: FONT.bold, fontSize: fs(u, TYPE.body) }}>{label}</Text>
                {count ? <View style={{ minWidth: u * 3.2, height: u * 3.2, paddingHorizontal: u * 0.6, borderRadius: 99, backgroundColor: C.terracotta, alignItems: "center", justifyContent: "center" }}><Text allowFontScaling={false} style={{ color: "#FFF", fontFamily: FONT.bold, fontSize: fs(u, TYPE.tiny) }}>{count}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    }>
      <CollectAll />
      {tab === "today" ? <>
      <PopularityCard />
      <LuckCard />
      <DishCard />
      <ThemeCard />
      <SpecialOrderCard />
      <DeliveryCard />
      <WeekendCard />
      </> : null}
      {tab === "goals" ? <>
      <Section title="Bugünün hedefleri" note={`${todays.filter((g) => g.claimed).length}/${todays.length} alındı`} />
      {todays.map((g) => <GoalRow key={g.id} icon={g.icon} name={g.name} text={`Bugün ${g.text}`} progress={g.progress} target={g.target} reward={`💰 ${fmt(g.gold)}`} complete={g.complete} claimed={g.claimed}
        onClaim={() => { const r = goals.claim(g.id); if (r.ok) act.toast(`🎁 ${g.name}: +${fmt(r.gold)} altın`, 2200); else act.warn(r.message); }} />)}
      {week ? <>
        <Section title="Haftanın hedefi" note="Pazartesi yenilenir" />
        <GoalRow icon={week.icon} name={week.name} text={`Bu hafta ${week.text}`} progress={week.progress} target={week.target} reward={`💰 ${fmt(week.gold)}`} complete={week.complete} claimed={week.claimed} big
          onClaim={() => { const r = goals.claimWeekly(); if (r.ok) act.toast(`🎁 ${week.name}: +${fmt(r.gold)} altın`, 2400); else act.warn(r.message); }} />
      </> : null}
      </> : null}
      {tab === "quests" ? <>
      <Section title="Görevler" note={`${done}/${list.length} tamamlandı`} />
      {list.map((s) => <GoalRow key={s.def.id} icon={s.def.icon} name={s.def.name} text={s.def.condition} progress={s.progress} target={s.def.target} reward={rewardText(s.def.reward)} complete={s.complete} claimed={s.claimed}
        onClaim={() => { const r = quests.claim(s.def.id); if (r.ok) act.toast(`🎁 ${s.def.name}: ödül alındı${r.reward.gold ? ` · +${fmt(r.reward.gold)} altın` : ""}`, 2200); else act.warn(r.message); }} />)}
      <BranchCard />
      </> : null}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- daily reward
export function DailyPanel() {
  const { world, act } = useWorld();
  const { game, daily } = world, u = useU();
  useRefresh(5000);
  const s = daily.status(), n = daily.defs.length;
  const doneUpTo = s.claimedToday ? s.streak : s.nextDay > 1 ? s.nextDay - 1 : 0;
  const info = s.claimedToday ? `Bugünün ödülü alındı. Yarın: Gün ${s.nextDay}.` : s.streakBroken ? "Bir günü kaçırdın, seri Gün 1'den yeniden başlıyor." : `Bugünün ödülü: Gün ${s.nextDay}/${n}.`;
  return (
    <Sheet title="Günlük Ödül" hint={`${info}\nHer gün gir, seri sürsün. Bir günü kaçırırsan seri 1. günden başlar.`} onClose={() => act.openOverlay(null)}>
      <Btn label={s.canClaim ? `Ödülü Al · Gün ${s.nextDay}` : "Bugün alındı"} disabled={!s.canClaim} style={{ alignSelf: "stretch" }}
        onPress={() => { const r = daily.claim(); if (r.ok) act.toast(`🎁 Günlük ödül · Gün ${r.day}: ${fmtReward(game, r.reward)}${r.streakBroken ? " (seri yeniden başladı)" : ""}`, 3200); else act.warn(r.message); }} />
      {(daily.defs as any[]).map((r, i) => {
        const day = i + 1, state = day <= doneUpTo ? "done" : day === s.nextDay && !s.claimedToday ? "today" : "todo";
        return (
          <Card key={day} tone={state === "today" ? "ready" : state === "done" ? "open" : undefined} left={<GameIcon id={state === "done" ? "check" : "gift"} size={u * 7} />}>
            <Title name={`Gün ${day}`} note={state === "done" ? "Alındı" : state === "today" ? "Bugün" : ""} />
            <Meta tone="reward" text={fmtReward(game, r)} />
          </Card>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- settings
export function SettingsPanel({ onReset }: { onReset: () => void }) {
  const { world, act } = useWorld();
  const { settings } = world, u = useU();
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState<string>(world.game.profile.name);
  const nameRef = useRef(name), dirty = useRef(false);
  nameRef.current = name;
  const commitName = (announce: boolean) => {                                  // the typed name is kept when the field is left, submitted or the panel is closed
    if (!dirty.current) return;
    dirty.current = false;
    const kept = world.game.setCafeName(nameRef.current);
    setName(kept);
    if (announce && kept) act.toast(`🪧 Kafenin adı: ${kept}`, 2000);
  };
  useEffect(() => () => { if (dirty.current) world.game.setCafeName(nameRef.current); }, [world]);
  const [, bump] = useState(0);
  const toggle = (key: string) => { settings.toggle(key); act.sfx("tap"); bump((n) => n + 1); if (key === "notify" && settings.values.notify) void askPermission().then((ok) => { if (!ok) act.warn("Bildirim izni verilmedi. Telefonun Ayarlar › Fırın & Kafe › Bildirimler bölümünden açabilirsin.", 3600); }); };
  const row = (key: string, icon: string, label: string) => (
    <Card key={key} left={<Text allowFontScaling={false} style={{ fontSize: u * 5 }}>{icon}</Text>} right={<Btn label={settings.values[key] ? "Açık" : "Kapalı"} variant={settings.values[key] ? "go" : "busy"} onPress={() => toggle(key)} />}>
      <Title name={label} />
    </Card>
  );
  return (
    <Sheet title="Ayarlar" onClose={() => act.openOverlay(null)}>
      <Card left={<Text allowFontScaling={false} style={{ fontSize: u * 5 }}>🪧</Text>}>
        <Title name="Kafenin adı" note={`en çok ${NAME_MAX} harf`} />
        <TextInput value={name} onChangeText={(t) => { dirty.current = true; setName(t.slice(0, NAME_MAX * 2)); }} onEndEditing={() => commitName(true)} onSubmitEditing={() => commitName(true)} onBlur={() => commitName(true)} placeholder="Örn. Pati Fırın" maxLength={NAME_MAX * 2} returnKeyType="done" accessibilityLabel="Kafenin adı"
          style={{ minHeight: Math.max(44, u * 8), borderRadius: u * 1.6, borderWidth: u * 0.3, borderColor: C.brown, backgroundColor: C.paper, paddingHorizontal: u * 1.6, color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.heading) }} />
        <Meta tone="muted" text="Tabelada görünür (kafe 2. aşamaya geçince asılır). Boş bırakırsan aşamanın adı kullanılır." />
      </Card>
      {row("sfx", "🔊", "Ses efektleri")}
      {row("music", "🎵", "Müzik")}
      {row("vibration", "📳", "Titreşim")}
      {row("tips", "💡", "İlk adım ipuçları")}
      {row("bigText", "🔠", "Büyük yazı (menüler ve paneller)")}
      {row("notify", "🔔", "Hatırlatmalar (fırın hazır, keşif döndü, kasa doldu; gece 22:00–09:00 sessiz)")}
      {row("lowfx", "🐢", "Düşük grafik (eski telefonlar: parıltı, ışık, yağmur ve gün ışığı kapanır)")}
      {__DEV__ ? <Card left={<Text allowFontScaling={false} style={{ fontSize: u * 5 }}>⏱</Text>}>
        <Title name="Açılış süresi" />
        <Meta tone="muted" text={Object.keys(timings).length ? `Toplam ${(timings.toplam / 1000).toFixed(1).replace(".", ",")} sn · ${Object.entries(timings).filter(([k]) => k !== "toplam").map(([k, v]) => `${k} ${(v / 1000).toFixed(1).replace(".", ",")} sn`).join(" · ")}` : "Ölçüm yok"} />
      </Card> : null}
      <Card tone="danger" right={confirming
        ? <View style={{ gap: u * 0.6 }}><Btn small variant="lack" label="Evet, sıfırla" onPress={() => { dirty.current = false; setConfirming(false); onReset(); }} /><Btn small variant="alt" label="Vazgeç" onPress={() => setConfirming(false)} /></View>
        : <Btn variant="lack" label="Sıfırla…" onPress={() => setConfirming(true)} />}>
        {confirming
          ? <><Title name="Emin misin?" /><Meta text="Tüm ilerleme (altın, stok, görevler, geliştirmeler, araştırmalar, keşif, günlük ödül) silinir. Eski kayıt yedeklenir. Ses ve titreşim ayarların korunur." /></>
          : <><Title name="İlerlemeyi sıfırla" /><Meta tone="muted" text="Oyuna baştan başlar. Önce onay istenir." /></>}
      </Card>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- town
const LABEL: Record<string, string> = { open: "Açık", available: "Açılabilir", locked: "Kilitli" };
const Req = ({ ok, text }: { ok: boolean; text: string }) => <Meta tone={ok ? "ok" : "bad"} text={`${ok ? "✓" : "✗"} ${text}`} />;

export function TownPanel({ onVisit }: { onVisit: (scene: any) => void }) {
  const { world, act } = useWorld();
  const { game, town } = world, u = useU();
  useRefresh();
  const list = (town.list() as any[]).filter((s) => !s.def.hidden);
  const open = list.filter((s) => s.status === "open").length;
  const reqs = (n: any) => <><Req ok={!n.missingLevel} text={`Seviye ${n.minLevel} (şu an ${town.playerLevel})`} /><Req ok={!n.missingGold} text={`${fmt(n.gold)} altın`} /></>;
  const opened = (r: any) => { act.toast(`${r.building.icon} ${r.building.name} açıldı! −${fmt(r.cost)} altın${r.xp ? ` · +${fmt(r.xp)} XP` : ""}`, 3200); act.sfx("claim"); act.buzz([30, 40, 30]); };
  return (
    <Sheet title="Kasaba" hint={`${open}/${list.length} bina açık · Seviye ${town.playerLevel} · 💰 ${fmt(game.gold)}`} onClose={() => act.openOverlay(null)}>
      {list.map((s) => {
        const d = s.def, id = d.id;
        let body: React.ReactNode, btn: React.ReactNode;
        if (s.status === "open") {
          body = <Meta text={d.note} />;
          if (d.starter) btn = <Btn label="Git" onPress={() => onVisit(d.scene)} />;
          else {
            const lv = s.level, max = s.maxLevel, stepName = lv ? d.levels[lv - 1] : "Yeni açıldı";
            const lack = s.next && (s.next.missingGold || s.next.missingLevel);
            body = <><Meta text={d.note} /><Meta text={`Gelişim: ${lv}/${max} · ${stepName}`} />{s.next ? reqs(s.next) : null}</>;
            btn = <View style={{ gap: u * 0.6 }}><Btn small label="Git" onPress={() => onVisit(d.scene ?? id)} />
              {s.next ? <Btn small variant={lack ? "lack" : "alt"} label="Geliştir" sub={d.levels[lv]} onPress={() => { const r = town.develop(id, lv); if (r.ok) { act.toast(`${r.building.icon} ${r.building.name} gelişti: seviye ${r.level} · −${fmt(r.cost)} altın${r.xp ? ` · +${fmt(r.xp)} XP` : ""}`, 3000); act.sfx("claim"); act.buzz([30, 40, 30]); } else act.warn(r.message); }} /> : <Btn small label="✓ Tamamlandı" disabled />}</View>;
          }
        } else if (d.comingSoon) { body = <Meta text={d.note} />; btn = <Btn label="Yakında" disabled />; }
        else {
          const n = s.unlock, reward = town.rewards[id]?.open?.xp;
          body = <><Meta text={d.note} />{reqs(n)}{reward ? <Meta tone="reward" text={`Açılış ödülü: ✨ ${reward} XP`} /> : null}</>;
          const open = <Btn small={id === "bookshop"} variant={s.status === "locked" || n.missingGold ? "lack" : "alt"} label={s.status === "locked" ? "🔒 Kilitli" : "Aç"} sub={s.status === "locked" ? undefined : `💰 ${fmt(n.gold)}`}
            onPress={() => { const r = town.open(id); if (r.ok) opened(r); else act.warn(r.message); }} />;
          btn = id === "bookshop" ? <View style={{ gap: u * 0.6 }}><Btn small label="Görüntüle" onPress={() => onVisit("bookshop")} />{open}</View> : open;
        }
        return (
          <Card key={id} tone={s.status === "open" ? "open" : s.status === "locked" ? "locked" : undefined} left={<GameIcon id={`b-${id}`} size={u * 7} />} right={btn}>
            <Title name={d.name} note={LABEL[s.status]} />
            {body}
          </Card>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- research (Bookshop)
export function ResearchPanel() {
  const { world, act } = useWorld();
  const { game, research, town } = world, u = useU();
  useRefresh();
  const isOpen = town.isOpen("bookshop");
  const bonusText = (id: string, level: number) => research.defs[id].describe(research.defs[id].values[level]);
  const opened = (r: any) => { act.toast(`${r.building.icon} ${r.building.name} açıldı! −${fmt(r.cost)} altın${r.xp ? ` · +${fmt(r.xp)} XP` : ""}`, 3200); act.sfx("claim"); act.buzz([30, 40, 30]); };
  const hint = `💰 ${fmt(game.gold)} · Bonuslar kalıcıdır${isOpen ? ` · Kitapçı gelişimi ${town.level("bookshop")}/${town.maxLevel("bookshop")}` : ""}`;
  if (!isOpen) {
    const n = town.need(town.unlocks.bookshop), lack = n.missingGold || n.missingLevel;
    return (
      <Sheet title="📚 Araştırma Merkezi" hint={hint}>
        <Card left={<GameIcon id="b-bookshop" size={u * 7} />} right={<Btn variant={lack ? "lack" : "alt"} label="Kitapçı'yı Aç" sub={`💰 ${fmt(n.gold)}`} onPress={() => { const r = town.open("bookshop"); if (r.ok) opened(r); else act.warn(r.message); }} />}>
          <Title name="Kitapçı henüz kapalı" />
          <Meta text="Açıldığında kalıcı araştırma bonusları sunar." />
          <Req ok={!n.missingLevel} text={`Seviye ${n.minLevel} (şu an ${town.playerLevel})`} />
          <Req ok={!n.missingGold} text={`${fmt(n.gold)} altın`} />
        </Card>
      </Sheet>
    );
  }
  return (
    <Sheet title="📚 Araştırma Merkezi" hint={hint}>
      {(research.ids() as string[]).map((id) => {
        const d = research.defs[id], lv = research.level(id), max = research.maxLevel(id), st = research.status(id), cost = research.nextCost(id);
        let btn: React.ReactNode, extra: React.ReactNode = null;
        if (st === "max") btn = <Btn label="Maksimum" disabled />;
        else if (st === "locked") { extra = <Meta tone="bad" text={`🔒 Kitapçı gelişimi ${d.bookshopLevel}. seviye gerekli (şu an ${town.level("bookshop")})`} />; btn = <Btn label="Kilitli" variant="lack" disabled />; }
        else {
          extra = <Meta tone="next" text={`Sonraki: ${bonusText(id, lv + 1)}`} />;
          btn = <Btn variant={game.gold < cost ? "lack" : "alt"} label="Araştır" sub={`💰 ${fmt(cost)}`}
            onPress={() => { const r = research.buy(id, lv); if (r.ok) { act.toast(`${r.def.icon} ${r.def.name} seviye ${r.level} · ${r.def.describe(r.def.values[r.level])} · −${fmt(r.cost)} altın`, 3200); act.sfx("claim"); act.buzz([30, 40, 30]); } else act.warn(r.message); }} />;
        }
        return (
          <Card key={id} tone={st === "max" ? "open" : st === "locked" ? "locked" : undefined} left={<EmojiIcon emoji={d.icon} size={u * 7} />} right={btn}>
            <Title name={d.name} note={`Seviye ${lv}/${max}`} />
            <Pips level={lv} max={max} />
            <Text allowFontScaling={false} style={{ color: C.greenDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.small) }}>{bonusText(id, lv)}</Text>
            {extra}
          </Card>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- exploration
const range = ([a, b]: number[]) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);

export function ExplorePanel({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { world, act } = useWorld();
  const { game, exploration: ex } = world, u = useU();
  useRefresh(500);
  const room = ex.goldRoom() as number;
  const possible = (d: any) => {
    const rw = d.rewards, parts = [`💰 ${range(rw.gold)}`, `✨ ${range(rw.xp)} XP`];
    for (const i of rw.ingredients ?? []) parts.push(`${game.ingredientsDef[i.id].icon} ${range(i.amount)}${i.chance < 1 ? ` (%${Math.round(i.chance * 100)})` : ""}`);
    if (rw.gems) parts.push(`💎 ${range(rw.gems.amount)} (nadir, %${Math.round(rw.gems.chance * 100)})`);
    return parts.join(" · ");
  };
  const earned = (r: any) => {
    const parts: string[] = [];
    if (r.gold) parts.push(`💰 ${fmt(r.gold)}`);
    if (r.xp) parts.push(`✨ ${fmt(r.xp)} XP`);
    for (const [id, n] of Object.entries(r.ingredients)) parts.push(`${game.ingredientsDef[id].icon} ×${n}`);
    if (r.gems) parts.push(`💎 ${r.gems}`);
    return parts.join(" · ");
  };
  const STATUS: Record<string, string> = { locked: "Kilitli", available: "Açık", busy: "Açık", active: "Keşifte", ready: "Tamamlandı" };
  return (
    <Sheet title="🧭 Keşif" hint={`Aynı anda bir keşif · süre gerçek zamanlı, oyun kapalıyken de ilerler\nBugün tam ödenen keşif altını: ${fmt(room)} kaldı (sonrası %${Math.round(EXPLORE_LIMIT.overRate * 100)})`} side="right">
      {(ex.list() as any[]).map((s) => {
        const d = s.def, st = s.status, a = ex.active;
        let body: React.ReactNode, btn: React.ReactNode;
        const head = <><Meta text={d.desc} /><Meta text={`⏱ ${formatDuration(d.duration)} · Seviye ${d.minLevel}${d.after ? ` · önce ${ex.region(d.after.region).name}` : ""}${s.done ? ` · ${s.done}× tamamlandı` : ""}`} /></>;
        if (st === "locked") { body = <>{head}{(s.missing as string[]).map((m) => <Meta key={m} tone="bad" text={`✗ ${m}`} />)}</>; btn = <Btn label="🔒 Kilitli" disabled />; }
        else if (st === "active") { body = <>{head}<Bar value={ex.progress()} /><Meta text={`${formatDuration(ex.remaining())} kaldı`} /></>; btn = <Btn label="Keşifte…" disabled />; }
        else if (st === "ready") { body = <>{head}<Meta tone="reward" text={`🎁 Ödül: ${earned(a.reward)}`} /></>; btn = <Btn variant="alt" label="Ödülü Al" onPress={() => { const r = ex.claim(a.id); if (r.ok) { act.toast(`${r.region.icon} ${r.region.name}: ${earned(r.reward)}${r.reduced ? `\nGünlük keşif altın sınırı aşıldı: ${fmt(r.rolled)} yerine ${fmt(r.reward.gold)} altın` : ""}`, r.reduced ? 5200 : 4200); act.sfx("claim"); act.buzz([30, 40, 60]); } else act.warn(r.message, 3000); }} />; }
        else { body = <>{head}<Meta tone="reward" text={`Olası ödüller: ${possible(d)}`} /></>; btn = st === "busy" ? <Btn label="Başka keşif sürüyor" disabled /> : <Btn variant="alt" label="Keşfe Çık" onPress={() => { const r = ex.start(d.id); if (r.ok) { act.toast(`${r.region.icon} ${r.region.name} keşfi başladı`, 2200); act.sfx("tap"); } else act.warn(r.message, 3000); }} />; }
        return (
          <Card key={d.id} tone={st === "locked" ? "locked" : st === "ready" ? "ready" : undefined} left={<EmojiIcon emoji={d.icon} size={u * 7} />} right={btn} style={selected === d.id ? { borderColor: C.honeyDark } : undefined}>
            <Title name={d.name} note={STATUS[st]} />
            {body}
          </Card>
        );
      })}
    </Sheet>
  );
}
