import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useSoundEffects } from "./src/audio/useSoundEffects";
import { DecisionModal } from "./src/components/DecisionModal";
import { DifficultyModal } from "./src/components/DifficultyModal";
import { EventBanner } from "./src/components/EventBanner";
import { InflationHeader } from "./src/components/InflationHeader";
import { OfflineSummaryModal } from "./src/components/OfflineSummaryModal";
import { ScreenId, TabBar } from "./src/components/TabBar";
import { TownNameModal } from "./src/components/TownNameModal";
import { TutorialModal } from "./src/components/TutorialModal";
import { VillagerRequestModal } from "./src/components/VillagerRequestModal";
import { EconomyProvider, useEconomyContext } from "./src/economy/EconomyContext";
import { useLocalNotifications } from "./src/notifications/useLocalNotifications";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { MarketScreen } from "./src/screens/MarketScreen";
import { TownScreen } from "./src/screens/TownScreen";
import { TradeScreen } from "./src/screens/TradeScreen";
import { hasSeenTutorial, markTutorialSeen } from "./src/tutorial/tutorialStorage";

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

  useLocalNotifications(state);

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

      {screen === "market" && <MarketScreen sounds={sounds} />}
      {screen === "inventory" && <InventoryScreen />}
      {screen === "trade" && <TradeScreen sounds={sounds} />}
      {screen === "town" && <TownScreen />}
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
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <EconomyProvider>
      <Game />
    </EconomyProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1a1410" },
});
