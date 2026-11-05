import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import faceImg from "../../assets/ui/merve_face.png";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { currentOnboardingStep } from "../economy/onboarding";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { FONT, TYPE } from "../theme";

interface Props {
  onOpen: () => void;
  /** true while a tutorial, modal or other interruption owns the screen */
  hidden?: boolean;
}

const BUBBLE_MS = 7000;

/** Merve's face, parked just above the tab bar on every screen: the standing
 * way into the quest panel. When the current task changes (a step finished,
 * a new daily quest) a gold "!" bobs on her and a speech bubble says in one
 * line what to do next, then fades after a few seconds; a tap opens the panel
 * and clears the "!". It reads the same quest state as the strip and the panel. */
export function QuestBadge({ onOpen, hidden }: Props) {
  const { state, t } = useEconomyContext();
  const step = currentOnboardingStep(state);
  const daily = state.dailyQuests.find((q) => !q.completed);
  const dailyTpl = daily ? QUEST_TEMPLATES_BY_ID[daily.templateId] : undefined;
  const task = step
    ? { key: `step-${step.id}`, text: t(step.titleKey) }
    : daily && dailyTpl
      ? { key: `daily-${daily.id}`, text: t(dailyTpl.titleKey) }
      : null;

  const [seenKey, setSeenKey] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState<string | null>(null);
  const bob = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const unseen = task !== null && task.key !== seenKey;

  // A new task pops the bubble open for a few seconds.
  useEffect(() => {
    if (!task || hidden || task.key === seenKey) return;
    setBubbleKey(task.key);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() =>
        setBubbleKey(null)
      );
    }, BUBBLE_MS);
    return () => clearTimeout(timer);
  }, [task?.key, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!unseen) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [unseen, bob]);

  if (!task || hidden) return null;
  const lift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <View style={styles.anchor} pointerEvents="box-none">
      {bubbleKey === task.key && (
        <Animated.View style={[styles.bubble, { opacity: fade }]} pointerEvents="none">
          <Text style={styles.bubbleText} numberOfLines={2}>
            {task.text}
          </Text>
          <View style={styles.tail} />
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ translateY: lift }] }}>
        <Pressable
          onPress={() => {
            setSeenKey(task.key);
            fade.setValue(0);
            setBubbleKey(null);
            onOpen();
          }}
          style={styles.face}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.hubTitle")}
        >
          <Image source={faceImg} style={styles.faceImg} resizeMode="cover" />
        </Pressable>
        {unseen && (
          <View style={styles.mark} pointerEvents="none">
            <Text style={styles.markText}>!</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", right: 10, bottom: 8, alignItems: "flex-end", zIndex: 6 },
  face: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: "#d9a94f",
    backgroundColor: "#f6e2be",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  faceImg: { width: "100%", height: "100%" },
  mark: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f2b630",
    borderWidth: 2,
    borderColor: "#5a3a1e",
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: "#3d2415", fontFamily: FONT.black, fontSize: TYPE.label, lineHeight: 16 },
  bubble: {
    maxWidth: 190,
    marginBottom: 8,
    marginRight: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#f6e7c4",
    borderWidth: 2,
    borderColor: "#b88a4a",
  },
  bubbleText: { color: "#3d2415", fontFamily: FONT.bold, fontSize: TYPE.label },
  tail: {
    position: "absolute",
    right: 18,
    bottom: -8,
    width: 12,
    height: 12,
    backgroundColor: "#f6e7c4",
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#b88a4a",
    transform: [{ rotate: "45deg" }],
  },
});
