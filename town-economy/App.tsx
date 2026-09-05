import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useSoundEffects } from "./src/audio/useSoundEffects";
import { ConfettiBurst } from "./src/components/ConfettiBurst";
import { DecisionModal } from "./src/components/DecisionModal";
import { DifficultyModal } from "./src/components/DifficultyModal";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { EventBanner } from "./src/components/EventBanner";
import { InflationHeader } from "./src/components/InflationHeader";
import { OfflineSummaryModal } from "./src/components/OfflineSummaryModal";
import { ScreenId, TabBar } from "./src/components/TabBar";
import { TownNameModal } from "./src/components/TownNameModal";
import { TutorialModal } from "./src/components/TutorialModal";
import { VillagerRequestModal } from "./src/components/VillagerRequestModal";
import { EconomyProvider, useEconomyContext } from "./src/economy/EconomyContext";
import { gameDayFromTick } from "./src/economy/useEconomy";
import { useLocalNotifications } from "./src/notifications/useLocalNotifications";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { InvestScreen } from "./src/screens/InvestScreen";
import { MarketScreen } from "./src/screens/MarketScreen";
import { ResearchScreen } from "./src/screens/ResearchScreen";
import { TownScreen } from "./src/screens/TownScreen";
import { TradeScreen } from "./src/screens/TradeScreen";
import { hasSeenTutorial, markTutorialSeen } from "./src/tutorial/tutorialStorage";
import { maybeRequestReview } from "./src/utils/reviewPrompt";

// On web, browsers block audio.play() until the page has seen a user
// gesture. Our event/hyperinflation sounds can fire from the tick loop
// before that happens; expo-audio's web shim doesn't await that promise,
// so the rejection surfaces here instead of at our call site — swallow
// just that expected case rather than letting it look like a crash.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message ?? "";
    if (typeof message === "string" && message.includes("play() failed")) {
      event.preventDefault();
    }
  });
}

function Game() {
  const {
    state,
    togglePause,
    reset,
    dismissOfflineSummary,
    resolveDecision,
    resolveRequest,
    setTownName,
    setLanguage,
    t,
    netWorth,
  } = useEconomyContext();
  const sounds = useSoundEffects();
  const [screen, setScreen] = useState<ScreenId>("market");
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);

  const lastEventId = useRef<number | null>(null);
  const wasGameOver = useRef(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevAchievementCount = useRef(state.unlockedAchievements.length);
  const prevPrestigeLevel = useRef(state.prestigeLevel);

  useLocalNotifications(state);

  // A "big win" — a new achievement or a fresh prestige — earns a
  // celebratory confetti pop on top of whatever screen the player is on.
  useEffect(() => {
    const grewAchievements = state.unlockedAchievements.length > prevAchievementCount.current;
    const prestiged = state.prestigeLevel > prevPrestigeLevel.current;
    prevAchievementCount.current = state.unlockedAchievements.length;
    prevPrestigeLevel.current = state.prestigeLevel;
    if (grewAchievements || prestiged) {
      setConfettiTrigger((n) => n + 1);
      sounds.playSuccess();
    }
    // Ask for a store review right after a moment the player is likely
    // happy about — a first prestige, or having racked up a handful of
    // achievements — never right after a setback. Only ever fires once
    // per install (see maybeRequestReview).
    if (prestiged || state.unlockedAchievements.length >= 6) {
      maybeRequestReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.unlockedAchievements.length, state.prestigeLevel]);

  useEffect(() => {
    let cancelled = false;
    hasSeenTutorial().then((seen) => {
      if (!cancelled && !seen) setTutorialVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const finishTutorial = () => {
    setTutorialVisible(false);
    markTutorialSeen();
  };

  useEffect(() => {
    if (state.lastEvent && state.lastEvent.id !== lastEventId.current) {
      lastEventId.current = state.lastEvent.id;
      if (!wasGameOver.current) sounds.playEvent();
    }
    if (state.gameOver && !wasGameOver.current) {
      sounds.playCrash();
    }
    wasGameOver.current = state.gameOver;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastEvent, state.gameOver]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <InflationHeader
          townName={state.townName}
          cash={state.cash}
          netWorth={netWorth}
          inflationIndex={state.inflationIndex}
          inflationRate={state.inflationRate}
          inflationHistory={state.inflationHistory}
          paused={state.paused}
          muted={sounds.muted}
          streakCount={state.streak.count}
          gameDay={gameDayFromTick(state.tick)}
          difficulty={state.difficulty}
          language={state.language}
          t={t}
          onTogglePause={togglePause}
          onToggleMuted={sounds.toggleMuted}
          onToggleLanguage={() => setLanguage(state.language === "tr" ? "en" : "tr")}
          onReset={() => setDifficultyModalVisible(true)}
          onHelp={() => setTutorialVisible(true)}
          onEditName={() => setNameModalVisible(true)}
        />
        <EventBanner event={state.lastEvent} />
        <ConfettiBurst trigger={confettiTrigger} />

        {screen === "market" && <MarketScreen sounds={sounds} />}
        {screen === "inventory" && <InventoryScreen />}
        {screen === "trade" && <TradeScreen sounds={sounds} />}
        {screen === "town" && <TownScreen />}
        {screen === "research" && <ResearchScreen />}
        {screen === "invest" && <InvestScreen sounds={sounds} />}
        {screen === "achievements" && <AchievementsScreen />}

        <TabBar active={screen} onChange={setScreen} />

        <DifficultyModal
          visible={difficultyModalVisible}
          currentDifficulty={state.difficulty}
          onSelect={(difficulty) => {
            reset(difficulty);
            setDifficultyModalVisible(false);
          }}
          onCancel={() => setDifficultyModalVisible(false)}
        />

        <OfflineSummaryModal summary={state.offlineSummary} onDismiss={dismissOfflineSummary} />

        <DecisionModal
          decision={!state.offlineSummary && !tutorialVisible ? state.pendingDecision : null}
          onResolve={resolveDecision}
        />

        <VillagerRequestModal
          request={!state.offlineSummary && !tutorialVisible ? state.pendingRequest : null}
          holding={state.pendingRequest ? state.goods[state.pendingRequest.goodId] : null}
          onResolve={resolveRequest}
        />

        <TutorialModal visible={tutorialVisible} onFinish={finishTutorial} />

        <TownNameModal
          visible={nameModalVisible}
          currentName={state.townName}
          onSave={(name) => {
            setTownName(name);
            setNameModalVisible(false);
          }}
          onCancel={() => setNameModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EconomyProvider>
        <Game />
      </EconomyProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1a1410" },
  // The UI was designed for a phone-width column; on a wide screen (iPad,
  // web desktop) let it grow to a comfortable max width and center it
  // instead of stretching cards edge-to-edge.
  content: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
});
