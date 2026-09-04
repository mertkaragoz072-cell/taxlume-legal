import React, { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "react-native";

interface Props extends TextProps {
  value: number;
  formatter?: (v: number) => string;
  duration?: number;
}

/** Tweens its displayed value toward `value` whenever it changes instead of
 * snapping straight to the new number — small "alive" feedback for cash,
 * net worth, and prices that would otherwise just jump every tick.
 * displayRef always tracks the last-rendered (possibly mid-tween) value, so
 * a value change that interrupts an in-flight animation restarts smoothly
 * from wherever it currently is rather than jumping. */
export function AnimatedNumber({ value, formatter, duration = 500, style, ...rest }: Props) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <Text style={style} {...rest}>
      {formatter ? formatter(display) : display.toFixed(1)}
    </Text>
  );
}
