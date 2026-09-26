import { Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, View } from "react-native";
import { useSoundEffects } from "./src/audio/useSoundEffects";
import { ComboBanner } from "./src/components/ComboBanner";
import { CrisisWarningBanner } from "./src/components/CrisisWarningBanner";
import { ConfettiBurst } from "./src/components/ConfettiBurst";
import { DailyRewardWheelModal } from "./src/components/DailyRewardWheelModal";
import { DecisionModal } from "./src/components/DecisionModal";
import { DifficultyModal } from "./src/components/DifficultyModal";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { EventBanner } from "./src/components/EventBanner";
import { GradientFill } from "./src/components/GradientFill";
import { InflationHeader } from "./src/components/InflationHeader";
import { OfflineSummaryModal } from "./src/components/OfflineSummaryModal";
import { OnboardingBanner } from "./src/components/OnboardingBanner";
import { RivalTraderModal } from "./src/components/RivalTraderModal";
import { CARAVAN_STEPS, CaravanTutorialModal } from "./src/components/CaravanTutorialModal";
import { MentorCoach } from "./src/components/MentorCoach";
import { SpotlightOverlay, SpotlightProvider, SpotlightTarget } from "./src/components/Spotlight";
import { currentMentorStep, MENTOR_STEPS } from "./src/economy/mentor";
import { ScreenId, TabBar } from "./src/components/TabBar";
import { DoctrineModal } from "./src/components/DoctrineModal";
import { SpeedBoostModal } from "./src/components/SpeedBoostModal";
import { TownNameModal } from "./src/components/TownNameModal";
import { TutorialModal } from "./src/components/TutorialModal";
import { VillagerRequestModal } from "./src/components/VillagerRequestModal";
import { EconomyProvider, useEconomyContext } from "./src/economy/EconomyContext";
import { TOWN_EMBLEMS_BY_ID } from "./src/economy/emblems";
import { townRankIcon, townRankTitle } from "./src/economy/townRanks";
import { effectiveTradeUnlockNetWorth } from "./src/economy/formulas";
import { DOCTRINE_UNLOCK_NET_WORTH, gameDayFromTick } from "./src/economy/useEconomy";
import { useLocalNotifications } from "./src/notifications/useLocalNotifications";
import { seasonalBackgroundGradient } from "./src/theme";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { InvestScreen } from "./src/screens/InvestScreen";
import { MarketScreen } from "./src/screens/MarketScreen";
import { ResearchScreen } from "./src/screens/ResearchScreen";
import { TitleScreen } from "./src/screens/TitleScreen";
import { TownScreen } from "./src/screens/TownScreen";
import { TradeScreen } from "./src/screens/TradeScreen";
import { hasSeenTutorial, markTutorialSeen } from "./src/tutorial/tutorialStorage";
import { maybeRequestReview } from "./src/utils/reviewPrompt";

// On web, browsers block audio.play() until the page has seen a user
// gesture. Our event/hyperinflation sounds can fire from the tick loop
// before that happens; expo-audio's web shim doesn't await that promise,
// so the rejection surfaces here instead of at our call site — swallow
// just that expected case rather than letting it look like a crash.
//
// The guard tests for the *method*, not for `window`. React Native defines
// `window` as an alias for the global object, so `typeof window !==
// "undefined"` is true on a phone — and then `window.addEventListener` is
// undefined and calling it throws. This runs at module scope, so that
// TypeError took the whole bundle down before a single frame was drawn, and
// the app sat on its splash screen with nothing to say. It cost a day.
if (Platform.OS === "web" && typeof window?.addEventListener === "function") {
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message ?? "";
    if (typeof message === "string" && message.includes("play() failed")) {
      event.preventDefault();
    }
  });
}

// Keep the native splash up until the custom fonts (see theme.ts's FONT
// tokens) have loaded, so the app never flashes a frame in the system font
// before swapping to its real typeface.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Trade-streak milestones that pop the combo banner — see the effect
// watching state.tradeStreak below.
const COMBO_MILESTONES = [3, 5, 8, 12, 20];

function Game() {
  const {
    state,
    togglePause,
    reset,
    dismissOfflineSummary,
    dismissDailyBonus,
    resolveDecision,
    resolveRequest,
    resolveRivalOffer,
    advanceMentor,
    setTownName,
    setLanguage,
    t,
    netWorth,
    start,
  } = useEconomyContext();
  const sounds = useSoundEffects();
  const [screen, setScreen] = useState<ScreenId>("market");
  // The title screen stands in front of the game until the player taps
  // through it. It is Game's own state rather than App's so the economy
  // is already mounted and hydrating behind it — by the time the button is
  // pressed the save has usually loaded, and "Continue" is the true label.
  const [titleVisible, setTitleVisible] = useState(true);
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [speedBoostModalVisible, setSpeedBoostModalVisible] = useState(false);
  const [doctrineModalVisible, setDoctrineModalVisible] = useState(false);
  // Offered once per session when the town first qualifies. Declining is
  // free — the Town screen keeps the choice available — so this never has
  // to nag, and the answer it gets is a considered one.
  const doctrineOffered = useRef(false);

  useEffect(() => {
    if (doctrineOffered.current) return;
    if (state.doctrine !== null) return;
    if (netWorth < DOCTRINE_UNLOCK_NET_WORTH) return;
    doctrineOffered.current = true;
    setDoctrineModalVisible(true);
  }, [netWorth, state.doctrine]);

  const rankTitle = townRankTitle(state.townRankIndex, t);

  const lastEventId = useRef<number | null>(null);
  const wasGameOver = useRef(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevAchievementCount = useRef(state.unlockedAchievements.length);
  const prevPrestigeLevel = useRef(state.prestigeLevel);

  // A trade streak crossing a milestone earns a brief, self-dismissing
  // combo banner — purely a celebratory flourish over the existing
  // tradeStreak stat, no economy effect.
  const prevTradeStreak = useRef(state.tradeStreak);
  const comboIdRef = useRef(0);
  const [comboEvent, setComboEvent] = useState<{ id: number; count: number } | null>(null);
  useEffect(() => {
    const prev = prevTradeStreak.current;
    prevTradeStreak.current = state.tradeStreak;
    if (state.tradeStreak > prev && COMBO_MILESTONES.includes(state.tradeStreak)) {
      comboIdRef.current += 1;
      setComboEvent({ id: comboIdRef.current, count: state.tradeStreak });
      sounds.playSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tradeStreak]);

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

  // A first launch no longer opens the slide deck; Merve does the
  // introducing (see MentorCoach). The stored flag still decides *whether*
  // she runs, rather than mentorStep alone: that lives in the save, so a
  // player who starts a new game on a different difficulty would otherwise
  // be walked around their own town again.
  const [mentorAllowed, setMentorAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hasSeenTutorial().then((seen) => {
      if (!cancelled && !seen) setMentorAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mentorActive = mentorAllowed && state.mentorStep < MENTOR_STEPS.length;
  const mentorStepDef = mentorActive ? currentMentorStep(state.mentorStep) : null;
  const mentorScreen = mentorStepDef?.screen ?? null;
  const mentorSpotlight = mentorStepDef?.spotlight ?? null;

  // She walks the player to the tab she is describing rather than telling
  // them to go there themselves. Keyed on the screen, not the step, so the
  // two market beats in a row don't yank a player who has scrolled away.
  useEffect(() => {
    if (mentorScreen) setScreen(mentorScreen);
  }, [mentorScreen]);

  // A beat that asks for an action moves on by itself the moment the action
  // lands, so the player is never left having done the thing and still
  // looking for a button to press about it.
  const mentorDone = mentorStepDef?.isDone?.(state) ?? false;
  useEffect(() => {
    if (!mentorActive || !mentorDone) return;
    const timer = setTimeout(() => {
      advanceMentor(state.mentorStep + 1);
      if (state.mentorStep + 1 >= MENTOR_STEPS.length) markTutorialSeen();
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorActive, mentorDone, state.mentorStep]);

  const nextMentorBeat = () => {
    const next = state.mentorStep + 1;
    advanceMentor(next);
    if (next >= MENTOR_STEPS.length) markTutorialSeen();
  };
  const skipMentor = () => {
    advanceMentor(MENTOR_STEPS.length);
    markTutorialSeen();
  };

  const finishTutorial = () => {
    setTutorialVisible(false);
    markTutorialSeen();
  };

  // The kervan guide, docked the same way Merve is: the trade screen stays
  // live behind him and SpotlightOverlay cuts a hole over the control he is
  // talking about. Gated on firstCaravanSent (economy state, so a real send
  // — bargained or not — dismisses it on its own) rather than a one-shot
  // flag, plus a session-only skip so declining it doesn't bring it back
  // every time the player revisits the Trade tab.
  const [caravanTutorialStep, setCaravanTutorialStep] = useState(0);
  const [caravanTutorialSkipped, setCaravanTutorialSkipped] = useState(false);
  const caravanTutorialActive =
    screen === "trade" &&
    state.tradeUnlocked &&
    !state.firstCaravanSent &&
    !caravanTutorialSkipped &&
    !mentorActive;
  const caravanStepDef = caravanTutorialActive ? CARAVAN_STEPS[caravanTutorialStep] : null;
  const caravanSpotlight = caravanStepDef?.spotlight ?? null;

  const nextCaravanStep = () => {
    const next = caravanTutorialStep + 1;
    if (next >= CARAVAN_STEPS.length) setCaravanTutorialSkipped(true);
    else setCaravanTutorialStep(next);
  };
  const skipCaravanTutorial = () => setCaravanTutorialSkipped(true);

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

  // Returned before the game's own tree so nothing behind the title can
  // claim the screen first — the offline summary and the tutorial both open
  // on mount, and they belong after the player has chosen to go in, not
  // stacked on top of the logo.
  if (titleVisible) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <TitleScreen
            onStart={() => {
              start();
              setTitleVisible(false);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Decisions, requests and rival offers interrupt whatever the player is
  // doing — that is the point of them — but not while something that has to
  // be answered first is already up. The daily wheel belongs on this list
  // beside the tutorial and the offline summary: it opens on hydrate, and
  // react-native-web portals modals in mount order, so an event that spawns
  // a few seconds later lands *on top* of the wheel and buries the claim
  // button under a villager asking for honey.
  const holdInterruptions =
    Boolean(state.offlineSummary) ||
    tutorialVisible ||
    mentorActive ||
    caravanTutorialActive ||
    state.dailyBonusPending !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <GradientFill colors={seasonalBackgroundGradient()} x1="0" y1="0" x2="0" y2="1" />
      <SpotlightProvider style={styles.content}>
        <SpotlightTarget id="inflation">
          <InflationHeader
            townName={state.townName}
            emblem={TOWN_EMBLEMS_BY_ID[state.selectedEmblem]?.icon ?? "🏘️"}
            emblemColor={state.selectedEmblemColor}
            rankIcon={townRankIcon(state.townRankIndex)}
            rankTitle={rankTitle}
            cash={state.cash}
            netWorth={netWorth}
            inflationIndex={state.inflationIndex}
            inflationRate={state.inflationRate}
            inflationHistory={state.inflationHistory}
            paused={state.paused}
            muted={sounds.muted}
            streakCount={state.streak.count}
            gameDay={gameDayFromTick(state.tick)}
            tick={state.tick}
            difficulty={state.difficulty}
            language={state.language}
            t={t}
            onTogglePause={togglePause}
            onToggleMuted={sounds.toggleMuted}
            onToggleLanguage={() => setLanguage(state.language === "tr" ? "en" : "tr")}
            onReset={() => setDifficultyModalVisible(true)}
            onHelp={() => setTutorialVisible(true)}
            onEditName={() => setNameModalVisible(true)}
            onOpenSpeedBoost={() => setSpeedBoostModalVisible(true)}
          />
        </SpotlightTarget>
        {/* Above the screens rather than inside one: a crisis lands on the
            whole town, so the countdown has to follow the player wherever
            they are preparing — market, trade or town hall. */}
        <CrisisWarningBanner crisis={state.pendingCrisis} tick={state.tick} />
        <EventBanner event={state.lastEvent} />
        <ComboBanner event={comboEvent} />
        <ConfettiBurst trigger={confettiTrigger} />

        {/* Rendered outside the per-screen blocks so the guided task follows
            the player between tabs — several of the steps are there to show
            that a tab exists at all. */}
        <OnboardingBanner onGoToScreen={setScreen} activeScreen={screen} />

        {screen === "market" && <MarketScreen sounds={sounds} />}
        {screen === "inventory" && <InventoryScreen />}
        {screen === "trade" && <TradeScreen sounds={sounds} />}
        {screen === "town" && <TownScreen onOpenDoctrine={() => setDoctrineModalVisible(true)} />}
        {screen === "research" && <ResearchScreen />}
        {screen === "invest" && <InvestScreen sounds={sounds} />}
        {screen === "achievements" && <AchievementsScreen />}

        {/* She sits above the tab bar in the layout but paints above the dim
            as well, which is what the zIndex on her dock is for — source
            order alone cannot give her both. */}
        {mentorActive && <MentorCoach onNext={nextMentorBeat} onSkip={skipMentor} />}
        {caravanTutorialActive && (
          <CaravanTutorialModal
            visible
            stepIndex={caravanTutorialStep}
            language={state.language}
            tradeUnlockThreshold={Math.round(effectiveTradeUnlockNetWorth(state))}
            onNext={nextCaravanStep}
            onSkip={skipCaravanTutorial}
          />
        )}

        <TabBar active={screen} onChange={setScreen} spotlight={mentorScreen} />

        {/* Over everything the tour is not pointing at, including the tab
            bar. The lit area is a gap in the dim rather than a hole punched
            through it, so the control inside it is the real one, still
            live, with nothing forwarding touches on its behalf. */}
        {mentorActive && <SpotlightOverlay target={mentorSpotlight} />}
        {caravanTutorialActive && <SpotlightOverlay target={caravanSpotlight} />}

        <DifficultyModal
          visible={difficultyModalVisible}
          currentDifficulty={state.difficulty}
          prestigeLevel={state.prestigeLevel}
          onSelect={(difficulty, ngPlusModifiers) => {
            reset(difficulty, ngPlusModifiers);
            setDifficultyModalVisible(false);
          }}
          onCancel={() => setDifficultyModalVisible(false)}
        />

        <OfflineSummaryModal summary={state.offlineSummary} onDismiss={dismissOfflineSummary} />

        <DecisionModal
          decision={holdInterruptions ? null : state.pendingDecision}
          onResolve={resolveDecision}
        />

        <VillagerRequestModal
          request={holdInterruptions ? null : state.pendingRequest}
          holding={state.pendingRequest ? state.goods[state.pendingRequest.goodId] : null}
          onResolve={resolveRequest}
        />

        <RivalTraderModal
          offer={holdInterruptions ? null : state.pendingRivalOffer}
          holding={state.pendingRivalOffer ? state.goods[state.pendingRivalOffer.goodId] : null}
          onResolve={resolveRivalOffer}
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

        <DoctrineModal visible={doctrineModalVisible} onClose={() => setDoctrineModalVisible(false)} />
        <SpeedBoostModal
          visible={speedBoostModalVisible}
          onClose={() => setSpeedBoostModalVisible(false)}
          sounds={sounds}
        />

        <DailyRewardWheelModal
          visible={!state.offlineSummary && !tutorialVisible && state.dailyBonusPending !== null}
          amount={state.dailyBonusPending ?? 0}
          streakCount={state.streak.count}
          onDismiss={dismissDailyBonus}
          onRevealed={() => setConfettiTrigger((n) => n + 1)}
          sounds={sounds}
        />
      </SpotlightProvider>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_700Bold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Waiting for fonts must not be a state the app can never leave. The splash
  // screen is only hidden once we are ready, so anything that leaves
  // `fontsLoaded` false forever leaves the player looking at the splash with
  // no way out — which reads as "the game doesn't open", with nothing on
  // screen to say otherwise.
  //
  // Two ways out, because there are two ways to get stuck: the hook reports
  // an error, or it reports nothing at all and simply never settles. A few
  // seconds of patience covers a slow first launch; past that, go in. The
  // display face falling back to the system font is a worse-looking game.
  // Not starting is not a game.
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  const ready = fontsLoaded || fontError !== null || waitedLongEnough;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <EconomyProvider>
        <Game />
      </EconomyProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#140f0a" },
  // The UI was designed for a phone-width column; on a wide screen (iPad,
  // web desktop) let it grow to a comfortable max width and center it
  // instead of stretching cards edge-to-edge.
  content: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
});
