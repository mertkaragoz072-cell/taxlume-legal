// Skia 2.6.2 calls Reanimated.createWorkletRuntime() while its video hook is being loaded, which throws at start-up when
// react-native-reanimated (an optional peer) is not installed. This game uses no video, so the hook is replaced by a stub (see metro.config.js).
export const useVideoLoading = (_source: string | null) => null;
