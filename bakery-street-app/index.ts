import { registerRootComponent } from "expo";
import React from "react";
import { Platform, Text, View } from "react-native";

/** Shows what went wrong when the app cannot even load its code (otherwise the splash screen would just stay). */
function Failure({ message }: { message: string }) {
  return React.createElement(View, { style: { flex: 1, backgroundColor: "#463020", alignItems: "center", justifyContent: "center", padding: 24 } },
    React.createElement(Text, { style: { color: "#F5E6C8", fontSize: 14 } }, `Açılış hatası:\n${message}`));
}
function start() {
  try { registerRootComponent(require("./App").default); }
  catch (e: any) { const message = `${String(e?.message ?? e)}\n${String(e?.stack ?? "").split("\n").slice(0, 8).join("\n")}`; registerRootComponent(() => React.createElement(Failure, { message })); }
}

// On the web (used for development screenshots only) Skia needs its WebAssembly runtime loaded first.
if (Platform.OS === "web") {
  const { LoadSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");
  LoadSkiaWeb({ locateFile: () => "/canvaskit.wasm" }).then(start);
} else {
  start();
}
