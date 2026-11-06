import React from "react";
import { StyleSheet, View } from "react-native";
import rivalsArt from "../../assets/ui/tradesheet/rivals.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { TOWNS_BY_ID } from "../economy/towns";
import { TRADING_HOUSES, TRADING_HOUSES_BY_ID, TradingHouseActivity } from "../economy/tradingHouses";
import { FONT, PANEL_GAP } from "../theme";
import { FixedPanel } from "./ImagePanels";

const BUYING = "#ffb85a";
const SELLING = "#8cc8ff";

// Positions are in the sent panel's own pixels (774 x 398): three parchment
// rows, each with a painted house shield on the left and an empty gold-rimmed
// slot on the right, and an info mark at the foot for the hint.
const ART_W = 774;
const ART_H = 398;
const ROW_CENTERS = [62, 167, 272];
const pctX = (px: number) => `${(px / ART_W) * 100}%` as const;
const pctY = (px: number) => `${(px / ART_H) * 100}%` as const;

interface Props {
  activities: TradingHouseActivity[];
}

/** What the rival houses are working right now.
 *
 * Published on purpose. A house buying up iron makes iron there scarce and
 * dear, which is the moment to sell into that town and the worst moment to
 * buy from it — but only if the player can see it, so this is the whole
 * interface to the competition. */
export function TradingHousesCard({ activities }: Props) {
  const { t } = useEconomyContext();
  if (activities.length === 0) return null;
  // The panel's three shields are the three houses, in this order.
  const byHouse = TRADING_HOUSES.map((h) => activities.find((a) => a.houseId === h.id));

  return (
    <FixedPanel source={rivalsArt} aspect={ART_W / ART_H} style={{ marginBottom: PANEL_GAP }}>
      {(w) => (
        <>
          {byHouse.map((a, i) => {
            if (!a) return null;
            const house = TRADING_HOUSES_BY_ID[a.houseId];
            const town = TOWNS_BY_ID[a.townId];
            const good = GOODS_BY_ID[a.goodId];
            if (!house || !town || !good) return null;
            const buying = a.side === "buying";
            const tint = buying ? BUYING : SELLING;
            const cy = ROW_CENTERS[i];
            const name = t(house.nameKey);
            const action = t(buying ? "tradingHouse.buyingIn" : "tradingHouse.sellingIn", {
              good: `${good.icon} ${t(good.nameKey)}`,
              town: t(town.nameKey),
            });
            // Sized from the text, not left to wrap: phone letters run wider than
            // a browser's, and a third line would spill out of the parchment row.
            // Prefer one line; otherwise two lines that fit under the name.
            const boxW = (440 / ART_W) * w;
            const nameSize = Math.min(w * 0.04, boxW / (name.length * 0.62));
            const oneLine = boxW / (action.length * 0.62);
            const actionSize =
              oneLine >= w * 0.021
                ? Math.min(w * 0.029, oneLine)
                : Math.min(w * 0.025, (boxW * 1.8) / (action.length * 0.62));
            return (
              <React.Fragment key={a.houseId}>
                <View
                  style={[
                    styles.text,
                    { left: pctX(150), width: pctX(440), top: pctY(cy - 44), height: pctY(88) },
                  ]}
                >
                  <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text
                    style={[styles.action, { fontSize: actionSize, lineHeight: actionSize * 1.2 }]}
                    numberOfLines={2}
                  >
                    {action}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tag,
                    { left: pctX(598), width: pctX(135), top: pctY(cy - 24), height: pctY(48) },
                  ]}
                >
                  <Text style={[styles.tagText, { color: tint, fontSize: w * 0.03 }]} numberOfLines={1}>
                    {t(buying ? "tradingHouse.priceUp" : "tradingHouse.priceDown")}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
          {(() => {
            // The hint must stay inside the frame's lower strip whatever font the
            // phone uses: size it so the whole text fits two lines of that strip
            // (phone letters run ~0.6em wide), instead of letting it spill over
            // the gold rim.
            const hint = t("tradingHouse.hint");
            const boxW = (640 / ART_W) * w;
            const size = Math.min(w * 0.026, (boxW * 1.8) / (hint.length * 0.6));
            return (
              <View
                style={[
                  styles.hintBox,
                  { left: pctX(112), width: pctX(640), top: pctY(322), height: pctY(50) },
                ]}
              >
                <Text style={[styles.hint, { fontSize: size, lineHeight: size * 1.2 }]} numberOfLines={2}>
                  {hint}
                </Text>
              </View>
            );
          })()}
        </>
      )}
    </FixedPanel>
  );
}

const styles = StyleSheet.create({
  text: { position: "absolute", justifyContent: "center" },
  name: { color: "#3d2415", fontFamily: FONT.serif, flexShrink: 0 },
  action: { color: "#5a3d22", fontFamily: FONT.bold, marginTop: 2, flexShrink: 0 },
  tag: { position: "absolute", alignItems: "center", justifyContent: "center" },
  tagText: { fontFamily: FONT.black, letterSpacing: 0.5 },
  hintBox: { position: "absolute", justifyContent: "center", overflow: "hidden" },
  hint: { color: "#e8d3a6", fontFamily: FONT.medium },
});
