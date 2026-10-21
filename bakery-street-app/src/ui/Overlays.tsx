// Quest, daily reward, settings, town, research and exploration panels.
import React, { useState } from "react";
import { Text, View } from "react-native";
import { formatDuration } from "../game/exploration.js";
import { useRefresh, useWorld } from "../runtime/context";
import { Bar, Btn, Card, Meta, Pips, Sheet, Title } from "./kit";
import { EmojiIcon, GameIcon, Rich } from "./icons";
import { C, FONT, fmt, fs, useU } from "./theme";

const fmtReward = (game: any, r: any) => [
  r.gold ? `💰 ${fmt(r.gold)}` : "",
  r.gems ? `💎 ${r.gems}` : "",
  ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ×${n}`),
].filter(Boolean).join(" · ");
export const formatReward = fmtReward;

// ---------------------------------------------------------------------------------------------------------------- quests
export function QuestPanel() {
  const { world, act } = useWorld();
  const { game, quests } = world, u = useU();
  useRefresh();
  const rank = (s: any) => (s.claimed ? 2 : s.complete ? 0 : 1);
  const list = (quests.list() as any[]).slice().sort((a, b) => rank(a) - rank(b));
  const done = list.filter((s) => s.claimed).length;
  const rewardText = (r: any) => [r.gold ? `💰 ${fmt(r.gold)}` : "", ...Object.entries(r.ingredients ?? {}).map(([id, n]) => `${game.ingredientsDef[id].icon} ${game.ingredientsDef[id].name} ×${n}`)].filter(Boolean).join(" · ");
  return (
    <Sheet title="Görevler" hint={`${done}/${list.length} görev tamamlandı ve ödülü alındı.`} onClose={() => act.openOverlay(null)}>
      {list.map((s) => {
        const q = s.def;
        return (
          <Card key={q.id} tone={s.claimed ? "locked" : s.complete ? "ready" : undefined} left={<EmojiIcon emoji={q.icon} size={u * 7} />}
            right={s.claimed ? <Btn label="✓ Alındı" disabled /> : s.complete ? <Btn label="Ödülü Al" onPress={() => { const r = quests.claim(q.id); if (r.ok) act.toast(`🎁 ${q.name}: ödül alındı${r.reward.gold ? ` · +${fmt(r.reward.gold)} altın` : ""}`, 2200); else act.warn(r.message); }} /> : <Btn label="Devam ediyor" disabled />}>
            <Title name={q.name} />
            <Meta text={q.condition} />
            <Bar value={s.progress / q.target} text={`${s.progress}/${q.target}`} />
            <Meta tone="reward" text={`Ödül: ${rewardText(q.reward)}`} />
          </Card>
        );
      })}
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
  const [, bump] = useState(0);
  const toggle = (key: string) => { settings.toggle(key); act.sfx("tap"); bump((n) => n + 1); };
  const row = (key: string, icon: string, label: string) => (
    <Card key={key} left={<Text style={{ fontSize: u * 5 }}>{icon}</Text>} right={<Btn label={settings.values[key] ? "Açık" : "Kapalı"} variant={settings.values[key] ? "go" : "busy"} onPress={() => toggle(key)} />}>
      <Title name={label} />
    </Card>
  );
  return (
    <Sheet title="Ayarlar" onClose={() => act.openOverlay(null)}>
      {row("sfx", "🔊", "Ses efektleri")}
      {row("music", "🎵", "Müzik")}
      {row("vibration", "📳", "Titreşim")}
      <Card tone="danger" right={confirming
        ? <View style={{ gap: u * 0.6 }}><Btn small variant="lack" label="Evet, sıfırla" onPress={() => { setConfirming(false); onReset(); }} /><Btn small variant="alt" label="Vazgeç" onPress={() => setConfirming(false)} /></View>
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
            <Text style={{ color: C.greenDark, fontFamily: FONT.bold, fontSize: fs(u, 2.4) }}>{bonusText(id, lv)}</Text>
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
    <Sheet title="🧭 Keşif" hint="Aynı anda bir keşif · süre gerçek zamanlı, oyun kapalıyken de ilerler" side="right">
      {(ex.list() as any[]).map((s) => {
        const d = s.def, st = s.status, a = ex.active;
        let body: React.ReactNode, btn: React.ReactNode;
        const head = <><Meta text={d.desc} /><Meta text={`⏱ ${formatDuration(d.duration)} · Seviye ${d.minLevel}${d.after ? ` · önce ${ex.region(d.after.region).name}` : ""}${s.done ? ` · ${s.done}× tamamlandı` : ""}`} /></>;
        if (st === "locked") { body = <>{head}{(s.missing as string[]).map((m) => <Meta key={m} tone="bad" text={`✗ ${m}`} />)}</>; btn = <Btn label="🔒 Kilitli" disabled />; }
        else if (st === "active") { body = <>{head}<Bar value={ex.progress()} /><Meta text={`${formatDuration(ex.remaining())} kaldı`} /></>; btn = <Btn label="Keşifte…" disabled />; }
        else if (st === "ready") { body = <>{head}<Meta tone="reward" text={`🎁 Ödül: ${earned(a.reward)}`} /></>; btn = <Btn variant="alt" label="Ödülü Al" onPress={() => { const r = ex.claim(a.id); if (r.ok) { act.toast(`${r.region.icon} ${r.region.name}: ${earned(r.reward)}`, 4200); act.sfx("claim"); act.buzz([30, 40, 60]); } else act.warn(r.message, 3000); }} />; }
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
