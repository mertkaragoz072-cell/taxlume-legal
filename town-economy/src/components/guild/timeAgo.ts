type T = (key: string, params?: Record<string, string | number>) => string;

/** "5 min ago" style label for a feed line. */
export function timeAgo(at: number, now: number, t: T): string {
  const mins = Math.max(0, Math.round((now - at) / 60_000));
  if (mins < 1) return t("guild.ago.now");
  if (mins < 60) return t("guild.ago.min", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 48) return t("guild.ago.hour", { n: hours });
  return t("guild.ago.day", { n: Math.round(hours / 24) });
}

/** "5h 12m" style countdown for an active duel. */
export function timeLeft(endsAt: number, now: number): string {
  const mins = Math.max(0, Math.floor((endsAt - now) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}
