import { useAudioPlayer } from "expo-audio";
import { useCallback, useRef, useState } from "react";

const buySource = require("../../assets/sounds/buy.wav");
const sellSource = require("../../assets/sounds/sell.wav");
const eventSource = require("../../assets/sounds/event.wav");
const crashSource = require("../../assets/sounds/crash.wav");

export function useSoundEffects() {
  const buyPlayer = useAudioPlayer(buySource);
  const sellPlayer = useAudioPlayer(sellSource);
  const eventPlayer = useAudioPlayer(eventSource);
  const crashPlayer = useAudioPlayer(crashSource);

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const play = useCallback((player: ReturnType<typeof useAudioPlayer>) => {
    if (mutedRef.current) return;
    try {
      player.seekTo(0);
      // On web this returns a Promise (HTMLMediaElement.play()) that rejects
      // when the browser's autoplay policy blocks it (e.g. no user gesture
      // yet) — swallow that instead of letting it surface as an unhandled
      // rejection. expo-audio's own types claim `void`, so cast defensively.
      const result = player.play() as unknown;
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(() => {});
      }
    } catch {
      // audio can fail to init in some environments (e.g. headless preview); ignore
    }
  }, []);

  return {
    muted,
    toggleMuted: () => setMuted((m) => !m),
    playBuy: () => play(buyPlayer),
    playSell: () => play(sellPlayer),
    playEvent: () => play(eventPlayer),
    playCrash: () => play(crashPlayer),
  };
}
