// Sound effects, music and vibration, following the settings (src/game/settings.js). Every call is guarded: audio or haptics failing
// never breaks the game.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { AppState } from "react-native";

const FILES: Record<string, number> = {
  tap: require("../../assets/sounds/tap.wav"),
  coin: require("../../assets/sounds/coin.wav"),
  done: require("../../assets/sounds/done.wav"),
  buy: require("../../assets/sounds/buy.wav"),
  claim: require("../../assets/sounds/claim.wav"),
  error: require("../../assets/sounds/error.wav"),
};
const MUSIC = require("../../assets/sounds/music.wav");

export class Feedback {
  private players = new Map<string, AudioPlayer>();
  private music: AudioPlayer | null = null;
  private ready = false;

  constructor(private settings: any) {
    settings.on((name: string) => { if (name === "music") this.syncMusic(); });
    AppState.addEventListener("change", (s) => { if (s !== "active") this.music?.pause(); else this.syncMusic(); });
  }

  /** Prepares the players (call once; safe to call again). */
  init() {
    if (this.ready) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" } as any).catch(() => {});
      for (const [name, src] of Object.entries(FILES)) { const p = createAudioPlayer(src); p.volume = 0.8; this.players.set(name, p); }
      this.music = createAudioPlayer(MUSIC); this.music.loop = true; this.music.volume = 0.7;
      this.ready = true;
      this.syncMusic();
    } catch { this.ready = false; }
  }

  sfx(name: string) {
    if (!this.settings.sfx || !this.ready) return;
    try { const p = this.players.get(name); if (p) { void p.seekTo(0); p.play(); } } catch { /* ignore */ }
  }

  syncMusic() {
    if (!this.ready || !this.music) return;
    try { if (this.settings.music) this.music.play(); else this.music.pause(); } catch { /* ignore */ }
  }

  /** A short vibration pattern (the first number's length picks the strength: longer = heavier). */
  buzz(pattern: number | number[] = 20) {
    if (!this.settings.vibration) return;
    try {
      const len = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
      if (Array.isArray(pattern) && pattern.length > 1) void Haptics.notificationAsync(len > 100 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      else void Haptics.impactAsync(len > 30 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }
  }
}
