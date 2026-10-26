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
