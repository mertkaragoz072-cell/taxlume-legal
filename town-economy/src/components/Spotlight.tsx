import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { COLORS, RADIUS, withAlpha } from "../theme";

/** Things the guided tour can point at. Adding one means wrapping the real
 * control in a <SpotlightTarget> with the same id — there is no registry of
 * selectors to keep in step with the UI. */
export type SpotlightId = "buy" | "inflation" | "caravanMap" | "caravanDirection" | "caravanSend";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Measure = (cb: (rect: Rect) => void) => void;

interface TargetEntry {
  measure: Measure;
  /** Brings the real control into view before the overlay starts pointing
   * at it. Only does anything on the web build (see SpotlightTarget) —
   * elsewhere it's a no-op, same as if the target just stayed wherever it
   * already was. */
  scrollIntoView: () => void;
}

interface Ctx {
  register: (id: SpotlightId, entry: TargetEntry | null) => void;
  entryOf: (id: SpotlightId) => TargetEntry | undefined;
  originRef: React.MutableRefObject<{ x: number; y: number }>;
  /** The ScrollView a spotlighted screen scrolls itself in, if any — see
   * useSpotlightScroll. Only one screen's targets are ever live at a time,
   * so one shared ref pair is enough. */
  scrollViewRef: React.MutableRefObject<ScrollView | null>;
  /** That ScrollView's own current contentOffset.y, kept in sync via the
   * onScroll handler useSpotlightScroll hands back. measureLayout below
   * only ever reports a target's position relative to the *visible* top of
   * the ScrollView, which shifts as the player scrolls — this is what
   * turns that relative number back into an absolute one scrollTo can use. */
  scrollOffsetRef: React.MutableRefObject<number>;
}

const SpotlightContext = createContext<Ctx | null>(null);

/** Holds the map of targets, and the window position of the frame the
 * overlay draws in.
 *
 * measureInWindow reports screen coordinates, while the overlay is absolute
 * inside this provider's own view — on a tall phone that is the safe area,
 * and on a wide screen the centred 480px column, so the two differ by the
 * status-bar inset and half the letterboxing. The origin is measured once
 * here and subtracted, rather than every target having to know where it
 * lives.
 */
export function SpotlightProvider({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const targets = useRef(new Map<SpotlightId, TargetEntry>()).current;
  const originRef = useRef({ x: 0, y: 0 });
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const frame = useRef<View>(null);

  const register = useCallback(
    (id: SpotlightId, entry: TargetEntry | null) => {
      if (entry) targets.set(id, entry);
      else targets.delete(id);
    },
    [targets]
  );
  const entryOf = useCallback((id: SpotlightId) => targets.get(id), [targets]);

  const onLayout = useCallback(() => {
    frame.current?.measureInWindow((x, y) => {
      originRef.current = { x, y };
    });
  }, []);

  // Without this the provider hands out a fresh object on every render of
  // whatever contains it — which in this app is most of the screen, since
  // ticks, price animations, and chatter all live above it. SpotlightOverlay
  // keys a measurement effect off this value's identity, so a value that
  // changes every render tears that effect down before its in-flight
  // measureInWindow callback (itself async) ever resolves — the overlay
  // then never picks up a newly-selected target and keeps showing whatever
  // it last managed to measure.
  const ctxValue = useMemo<Ctx>(
    () => ({ register, entryOf, originRef, scrollViewRef, scrollOffsetRef }),
    [register, entryOf]
  );

  return (
    <SpotlightContext.Provider value={ctxValue}>
      <View ref={frame} style={style} onLayout={onLayout} collapsable={false}>
        {children}
      </View>
    </SpotlightContext.Provider>
  );
}

/** A screen with spotlightable targets inside a ScrollView spreads the
 * returned `scrollProps` onto that ScrollView, so a target below the fold
 * can be scrolled into view before the tour points at it (see
 * SpotlightTarget's scrollIntoView and SpotlightOverlay, which calls it).
 * Only meaningful for a screen that actually has such targets; harmless to
 * skip otherwise. */
export function useSpotlightScroll():
  | { ref: React.RefObject<ScrollView | null>; onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void }
  | undefined {
  const ctx = useContext(SpotlightContext);
  if (!ctx) return undefined;
  return {
    ref: ctx.scrollViewRef,
    onScroll: (e) => {
      ctx.scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
  };
}

/** Wraps a real control so the tour can cut a hole over it. Renders a plain
 * View around its children and changes nothing about them. */
export function SpotlightTarget({
  id,
  children,
  style,
}: {
  id: SpotlightId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ctx = useContext(SpotlightContext);
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, {
      measure: (cb) => {
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) cb({ x, y, width, height });
        });
      },
      // measureLayout reports this target's position relative to the
      // *visible* top of the ScrollView — it walks up through however many
      // wrapper Views sit in between on its own, unlike onLayout (which
      // only ever reports a position relative to the immediate parent, and
      // was wrong here for the direction toggle and send button: both sit
      // inside their own panel View, one level below the ScrollView). That
      // relative number shifts as the player scrolls, so it's added to the
      // ScrollView's own last-known offset (see useSpotlightScroll) to get
      // an absolute position scrollTo can use.
      //
      // measureLayout's first argument has to be an actual host node, not
      // the ScrollView component instance itself — on the web build
      // react-native-web's ScrollView ref already *is* the underlying DOM
      // node (with measureLayout patched onto it), so passing the instance
      // straight through happened to work there and passed every web check
      // this went through. On a real device the ScrollView ref is the
      // composite class instance, which the native side can't resolve into
      // a node to measure against, so it silently failed there instead
      // (onFail below is a no-op) — the exact "still broken on the phone"
      // report this native/web split was already responsible for once
      // before, just for the other two nested targets. getNativeScrollRef()
      // is the ScrollView's own accessor for the real node underneath it.
      scrollIntoView: () => {
        const node = ref.current;
        const scrollView = ctx.scrollViewRef.current;
        if (!node || !scrollView) return;
        const relativeTo =
          (scrollView as unknown as { getNativeScrollRef?: () => unknown }).getNativeScrollRef?.() ?? scrollView;
        (node as unknown as { measureLayout?: (relativeToNode: unknown, onSuccess: (x: number, y: number) => void, onFail?: () => void) => void })
          .measureLayout?.(
            relativeTo,
            (_x, relativeY) => {
              const target = Math.max(0, ctx.scrollOffsetRef.current + relativeY - 16);
              scrollView.scrollTo({ y: target, animated: true });
            },
            () => {}
          );
      },
    });
    return () => ctx.register(id, null);
  }, [ctx, id]);

  return (
    <View ref={ref} style={style} collapsable={false}>
      {children}
    </View>
  );
}

const HOLE_PAD = 8;

/** Whether to put anything over the game at all.
 *
 * Fail open, never closed: without a measured rect there is no hole, and an
 * overlay with no hole on a beat that waits for the player to press
 * something is a dead end — which is exactly what it was. Losing the
 * highlight is a cosmetic failure; losing the only pressable control is not.
 */
export function shouldRenderOverlay(target: SpotlightId | null, rect: { width: number } | null) {
  return Boolean(target) && rect !== null && rect.width > 0;
}

/** Dims the whole screen except one control, which stays live.
 *
 * Four panels around the hole rather than a mask: the hole is simply a
 * region with no view over it, so the control underneath receives touches
 * with nothing to forward and nothing to fake. The panels are Pressables
 * with an empty handler so that everything *else* is deliberately, visibly
 * inert — the point of the step is that there is one thing to press.
 *
 * The rect is re-measured on a timer rather than on layout. A control
 * inside a ScrollView moves when the list scrolls and fires no layout
 * event, so a measurement taken once is wrong the moment the player
 * scrolls — and the market scrolls under the player while prices tick.
 */
export function SpotlightOverlay({ target }: { target: SpotlightId | null }) {
  const ctx = useContext(SpotlightContext);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!ctx || !target) {
      setRect(null);
      return;
    }
    let cancelled = false;
    // Once, when the tour points at a new target: the map, the direction
    // toggle and the send button sit far apart on a scrolling screen, and
    // without this the ones below the fold never enter the viewport on
    // their own. The overlay would then dim the entire screen with no hole
    // anywhere in it — indistinguishable from a plain text card over a
    // blank screen, which is what this was reported as. Left out of the
    // polling tick below on purpose: re-scrolling ten times a second would
    // fight the player's own scrolling.
    ctx.entryOf(target)?.scrollIntoView();
    const tick = () => {
      const entry = ctx.entryOf(target);
      if (!entry) return;
      entry.measure((r) => {
        if (cancelled) return;
        const o = ctx.originRef.current;
        setRect({ x: r.x - o.x, y: r.y - o.y, width: r.width, height: r.height });
      });
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ctx, target]);

  if (!rect || !shouldRenderOverlay(target, rect)) return null;

  // No measurement, no overlay — fail open, never closed.
  // (see shouldRenderOverlay)
  //
  // This used to dim the whole screen while it waited, on the reasoning
  // that a full dim beats a hole in the wrong place. That was exactly
  // backwards on the one beat that matters: the step asking for a trade
  // withholds its Continue button, so a dim with no hole left nothing on
  // screen to press and the tour simply stopped. A target that fails to
  // measure now costs the highlight and nothing else — the step still
  // reads, and the button under it still works.

  const left = rect.x - HOLE_PAD;
  const top = rect.y - HOLE_PAD;
  const right = rect.x + rect.width + HOLE_PAD;
  const bottom = rect.y + rect.height + HOLE_PAD;

  return (
    <>
      <Panel style={{ left: 0, right: 0, top: 0, height: Math.max(0, top) }} />
      <Panel style={{ left: 0, right: 0, top: bottom, bottom: 0 }} />
      <Panel style={{ left: 0, top, height: bottom - top, width: Math.max(0, left) }} />
      <Panel style={{ left: right, right: 0, top, height: bottom - top }} />
      <View
        pointerEvents="none"
        style={[styles.ring, { left, top, width: right - left, height: bottom - top }]}
      />
    </>
  );
}

/** One quarter of the frame around the lit control.
 *
 * A real blur rather than a flat scrim: the game stays legible behind it,
 * so the player can still see the market they are being taught about
 * instead of a black sheet. The dark wash over the blur is what makes the
 * lit button obviously the bright thing on screen, and it is also the whole
 * effect on a runtime where BlurView does nothing (some browsers).
 *
 * A Pressable with an empty handler on purpose: everything outside the hole
 * is meant to be visibly, deliberately inert.
 */
function Panel({ style }: { style: ViewStyle }) {
  return (
    <Pressable style={[styles.panel, style]} onPress={() => {}}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wash]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { position: "absolute", zIndex: 20 },
  wash: { backgroundColor: "rgba(8, 5, 3, 0.62)" },
  ring: {
    position: "absolute",
    zIndex: 20,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: withAlpha(COLORS.accent, 0.95),
  },
});
