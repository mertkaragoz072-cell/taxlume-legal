import { useState } from "react";
import { Pressable, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { rankTheme } from "../../economy/rankTheme";
import { townRankIcon } from "../../economy/townRanks";
import { useGuild } from "../../guild/GuildContext";
import { CHEER_CODES, GUILD_PHRASES, GuildInfo } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { DuelsPanel } from "./DuelsPanel";
import { INK, MUTED, styles } from "./guildStyles";

export function MembersTab({ guild }: { guild: GuildInfo }) {
  const { busy, cheer, challenge } = useGuild();
  const { t, tPlural, formatCoins } = useEconomyContext();
  const [cheerFor, setCheerFor] = useState<string | null>(null);

  // a duel needs two free players
  const iAmBusy = guild.duels.some((d) => d.status === "pending" || d.status === "active");

  return (
    <>
      <DuelsPanel guild={guild} />

      <GoalRibbon text={t("guild.membersSection")} />
      <GoalFrame>
        {guild.members.map((m) => (
          <View key={m.id}>
            <View style={styles.memberRow}>
              <Text style={styles.memberIcon}>{townRankIcon(m.rankIndex)}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.memberName, { color: m.isYou ? rankTheme(m.rankIndex).accent : INK }]}
                  numberOfLines={1}
                >
                  {m.name}
                  {m.isYou ? ` · ${t("guild.you")}` : ""}
                  {m.isOwner ? ` · ${t("guild.owner")}` : ""}
                </Text>
                <Text style={styles.hint}>
                  {tPlural("guild.contribution", m.weekContribution, { n: m.weekContribution })}
                  {m.donated + m.gifted > 0
                    ? ` · ${t("guild.tradeExtra", { d: m.donated, g: m.gifted })}`
                    : ""}
                  {m.cashGiven > 0 ? ` · 🏛️ ${formatCoins(m.cashGiven, 0)}` : ""}
                </Text>
              </View>
              {!m.isYou && (
                <Pressable
                  style={[styles.duelBtn, { marginRight: 6, opacity: iAmBusy ? 0.4 : 1 }]}
                  disabled={busy || iAmBusy}
                  onPress={() => void challenge(m.id)}
                  accessibilityLabel={t("guild.duelChallenge", { name: m.name })}
                >
                  <Text style={{ fontSize: 18 }}>⚔️</Text>
                </Pressable>
              )}
              {!m.isYou && (
                <Pressable
                  style={styles.cheerBtn}
                  disabled={busy}
                  onPress={() => setCheerFor(cheerFor === m.id ? null : m.id)}
                  accessibilityLabel={`${CHEER_CODES[0]} ${m.name}`}
                >
                  <Text style={{ fontSize: 20 }}>{CHEER_CODES[0]}</Text>
                </Pressable>
              )}
            </View>
            {cheerFor === m.id && (
              <View style={styles.cheerPicker}>
                {CHEER_CODES.map((code) => {
                  const phrase = (GUILD_PHRASES as readonly string[]).includes(code);
                  return (
                    <Pressable
                      key={code}
                      style={phrase ? styles.phrasePill : styles.chip}
                      disabled={busy}
                      onPress={() => {
                        setCheerFor(null);
                        void cheer(m.id, code);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={phrase ? styles.phraseText : { fontSize: 22 }}>
                        {phrase ? t(`guild.phrase.${code}`) : code}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </GoalFrame>

      <GoalRibbon text={t("guild.cheerSection")} />
      <GoalFrame>
        {guild.cheers.length === 0 ? (
          <Text style={styles.hint}>{t("guild.cheerNone")}</Text>
        ) : (
          guild.cheers.map((c) => (
            <Text key={c.id} style={[styles.hint, { color: c.toYou ? INK : MUTED }]}>
              {t(c.toYou ? "guild.cheerToYou" : "guild.cheerToOther", {
                name: c.fromName,
                emote: (GUILD_PHRASES as readonly string[]).includes(c.emote)
                  ? t(`guild.phrase.${c.emote}`)
                  : c.emote,
              })}
            </Text>
          ))
        )}
      </GoalFrame>
    </>
  );
}
