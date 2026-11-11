// The guest album and the statistics page (menu entries "Müşteri Albümü" and "İstatistikler").
import React from "react";
import { Text } from "react-native";
import { useRefresh, useWorld } from "../runtime/context";
import { Card, Meta, Sheet, Title } from "./kit";
import { EmojiIcon } from "./icons";
import { fmt, useU } from "./theme";

// ---------------------------------------------------------------------------------------------------------------- guest album
export function AlbumPanel() {
  const { world, act } = useWorld();
  const { game, album, cafe } = world, u = useU();
  useRefresh();
  const looks = album.looks as string[];
  return (
    <Sheet title="Müşteri Albümü" hint={`${album.count()}/${looks.length} müşteri tanıştın${album.completed ? " · albüm tamamlandı!" : `\nYeni her müşteri +${fmt(album.cfg.newLook)} altın, hepsi +${fmt(album.cfg.complete)} altın kazandırır`}`} onClose={() => act.openOverlay(null)}>
      {looks.map((look) => {
        const e = album.entry(look), fav = cafe.favoriteOf(look), def = game.productsDef[fav];
        return (
          <Card key={look} tone={e ? undefined : "locked"} left={<EmojiIcon emoji={e ? "🐱" : "❔"} size={u * 7} />}>
            <Title name={e ? album.nameOf(look) : "Henüz tanışmadın"} />
            <Meta text={e ? `${e.served} kez servis yapıldı` : "Bu müşteriye bir ürün servis et"} />
            <Meta tone={e?.fav ? "reward" : undefined} text={e?.fav ? `Favorisi: ${def.icon} ${def.name} (+%${Math.round(cafe.cfg.bonuses.favorite.share * 100)})` : "Favorisi: ? (denerken öğrenirsin)"} />
          </Card>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------- statistics
const clockText = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h} sa ${m} dk` : `${m} dk`; };
export function StatsPanel() {
  const { world, act } = useWorld();
  const { game, album, cafe } = world, u = useU();
  useRefresh(5000);
  const st = game.stats, best = Object.entries(st.sold as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
  const bestDef = best && best[1] > 0 ? game.productsDef[best[0]] : null;
  const rating = cafe.rating() as { stars: number; happy: number; total: number };
  const line = (icon: string, name: string, value: string) => <Card key={name} left={<Text allowFontScaling={false} style={{ fontSize: u * 5 }}>{icon}</Text>}><Title name={name} note={value} /></Card>;
  return (
    <Sheet title="İstatistikler" hint={game.profile.name ? `🪧 ${game.profile.name}` : "Kafenin şimdiye kadarki hikâyesi"} onClose={() => act.openOverlay(null)}>
      {line("⏱", "Kafede geçen süre", clockText(st.playSec ?? 0))}
      {line("🧾", "Toplam satış", fmt(st.soldTotal))}
      {line("🏭", "Toplam üretim", fmt(st.producedTotal))}
      {line("💰", "Toplam kazanılan altın", fmt(st.goldEarned))}
      {line("🪙", "Toplam harcanan altın", fmt(st.goldSpent))}
      {line("⚡", "En iyi servis serisi", `${st.bestCombo ?? 0} satış`)}
      {line("♥", "Favori servisi", fmt(st.favoritesServed ?? 0))}
      {line("🏆", "En çok satan ürün", bestDef ? `${bestDef.icon} ${bestDef.name} · ${fmt(best[1])}` : "—")}
      {line("⭐", "Kafe puanı", `★ ${rating.stars.toFixed(1)} (son ${rating.total} müşteri)`)}
      {line("📖", "Müşteri albümü", `${album.count()}/${album.looks.length}`)}
    </Sheet>
  );
}

