import { useEconomyContext } from "../../economy/EconomyContext";
import { GuildFeedItem, GuildInfo, HALL_PROJECTS } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { INK, MUTED, styles } from "./guildStyles";
import { useNow } from "./useNow";
import { timeAgo } from "./timeAgo";

const ICONS: Record<GuildFeedItem["kind"], string> = {
  joined: "👋",
  goal_done: "🎯",
  order_done: "📦",
  duel_won: "⚔️",
  project_done: "🏛️",
  big_draw: "💎",
  caravan_sent: "🐪",
  caravan_arrived: "🐪",
};

/** What has been going on in the guild lately. */
export function FeedPanel({ guild }: { guild: GuildInfo }) {
  const { t, tPlural } = useEconomyContext();
  const now = useNow();
  return (
    <>
      <GoalRibbon text={t("guild.feedSection")} />
      <GoalFrame>
        {guild.feed.length === 0 ? (
          <Text style={styles.hint}>{t("guild.feedEmpty")}</Text>
        ) : (
          guild.feed.map((f) => {
            const project = f.kind === "project_done" ? HALL_PROJECTS[Number(f.detail) - 1] : undefined;
            const dest = f.kind.startsWith("caravan") && f.detail ? t(`place.${f.detail}.name`) : "";
            return (
              <Text key={f.id} style={[styles.hint, { color: INK, marginBottom: 6 }]}>
                {ICONS[f.kind]}{" "}
                {t(`guild.feed.${f.kind}`, {
                  name: f.actorName || "?",
                  project: project ? `${project.icon} ${t(`guild.project.${project.id}.name`)}` : "",
                  dest,
                })}
                <Text style={{ color: MUTED }}>{`  ·  ${timeAgo(f.at, now, t, tPlural)}`}</Text>
              </Text>
            );
          })
        )}
      </GoalFrame>
    </>
  );
}
