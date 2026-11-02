import bread from "../../assets/resources/bread.png";
import cotton from "../../assets/resources/cotton.png";
import sand_sack from "../../assets/resources/sand_sack.png";
import wheat from "../../assets/resources/wheat.png";

// A newer, higher-resolution illustrated set for a subset of resources —
// cut from a reference sheet, real alpha already verified (see the session
// notes around when this file was added). Kept separate from GOOD_IMAGES
// in ./goodImages (which is what GoodCard/GoodIcon actually render today)
// rather than merged into or replacing it: these use their own names
// (wheat/cotton/sand_sack/bread), not GoodId, and nothing reads this map
// yet. A future pass that wires these into the UI can either fold matching
// entries into GOOD_IMAGES or key this against GoodId directly, once it's
// clear which of these are meant to replace an existing good's art.
export const RESOURCE_IMAGES = { wheat, cotton, sand_sack, bread } as const;

export type ResourceIconId = keyof typeof RESOURCE_IMAGES;
