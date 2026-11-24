import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/** Shown when the app could not be loaded at all.
 *
 * A module that throws while the bundle is being evaluated takes everything
 * with it: App never renders, no effect ever runs, and the splash screen —
 * which is hidden only once the app is ready — stays up forever. On a phone
 * that is indistinguishable from a freeze, and it says nothing. The screen
 * below is the difference between "it doesn't open" and a message naming the
 * file and the line.
 *
 * It is deliberately built from nothing but View and Text: no fonts, no
 * theme, no context. Whatever broke, this still has to render.
 */
function FatalError({ message }: { message: string }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Golden Town could not start</Text>
      <ScrollView style={styles.scroll}>
        <Text style={styles.body} selectable>
          {message}
        </Text>
      </ScrollView>
    </View>
  );
}

// require, not import: an import is hoisted and evaluated before this file's
// own code, so the try would never be entered.
let Root: React.ComponentType;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Root = require("./App").default;
} catch (error) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? "(no stack)"}`
      : String(error);
  Root = function FailedToLoad() {
    return <FatalError message={detail} />;
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#140f0a", paddingTop: 72, paddingHorizontal: 20 },
  title: { color: "#e8c777", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  scroll: { flex: 1, marginBottom: 32 },
  body: { color: "#d8cdbb", fontSize: 12, lineHeight: 18 },
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
