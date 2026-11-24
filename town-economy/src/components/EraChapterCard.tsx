import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import tier2 from "../../assets/tier2-happy-marketplace.webp";
import tier3 from "../../assets/tier3-happy-marketplace.webp";
import tier4 from "../../assets/tier4-happy-marketplace.webp";
import tier1 from "../../assets/ui/header-market.webp";
import { useEconomyContext } from "../economy/EconomyContext";
import { eraChapterNumber, eraDecreeId, eraStoryKey, eraTitleKey } from "../economy/eras";
import { rankTheme } from "../economy/rankTheme";
import { townRankIcon } from "../economy/townRanks";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { BigButton } from "./ModalKit";
import { RankAtmosphere } from "./RankAtmosphere";

const SCENES = { 1: tier1, 2: tier2, 3: tier3, 4: tier4 } as const;

interface Props {
  rankIndex: number;
  onContinue: () => void;
}

/** The title page of a new age: "CHAPTER 3 — In the Shadow of the Walls", the
 * era's story beat, and a hint that a charter is waiting to be signed. Shown
 * between the promotion reveal and Merve's congratulations. */
export function EraChapterCard({ rankIndex, onContinue }: Props) {
  const { t } = useEconomyContext();
  const theme = rankTheme(rankIndex);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const label = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const story = useRef(new Animated.Value(0)).current;
  const hasDecree = eraDecreeId(rankIndex) !== null;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(label, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(title, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(story, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [label, title, story, rankIndex]);

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.root]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onPress={onContinue}
      accessibilityLabel={t("eraChapter.continue")}
    >
      <Image source={SCENES[theme.band]} style={styles.scene} resizeMode="cover" />
      <View style={styles.dim} pointerEvents="none" />
      {size.w > 0 && <RankAtmosphere rankIndex={rankIndex} width={size.w} height={size.h} boost={1.3} />}

      <View style={styles.center} pointerEvents="box-none">
        <Animated.Text style={[styles.label, { color: theme.accent, opacity: label }]}>
          {t("eraChapter.label", { n: eraChapterNumber(rankIndex) })}
        </Animated.Text>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: title,
            transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <View style={styles.rule}>
            <View style={[styles.ruleLine, { backgroundColor: theme.accent }]} />
            <Text style={styles.ruleIcon}>{townRankIcon(rankIndex)}</Text>
            <View style={[styles.ruleLine, { backgroundColor: theme.accent }]} />
          </View>
          <Text style={styles.title}>{t(eraTitleKey(rankIndex))}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: story, alignSelf: "stretch" }}>
          <Text style={styles.story}>{t(eraStoryKey(rankIndex))}</Text>
          {hasDecree && (
            <Text style={[styles.decree, { color: theme.accent }]}>{t("eraChapter.decree")}</Text>
          )}
          <View style={styles.btn}>
            <BigButton laurel label={t("eraChapter.continue")} onPress={onContinue} />
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", backgroundColor: "#0c0704" },
  scene: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,5,2,0.72)" },
  center: { width: "100%", maxWidth: 400, paddingHorizontal: 26, alignItems: "center" },
  label: { fontFamily: FONT.display, fontSize: 15, letterSpacing: 5, marginBottom: 14 },
  rule: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 12, marginBottom: 12 },
  ruleLine: { flex: 1, height: 1.5, opacity: 0.7 },
  ruleIcon: { fontSize: 30 },
  title: {
    color: "#fff4d6",
    fontFamily: FONT.serif,
    fontSize: 34,
    lineHeight: 42,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  story: {
    color: "#eadfc6",
    fontFamily: FONT.serif,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
    marginTop: 18,
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  decree: { fontFamily: FONT.medium, fontSize: 14, textAlign: "center", marginTop: 16 },
  btn: { alignSelf: "stretch", marginTop: 22 },
});
