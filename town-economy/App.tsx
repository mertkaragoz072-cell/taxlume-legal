import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useSoundEffects } from "./src/audio/useSoundEffects";
import { EventBanner } from "./src/components/EventBanner";
import { InflationHeader } from "./src/components/InflationHeader";
import { ScreenId, TabBar } from "./src/components/TabBar";
import { EconomyProvider, useEconomyContext } from "./src/economy/EconomyContext";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { MarketScreen } from "./src/screens/MarketScreen";
import { TownScreen } from "./src/screens/TownScreen";
import { TradeScreen } from "./src/screens/TradeScreen";

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
  const { state, togglePause, reset, netWorth } = useEconomyContext();
  const sounds = useSoundEffects();
  const [screen, setScreen] = useState<ScreenId>("market");

  const lastEventId = useRef<number | null>(null);
  const wasGameOver = useRef(false);

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
        cash={state.cash}
        netWorth={netWorth}
        inflationIndex={state.inflationIndex}
        inflationRate={state.inflationRate}
        inflationHistory={state.inflationHistory}
        paused={state.paused}
        muted={sounds.muted}
        streakCount={state.streak.count}
        onTogglePause={togglePause}
        onToggleMuted={sounds.toggleMuted}
        onReset={reset}
      />
      <EventBanner event={state.lastEvent} />

      {screen === "market" && <MarketScreen sounds={sounds} />}
      {screen === "inventory" && <InventoryScreen />}
      {screen === "trade" && <TradeScreen sounds={sounds} />}
      {screen === "town" && <TownScreen />}
      {screen === "achievements" && <AchievementsScreen />}

      <TabBar active={screen} onChange={setScreen} />
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
