import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { RESEARCH_NODES, RESEARCH_NODES_BY_ID, ResearchNode } from "../economy/research";
import { GradientFill } from "../components/GradientFill";
import { ScalePressable } from "../components/ScalePressable";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";

function NodeCard({ node }: { node: ResearchNode }) {
  const { state, research, t } = useEconomyContext();
  const researched = state.researched.includes(node.id);
  const prereq = node.requires ? RESEARCH_NODES_BY_ID[node.requires] : null;
  const locked = !researched && !!prereq && !state.researched.includes(prereq.id);
  const affordable = state.cash >= node.cost;
  const disabled = researched || locked || !affordable;

  return (
    <View style={[styles.nodeCard, locked && styles.nodeCardLocked]}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
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
              <Text style={styles.goodHeaderName}>{t(good.nameKey)}</Text>
            </View>
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  sectionNote: { color: "#a0917a", fontSize: 12, marginBottom: 16, lineHeight: 17 },
  goodGroup: { marginBottom: 18 },
  goodHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  goodHeaderIcon: { fontSize: 18, marginRight: 8 },
  goodHeaderName: { color: "#f0e3c8", fontWeight: "800", fontSize: 14 },
  nodeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  nodeCardLocked: { opacity: 0.6 },
  dimmed: { opacity: 0.7 },
  nodeIcon: { fontSize: 24, marginRight: 12 },
  nodeName: { color: "#f0e3c8", fontWeight: "700", fontSize: 13 },
  nodeDesc: { color: "#a0917a", fontSize: 11, marginTop: 2 },
  effectRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  effectText: { color: "#3fae5c", fontSize: 11, fontWeight: "700" },
  lockedText: { color: "#c94b4b", fontSize: 10, fontWeight: "600", marginTop: 4 },
  badge: {
    backgroundColor: "rgba(63,174,92,0.16)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  badgeText: { color: "#3fae5c", fontWeight: "700", fontSize: 11 },
  researchBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 10,
    overflow: "hidden",
  },
  researchBtnDisabled: { backgroundColor: "#4a4032" },
  researchBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 11 },
});
