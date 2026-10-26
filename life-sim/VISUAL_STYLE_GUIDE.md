# Visual Style Guide

Source of truth: `../references/life-simulator-reference.jpg` (1536×1024 board, 22+ panels, Turkish labels).
The board is a **visual target only**. Every location is built as a real 3D scene from reusable procedural parts; the
image is never used as a background.

## 1. What the reference shows (analysis)

- **Interiors are front-facing dioramas**: a back wall with a big window onto a dusk city skyline, a floor in front, furniture
  standing against the wall, and the character in **profile** (facing left/right) in front of the furniture. Perspective is mild.
- **Light**: warm amber lamps and window light against dark teal/grey walls; strong rim highlights; soft contact shadows.
  Evening/dusk is the default mood. Exteriors use a sunset sky with long warm light.
- **Materials**: dark painted wall panels, wood floors/furniture (home, café, restaurant), black steel (gym), glass/chrome
  (bathroom, clinic), bright saturated colour only for small accents (plates, dumbbells, goods, neon).
- **Character**: pure-white rounded stickman, ~5.5 heads tall, thick black outline, simple dot eyes, no fingers. Clothes are flat
  colour shapes (cap, hoodie, shorts, shoes). Tattoos are black line art on the white body.
- **UI (second reference board)**: dark rounded cards, yellow accent, red STOP button, green/blue/orange action buttons per activity,
  circular level badge, thin coloured stat bars.

## 2. Global art direction (applies everywhere)

| Aspect | Rule |
|---|---|
| Camera | Interiors: fixed, slightly elevated, near-frontal (yaw ≤ 12°, elevation 8–15°), fov 34–40°. Gym bench station: fixed 3/4 view from the foot end. Outdoors/city: fixed, same family, wider. City map: separate top-down-ish presentation. |
| Layers | Background (wall/window/skyline, z −3.6) → mid props (z −2…−1) → **gameplay lane** (character + interactables, z −0.6…+0.4) → light foreground accents (never covering the lane). |
| Character | One rig (`character/rig.ts`), 1.8 m, same proportions in every scene; outline 2.6 cm; physique via muscle scaling only. |
| Lighting | One hemisphere + one soft key (shadow) + warm point lamps + window rim; bloom only for emissive; warm/teal grade; vignette 0.3. Time of day changes the window and lamp intensity. |
| Materials | Shared toon ramp, vertex-coloured batched meshes for static set dressing, outlined meshes only for hero/interactive objects. |
| Occlusion | No prop may sit between the camera and the lane at character height; checked by ray tests. |
| UI | Dark panels `#181b22`, yellow `#ffcf33`, red stop, green/blue/orange activity buttons, 48 px minimum touch targets, bottom nav. |
| Performance | Batch static props, ≤ ~150 draw calls per scene, 1024 shadow map, bloom auto-disables on slow devices. |

## 3. Per-location specification

Format: **Camera/composition · Geometry · Background · Lighting · Materials · Character placement · Interactables · Animations · Mobile layout**.
Status values live in `IMPLEMENTATION_STATUS.md` (NOT STARTED / IN PROGRESS / VERIFIED).

### Gym — "Spor Salonu" (+ sections: Bench Press, Squat, Deadlift, Barfiks, Dumbbell, Kondisyon)
- **Camera** frontal, slightly elevated (elevation 9°, fov 34°): the lifter sits on an **incline bench facing the viewer** (feet toward the camera, torso reclined 43° from upright), the bar runs horizontally across the screen with a plate at each end, the rack stands behind the lifter, uprights flank the bar. Other stations: frontal. **Geometry** power rack, bench, barbell with colour plates, dumbbell racks (black + hex colour), treadmills ×3 with glowing screens, punching bag, plate tree, kettlebells. **Background** steel columns, skyline window, "TRAIN HARDER GET STRONGER" sign, hanging lamps. **Lighting** dark, warm lamps, window rim. **Materials** black steel, dark tile, rubber mat. **Character** on the active station, centred. **Interactables** each station (bench, squat rack, deadlift platform, pull-up bar, dumbbell rack, treadmill), membership desk. **Animations** bench, squat, deadlift, pull-up, curl, run (each own pose set). **Mobile** station card + weight/reps steppers in the dock.

### Home — Bedroom "Yatak Odası"
- **Composition** frontal diorama, bed centre-right, window left-of-centre. **Geometry** double bed (navy duvet, pillows), nightstand + glowing lamp, wardrobe, rug, plants, wall art. **Background** window with skyline, shelf. **Lighting** very warm lamp pool, dim blue window. **Materials** wood floor, navy fabric, cream wall. **Character** lies on the bed to sleep; stands at wardrobe. **Interactables** bed (sleep/nap), wardrobe (outfit – Milestone 8), nightstand lamp (toggle), door. **Animations** walk, lie down/get up, sleeping breathing (Zzz). **Mobile** object chips + action sheet.

### Home — Study "Çalışma Odası"
- Desk with monitor + laptop, office chair, drawers, shelves with plants and books, window. Warm desk lamp. Character sits and types. Interactables: computer (study/learn, job search later), bookshelf. Animations: sit, typing hands.

### Home — Living room "Oturma Odası"
- Sofa, coffee table, TV on a wooden stand (emissive screen), bookshelf, big plant, window. Character sits on the sofa (relax / watch TV / nap). Interactables: sofa, TV. Animations: sit, lean back, remote.

### Home — Kitchen "Mutfak"
- Fridge, counters + cupboards (olive green), stove with hood, sink, microwave, table with two chairs, window. Character stands at stove/sink, sits at table to eat. Interactables: fridge (inventory), stove (cook), sink (drink), table (eat). Animations: stir, drink, eat (hand to mouth).

### Home — Bathroom "Banyo"
- Glass shower cabin with rain head, toilet, wooden vanity with lit mirror, towel rail, bath mat. Chrome/white tile. Character showers standing, arms raised. Interactables: shower, sink/mirror, toilet (time-only). Animations: shower with water particles, wash.

### Workplace "İş Yeri"
- Open office: rows of desks with monitors, black office chairs, windows with skyline, ceiling light strips. Character sits at own desk. Interactables: job board, own desk (shift), manager, coffee machine. Animations: type, walk, hand-over.

### Café "Kafe"
- Warm wood, chalk menu board ("COFFEE FOCUS BETTER DAY"), counter with espresso machine, small tables, laptops. Interactables: counter (order), table (sit/eat/meet friends). Animations: sit with cup, laptop.

### Grocery market "Market"
- Shelves of coloured goods, produce crates, checkout counter with till, shopping cart. Interactables: shelves by category, cart, till. Animations: push cart, pick item.

### City centre "Şehir Merkezi" (+ "Ev dışı yaşam")
- Plaza with fountain, benches, trees, row houses with warm windows, street with cars. Doubles as the travel hub. Interactables: building doors, bus/tram stop, bench. Animations: walk, wave. Map presentation: stylised district map with place pins (see reference second board).

### Character customization "Karakter özelleştirme"
- Wardrobe rack (hoodies, jackets), shoe shelf, mirror, plant. Character stands in front of the mirror in profile. Interactables: rack categories, shoes, accessories, mirror (preview). Animations: turn, try-on.

### Sports-equipment shop "Mağaza – Spor Ekipmanları"
- Dumbbell walls, barbells with plates, bench, bag. Interactables: item displays (buy for gym/home).

### Clothing shop "Mağaza – Kıyafet"
- Clothes rails, folded stacks, caps, shoes, mannequin/mirror. Interactables: tops/bottoms/shoes/accessories racks.

### Restaurant "Restoran"
- Warm dark wood, pendant lamps, several tables with seated guests, window. Interactables: table (order, premium meals). Animations: sit, eat.

### Park "Park"
- Sunset skyline over trees and a lake, bench, path, railing. Interactables: bench (relax), path (walk/jog). Animations: walk, sit.

### Beach / promenade "Sahil / Gezi Alanı"
- Sunset sea, palm trees, lamp posts, railing, boardwalk. Interactables: walk, bench. Animations: walk.

### Relaxation / entertainment "Dinlenme / Eğlence" (cinema / lounge)
- Dark lounge, armchair, large TV with glowing city scene, side lamp, TV stand. Cinema variant: seats facing a screen. Interactables: seat (watch). Animations: sit, lean.

### Health centre "Sağlık Merkezi"
- Clean light-grey/teal, hospital bed, monitor, posters, plant. Interactables: bed (recovery), reception (treatment). Animations: lie, check-up.

### Tattoo studio "Dövmeci"
- Red/purple neon sign, tattoo chair, artist desk, flash art. Character lying in chair with visible line-art tattoos. Interactables: designs catalogue, body placement picker, chair. Animations: sit/recline, needle buzz.

### Barber "Berber"
- Mirror with bulbs, barber chair, shelves of products, wooden counter. Interactables: chair (hairstyle), mirror. Animations: sit, cape.

### Nightlife / club "Gece Hayatı"
- Street facade with neon "CLUB", velvet rope, bouncers, magenta/cyan light. Interior dance floor (later). Interactables: door (entry fee), dance floor. Animations: walk, dance.

## 4. Reusable scene kit (target architecture)

`world/rooms/*` builders share: `wallAndFloor(theme)`, `windowWithSkyline(timeOfDay)`, `lampPool(x,y)`, furniture factories (bed, sofa, desk, fridge…),
`Interactable` hit volumes (`userData.interactable`), an `actor` anchor for the character, and a `CameraSetup`.
