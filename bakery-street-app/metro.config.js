const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const stub = path.join(__dirname, "src/stubs/skiaUseVideoLoading.ts");
const upstream = config.resolver.resolveRequest;

// Skia's optional Reanimated video hook crashes the app at launch when Reanimated is absent; see src/stubs/skiaUseVideoLoading.ts.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "./useVideoLoading" && /react-native-skia[\\/]/.test(context.originModulePath)) {
    return { type: "sourceFile", filePath: stub };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
