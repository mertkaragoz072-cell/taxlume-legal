import React, { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { GoodTab, ResearchBanner, ResearchCard } from "../components/ResearchPanels";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS } from "../economy/goods";
import { RESEARCH_NODES, RESEARCH_NODES_BY_ID, ResearchNode } from "../economy/research";
import { researchCost } from "../economy/formulas";
import { townRankNameKey } from "../economy/townRanks";
import { PANEL_GAP, SCREEN_PADDING } from "../theme";

function NodeCard({ node }: { node: ResearchNode }) {
  const { state, research, t } = useEconomyContext();
  const researched = state.researched.includes(node.id);
  const prereq = node.requires ? RESEARCH_NODES_BY_ID[node.requires] : null;
  const prereqLocked = !researched && !!prereq && !state.researched.includes(prereq.id);
  // Checked independently of the prereq above, and shown in its place once
  // the prereq is already clear — a tier-3 node otherwise ready to research
  // the moment its tier-2 sibling is done would sit there with no
  // explanation for why the button still won't work.
  const rankLocked = !researched && !!node.requiresRank && state.townRankIndex < node.requiresRank;
  const locked = prereqLocked || rankLocked;
  const cost = researchCost(state, node);
  const affordable = state.cash >= cost;

  const effects: string[] = [];
  if (node.productionBonusPct > 0) {
    effects.push(t("research.effectProduction", { pct: Math.round(node.productionBonusPct * 100) }));
  }
  if (node.valueBonusPct > 0) {
    effects.push(t("research.effectValue", { pct: Math.round(node.valueBonusPct * 100) }));
  }
  let lockedText: string | undefined;
  if (prereqLocked && prereq) {
    lockedText = t("research.lockedRequires", { name: t(prereq.nameKey) });
  } else if (rankLocked && node.requiresRank !== undefined) {
    lockedText = t("research.lockedRank", { rank: t(townRankNameKey(node.requiresRank)) });
  }

  return (
    <ResearchCard
      nodeId={node.id}
      icon={node.icon}
      name={t(node.nameKey)}
      description={t(node.descriptionKey)}
      effects={effects}
      lockedText={lockedText}
      locked={locked}
      researched={researched}
      affordable={affordable}
      buttonLabel={t("research.researchBtn", { cost })}
      researchedLabel={t("research.researchedBadge")}
      onResearch={() => research(node.id)}
    />
  );
}

export function ResearchScreen() {
  const { state, t } = useEconomyContext();
  const { width: screenW } = useWindowDimensions();
  const goods = GOODS.filter((good) => RESEARCH_NODES.some((n) => n.goodId === good.id));
  const [selectedId, setSelectedId] = useState(goods[0]?.id);
  const selected = goods.find((g) => g.id === selectedId) ?? goods[0];
  const nodes = selected ? RESEARCH_NODES.filter((n) => n.goodId === selected.id) : [];

  const inner = Math.min(screenW, 640) - SCREEN_PADDING * 2;
  const sideW = Math.round(Math.max(96, Math.min(130, inner * 0.27)));

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <ResearchBanner title={t("tabs.research")} note={t("research.sectionNote")} />
      <View style={styles.row}>
        <View style={{ width: sideW }}>
          {goods.map((good) => {
            const goodNodes = RESEARCH_NODES.filter((n) => n.goodId === good.id);
            const done = goodNodes.filter((n) => state.researched.includes(n.id)).length;
            return (
              <GoodTab
                key={good.id}
                goodId={good.id}
                icon={good.icon}
                name={t(good.nameKey)}
                selected={good.id === selected?.id}
                width={sideW}
                progress={`${done}/${goodNodes.length}`}
                onPress={() => setSelectedId(good.id)}
              />
            );
          })}
        </View>
        <View style={styles.cards}>
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: SCREEN_PADDING, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: PANEL_GAP - 4 },
  cards: { flex: 1, minWidth: 0 },
});
