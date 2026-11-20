import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import tier2 from "../../assets/tier2-happy-marketplace.webp";
import tier3 from "../../assets/tier3-happy-marketplace.webp";
import tier4 from "../../assets/tier4-happy-marketplace.webp";
import tier1 from "../../assets/ui/header-market.webp";
import { useEconomyContext } from "../economy/EconomyContext";
import { rankGainLines } from "../economy/rankPerks";
import { rankTheme, sceneBandForRank } from "../economy/rankTheme";
import { townRankIcon, townRankReward, townRankTitle } from "../economy/townRanks";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { RankAtmosphere } from "./RankAtmosphere";
import { BigButton } from "./ModalKit";

const SCENES = { 1: tier1, 2: tier2, 3: tier3, 4: tier4 } as const;

interface Props {
  /** rank the town held before this jump */
  fromIndex: number;
  /** rank it holds now */
  toIndex: number;
  onContinue: () => void;
}

/** The rank-up moment itself, before Merve speaks: the old street dissolves into
 * the new one, "KASABA -> SEHIR" lands, and what the jump opened is listed. */
export function RankUpReveal({ fromIndex, toIndex, onContinue }: Props) {
  const { t, formatCoins, state } = useEconomyContext();
  const from = useRef(new Animated.Value(1)).current;
  const to = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const list = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const theme = rankTheme(toIndex);
  const fromBand = sceneBandForRank(fromIndex);
  const toBand = sceneBandForRank(toIndex);

  useEffect(() => {
    from.setValue(1);
    to.setValue(0);
    title.setValue(0);
    list.setValue(0);
    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(to, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(from, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(title, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(list, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [from, to, title, list, fromIndex, toIndex]);

  // everything this jump passed through, so a double promotion lists both
  const rows: string[] = rankGainLines(fromIndex, toIndex, t);
  let reward = 0;
  for (let i = fromIndex + 1; i <= toIndex; i++) reward += townRankReward(i);
  rows.push(t("rankReveal.reward", { amount: formatCoins(reward, 0) }));

  const fromTitle = townRankTitle(fromIndex, t);
  const toTitle = townRankTitle(toIndex, t);
  void state;

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.root]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onPress={onContinue}
      accessibilityLabel={t("rankReveal.continue")}
    >
      <Image source={SCENES[fromBand]} style={styles.scene} resizeMode="cover" />
      <Animated.Image source={SCENES[toBand]} style={[styles.scene, { opacity: to }]} resizeMode="cover" />
      <Animated.View style={[styles.fromFade, { opacity: from }]} pointerEvents="none" />
      {size.w > 0 && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: from }]} pointerEvents="none">
            <RankAtmosphere rankIndex={fromIndex} width={size.w} height={size.h} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: to }]} pointerEvents="none">
            <RankAtmosphere rankIndex={toIndex} width={size.w} height={size.h} boost={1.6} />
          </Animated.View>
        </>
      )}
      <View style={styles.dim} pointerEvents="none" />

      <View style={styles.center} pointerEvents="box-none">
        <Text style={[styles.eyebrow, { color: theme.accent }]}>{t("rankReveal.promoted")}</Text>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: title,
            transform: [{ scale: title.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <Text style={styles.bigIcon}>{townRankIcon(toIndex)}</Text>
          <View style={styles.names}>
            <Text style={styles.oldName} numberOfLines={1}>
              {fromTitle}
            </Text>
            <Text style={[styles.arrow, { color: theme.accent }]}>→</Text>
          </View>
          <Text style={[styles.newName, { color: theme.accent }]} numberOfLines={1}>
            {toTitle}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.list, { opacity: list }]}>
          <Text style={styles.listTitle}>{t("rankReveal.unlocked")}</Text>
          {rows.map((r) => (
            <Text key={r} style={styles.row}>
              {"• "}
              {r}
            </Text>
          ))}
        </Animated.View>

        <Animated.View style={[styles.btn, { opacity: list }]}>
          <BigButton laurel label={t("rankReveal.continue")} onPress={onContinue} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center" },
  scene: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  fromFade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#140c06" },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,6,2,0.58)" },
  center: { width: "100%", maxWidth: 400, paddingHorizontal: 22, alignItems: "center" },
  eyebrow: { fontFamily: FONT.display, fontSize: 15, letterSpacing: 4, marginBottom: 10 },
  bigIcon: { fontSize: 78, lineHeight: 92 },
  names: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  oldName: { color: "#d8c8a8", fontFamily: FONT.serif, fontSize: 20, opacity: 0.8 },
  arrow: { fontFamily: FONT.black, fontSize: 22 },
  newName: {
    fontFamily: FONT.serif,
    fontSize: 46,
    lineHeight: 54,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  list: {
    alignSelf: "stretch",
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(24,14,8,0.82)",
    borderWidth: 1.5,
    borderColor: "rgba(246,211,106,0.55)",
  },
  listTitle: { color: "#f6e2a0", fontFamily: FONT.display, fontSize: 13, letterSpacing: 2, marginBottom: 6 },
  row: { color: "#f4e8d0", fontFamily: FONT.medium, fontSize: 13, lineHeight: 19 },
  btn: { alignSelf: "stretch", marginTop: 14 },
});
