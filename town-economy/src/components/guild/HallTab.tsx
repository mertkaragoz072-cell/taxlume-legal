import { useState } from "react";
import { Pressable, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { GUILD_BADGES } from "../../guild/badges";
import { useGuild } from "../../guild/GuildContext";
import { GuildInfo, guildLevel, REPORT_REASONS } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { MUTED, styles } from "./guildStyles";
import { HallPanel } from "./HallPanel";
import { RankingPanel } from "./RankingPanel";

export function HallTab({ guild }: { guild: GuildInfo }) {
  const { busy, leave, report } = useGuild();
  const { t } = useEconomyContext();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  return (
    <>
      <HallPanel guild={guild} />

      <GoalRibbon text={t("guild.badgeSection")} />
      <GoalFrame>
        <View style={styles.badgeGrid}>
          {GUILD_BADGES.map((b) => {
            const on = b.earned(guild, guildLevel(guild.totalContribution));
            return (
              <View key={b.id} style={[styles.badge, on && styles.badgeOn]}>
                <Text style={{ fontSize: 26, opacity: on ? 1 : 0.35 }}>{on ? b.icon : "🔒"}</Text>
                <Text style={[styles.badgeName, !on && { color: MUTED }]} numberOfLines={1}>
                  {t(`guild.badge.${b.id}.name`)}
                </Text>
                <Text style={styles.badgeHint} numberOfLines={3}>
                  {t(`guild.badge.${b.id}.hint`)}
                </Text>
              </View>
            );
          })}
        </View>
      </GoalFrame>

      <RankingPanel />

      <View style={styles.reportBox}>
        {reported ? (
          <Text style={styles.claimed}>{t("guild.reportThanks")}</Text>
        ) : reporting ? (
          <>
            <Text style={styles.hint}>{t("guild.reportWhy")}</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={styles.reasonBtn}
                disabled={busy}
                onPress={() => void report(reason).then((sent) => sent && setReported(true))}
                accessibilityRole="button"
              >
                <Text style={styles.reasonText}>{t(`guild.reportReason.${reason}`)}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Pressable onPress={() => setReporting(true)} accessibilityRole="button">
            <Text style={styles.reportLink}>{t("guild.report")}</Text>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 6 }}>
        <BigButton
          tone="red"
          label={confirmLeave ? t("guild.leaveConfirm") : t("guild.leave")}
          disabled={busy}
          onPress={() => {
            if (!confirmLeave) setConfirmLeave(true);
            else void leave().then(() => setConfirmLeave(false));
          }}
        />
      </View>
    </>
  );
}
