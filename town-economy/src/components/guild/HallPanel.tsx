import { View } from "react-native";
import { useEconomyContext } from "../../economy/EconomyContext";
import { useGuild } from "../../guild/GuildContext";
import { GuildInfo, HALL_PROJECTS } from "../../guild/types";
import { Text } from "../AppText";
import { GoalFrame, GoalProgress, GoalRibbon } from "../GoalPanels";
import { BigButton } from "../ModalKit";
import { INK, MUTED, styles } from "./guildStyles";

const GIFTS = [100, 1_000, 10_000];

/** The guild hall: six buildings the members pay for together, in order. Each
 * adds warehouse room or output to every member's town. */
export function HallPanel({ guild }: { guild: GuildInfo }) {
  const { busy, donateHall } = useGuild();
  const { t, formatCoins, state } = useEconomyContext();
  const { built, progress } = guild.projects;
  const cash = Math.floor(state.cash);

  return (
    <>
      <GoalRibbon text={t("guild.hallSection")} />
      <GoalFrame>
        <Text style={styles.hint}>{t("guild.hallHint", { cash: formatCoins(cash, 0) })}</Text>
        {HALL_PROJECTS.map((p, i) => {
          const done = i < built;
          const current = i === built;
          const left = p.cost - progress;
          return (
            <View key={p.id} style={[styles.hallRow, current && styles.hallRowOn]}>
              <View style={styles.memberRow}>
                <Text style={[styles.memberIcon, { opacity: done || current ? 1 : 0.4 }]}>
                  {done || current ? p.icon : "🔒"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.memberName, { color: done || current ? INK : MUTED }]}
                    numberOfLines={1}
                  >
                    {t(`guild.project.${p.id}.name`)}
                    {done ? "  ✓" : ""}
                  </Text>
                  <Text style={styles.hint}>
                    {[
                      p.storage > 0 ? t("guild.perkStorage", { n: p.storage }) : "",
                      p.output > 0 ? t("guild.perkOutput", { pct: Math.round(p.output * 1000) / 10 }) : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {!done ? `  ·  ${formatCoins(p.cost, 0)}` : ""}
                  </Text>
                </View>
              </View>
              {current && (
                <>
                  <GoalProgress pct={progress / p.cost} color="#f6d36a" />
                  <Text style={[styles.hint, { marginTop: 4 }]}>
                    {t("guild.hallProgress", {
                      have: formatCoins(progress, 0),
                      cost: formatCoins(p.cost, 0),
                    })}
                  </Text>
                  <View style={styles.btnRow}>
                    {GIFTS.map((g) => (
                      <View key={g} style={{ flex: 1 }}>
                        <BigButton
                          label={`+${formatCoins(Math.min(g, left), 0)}`}
                          height={38}
                          fontSize={12}
                          disabled={busy || cash < 1}
                          onPress={() => void donateHall(Math.min(g, left))}
                        />
                      </View>
                    ))}
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label={t("guild.hallAll")}
                        height={38}
                        fontSize={12}
                        disabled={busy || cash < 1}
                        onPress={() => void donateHall(Math.min(cash, left))}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}
        {built >= HALL_PROJECTS.length && <Text style={styles.done}>{t("guild.hallComplete")}</Text>}
      </GoalFrame>
    </>
  );
}
