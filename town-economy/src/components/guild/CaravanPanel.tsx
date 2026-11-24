import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { isGoodUnlocked } from "../../economy/formulas";
import { GOODS, GOODS_BY_ID } from "../../economy/goods";
import { GoodId } from "../../economy/types";
import { useGuild } from "../../guild/GuildContext";
import { caravanPayout } from "../../guild/reward";
import { CARAVAN_DESTS, CARAVAN_TIER_MULT, CaravanDest, GuildInfo } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalProgress, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { INK, MUTED, styles } from "./guildStyles";
import { timeLeft } from "./timeAgo";
import { useNow } from "./useNow";

/** The guild caravan: everyone loads goods from their own stock, someone sends
 * it, it travels for a few hours, and each loader collects a share of what it
 * earned (the goods' value, times the trip's luck and the destination's bonus). */
export function CaravanPanel({ guild }: { guild: GuildInfo }) {
  const { busy, startCaravan, loadCaravan, sendCaravan, claimCaravan } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const now = useNow();
  const [dest, setDest] = useState<CaravanDest>("windyhill");
  const [pick, setPick] = useState<GoodId | null>(null);
  const c = guild.caravan;

  const held = GOODS.filter((g) => isGoodUnlocked(g, state) && Math.floor(state.goods[g.id].holding) > 0);
  const picked = held.find((g) => g.id === pick) ?? held[0];
  const pickedHeld = picked ? Math.floor(state.goods[picked.id].holding) : 0;
  const room = c ? c.capacity - c.loaded : 0;
  const placeName = (id: string) => t(`place.${id}.name`);
  const items = (list: { goodId: string; qty: number }[]) =>
    list.map((l) => `${l.qty} ${GOODS_BY_ID[l.goodId]?.icon ?? ""}`).join("  ");

  return (
    <>
      <GoalRibbon text={t("guild.caravanSection")} />
      <GoalFrame lit={guild.claimable.length > 0}>
        {guild.claimable.map((share) => {
          const pay = caravanPayout(share, (id) => state.goods[id as GoodId]?.price ?? 0);
          return (
            <View key={share.id} style={styles.duelRow}>
              <Text style={[styles.memberName, { color: INK }]}>
                {t("guild.caravanBack", { dest: placeName(share.dest) })}
              </Text>
              <Text style={styles.hint}>
                {t(`guild.caravanTier.${share.tier}`, { mult: CARAVAN_TIER_MULT[share.tier - 1] })}
              </Text>
              <Text style={styles.hint}>{t("guild.caravanYourLoad", { items: items(share.loads) })}</Text>
              <BigButton
                laurel
                label={t("guild.caravanClaim", { amount: formatCoins(pay, 0) })}
                disabled={busy}
                onPress={() => void claimCaravan(share.id)}
              />
            </View>
          );
        })}

        {!c && (
          <>
            <Text style={styles.hint}>{t("guild.caravanHint")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {CARAVAN_DESTS.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => setDest(d.id)}
                  style={[styles.destChip, dest === d.id && styles.chipOn]}
                  accessibilityRole="button"
                >
                  <Text style={styles.memberName} numberOfLines={1}>
                    {placeName(d.id)}
                  </Text>
                  <Text style={styles.badgeHint}>
                    {t("guild.caravanDest", { hours: d.hours, bonus: Math.round((d.bonus - 1) * 100) })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ marginTop: 10 }}>
              <BigButton
                label={t("guild.caravanStart")}
                disabled={busy}
                onPress={() => void startCaravan(dest)}
              />
            </View>
          </>
        )}

        {c?.status === "loading" && (
          <>
            <Text style={[styles.memberName, { color: INK }]}>
              {t("guild.caravanLoading", { dest: placeName(c.dest) })}
            </Text>
            <Text style={styles.progressText}>
              {c.loaded} / {c.capacity}
            </Text>
            <GoalProgress pct={c.loaded / c.capacity} color="#f6d36a" />
            <Text style={[styles.hint, { marginTop: 6 }]}>
              {c.byGood.length > 0 ? items(c.byGood) + "  ·  " : ""}
              {t("guild.caravanMine", { n: c.myLoaded })}
            </Text>

            {room > 0 && (
              <>
                {held.length === 0 ? (
                  <Text style={styles.hint}>{t("guild.caravanNoStock")}</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                  >
                    {held.map((g) => (
                      <Pressable
                        key={g.id}
                        onPress={() => setPick(g.id)}
                        style={[styles.chip, picked?.id === g.id && styles.chipOn]}
                        accessibilityRole="button"
                        accessibilityLabel={t(g.nameKey)}
                      >
                        <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                        <Text style={styles.badgeHint}>{Math.floor(state.goods[g.id].holding)}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                {picked && (
                  <View style={styles.btnRow}>
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label={t("guild.caravanLoad", { n: Math.min(10, pickedHeld, room) })}
                        height={40}
                        fontSize={13}
                        disabled={busy}
                        onPress={() => void loadCaravan(picked.id, Math.min(10, room))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label={t("guild.caravanLoadAll")}
                        height={40}
                        fontSize={13}
                        disabled={busy}
                        onPress={() => void loadCaravan(picked.id, room)}
                      />
                    </View>
                  </View>
                )}
              </>
            )}
            <Text style={[styles.hint, { marginTop: 8 }]}>{t("guild.caravanSendHint")}</Text>
            <BigButton
              laurel
              label={t("guild.caravanSend")}
              disabled={busy || c.loaded === 0}
              onPress={() => void sendCaravan()}
            />
          </>
        )}

        {c?.status === "travelling" && (
          <>
            <Text style={[styles.memberName, { color: INK }]}>
              {t("guild.caravanTravelling", {
                dest: placeName(c.dest),
                time: c.arrivesAt ? timeLeft(c.arrivesAt, now) : "",
              })}
            </Text>
            <Text style={styles.hint}>
              {c.loaded} 📦 {c.byGood.length > 0 ? " · " + items(c.byGood) : ""}
            </Text>
            <Text style={[styles.hint, { color: MUTED }]}>{t("guild.caravanWaiting")}</Text>
          </>
        )}
      </GoalFrame>
    </>
  );
}
