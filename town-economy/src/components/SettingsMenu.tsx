import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import icPause from "../../assets/ui/modal/ic_pause.webp";
import icBolt from "../../assets/ui/modal/ic_bolt.webp";
import icSpeaker from "../../assets/ui/modal/ic_speaker.webp";
import icGlobe from "../../assets/ui/modal/ic_globe.webp";
import icHelp from "../../assets/ui/modal/ic_help.webp";
import icPad from "../../assets/ui/modal/ic_pad.webp";
import medGear from "../../assets/ui/modal/med_gear.webp";
import { ModalShell, RowBar } from "./ModalKit";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT, TYPE } from "../theme";
import { ModalBackdrop } from "./ModalBackdrop";

interface Props {
  size: number;
  language: string;
  muted: boolean;
  paused: boolean;
  onToggleLanguage: () => void;
  onOpenSpeedBoost: () => void;
  onHelp: () => void;
  onToggleMuted: () => void;
  onTogglePause: () => void;
  onReset: () => void;
}

/** The header's one control: a gear that opens a dropdown holding what used
 * to be six separate round buttons. The gear itself carries a small dot while
 * a speed boost is running or the game is paused, so those states are still
 * visible without opening the menu. */
export function SettingsMenu(props: Props) {
  const { size, language, muted, paused } = props;
  const { state, t } = useEconomyContext();
  const [open, setOpen] = useState(false);
  const boostActive = state.speedBoostExpiresAt !== null;

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const rows: { icon: number; label: string; right?: string; onPress: () => void; toggle?: boolean }[] = [
    {
      icon: icPause,
      label: paused ? t("a11y.resume") : t("a11y.pause"),
      onPress: run(props.onTogglePause),
    },
    {
      icon: icBolt,
      label: t("a11y.speedBoost"),
      right: boostActive ? "●" : undefined,
      onPress: run(props.onOpenSpeedBoost),
    },
    {
      icon: icSpeaker,
      label: muted ? t("a11y.unmute") : t("a11y.mute"),
      onPress: run(props.onToggleMuted),
    },
    {
      icon: icGlobe,
      label: t("a11y.toggleLanguage"),
      right: language === "tr" ? "TR" : "EN",
      onPress: run(props.onToggleLanguage),
    },
    { icon: icHelp, label: t("a11y.help"), onPress: run(props.onHelp) },
    { icon: icPad, label: t("a11y.newGame"), onPress: run(props.onReset) },
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.gear, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.gearGlyph, { fontSize: size * 0.62 }]}>⚙</Text>
        {(boostActive || paused) && <View style={[styles.dot, paused && styles.dotPaused]} />}
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <ModalBackdrop>
          <ModalShell title={t("settings.title")} medallion={medGear} onClose={() => setOpen(false)}>
            {rows.map((row) => (
              <RowBar
                key={row.label}
                label={row.label}
                icon={row.icon}
                right={row.right}
                onPress={row.onPress}
              />
            ))}
          </ModalShell>
        </ModalBackdrop>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gear: {
    backgroundColor: "#2b1a0e",
    borderWidth: 2,
    borderColor: "#b88a4a",
    alignItems: "center",
    justifyContent: "center",
  },
  gearGlyph: { color: "#f4e8ce", lineHeight: undefined },
  dot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffd75e",
    borderWidth: 1.5,
    borderColor: "#2b1a0e",
  },
  dotPaused: { backgroundColor: "#6fb8f2" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "flex-end",
    paddingTop: 66,
    paddingRight: 10,
  },
  menu: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#b88a4a",
    backgroundColor: "#2b1a0e",
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: "rgba(232,199,119,0.18)" },
  rowIcon: { width: 22, textAlign: "center", fontSize: TYPE.title, color: "#f4e8ce" },
  rowLabel: { flex: 1, color: "#f4e8ce", fontFamily: FONT.bold, fontSize: TYPE.body },
  rowRight: { color: "#e8c777", fontFamily: FONT.black, fontSize: TYPE.label },
});
