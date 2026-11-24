import React from "react";
import { StyleSheet, View } from "react-native";
import { SheetHeader } from "./SheetHeader";

interface Props {
  text: string;
  /** Unused now — every section label hangs on the same carved beam with a
   * green plaque, so there is nothing left to tint. Kept in the type purely
   * so none of this component's call sites, each passing their own accent
   * color, need to change. */
  color?: string;
}

/** Every section heading in the game: the carved beam with the wheat-wreathed
 * green plaque, centred over the panel it titles and tucked a little under
 * it. */
export function SectionLabel({ text }: Props) {
  return (
    <View style={styles.wrap}>
      <SheetHeader text={text} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch", marginTop: 2, marginBottom: 3, zIndex: 2 },
});
