import { registerRootComponent } from "expo";
import { Platform } from "react-native";

// On the web (used for development screenshots only) Skia needs its WebAssembly runtime loaded first.
if (Platform.OS === "web") {
  const { LoadSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");
  LoadSkiaWeb({ locateFile: () => "/canvaskit.wasm" }).then(() => registerRootComponent(require("./App").default));
} else {
  registerRootComponent(require("./App").default);
}
