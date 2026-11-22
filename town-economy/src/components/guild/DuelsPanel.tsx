import { View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { useGuild } from "../../guild/GuildContext";
import { duelRewardFor } from "../../guild/reward";
import { GuildDuel, GuildInfo } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalProgress, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { INK, MUTED, styles } from "./guildStyles";
import { useNow } from "./useNow";
import { timeLeft } from "./timeAgo";

/** Friendly 24-hour trading duels between two members: most trades wins. */
export function DuelsPanel({ guild }: { guild: GuildInfo }) {
  const { busy, respondDuel, claimDuel } = useGuild();
  const { t, tPlural, formatCoins, state } = useEconomyContext();
  const now = useNow();
  const mine = (d: GuildDuel) => (d.challengerId === guild.members.find((m) => m.isYou)?.id ? "c" : "o");
  const live = guild.duels.filter((d) => d.status !== "declined");

  return (
    <>
      <GoalRibbon text={t("guild.duelSection")} />
      <GoalFrame>
        {live.length === 0 && <Text style={styles.hint}>{t("guild.duelNone")}</Text>}
        {live.map((d) => {
          const youAreC = mine(d) === "c";
          const you = youAreC ? d.cTrades : d.oTrades;
          const them = youAreC ? d.oTrades : d.cTrades;
          const rival = youAreC ? d.opponentName : d.challengerName;
          const top = Math.max(1, you, them);
          return (
            <View key={d.id} style={styles.duelRow}>
              {d.status === "pending" && (
                <>
                  <Text style={[styles.memberName, { color: INK }]}>
                    {youAreC
                      ? t("guild.duelSent", { name: rival })
                      : t("guild.duelReceived", { name: rival })}
                  </Text>
                  <Text style={styles.hint}>
                    {t("guild.duelRules", { prize: formatCoins(duelRewardFor(state.townRankIndex), 0) })}
                  </Text>
                  <View style={styles.btnRow}>
                    {!youAreC && (
                      <View style={{ flex: 1 }}>
                        <BigButton
                          label={t("guild.duelAccept")}
                          height={40}
                          fontSize={13}
                          disabled={busy}
                          onPress={() => void respondDuel(d.id, true)}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <BigButton
                        tone="red"
                        label={youAreC ? t("guild.duelWithdraw") : t("guild.duelDecline")}
                        height={40}
                        fontSize={13}
                        disabled={busy}
                        onPress={() => void respondDuel(d.id, false)}
                      />
                    </View>
                  </View>
                </>
              )}
              {d.status === "active" && (
                <>
                  <Text style={[styles.memberName, { color: INK }]}>
                    {t("guild.duelVs", { name: rival })}
                    {d.endsAt ? `  ·  ${timeLeft(d.endsAt, now)}` : ""}
                  </Text>
                  <Text style={styles.hint}>{tPlural("guild.duelYou", you, { n: you })}</Text>
                  <GoalProgress pct={you / top} color="#9fd68f" />
                  <Text style={[styles.hint, { marginTop: 6 }]}>
                    {tPlural("guild.duelThem", them, { name: rival, n: them })}
                  </Text>
                  <GoalProgress pct={them / top} color="#e07a5f" />
                </>
              )}
              {d.status === "done" && (
                <>
                  <Text style={[styles.memberName, { color: d.winnerId === null ? MUTED : INK }]}>
                    {d.winnerId === null
                      ? t("guild.duelTie", { name: rival })
                      : d.winnerId === guild.members.find((m) => m.isYou)?.id
                        ? t("guild.duelWon", { name: rival })
                        : t("guild.duelLost", { name: rival })}
                  </Text>
                  <Text style={styles.hint}>{t("guild.duelScore", { you, them })}</Text>
                  {d.canClaim && (
                    <BigButton
                      laurel
                      label={t("guild.duelClaim", {
                        amount: formatCoins(duelRewardFor(state.townRankIndex), 0),
                      })}
                      disabled={busy}
                      onPress={() => void claimDuel(d.id)}
                    />
                  )}
                </>
              )}
            </View>
          );
        })}
      </GoalFrame>
    </>
  );
}
