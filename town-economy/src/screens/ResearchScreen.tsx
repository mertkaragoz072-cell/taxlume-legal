import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { RESEARCH_NODES, RESEARCH_NODES_BY_ID, ResearchNode } from "../economy/research";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { CARD_GRADIENT, cardShadow, COLORS, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

function NodeCard({ node, color }: { node: ResearchNode; color: string }) {
  const { state, research, t } = useEconomyContext();
  const researched = state.researched.includes(node.id);
  const prereq = node.requires ? RESEARCH_NODES_BY_ID[node.requires] : null;
  const locked = !researched && !!prereq && !state.researched.includes(prereq.id);
  const affordable = state.cash >= node.cost;
  const disabled = researched || locked || !affordable;

  return (
    <View style={[styles.nodeCard, locked && styles.nodeCardLocked]}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      {!locked && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, 0.1) }]}
        />
      )}
      <View style={[styles.accentStripe, { backgroundColor: color }]} />
      <Text style={[styles.nodeIcon, locked && styles.dimmed]}>{node.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.nodeName, locked && styles.dimmed]}>{t(node.nameKey)}</Text>
        <Text style={[styles.nodeDesc, locked && styles.dimmed]}>{t(node.descriptionKey)}</Text>
        <View style={styles.effectRow}>
          {node.productionBonusPct > 0 && (
            <Text style={styles.effectText}>
              {t("research.effectProduction", { pct: Math.round(node.productionBonusPct * 100) })}
            </Text>
          )}
          {node.valueBonusPct > 0 && (
            <Text style={styles.effectText}>
              {t("research.effectValue", { pct: Math.round(node.valueBonusPct * 100) })}
            </Text>
          )}
        </View>
        {locked && prereq && (
          <Text style={styles.lockedText}>
            {t("research.lockedRequires", { name: t(prereq.nameKey) })}
          </Text>
        )}
      </View>
      {researched ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("research.researchedBadge")}</Text>
        </View>
      ) : (
        <ScalePressable
          disabled={disabled}
          onPress={() => research(node.id)}
          style={[styles.researchBtn, (locked || !affordable) && styles.researchBtnDisabled]}
          scaleTo={0.95}
        >
          {!disabled && <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />}
          <Text style={styles.researchBtnText}>
            {t("research.researchBtn", { cost: node.cost })}
          </Text>
        </ScalePressable>
      )}
    </View>
  );
}

export function ResearchScreen() {
  const { t } = useEconomyContext();

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionNote}>{t("research.sectionNote")}</Text>
      {GOODS.map((good) => {
        const nodes = RESEARCH_NODES.filter((n) => n.goodId === good.id);
        return (
          <View key={good.id} style={styles.goodGroup}>
            <View style={styles.goodHeaderRow}>
              <Text style={styles.goodHeaderIcon}>{good.icon}</Text>
              <Text style={[styles.goodHeaderName, { color: good.color }]}>{t(good.nameKey)}</Text>
            </View>
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} color={good.color} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SPACING.lg, paddingBottom: 40 },
  sectionNote: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: SPACING.lg, lineHeight: 17 },
  goodGroup: { marginBottom: SPACING.lg + 2 },
  goodHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  goodHeaderIcon: { fontSize: TYPE.heading, marginRight: SPACING.sm },
  goodHeaderName: { color: COLORS.textPrimary, fontWeight: WEIGHT.black, fontSize: TYPE.body },
  nodeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    overflow: "hidden",
  },
  nodeCardLocked: { opacity: 0.6 },
  accentStripe: { position: "absolute", top: 0, bottom: 0, left: 0, width: 4 },
  dimmed: { opacity: 0.7 },
  nodeIcon: { fontSize: TYPE.heading + 6, marginRight: SPACING.md },
  nodeName: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontSize: TYPE.body },
  nodeDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 2 },
  effectRow: { flexDirection: "row", gap: SPACING.sm + 2, marginTop: SPACING.xs },
  effectText: { color: COLORS.positive, fontSize: TYPE.caption, fontWeight: WEIGHT.bold },
  lockedText: { color: COLORS.negative, fontSize: TYPE.micro, fontWeight: WEIGHT.medium, marginTop: SPACING.xs },
  badge: {
    backgroundColor: "rgba(63,174,92,0.16)",
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    marginLeft: SPACING.sm + 2,
  },
  badgeText: { color: COLORS.positive, fontWeight: WEIGHT.bold, fontSize: TYPE.caption },
  researchBtn: {
    borderRadius: RADIUS.chip,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    marginLeft: SPACING.sm + 2,
    overflow: "hidden",
  },
  researchBtnDisabled: { backgroundColor: "#4a4032" },
  researchBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontSize: TYPE.caption },
});
