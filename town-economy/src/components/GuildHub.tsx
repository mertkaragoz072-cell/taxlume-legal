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
import { isGoodUnlocked } from "../economy/formulas";
import { GOODS, GOODS_BY_ID } from "../economy/goods";
import { guildProductionBonus } from "../economy/guildPerks";
import { rankTheme } from "../economy/rankTheme";
import { GoodId } from "../economy/types";
import { townRankIcon } from "../economy/townRanks";
import { normalizeGuildCode } from "../guild/guildName";
import { useGuild } from "../guild/GuildContext";
import { GUILD_BADGES } from "../guild/badges";
import { guildRewardFor } from "../guild/reward";
import {
  CHEER_CODES,
  GUILD_PHRASES,
  streakMultiplier,
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
    donate,
    claimOrder,
    requestGood,
    cancelRequest,
    fulfill,
    report,
    clearError,
  } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [cheerFor, setCheerFor] = useState<string | null>(null);
  const [wantGood, setWantGood] = useState<GoodId>("grain");
  const [wantQty, setWantQty] = useState(10);
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

  const reward = guildRewardFor(state.townRankIndex, guild?.streak ?? 0);

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
                <Text style={styles.perk}>
                  {guildLevel(guild.totalContribution) >= 2
                    ? t("guild.levelPerk", {
                        pct:
                          Math.round(guildProductionBonus(guildLevel(guild.totalContribution)) * 1000) / 10,
                      })
                    : t("guild.levelPerkLocked")}
                </Text>
                <Text style={styles.perk}>
                  {guild.streak > 0
                    ? t("guild.streak", {
                        n: guild.streak,
                        pct: Math.round((streakMultiplier(guild.streak) - 1) * 100),
                      })
                    : t("guild.streakNone")}
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

              <GoalRibbon text={t("guild.orderSection")} />
              <GoalFrame>
                {(() => {
                  const o = guild.order;
                  const good = GOODS_BY_ID[o.goodId];
                  if (!good) return null;
                  const held = Math.floor(state.goods[good.id]?.holding ?? 0);
                  const left = Math.max(0, o.target - o.progress);
                  const done = o.progress >= o.target;
                  return (
                    <>
                      <Text style={styles.hint}>
                        {t("guild.orderText", { icon: good.icon, good: t(good.nameKey) })}
                      </Text>
                      <Text style={styles.progressText}>
                        {Math.min(o.progress, o.target)} / {o.target} {good.icon}
                      </Text>
                      <GoalProgress pct={o.progress / o.target} color="#9fd68f" />
                      <Text style={[styles.hint, { marginTop: 8 }]}>
                        {t("guild.orderMine", { n: o.myDonated, held })}
                      </Text>
                      {!done && (
                        <View style={styles.btnRow}>
                          <View style={{ flex: 1 }}>
                            <BigButton
                              label={t("guild.give", { n: Math.min(10, held, left) || 10 })}
                              height={40}
                              fontSize={13}
                              disabled={busy || held <= 0}
                              onPress={() => void donate(Math.min(10, left))}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <BigButton
                              label={t("guild.giveAll")}
                              height={40}
                              fontSize={13}
                              disabled={busy || held <= 0}
                              onPress={() => void donate(left)}
                            />
                          </View>
                        </View>
                      )}
                      {done && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.done}>{t("guild.orderDone")}</Text>
                          {o.rewardClaimed ? (
                            <Text style={styles.claimed}>{t("guild.orderClaimed")}</Text>
                          ) : o.myDonated >= 1 ? (
                            <BigButton
                              laurel
                              label={t("guild.orderClaim", { amount: formatCoins(reward, 0) })}
                              disabled={busy}
                              onPress={() => void claimOrder()}
                            />
                          ) : (
                            <Text style={styles.hint}>{t("guild.orderNeedGive")}</Text>
                          )}
                        </View>
                      )}
                    </>
                  );
                })()}
              </GoalFrame>

              <GoalRibbon text={t("guild.marketSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.marketHint")}</Text>
                {guild.requests.length === 0 && <Text style={styles.hint}>{t("guild.marketEmpty")}</Text>}
                {guild.requests.map((r) => {
                  const good = GOODS_BY_ID[r.goodId];
                  if (!good) return null;
                  const held = Math.floor(state.goods[good.id]?.holding ?? 0);
                  const need = r.qty - r.filled;
                  return (
                    <View key={r.id} style={styles.memberRow}>
                      <Text style={styles.memberIcon}>{good.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={2}>
                          {r.isMine ? t("guild.yourRequest") : r.fromName}
                        </Text>
                        <Text style={styles.hint}>
                          {t("guild.requestWants", {
                            filled: r.filled,
                            qty: r.qty,
                            icon: good.icon,
                            good: t(good.nameKey),
                          })}
                        </Text>
                      </View>
                      <View style={{ width: 96 }}>
                        {r.isMine ? (
                          <BigButton
                            tone="red"
                            label={t("guild.cancel")}
                            height={38}
                            fontSize={12}
                            disabled={busy}
                            onPress={() => void cancelRequest()}
                          />
                        ) : (
                          <BigButton
                            label={
                              held > 0 ? t("guild.send", { n: Math.min(held, need) }) : t("guild.noneHeld")
                            }
                            height={38}
                            fontSize={12}
                            disabled={busy || held <= 0}
                            onPress={() => void fulfill(r.id, good.id, need)}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}

                {!guild.requests.some((r) => r.isMine) && (
                  <View style={styles.askBox}>
                    <Text style={styles.askTitle}>{t("guild.newRequest")}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {GOODS.filter((g) => isGoodUnlocked(g, state)).map((g) => (
                        <Pressable
                          key={g.id}
                          onPress={() => setWantGood(g.id)}
                          style={[styles.chip, wantGood === g.id && styles.chipOn]}
                          accessibilityRole="button"
                          accessibilityLabel={t(g.nameKey)}
                        >
                          <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View style={styles.btnRow}>
                      {[5, 10, 25].map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => setWantQty(n)}
                          style={[styles.chip, styles.qtyChip, wantQty === n && styles.chipOn]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.reasonText}>{n}</Text>
                        </Pressable>
                      ))}
                      <View style={{ flex: 1 }}>
                        <BigButton
                          label={t("guild.ask")}
                          height={40}
                          fontSize={13}
                          disabled={busy}
                          onPress={() => void requestGood(wantGood, wantQty)}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </GoalFrame>

              <GoalRibbon text={t("guild.membersSection")} />
              <GoalFrame>
                {guild.members.map((m) => (
                  <View key={m.id}>
                    <View style={styles.memberRow}>
                      <Text style={styles.memberIcon}>{townRankIcon(m.rankIndex)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.memberName,
                            { color: m.isYou ? rankTheme(m.rankIndex).accent : INK },
                          ]}
                          numberOfLines={1}
                        >
                          {m.name}
                          {m.isYou ? ` · ${t("guild.you")}` : ""}
                          {m.isOwner ? ` · ${t("guild.owner")}` : ""}
                        </Text>
                        <Text style={styles.hint}>
                          {t("guild.contribution", { n: m.weekContribution })}
                          {m.donated + m.gifted > 0
                            ? ` · ${t("guild.tradeExtra", { d: m.donated, g: m.gifted })}`
                            : ""}
                        </Text>
                      </View>
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
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  askBox: {
    marginTop: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(246,211,106,0.2)",
    paddingTop: 10,
  },
  askTitle: { color: INK, fontFamily: FONT.bold, fontSize: 14 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(200,132,60,0.5)",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  qtyChip: { width: 48 },
  chipOn: { borderColor: "#f6d36a", backgroundColor: "rgba(246,211,106,0.18)" },
  perk: { color: "#9fd68f", fontFamily: FONT.medium, fontSize: 13, marginBottom: 4 },
  cheerPicker: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 8, paddingLeft: 36 },
  phrasePill: {
    minHeight: 40,
    borderRadius: 12,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(200,132,60,0.5)",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phraseText: { color: INK, fontFamily: FONT.medium, fontSize: 13 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    width: "31%",
    flexGrow: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(200,132,60,0.3)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  badgeOn: { borderColor: "#f6d36a", backgroundColor: "rgba(246,211,106,0.12)" },
  badgeName: { color: INK, fontFamily: FONT.bold, fontSize: 12, marginTop: 2 },
  badgeHint: { color: MUTED, fontFamily: FONT.medium, fontSize: 10, textAlign: "center", marginTop: 2 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  memberIcon: { fontSize: 26 },
  memberName: { fontFamily: FONT.bold, fontSize: 15, color: INK },
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
