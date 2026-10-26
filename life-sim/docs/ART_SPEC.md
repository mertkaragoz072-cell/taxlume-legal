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

## Slot reserved for the supplied bench-station asset
The bench station currently in the middle is the procedural placeholder (`world/props.ts → createBench/createRack`, geometry in
`world/benchGeometry.ts`). A supplied asset replaces it at the station group (`gymScene.ts → station`, origin at the seat, +x toward the viewer's
feet side). Accepted: a GLB/GLTF model (preferred: separate bar, bench, rack, with the bar centred at its own origin and sized in metres), or
transparent PNG/WebP sprites (bench + rack as a back layer, bar + plates as a separate layer, an optional front layer) — sprites keep the animated
stickman between the layers.
