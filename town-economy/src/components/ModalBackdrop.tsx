import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  children: React.ReactNode;
}

/** Shared backdrop for every full-screen modal — blurs the screen behind
 * the dialog instead of just dimming it flat, the visual signature of a
 * modern native modal rather than a plain dark scrim. A soft dark wash
 * still sits on top so foreground text stays readable over a bright
 * background; on a runtime where BlurView has no effect (some web
 * browsers) the wash alone still reads as a normal modal backdrop. */
export function ModalBackdrop({ children }: Props) {
  return (
    // aria-modal keeps a screen reader inside the dialog: without it
    // a screen reader walks straight past the modal into the blurred screen
    // behind it, which is unreachable by touch and reads as a dead end.
    <View style={styles.fill} aria-modal>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, styles.wash]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  wash: { backgroundColor: "rgba(10, 7, 4, 0.45)" },
});
