import { useEffect, useRef } from "react";
import { Animated } from "react-native";

const UP_COLOR = "#3fae5c";
const DOWN_COLOR = "#c94b4b";

/**
 * Drives a short flash overlay whenever `price` changes, green on an
 * increase and red on a decrease. Consumers render an absolutely
 * positioned Animated.View with { backgroundColor: flashColor, opacity }.
 */
export function usePriceFlash(price: number) {
  const prevPrice = useRef(price);
  const opacity = useRef(new Animated.Value(0)).current;
  const colorRef = useRef(UP_COLOR);

  useEffect(() => {
    if (price !== prevPrice.current) {
      colorRef.current = price > prevPrice.current ? UP_COLOR : DOWN_COLOR;
      prevPrice.current = price;
      opacity.setValue(0.35);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }).start();
    }
  }, [price, opacity]);

  return { opacity, flashColor: colorRef.current };
}
