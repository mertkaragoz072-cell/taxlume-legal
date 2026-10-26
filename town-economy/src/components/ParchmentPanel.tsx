import React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { PARCHMENT, RADIUS } from "../theme";

interface Props extends ViewProps {
  /** a touch darker/more saturated edge — used for the handful of panels
   * that need to read as "special" (the active-good highlight, a ready
   * action) the same way UNLOCKED_CARD_GRADIENT does in the dark theme. */
  accent?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/** The parchment theme's base surface: warm paper with a carved double
 * border, standing in for CARD_GRADIENT + cardShadow in screens that have
 * switched over (see theme.ts's PARCHMENT comment). A flat color rather
 * than a photographed texture — there's no seamless paper-grain asset
 * commissioned yet, and a flat warm cream with a timber border already
 * reads as "parchment" at this size; the grain can layer in later as a
 * pure visual upgrade without touching any layout that depends on this
 * component's shape. */
export function ParchmentPanel({ accent, style, children, ...rest }: Props) {
  return (
    <View
      style={[styles.panel, accent && styles.panelAccent, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: PARCHMENT.paper,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: PARCHMENT.wood,
    padding: 12,
    // A soft ground shadow instead of the dark theme's lifted-card glow —
    // parchment reads as sitting flat on a table, not floating.
    shadowColor: PARCHMENT.woodDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  panelAccent: {
    borderColor: PARCHMENT.gold,
    borderWidth: 3,
  },
});
