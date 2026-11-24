import { Share, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { GOODS_BY_ID } from "../../economy/goods";
import { guildProductionBonus } from "../../economy/guildPerks";
import { useGuild } from "../../guild/GuildContext";
import { guildRewardFor } from "../../guild/reward";
import { GUILD_MAX_MEMBERS, GuildInfo, guildLevel, streakMultiplier } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalProgress, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { DrawCard } from "./DrawCard";
import { FeedPanel } from "./FeedPanel";
import { styles } from "./guildStyles";

export function OverviewTab({ guild }: { guild: GuildInfo }) {
  const { busy, claim, donate, claimOrder } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const reward = guildRewardFor(state.townRankIndex, guild.streak);

  return (
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
                pct: Math.round(guildProductionBonus(guildLevel(guild.totalContribution)) * 1000) / 10,
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
                void Share.share({ message: t("guild.inviteMessage", { code: guild.code }) }).catch(() => {})
              }
            />
          </View>
        </View>
      </GoalFrame>

      <DrawCard guild={guild} />

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

      <FeedPanel guild={guild} />
    </>
  );
}
