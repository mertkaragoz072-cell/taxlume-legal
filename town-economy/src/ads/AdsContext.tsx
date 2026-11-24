import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT } from "../theme";
import { createAdmobProvider } from "./admobProvider";

/** Rewarded ads, as the game needs them: ask for one, find out whether the
 * player watched it to the end. Which ad network answers is decided in one
 * place (see getAdProvider): the shipped app has none until one is set up, so
 * the "watch an ad to skip" buttons stay hidden. */
export interface RewardedAdProvider {
  /** resolves true only if the ad was watched through and the reward is earned */
  showRewarded(): Promise<boolean>;
}

interface AdsValue {
  /** whether a rewarded ad can be offered right now */
  available: boolean;
  showRewarded: () => Promise<boolean>;
}

const AdsContext = createContext<AdsValue>({ available: false, showRewarded: async () => false });

/** No real network yet. EXPO_PUBLIC_ADS_MOCK=1 turns on a pretend ad (a few
 * seconds of waiting) for development and screenshots; a real network plugs in
 * here later (see docs/ADS.md). */
export function getAdProvider(): "mock" | RewardedAdProvider | null {
  if (process.env.EXPO_PUBLIC_ADS_MOCK === "1") return "mock";
  // Real ads only when the build says so (EXPO_PUBLIC_ADS=1): the privacy policy and the
  // store forms have to say "ads" before any release carries them (see docs/ADS.md).
  if (process.env.EXPO_PUBLIC_ADS === "1") return createAdmobProvider();
  return null;
}

const MOCK_SECONDS = 3;

export function AdsProvider({
  children,
  provider: given,
}: {
  children: React.ReactNode;
  provider?: "mock" | RewardedAdProvider | null;
}) {
  const provider = useMemo(() => (given !== undefined ? given : getAdProvider()), [given]);
  const [pending, setPending] = useState<((ok: boolean) => void) | null>(null);

  const showRewarded = useCallback(async (): Promise<boolean> => {
    if (!provider) return false;
    if (provider === "mock") return new Promise<boolean>((resolve) => setPending(() => resolve));
    try {
      return await provider.showRewarded();
    } catch {
      return false;
    }
  }, [provider]);

  const value = useMemo<AdsValue>(
    () => ({ available: provider !== null, showRewarded }),
    [provider, showRewarded]
  );

  return (
    <AdsContext.Provider value={value}>
      {children}
      {pending && (
        <MockAd
          onDone={(ok) => {
            pending(ok);
            setPending(null);
          }}
        />
      )}
    </AdsContext.Provider>
  );
}

export function useAds(): AdsValue {
  return useContext(AdsContext);
}

/** A stand-in ad: counts down, then pays out. Closing it early earns nothing. */
function MockAd({ onDone }: { onDone: (ok: boolean) => void }) {
  const { t } = useEconomyContext();
  const [left, setLeft] = useState(MOCK_SECONDS);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left <= 0 && !doneRef.current) {
      doneRef.current = true;
      onDone(true);
    }
  }, [left, onDone]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(false)}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{t("ads.mockTitle")}</Text>
          <Text style={styles.count}>{Math.max(0, left)}</Text>
          <Text style={styles.note}>{t("ads.mockNote")}</Text>
          <Pressable
            onPress={() => {
              if (!doneRef.current) {
                doneRef.current = true;
                onDone(false);
              }
            }}
            accessibilityRole="button"
          >
            <Text style={styles.close}>{t("ads.mockClose")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center" },
  box: {
    width: 280,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#241509",
    borderWidth: 2,
    borderColor: "#c8843c",
    alignItems: "center",
    gap: 8,
  },
  title: { color: "#f6d36a", fontFamily: FONT.display, fontSize: 16, letterSpacing: 1 },
  count: { color: "#f4e8d0", fontFamily: FONT.display, fontSize: 56 },
  note: { color: "#b9a88a", fontFamily: FONT.medium, fontSize: 12, textAlign: "center" },
  close: {
    color: "#b9a88a",
    fontFamily: FONT.medium,
    fontSize: 13,
    textDecorationLine: "underline",
    marginTop: 6,
  },
});
