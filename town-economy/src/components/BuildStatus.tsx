import React from "react";
import { StyleSheet, View } from "react-native";
import { useAds } from "../ads/AdsContext";
import { useEconomyContext } from "../economy/EconomyContext";
import {
  AD_SKIP_MS,
  formatWait,
  ImprovementKind,
  improvementProgress,
  PendingImprovement,
} from "../economy/construction";
import { useClock } from "../hooks/useClock";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GoldButton } from "./PanelKit";

/** What an improvement under construction looks like in its card: a countdown,
 * a thin progress bar, and (when an ad can be shown) the button that takes five
 * minutes off, or finishes it outright when five minutes or less are left. */
export function BuildStatus({ item, kind }: { item: PendingImprovement; kind: ImprovementKind }) {
  const { t, skipImprovement } = useEconomyContext();
  const ads = useAds();
  const now = useClock(1000);
  const remaining = Math.max(0, item.readyAt - now);
  const finishes = remaining <= AD_SKIP_MS;

  return (
    <View style={styles.box}>
      <Text style={styles.time}>⏳ {formatWait(remaining)}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${improvementProgress(item, now) * 100}%` }]} />
      </View>
      {ads.available && remaining > 0 && (
        <GoldButton
          label={finishes ? t("build.adFinish") : t("build.adSkip")}
          height={30}
          onPress={() => void ads.showRewarded().then((ok) => ok && skipImprovement(kind))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "stretch", gap: 4, minWidth: 92 },
  time: { color: "#3d2415", fontFamily: FONT.bold, fontSize: 14, textAlign: "center" },
  track: { height: 5, borderRadius: 3, backgroundColor: "rgba(61,36,21,0.25)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#1f6b32" },
});
