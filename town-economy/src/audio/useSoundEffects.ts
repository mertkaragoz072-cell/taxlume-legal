import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

const buySource = require("../../assets/sounds/buy.wav");
const sellSource = require("../../assets/sounds/sell.wav");
const eventSource = require("../../assets/sounds/event.wav");
const crashSource = require("../../assets/sounds/crash.wav");
const ambientSource = require("../../assets/sounds/ambient.wav");

function playOrIgnore(player: ReturnType<typeof useAudioPlayer>) {
  try {
    const result = player.play() as unknown;
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // audio can fail to init in some environments (e.g. headless preview); ignore
  }
}

export function useSoundEffects() {
  const buyPlayer = useAudioPlayer(buySource);
  const sellPlayer = useAudioPlayer(sellSource);
  const eventPlayer = useAudioPlayer(eventSource);
  const crashPlayer = useAudioPlayer(crashSource);
  const musicPlayer = useAudioPlayer(ambientSource);
  // Imperative setup belongs in an effect, not inline during render. The
  // react-hooks/immutability rule flags this as "modifying a hook's return
  // value," but expo-audio's AudioPlayer is a SharedObject explicitly
  // designed for exactly this (its own docs set `.volume` the same way) —
  // not React state the rule's memoization assumptions apply to.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    musicPlayer.loop = true;
    musicPlayer.volume = 0.35;
  }, [musicPlayer]);
  // Whether startMusic() has ever been called — the mute effect below
  // should never start music on its own, only resume it once the player
  // (a user gesture, per the title screen's Start button) has opted in.
  const musicStarted = useRef(false);

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Follows the same mute switch as sound effects — one "quiet mode" for
  // the whole app rather than a second volume control nobody asked for.
  useEffect(() => {
    if (!musicStarted.current) return;
    if (muted) {
      musicPlayer.pause();
    } else {
      playOrIgnore(musicPlayer);
    }
  }, [muted, musicPlayer]);

  // On web, player.play() returns a Promise (HTMLMediaElement.play()) that
  // rejects when the browser's autoplay policy blocks it (e.g. no user
  // gesture yet) — swallow that instead of letting it surface as an
  // unhandled rejection. expo-audio's own types claim `void`, so cast
  // defensively. Shared by one-shot effects (which also rewind first) and
  // the looping ambient track (which must not rewind on every resume).
  const play = useCallback((player: ReturnType<typeof useAudioPlayer>) => {
    if (mutedRef.current) return;
    try {
      player.seekTo(0);
      playOrIgnore(player);
    } catch {
      // audio can fail to init in some environments (e.g. headless preview); ignore
    }
  }, []);

  // Best-effort tactile feedback — a platform that can't vibrate (desktop
  // web, an iPad without the Taptic Engine) should silently do nothing,
  // never throw, and it follows the same mute toggle as sound so there's
  // just one "quiet mode" switch rather than a second setting to manage.
  const haptic = useCallback((trigger: () => Promise<void>) => {
    if (mutedRef.current) return;
    try {
      trigger().catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  // The player itself is created eagerly (useAudioPlayer mounts it right
  // away), but actually calling play() before any user gesture is what
  // browsers' autoplay policy blocks — this is meant to be invoked from the
  // title screen's Start/Continue button, which is that gesture.
  const startMusic = useCallback(() => {
    if (musicStarted.current) return;
    musicStarted.current = true;
    if (mutedRef.current) return;
    playOrIgnore(musicPlayer);
  }, [musicPlayer]);

  return {
    muted,
    toggleMuted: () => setMuted((m) => !m),
    startMusic,
    playBuy: () => {
      play(buyPlayer);
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    },
    playSell: () => {
      play(sellPlayer);
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    },
    playEvent: () => play(eventPlayer),
    playCrash: () => {
      play(crashPlayer);
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    },
    playSuccess: () => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  };
}
