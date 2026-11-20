import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { rankTheme } from "../economy/rankTheme";
import { townRankIcon } from "../economy/townRanks";
import { normalizeGuildCode } from "../guild/guildName";
import { useGuild } from "../guild/GuildContext";
import { guildRewardFor } from "../guild/reward";
import {
  CHEER_EMOTES,
  GUILD_CODE_LENGTH,
  GUILD_MAX_MEMBERS,
  GUILD_NAME_MAX,
  guildLevel,
  REPORT_REASONS,
} from "../guild/types";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GoalFrame, GoalProgress, GoalRibbon } from "./GoalPanels";
import { BigButton } from "./ModalKit";
import { SheetHeader } from "./SheetHeader";

const INK = "#f4e8d0";
const MUTED = "#b9a88a";

/** The guild screen: start or join one, then see the shared weekly goal, the
 * members and a few friendly cheers. Everything is read from the guild
 * backend (see src/guild); no free text exists except the guild's own name. */
export function GuildHub() {
  const {
    hubOpen,
    closeHub,
    status,
    guild,
    error,
    busy,
    create,
    join,
    leave,
    cheer,
    claim,
    report,
    clearError,
  } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (!hubOpen) {
      setConfirmLeave(false);
      setReporting(false);
      setReported(false);
      clearError();
    }
  }, [hubOpen, clearError]);

  const reward = guildRewardFor(state.townRankIndex);

  return (
    <Modal visible={hubOpen} transparent animationType="fade" onRequestClose={closeHub}>
      <SafeAreaView style={styles.root}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <SheetHeader text={t("guild.title")} />
          </View>
          <Pressable
            onPress={closeHub}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t("guild.close")}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{t(`guild.error.${error}`)}</Text>
            </View>
          )}

          {status !== "in" && (
            <>
              <GoalRibbon text={t("guild.createSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.createHint")}</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, GUILD_NAME_MAX))}
                  placeholder={t("guild.namePlaceholder")}
                  placeholderTextColor="#6b5f4d"
                  style={styles.input}
                  maxLength={GUILD_NAME_MAX}
                />
                <BigButton
                  label={t("guild.createBtn")}
                  disabled={busy || name.trim().length < 3}
                  onPress={() => void create(name)}
                />
              </GoalFrame>

              <GoalRibbon text={t("guild.joinSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.joinHint")}</Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(normalizeGuildCode(v))}
                  placeholder={t("guild.codePlaceholder")}
                  placeholderTextColor="#6b5f4d"
                  style={[styles.input, styles.codeInput]}
                  maxLength={GUILD_CODE_LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <BigButton
                  label={t("guild.joinBtn")}
                  disabled={busy || code.length !== GUILD_CODE_LENGTH}
                  onPress={() => void join(code)}
                />
              </GoalFrame>
            </>
          )}

          {status === "in" && guild && (
            <>
              <GoalFrame lit>
                <Text style={styles.guildName} numberOfLines={1}>
                  {guild.name}
                </Text>
                <Text style={styles.hint}>
                  {t("guild.level", { n: guildLevel(guild.totalContribution) })} ·{" "}
                  {t("guild.members", { n: guild.memberCount, max: GUILD_MAX_MEMBERS })}
                </Text>
                <View style={styles.codeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codeLabel}>{t("guild.code")}</Text>
                    <Text style={styles.code} selectable>
                      {guild.code}
                    </Text>
                  </View>
                  <View style={{ width: 150 }}>
                    <BigButton
                      label={t("guild.invite")}
                      height={40}
                      fontSize={12}
                      onPress={() =>
                        void Share.share({ message: t("guild.inviteMessage", { code: guild.code }) }).catch(
                          () => {}
                        )
                      }
                    />
                  </View>
                </View>
              </GoalFrame>

              <GoalRibbon text={t("guild.goalSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.goalText", { goal: guild.goalTarget })}</Text>
                <Text style={styles.progressText}>
                  {Math.min(guild.goalProgress, guild.goalTarget)} / {guild.goalTarget}
                </Text>
                <GoalProgress pct={guild.goalProgress / guild.goalTarget} color="#f6d36a" />
                {guild.goalProgress >= guild.goalTarget && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.done}>{t("guild.goalDone")}</Text>
                    {guild.rewardClaimed ? (
                      <Text style={styles.claimed}>{t("guild.claimed")}</Text>
                    ) : (
                      <BigButton
                        laurel
                        label={t("guild.claim", { amount: formatCoins(reward, 0) })}
                        disabled={busy}
                        onPress={() => void claim()}
                      />
                    )}
                  </View>
                )}
              </GoalFrame>

              <GoalRibbon text={t("guild.membersSection")} />
              <GoalFrame>
                {guild.members.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
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
                      <Text style={styles.hint}>{t("guild.contribution", { n: m.weekContribution })}</Text>
                    </View>
                    {!m.isYou && (
                      <Pressable
                        style={styles.cheerBtn}
                        disabled={busy}
                        onPress={() => void cheer(m.id, CHEER_EMOTES[0])}
                        accessibilityLabel={`${CHEER_EMOTES[0]} ${m.name}`}
                      >
                        <Text style={{ fontSize: 20 }}>{CHEER_EMOTES[0]}</Text>
                      </Pressable>
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
                        emote: c.emote,
                      })}
                    </Text>
                  ))
                )}
              </GoalFrame>

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
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // iOS's SafeAreaView clears the notch; Android has none, so it gets the status bar's height.
  root: {
    flex: 1,
    backgroundColor: "#241509",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
    gap: 6,
    backgroundColor: "#241509",
    zIndex: 2,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1.5,
    borderColor: "#c8843c",
  },
  closeText: { color: INK, fontSize: 16, fontFamily: FONT.bold },
  scroll: { padding: 12, paddingBottom: 40, maxWidth: 440, width: "100%", alignSelf: "center" },
  hint: { color: MUTED, fontFamily: FONT.medium, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  input: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#c8843c",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: INK,
    fontSize: 15,
    fontFamily: FONT.bold,
    marginBottom: 10,
  },
  codeInput: { textAlign: "center", letterSpacing: 6, fontSize: 20 },
  errorBox: {
    backgroundColor: "rgba(160,40,30,0.35)",
    borderColor: "#d9634f",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  errorText: { color: "#ffd9d1", fontFamily: FONT.medium, fontSize: 13 },
  guildName: { color: "#f6d36a", fontFamily: FONT.display, fontSize: 24, marginBottom: 2 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  codeLabel: { color: MUTED, fontFamily: FONT.medium, fontSize: 11 },
  code: { color: INK, fontFamily: FONT.display, fontSize: 24, letterSpacing: 4 },
  progressText: { color: INK, fontFamily: FONT.bold, fontSize: 18, marginBottom: 6 },
  done: { color: "#f6d36a", fontFamily: FONT.bold, fontSize: 15, marginBottom: 8, textAlign: "center" },
  claimed: { color: "#9fd68f", fontFamily: FONT.medium, fontSize: 13, textAlign: "center" },
  reportBox: { alignItems: "stretch", marginTop: 4, marginBottom: 10, gap: 6 },
  reportLink: {
    color: MUTED,
    fontFamily: FONT.medium,
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 8,
  },
  reasonBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#c8843c",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  reasonText: { color: INK, fontFamily: FONT.medium, fontSize: 14 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  memberIcon: { fontSize: 26 },
  memberName: { fontFamily: FONT.bold, fontSize: 15 },
  cheerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,211,106,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,211,106,0.45)",
  },
});
