import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";
import { CARD_GRADIENT, GOLD_GRADIENT } from "../theme";

// Deliberately duplicated here rather than imported from persist.ts — the
// save file is exactly the kind of thing that might be causing the crash
// this boundary exists to survive, so this stays a plain string constant,
// never a shared module that could itself fail to load.
const STORAGE_KEY = "taxlume-town-economy-save-v1";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Sits above EconomyProvider so it can catch a crash anywhere — including
 * one caused by a corrupted or hand-edited save (e.g. from the save-code
 * import feature) — and show a friendly recovery screen instead of a blank
 * white screen. Bilingual and hardcoded on purpose: at this point we can't
 * trust context/i18n to still be working. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error caught by ErrorBoundary:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleResetSave = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore — we're already in a broken state, best effort only
    }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.icon}>🏚️</Text>
          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            Kasaba beklenmedik bir sorunla karşılaştı. Tekrar dene, ya da sorun devam ederse
            kayıtlı ilerlemeni sıfırlayıp yeniden başlayabilirsin.
          </Text>
          <Text style={styles.subtitle}>
            The town hit an unexpected snag. Try again, or if it keeps happening, reset your
            saved progress and start fresh.
          </Text>

          <ScalePressable onPress={this.handleRetry} style={styles.primaryBtn} scaleTo={0.97}>
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.primaryBtnText}>Tekrar Dene · Try Again</Text>
          </ScalePressable>

          <ScalePressable onPress={this.handleResetSave} style={styles.secondaryBtn} scaleTo={0.97}>
            <Text style={styles.secondaryBtnText}>
              Kaydı Sıfırla ve Yeniden Başla · Reset Save & Restart
            </Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a1410",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { color: "#f0e3c8", fontSize: 17, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: "#a0917a",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 10,
    marginBottom: 10,
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 10,
  },
  primaryBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 13 },
  secondaryBtn: { paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { color: "#a0917a", fontSize: 12, fontWeight: "600" },
});
