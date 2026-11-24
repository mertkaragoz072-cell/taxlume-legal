import React, { useEffect, useRef } from "react";
import { Animated, Image, Modal, StyleSheet, View } from "react-native";
import villagerArt from "../../assets/ui/modal/villager.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOOD_IMAGES } from "../economy/goodImages";
import { GOODS_BY_ID } from "../economy/goods";
import { GoodState, VillagerRequest } from "../economy/types";
import { FONT } from "../theme";
import { ModalBackdrop } from "./ModalBackdrop";
import { ModalShell, OptionBar, ParchmentNote } from "./ModalKit";

interface Props {
  request: VillagerRequest | null;
  holding: GoodState | null;
  onResolve: (give: boolean) => void;
}

export function VillagerRequestModal({ request, holding, onResolve }: Props) {
  const { t } = useEconomyContext();
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
  const art = GOOD_IMAGES[request.goodId];

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <ModalShell title={t("villagerRequest.title")}>
          <View style={styles.row}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.villager,
                {
                  opacity: enterAnim,
                  transform: [
                    { translateX: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                  ],
                },
              ]}
            >
              <Image source={villagerArt} style={styles.villagerImg} resizeMode="contain" />
            </Animated.View>
            <View style={styles.col}>
              <ParchmentNote>
                <Text style={styles.note}>
                  {t("villagerRequest.description", {
                    qty: request.qty,
                    icon: good.icon,
                    good: t(good.nameKey),
                  })}
                </Text>
              </ParchmentNote>
              <View style={{ height: 10 }} />
              <OptionBar
                kind="optG"
                title={t("villagerRequest.giveBtn", { qty: request.qty, icon: good.icon })}
                hint={
                  canGive
                    ? t("villagerRequest.giveHint")
                    : t("villagerRequest.insufficientHint", { good: t(good.nameKey) })
                }
                icon={art}
                emoji={art ? undefined : good.icon}
                disabled={!canGive}
                onPress={() => onResolve(true)}
              />
              <OptionBar
                kind="optR"
                title={t("villagerRequest.refuseBtn")}
                hint={t("villagerRequest.refuseHint")}
                emoji="😟"
                onPress={() => onResolve(false)}
              />
            </View>
          </View>
        </ModalShell>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", minHeight: 250 },
  villager: { position: "absolute", left: -10, bottom: -10, width: 96, zIndex: 2 },
  villagerImg: { width: 96, height: 240 },
  col: { flex: 1, marginLeft: 76 },
  note: { color: "#3b2412", fontFamily: FONT.medium, fontSize: 12.5, lineHeight: 17, textAlign: "center" },
});
