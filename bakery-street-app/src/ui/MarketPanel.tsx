// The Market scene's panel is the shop opened on its ingredients list (the same panel the Mağaza button opens over the café).
import React from "react";
import { useWorld } from "../runtime/context";
import { ShopPanel } from "./ShopPanel";

export function MarketPanel() {
  const { act } = useWorld();
  return <ShopPanel request={{ tab: "ingredients", n: 0 }} onClose={() => act.go("interior")} />;
}
