// Metro resolves an imported image to an opaque asset handle, but nothing in
// the toolchain tells TypeScript that: expo/tsconfig.base declares stylesheet
// modules and leaves images alone, and this project pins `types` to jest and
// node, so no ambient package fills the gap either. Without this, importing a
// PNG is a missing-module error, and the only way round it is `require()`,
// which the lint config forbids.
declare module "*.png" {
  import type { ImageRequireSource } from "react-native";

  const source: ImageRequireSource;
  export default source;
}

declare module "*.webp" {
  import type { ImageRequireSource } from "react-native";

  const source: ImageRequireSource;
  export default source;
}
