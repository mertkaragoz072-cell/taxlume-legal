import { useState } from "react";
import { View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { useGuild } from "../../guild/GuildContext";
import { drawRewardFor } from "../../guild/reward";
import { GuildInfo } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { MUTED, styles } from "./guildStyles";

/** One free draw a day: a small, medium or big purse (big ones are announced to the guild). */
export function DrawCard({ guild }: { guild: GuildInfo }) {
  const { busy, draw } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const [got, setGot] = useState<1 | 2 | 3 | null>(null);

  return (
    <>
      <GoalRibbon text={t("guild.drawSection")} />
      <GoalFrame lit={got === 3}>
        {got ? (
          <>
            <Text style={styles.done}>{t(`guild.drawTier.${got}`)}</Text>
            <Text style={[styles.hint, { textAlign: "center" }]}>
              {t("guild.drawGot", { amount: formatCoins(drawRewardFor(state.townRankIndex, got), 0) })}
            </Text>
          </>
        ) : guild.drawnToday ? (
          <Text style={[styles.hint, { color: MUTED, marginBottom: 0 }]}>{t("guild.drawDone")}</Text>
        ) : (
          <>
            <Text style={styles.hint}>{t("guild.drawHint")}</Text>
            <View>
              <BigButton
                laurel
                label={t("guild.drawBtn")}
                disabled={busy}
                onPress={() => void draw().then((tier) => tier && setGot(tier))}
              />
            </View>
          </>
        )}
      </GoalFrame>
    </>
  );
}
