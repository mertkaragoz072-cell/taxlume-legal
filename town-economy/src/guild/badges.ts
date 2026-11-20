import { GuildInfo } from "./types";

export interface GuildBadge {
  id: string;
  icon: string;
  /** i18n keys: guild.badge.<id>.name / .hint */
  earned: (g: GuildInfo, level: number) => boolean;
}

/** Small trophies for how a player takes part, worked out from what the
 * server already says about them; nothing extra is stored. */
export const GUILD_BADGES: GuildBadge[] = [
  { id: "trader", icon: "🛒", earned: (g) => g.myTotals.trades >= 100 },
  { id: "giver", icon: "📦", earned: (g) => g.myTotals.donated >= 50 },
  { id: "friend", icon: "🤝", earned: (g) => g.myTotals.gifted >= 25 },
  { id: "streak", icon: "🔥", earned: (g) => g.streak >= 3 },
  { id: "founder", icon: "👑", earned: (g) => g.members.some((m) => m.isYou && m.isOwner) },
  { id: "veteran", icon: "🏅", earned: (_g, level) => level >= 5 },
];
