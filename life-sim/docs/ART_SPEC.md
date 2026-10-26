# Art specification (to reach the painted look of the reference boards)

The reference boards are painted illustrations. Procedural Three.js art can approximate their lighting (bloom, colour
grade, light shafts, dense props — implemented) but not their hand-painted surface detail. For that fidelity, supply
authored plates; the code has a clear place for them.

## Per location (portrait, 1536×2732 px, PNG/WebP, sRGB)
1. `backdrop` — the empty room painted from the fixed camera, **no character, no interactive equipment** (bench, rack, bar).
2. `midground` (optional) — transparent PNG of props that stand in front of the character (e.g. foreground rack edge).
3. `props/*.png` — transparent sprites for interactive equipment, same lighting direction as the backdrop (key light upper-right, warm).
4. Keep the stage area (centre third, lower-middle) free of detail so the character and bar read clearly; leave the
   bottom ~30% quiet because the dock covers it.

## Integration point
`world/gymScene.ts`: replace the back wall, window and shelf meshes with one textured plane at z = -3.6 sized to the
camera frustum at that depth; keep the 3D station, character and lighting on top. Other locations follow the same
`LocationScene` interface (`world/locationScene.ts`).

## Character
The rig (`character/rig.ts`) stays procedural so it can be animated and re-proportioned; only its outline thickness and
shading ramp (`world/materials.ts`) should be tuned to match painted backdrops.

## Implemented: gym painted backdrop (`public/art/gym-backdrop.webp`)
- 941×1672 portrait painting supplied by the project owner. `world/gymScene.ts` loads it; `world/renderer.ts` draws it as the scene
  background, cover-fitted and centred (sides are cropped on narrower screens), **without** filmic tone mapping so the colours stay as painted.
- The procedural gym (wall, racks, window, treadmills, lamps…) remains as an automatic **fallback** if the file is missing or fails to load.
- The 3D station (bench, rack, bar, lifter) stands in the middle of the painted floor on a contact shadow; it is lit with a neutral-warm key so the
  character stays white against the amber painting.
- To replace the art: overwrite `public/art/gym-backdrop.webp` (keep the portrait aspect; the floor should occupy the lower ~55%; leave the centre of
  the floor open for the station).

## Implemented: bench-station sprite (`public/art/bench-station.webp`)
- Supplied asset: transparent WebP (cropped to 1168×1182) of a flat bench with a rack (two uprights with J-hooks), drawn in a 3/4 view from the foot end.
- It is a **camera-facing layer just behind the 3D lifter and bar** (`world/gymScene.ts`, `SPRITE`, `placeSprite`): the stickman and the barbell stay real 3D
  and animated; the sprite provides the bench and rack art. If the file is missing the procedural bench/rack is used.
- The gym staging was **calibrated to the sprite** (not the other way round): `scripts/calibrate-bench-sprite.py` least-squares fits station yaw (−55°),
  camera elevation (13°), scale (860 px/m), sprite offset, pad extent (−0.72…+0.58 m), hook position (x −0.50, y 0.83) and upright spacing (±0.44 m)
  from points measured on the sprite (rms ≈ 4.5 cm). The bench is therefore **flat** again (torso exactly horizontal on the pad).
- Limits: the sprite is a flat picture, so the near upright cannot pass *in front of* the lifter; hooks and uprights in the art are lower and chunkier
  than a real rack, so the racked bar sits beyond the lifter's head and travels to the chest on unrack.
- Debug: add `&proc=1` (with `&debug=1`) to the URL to show the 3D fallback bench over the sprite for alignment checks.
- To replace the sprite: keep a transparent background and the same camera angle, measure the key points again, run the calibration script, copy the printed values.
