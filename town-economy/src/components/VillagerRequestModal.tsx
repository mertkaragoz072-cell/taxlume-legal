import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { GOODS_BY_ID } from "../economy/goods";
import { GoodState, VillagerRequest } from "../economy/types";
import { ScalePressable } from "./ScalePressable";
import { VillagerIllustration } from "./VillagerIllustration";

interface Props {
  request: VillagerRequest | null;
  holding: GoodState | null;
  onResolve: (give: boolean) => void;
}

export function VillagerRequestModal({ request, holding, onResolve }: Props) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const requestId = request?.id;

  useEffect(() => {
    if (requestId == null) return;
    enterAnim.setValue(0);
    Animated.spring(enterAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 55,
    }).start();
  }, [requestId, enterAnim]);

  if (!request) return null;
  const good = GOODS_BY_ID[request.goodId];
  const canGive = (holding?.holding ?? 0) >= request.qty;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.villagerWrap,
              {
                opacity: enterAnim,
                transform: [
                  {
                    translateX: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }),
                  },
                ],
              },
            ]}
          >
            <VillagerIllustration size={76} />
          </Animated.View>

          <View style={styles.card}>
            <Text style={styles.title}>Köylü Ricası</Text>
            <Text style={styles.description}>
              Bir köylü {request.qty} {good.icon} {good.name} rica ediyor. Verirsen halk memnun olur,
              reddedersen üzülür.
            </Text>

            <ScalePressable
              onPress={() => onResolve(true)}
              style={[styles.option, !canGive && styles.optionDisabled]}
              scaleTo={0.96}
            >
              <Text style={styles.optionLabel}>
                Ver ({request.qty} {good.icon})
              </Text>
              <Text style={styles.optionHint}>
                {canGive ? "😊 mutluluk artar" : `elinde yeterli ${good.name} yok`}
              </Text>
            </ScalePressable>

            <ScalePressable onPress={() => onResolve(false)} style={styles.option} scaleTo={0.96}>
              <Text style={styles.optionLabel}>Reddet</Text>
              <Text style={styles.optionHint}>😞 mutluluk azalır</Text>
            </ScalePressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  stage: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  villagerWrap: {
    marginRight: -22,
    marginBottom: 14,
    zIndex: 2,
  },
  card: {
    flex: 1,
    backgroundColor: "#2a2016",
    borderRadius: 18,
    paddingVertical: 20,
    paddingRight: 20,
    paddingLeft: 30,
    alignItems: "center",
    zIndex: 1,
  },
  title: { color: "#f0e3c8", fontSize: 17, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  description: {
    color: "#a0917a",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  option: {
    width: "100%",
    backgroundColor: "#1a1410",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#3a2d1e",
  },
  optionDisabled: { opacity: 0.5 },
  optionLabel: { color: "#f0e3c8", fontWeight: "700", fontSize: 14, marginBottom: 3 },
  optionHint: { color: "#a0917a", fontSize: 11 },
});
