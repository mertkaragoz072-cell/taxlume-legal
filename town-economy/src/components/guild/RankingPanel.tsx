import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { rankTheme } from "../../economy/rankTheme";
import { useGuild } from "../../guild/GuildContext";
import { guildLevel } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { INK, MUTED, styles } from "./guildStyles";

/** This week's most active guilds. Their names are chosen by players, so every
 * line but your own has a report flag. */
export function RankingPanel() {
  const { ranking, loadRanking, reportRanked, busy } = useGuild();
  const { t, state } = useEconomyContext();
  const [asking, setAsking] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    void loadRanking();
    // refreshed each time the Hall tab opens
  }, [loadRanking]);

  return (
    <>
      <GoalRibbon text={t("guild.rankingSection")} />
      <GoalFrame>
        {ranking.length === 0 && <Text style={styles.hint}>{t("guild.rankingEmpty")}</Text>}
        {ranking.map((g, i) => (
          <View key={g.id} style={styles.memberRow}>
            <Text style={[styles.memberName, { width: 28, color: i < 3 ? "#f6d36a" : MUTED }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.memberName, { color: g.isMine ? rankTheme(state.townRankIndex).accent : INK }]}
                numberOfLines={1}
              >
                {g.name}
              </Text>
              <Text style={styles.hint}>
                {t("guild.rankingLine", {
                  level: guildLevel(g.totalContribution),
                  members: g.members,
                  score: g.score,
                })}
              </Text>
            </View>
            {!g.isMine &&
              (sent.includes(g.id) ? (
                <Text style={styles.hint}>✓</Text>
              ) : (
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    if (asking !== g.id) {
                      setAsking(g.id);
                      return;
                    }
                    setAsking(null);
                    void reportRanked(g.id, "guild_name").then((ok) => ok && setSent((s) => [...s, g.id]));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("guild.rankingReport")}
                >
                  <Text style={styles.reportLink}>
                    {asking === g.id ? t("guild.rankingReportSure") : "⚑"}
                  </Text>
                </Pressable>
              ))}
          </View>
        ))}
      </GoalFrame>
    </>
  );
}
