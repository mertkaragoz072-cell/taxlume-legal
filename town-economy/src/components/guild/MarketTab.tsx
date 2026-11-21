import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { isGoodUnlocked } from "../../economy/formulas";
import { GOODS, GOODS_BY_ID } from "../../economy/goods";
import { GoodId } from "../../economy/types";
import { useGuild } from "../../guild/GuildContext";
import { GuildInfo } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { styles } from "./guildStyles";

export function MarketTab({ guild }: { guild: GuildInfo }) {
  const { busy, cancelRequest, fulfill, requestGood } = useGuild();
  const { t, state } = useEconomyContext();
  const [wantGood, setWantGood] = useState<GoodId>("grain");
  const [wantQty, setWantQty] = useState(10);

  return (
    <>
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
                    label={held > 0 ? t("guild.send", { n: Math.min(held, need) }) : t("guild.noneHeld")}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
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
    </>
  );
}
