// Jest runs without React Native's native side, and async-storage 2.x throws
// from its own module scope when it cannot find the native module:
//
//   [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
//
// That kills the whole suite at import, before a single test body runs, for
// every file that reaches persist.ts. The package ships a mock for exactly
// this; wiring it here keeps the reducer tests testing the reducer instead of
// the storage layer.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
