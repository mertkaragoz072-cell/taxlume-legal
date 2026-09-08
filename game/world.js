/* =============================================================================
   Tap Life room.

   The room itself is flat: a straight-on orthographic camera turns the wall
   and the floor into two plain bands, exactly like the 2D version. Only the
   objects keep their volume - each one is a real mesh, turned a little off
   axis so you can see round it, with a soft shadow pooled at its feet.

   Deliberately minimal and soft: pastel colours, rounded shapes, no outlines
   and gentle shading.

   The game rules stay in game.js and drive this module through the World.*
   API at the bottom. Units are metres.
   ========================================================================== */
window.World = (function () {
  "use strict";

  // How much of the room's width the canvas shows. Everything else is derived
  // from it, so the layout keeps the same proportions on any screen.
  var VIEW_W = 3.6;
  var FLOOR_FRAC = 0.24;   // share of the canvas taken by the floor band
  var TILT = 0.34;         // radians each object is turned, to show its depth

  var scene, camera, renderer, clock;
  var raycaster, pointer;
  var root;
  var slots = {};
  var picks = [];
  var sun, sunTarget, hemi, lampLight, ambient;
  var character;
  var weather = null;
  var coin = null;
  var ready = false;

  var tiers = {};

  /* ---------------------------------------------------------------- helpers */

  // Soft three-band ramp: shading enough to read the form, never harsh.
  var toonRamp = null;
  function ramp() {
    if (!toonRamp) {
      var steps = [196, 228, 255];
      var data = new Uint8Array(steps.length * 4);
      steps.forEach(function (v, i) {
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
      });
      toonRamp = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
      toonRamp.needsUpdate = true;
      toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
      toonRamp.generateMipmaps = false;
    }
    return toonRamp;
  }

  function mat(color) {
    return new THREE.MeshToonMaterial({ color: color, gradientMap: ramp() });
  }

  function flat(color, opacity) {
    var m = new THREE.MeshBasicMaterial({ color: color });
    if (opacity != null && opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
    }
    return m;
  }

  function mesh(geo, color) {
    var m = new THREE.Mesh(geo, mat(color));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Rounded box: the shape everything in this room is made of.
  function pill(w, h, d, color, radius) {
    var r = radius != null ? radius : Math.min(w, h, d) * 0.28;
    r = Math.min(r, Math.min(w, h, d) * 0.49);
    var geo = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
    roundGeometry(geo, w, h, d, r);
    return mesh(geo, color);
  }

  // Pushes box vertices toward a rounded shell, which softens every corner.
  function roundGeometry(geo, w, h, d, r) {
    var pos = geo.attributes.position;
    var hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    var v = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var cx = Math.max(-hx, Math.min(hx, v.x));
      var cy = Math.max(-hy, Math.min(hy, v.y));
      var cz = Math.max(-hz, Math.min(hz, v.z));
      var dx = v.x - cx, dy = v.y - cy, dz = v.z - cz;
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      pos.setXYZ(i, cx + (dx / len) * r, cy + (dy / len) * r, cz + (dz / len) * r);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  function ball(r, color) {
    return mesh(new THREE.SphereGeometry(r, 20, 16), color);
  }

  function capsule(r, len, color) {
    return mesh(new THREE.CapsuleGeometry(r, len, 4, 14), color);
  }

  function cyl(rt, rb, h, color, seg) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), color);
  }

  function at(obj, x, y, z) {
    obj.position.set(x, y, z);
    return obj;
  }

  function plate(w, h, color, opacity) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), flat(color, opacity));
  }

  /* --------------------------------------------------------------- palettes */

  var PASTEL = {
    skin: 0xffdfc4,
    hair: 0x8a6244,
    shirt: 0x7fd4a8,
    pants: 0x8fb8e8,
    shoe: 0x6b7fa8,
  };

  var ROOM_PALETTE = [
    { wall: 0xfdeed8, floor: 0xe7c49b, skirt: 0xfff8ee },
    { wall: 0xe4f0ff, floor: 0xdfd2bb, skirt: 0xffffff },
    { wall: 0xefe8ff, floor: 0xcfc3e0, skirt: 0xfaf6ff },
  ];

  /* ------------------------------------------------------------- room shell */

  var wallMat, floorMat, skirtMat;
  var roomTierIndex = 0;

  function buildRoom() {
    var g = new THREE.Group();
    var pal = ROOM_PALETTE[0];

    // Two flat bands meeting at y = 0: wall above, floor below. Both are drawn
    // far wider and taller than the frame so their edges are never in shot.
    wallMat = new THREE.MeshBasicMaterial({ color: pal.wall });
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), wallMat);
    wall.position.set(0, 7, -1.2);
    g.add(wall);

    floorMat = new THREE.MeshBasicMaterial({ color: pal.floor });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), floorMat);
    floor.position.set(0, -5, -1.1);
    g.add(floor);

    // Skirting board along the seam, the one line that says "this is a room".
    skirtMat = new THREE.MeshBasicMaterial({ color: pal.skirt });
    var skirt = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.12), skirtMat);
    skirt.position.set(0, 0.06, -1.05);
    g.add(skirt);

    return g;
  }

  function applyRoomTier(tier) {
    roomTierIndex = Math.max(0, Math.min(2, tier - 1));
    applyRoomLook();
  }

  function applyRoomLook() {
    var pal = ROOM_PALETTE[roomTierIndex];
    var tint = (DAY[dayPhase] || DAY.day).room;
    wallMat.color.set(pal.wall).multiply(tint);
    floorMat.color.set(pal.floor).multiply(tint);
    skirtMat.color.set(pal.skirt).multiply(tint);
    if (windowFrame) windowFrame.material.color.set(0xffffff).multiply(tint);
  }

  /* ------------------------------------------------------------------ window */

  var windowGroup, windowSky, windowSun, windowHills, windowFrame;

  function buildWindow() {
    var g = new THREE.Group();
    var PW = 1.15, PH = 0.95;

    windowFrame = plate(PW + 0.18, PH + 0.18, 0xffffff);
    g.add(windowFrame);

    windowSky = plate(PW, PH, 0xbfe8ff);
    windowSky.position.z = 0.006;
    g.add(windowSky);

    windowHills = [];
    var view = new THREE.Group();
    view.position.z = 0.014;

    windowSun = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), flat(0xffe9a3));
    windowSun.position.set(0.3, 0.24, 0);
    view.add(windowSun);

    [[-0.26, 0.28, 0xaee0a8], [0.22, 0.22, 0x9ad49a]].forEach(function (h) {
      var hill = new THREE.Mesh(new THREE.CircleGeometry(h[1], 20), flat(h[2]));
      hill.position.set(h[0], -0.36, 0);
      view.add(hill);
      windowHills.push(hill);
    });
    g.add(view);
    return g;
  }

  /* --------------------------------------------------------------- furniture */

  function buildBed(tier) {
    var g = new THREE.Group();
    var frameCol = [0xe8c39e, 0xdcb08a, 0xe6e9ee, 0xf5dfa0][tier - 1];
    var duvetCol = [0xa8ddd4, 0x8fd0e8, 0xc9c4e8, 0xf5b8c4][tier - 1];

    var base = pill(1.6, 0.34, 1.0, frameCol, 0.12);
    at(base, 0, 0.24, 0);
    g.add(base);

    var head = pill(0.15, 0.6, 0.95, frameCol, 0.07);
    at(head, -0.78, 0.5, 0);
    g.add(head);

    var mattress = pill(1.5, 0.2, 0.93, 0xfffaf2, 0.08);
    at(mattress, 0, 0.5, 0);
    g.add(mattress);

    var duvet = pill(1.0, 0.18, 0.95, duvetCol, 0.08);
    at(duvet, 0.26, 0.63, 0);
    g.add(duvet);

    var pillowG = pill(0.42, 0.16, 0.52, 0xffffff, 0.08);
    at(pillowG, -0.5, 0.65, 0);
    g.add(pillowG);

    if (tier >= 3) {
      var pillow2 = pill(0.36, 0.14, 0.44, duvetCol, 0.07);
      at(pillow2, -0.48, 0.78, 0);
      g.add(pillow2);
    }
    return g;
  }

  function buildFridge(tier) {
    var g = new THREE.Group();
    var shell = [0xbfe6e0, 0xa8ddd8, 0xe4e8ec, 0xf6f2e8][tier - 1];

    var body = pill(0.7, 1.6, 0.66, shell, 0.14);
    at(body, 0, 0.8, 0);
    g.add(body);

    var handle = pill(0.05, 0.34, 0.05, 0xffffff, 0.024);
    at(handle, 0.24, 1.0, 0.34);
    g.add(handle);

    if (tier >= 3) {
      var screen = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), flat(0xbfe8ff));
      screen.position.set(-0.14, 1.24, 0.335);
      g.add(screen);
    }
    return g;
  }

  function buildPlant(tier) {
    var g = new THREE.Group();
    var potCol = [0xf0a882, 0xe8946e, 0xe6e9ee, 0xf5dfa0][tier - 1];

    var pot = cyl(0.19, 0.15, 0.28, potCol, 22);
    at(pot, 0, 0.14, 0);
    g.add(pot);

    var stem = cyl(0.025, 0.03, 0.3, 0x8fc98a, 10);
    at(stem, 0, 0.42, 0);
    g.add(stem);

    var leaves = new THREE.Group();
    var count = 3 + Math.min(tier, 3);
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var leaf = ball(0.16, 0xa8dda0);
      leaf.scale.set(1, 0.62, 1);
      at(leaf, Math.cos(a) * 0.13, 0.6 + (i % 2) * 0.07, Math.sin(a) * 0.13);
      leaves.add(leaf);
    }
    g.add(leaves);
    g.userData.leaves = leaves;

    if (tier >= 4) {
      for (var f = 0; f < 3; f++) {
        var af = (f / 3) * Math.PI * 2;
        var fl = ball(0.05, 0xffc2d4);
        at(fl, Math.cos(af) * 0.14, 0.76, Math.sin(af) * 0.14);
        g.add(fl);
      }
    }
    return g;
  }

  /* ------------------------------------------------------------- shop items */

  function buildRug(tier) {
    var g = new THREE.Group();
    var base = [0xf3ddc4, 0xf0c8c8, 0xc9d6f0][tier - 1];
    var trim = [0xe6c7a4, 0xf5b8c4, 0xa8bde0][tier - 1];

    var outer = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), mat(base));
    outer.scale.y = 0.3;
    g.add(outer);

    var inner = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), mat(trim));
    inner.scale.y = 0.3;
    inner.position.z = 0.004;
    g.add(inner);

    if (tier >= 3) {
      var core = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), mat(base));
      core.scale.y = 0.3;
      core.position.z = 0.008;
      g.add(core);
    }
    g.position.y = 0.16;
    return g;
  }

  function buildLamp(tier) {
    var g = new THREE.Group();
    var poleCol = [0xd9c3a5, 0xe6e9ee, 0xf5dfa0][tier - 1];
    var shadeCol = [0xffeccc, 0xfff6e8, 0xfff0d4][tier - 1];

    var base = cyl(0.19, 0.21, 0.06, poleCol, 22);
    at(base, 0, 0.03, 0);
    g.add(base);

    var pole = cyl(0.03, 0.03, 1.05, poleCol, 12);
    at(pole, 0, 0.56, 0);
    g.add(pole);

    var shade = cyl(0.19, 0.28, 0.28, shadeCol, 24);
    at(shade, 0, 1.2, 0);
    g.add(shade);
    g.userData.shade = shade;

    return g;
  }

  function buildPicture(tier) {
    var g = new THREE.Group();
    var frameCol = [0xe8c39e, 0xffffff, 0xf5dfa0][tier - 1];
    var artCol = [0xa8dda0, 0xbfd8f5, 0xe8c4e0][tier - 1];

    var frame = pill(0.6, 0.48, 0.06, frameCol, 0.025);
    g.add(frame);
    var art = plate(0.46, 0.34, artCol);
    art.position.z = 0.05;
    g.add(art);
    var sun = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), flat(0xffe9a3));
    sun.position.set(0.1, 0.06, 0.056);
    g.add(sun);
    return g;
  }

  function buildShelf(tier) {
    var g = new THREE.Group();
    var wood = [0xe8c39e, 0xdcb08a, 0xe6e9ee][tier - 1];
    var board = pill(1.0, 0.07, 0.24, wood, 0.03);
    g.add(board);

    var colors = [0xf5b8c4, 0x9ec8f0, 0xa8dda0, 0xffd9a0];
    var count = 3 + tier;
    for (var i = 0; i < count; i++) {
      var bk = pill(0.08, 0.24, 0.16, colors[i % colors.length], 0.025);
      at(bk, -0.36 + i * 0.12, 0.16, 0);
      g.add(bk);
    }
    if (tier >= 2) {
      var pot2 = ball(0.1, 0xa8dda0);
      pot2.scale.y = 0.8;
      at(pot2, 0.4, 0.15, 0);
      g.add(pot2);
    }
    return g;
  }

  function buildTv(tier) {
    var g = new THREE.Group();
    var w = [0.85, 1.05, 1.25][tier - 1];
    var h = [0.5, 0.62, 0.74][tier - 1];

    var body = pill(w, h, 0.08, 0xe8eaee, 0.035);
    g.add(body);
    var screen = plate(w - 0.12, h - 0.12, 0x9fd6ee);
    screen.position.z = 0.056;
    g.add(screen);
    g.userData.screen = screen;

    var lit = new THREE.PointLight(0x9fd6ee, 0, 2.4);
    lit.position.set(0, 0, 0.6);
    g.add(lit);
    g.userData.light = lit;
    return g;
  }

  function buildPet(tier) {
    var g = new THREE.Group();
    var fur = [0xe8c9a0, 0xf5e3c8, 0xfffaf2][tier - 1];

    var body = ball(0.17, fur);
    body.scale.set(1.25, 0.95, 1);
    at(body, 0, 0.19, 0);
    g.add(body);

    var head = ball(0.14, fur);
    at(head, 0.19, 0.32, 0);
    g.add(head);
    g.userData.head = head;

    var snout = ball(0.06, 0xfff6ea);
    at(snout, 0.29, 0.29, 0);
    g.add(snout);
    var nose = ball(0.028, 0x6b5548);
    at(nose, 0.34, 0.3, 0);
    g.add(nose);

    [-0.075, 0.075].forEach(function (z) {
      var ear = ball(0.06, fur);
      ear.scale.set(0.62, 1.15, 0.5);
      at(ear, 0.15, 0.43, z);
      g.add(ear);
      var eye = ball(0.022, 0x5c4a3f);
      at(eye, 0.27, 0.35, z * 0.85);
      g.add(eye);
    });

    [[-0.09, -0.08], [-0.09, 0.08], [0.08, -0.08], [0.08, 0.08]].forEach(function (p) {
      var leg = capsule(0.045, 0.06, fur);
      at(leg, p[0], 0.07, p[1]);
      g.add(leg);
    });

    var tail = capsule(0.035, 0.1, fur);
    at(tail, -0.21, 0.28, 0);
    tail.rotation.z = -0.7;
    g.add(tail);
    g.userData.tail = tail;

    if (tier >= 2) {
      var collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 18), mat(0xf5b8c4));
      collar.rotation.y = Math.PI / 2;
      at(collar, 0.13, 0.28, 0);
      g.add(collar);
    }
    if (tier >= 3) {
      var bow = ball(0.05, 0xf5b8c4);
      bow.scale.set(1.5, 0.75, 0.7);
      at(bow, 0.13, 0.43, 0);
      g.add(bow);
    }
    return g;
  }

  /* --------------------------------------------------------------- character
     Chibi proportions: a big round head on a small soft body reads as cute at
     any distance and needs almost no detail to work. */

  function buildCharacter() {
    var g = new THREE.Group();

    var legs = new THREE.Group();
    [-0.1, 0.1].forEach(function (x, i) {
      var pivot = new THREE.Group();
      at(pivot, x, 0.44, 0);
      var leg = capsule(0.085, 0.2, PASTEL.pants);
      at(leg, 0, -0.19, 0);
      pivot.add(leg);
      var shoe = pill(0.17, 0.1, 0.22, PASTEL.shoe, 0.045);
      at(shoe, 0, -0.4, 0.03);
      pivot.add(shoe);
      legs.add(pivot);
      legs.userData["leg" + i] = pivot;
    });
    g.add(legs);
    g.userData.legs = legs;

    var torso = pill(0.44, 0.46, 0.32, PASTEL.shirt, 0.15);
    at(torso, 0, 0.66, 0);
    g.add(torso);
    g.userData.torso = torso;

    var arms = new THREE.Group();
    [-1, 1].forEach(function (side, i) {
      var pivot = new THREE.Group();
      at(pivot, side * 0.23, 0.82, 0);
      var arm = capsule(0.072, 0.16, PASTEL.shirt);
      at(arm, 0, -0.14, 0);
      pivot.add(arm);
      var hand = ball(0.082, PASTEL.skin);
      at(hand, 0, -0.29, 0);
      pivot.add(hand);
      arms.add(pivot);
      arms.userData["arm" + i] = pivot;
    });
    g.add(arms);
    g.userData.arms = arms;

    var headGroup = new THREE.Group();
    at(headGroup, 0, 1.19, 0);

    var head = ball(0.31, PASTEL.skin);
    headGroup.add(head);

    var hair = mesh(
      new THREE.SphereGeometry(0.325, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
      PASTEL.hair
    );
    at(hair, 0, 0.015, 0);
    headGroup.add(hair);

    // Face: two dots, two blushes and a small smile. Nothing more.
    [-1, 1].forEach(function (side) {
      var eye = ball(0.038, 0x4a3b33);
      at(eye, side * 0.115, 0.01, 0.285);
      headGroup.add(eye);
      var shine = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), flat(0xffffff));
      at(shine, side * 0.128, 0.035, 0.317);
      headGroup.add(shine);
      var blush = new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), flat(0xffc2c2, 0.75));
      at(blush, side * 0.2, -0.075, 0.245);
      headGroup.add(blush);
    });

    var smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.011, 8, 14, Math.PI),
      flat(0x4a3b33)
    );
    at(smile, 0, -0.045, 0.295);
    smile.rotation.z = Math.PI;
    headGroup.add(smile);

    g.add(headGroup);
    g.userData.head = headGroup;

    var plateG = new THREE.Group();
    var dish = cyl(0.14, 0.12, 0.035, 0xffffff, 20);
    plateG.add(dish);
    var food = ball(0.055, 0xf5a8a8);
    at(food, 0, 0.05, 0);
    plateG.add(food);
    at(plateG, 0.28, 0.66, 0.16);
    plateG.visible = false;
    g.add(plateG);
    g.userData.plate = plateG;

    return g;
  }

  /* ------------------------------------------------------------- placements */

  // A flat stage: x spreads objects across the room, y lifts wall items, and z
  // only decides what overlaps what. Floor items all stand on y = 0.
  var LAYOUT = {
    bed:     { pos: [-0.95, 0, -0.35],   anchor: [0, 0.95, 0] },
    // The lamp stands in front of the bed rather than beside it: overlapping
    // layers are what give this flat room its sense of depth.
    lamp:    { pos: [-1.5, 0, 0.55],     anchor: [0, 1.45, 0] },
    rug:     { pos: [0.15, 0, 0.2],      anchor: [0, 0.32, 0] },
    pet:     { pos: [0.35, 0, 0.5],      anchor: [0, 0.58, 0] },
    plant:   { pos: [0.78, 0, -0.15],    anchor: [0, 0.9, 0] },
    fridge:  { pos: [1.45, 0, -0.3],     anchor: [0, 1.75, 0] },
    picture: { pos: [-1.3, 2.9, -0.9],   anchor: [0, 0.34, 0] },
    shelf:   { pos: [-1.3, 2.15, -0.9],  anchor: [0, 0.3, 0] },
    tv:      { pos: [1.15, 1.8, -0.9],   anchor: [0, 0.44, 0] },
  };

  var BUILDERS = {
    bed: buildBed, fridge: buildFridge, plant: buildPlant,
    rug: buildRug, lamp: buildLamp, picture: buildPicture,
    shelf: buildShelf, tv: buildTv, pet: buildPet,
  };

  // A flat disc of shade under an object is what sells its weight here; real
  // shadow maps do nothing useful against a straight-on camera.
  function shadowPool(width) {
    var pool = new THREE.Mesh(
      new THREE.CircleGeometry(width * 0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x8a6a4a, transparent: true, opacity: 0.22 })
    );
    pool.scale.y = 0.2;
    pool.position.set(0, 0.03, 0.02);
    return pool;
  }

  function mountSlot(key, tier) {
    var slot = slots[key];
    if (slot && slot.group) {
      root.remove(slot.group);
      disposeTree(slot.group);
    }
    var layout = LAYOUT[key];
    var holder = new THREE.Group();
    holder.position.set(layout.pos[0], layout.pos[1], layout.pos[2]);

    var group = BUILDERS[key](tier);
    // Turning each object off axis is the whole trick: the room stays flat,
    // the things in it do not.
    group.rotation.y = TILT;
    holder.add(group);

    if (layout.pos[1] === 0 && key !== "rug") {
      var bounds = new THREE.Box3().setFromObject(group);
      var size = bounds.getSize(new THREE.Vector3());
      holder.add(shadowPool(Math.max(size.x, 0.4) * 1.1));
    }

    Object.keys(group.userData).forEach(function (k) {
      holder.userData[k] = group.userData[k];
    });
    holder.traverse(function (o) {
      if (o.isMesh) o.userData.pick = key;
    });
    root.add(holder);
    slots[key] = { group: holder, layout: layout, art: group };
    rebuildPicks();
    return holder;
  }

  function disposeTree(obj) {
    obj.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
        else o.material.dispose();
      }
    });
  }

  function rebuildPicks() {
    picks = [];
    root.traverse(function (o) {
      if (o.isMesh && o.userData.pick) picks.push(o);
    });
  }

  /* ------------------------------------------------------- character motion */

  var charState = "idle";
  var charTimer = 0;
  var walkTarget = null;
  var walkPhase = 0;
  var actionTimer = 0;
  var facing = 0;
  var petTarget = null;   // an x position, or null while resting
  var petTimer = 0;

  // Everything happens on one line across the room; only x varies.
  var STAGE_Z = 0.55;
  var SPOTS = {
    centre: new THREE.Vector3(-0.2, 0, STAGE_Z),
    window: new THREE.Vector3(0.35, 0, STAGE_Z),
    fridge: new THREE.Vector3(0.95, 0, STAGE_Z),
    bed: new THREE.Vector3(-1.0, 0, STAGE_Z),
    tv: new THREE.Vector3(0.6, 0, STAGE_Z),
    lamp: new THREE.Vector3(-1.25, 0, STAGE_Z),
  };

  function pickWanderSpot() {
    var keys = Object.keys(SPOTS);
    return SPOTS[keys[Math.floor(Math.random() * keys.length)]].clone();
  }

  function walkTo(vec, then) {
    walkTarget = { pos: vec.clone(), then: then || null };
    charState = "walk";
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) {
    var d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }

  function updateCharacter(dt, t) {
    if (!character) return;
    var legs = character.userData.legs;
    var arms = character.userData.arms;
    var head = character.userData.head;
    var torso = character.userData.torso;

    if (charState === "sleep") {
      var bed = slots.bed;
      var target = new THREE.Vector3(bed.layout.pos[0] + 0.72, 0.82, bed.layout.pos[2] + 0.35);
      character.position.lerp(target, Math.min(1, dt * 4));
      character.rotation.z = lerp(character.rotation.z, Math.PI / 2, Math.min(1, dt * 4));
      character.rotation.y = lerpAngle(character.rotation.y, 0, Math.min(1, dt * 4));
      legs.userData.leg0.rotation.x = 0;
      legs.userData.leg1.rotation.x = 0;
      arms.userData.arm0.rotation.x = 0.15;
      arms.userData.arm1.rotation.x = 0.15;
      torso.position.y = 0.66 + Math.sin(t * 1.6) * 0.012;
      return;
    }

    character.rotation.z = lerp(character.rotation.z, 0, Math.min(1, dt * 6));
    torso.position.y = 0.66 + Math.sin(t * 2.2) * 0.008;
    head.rotation.z = Math.sin(t * 1.7) * 0.035;

    if (charState === "walk" && walkTarget) {
      var to = walkTarget.pos.clone().sub(character.position);
      to.y = 0;
      var dist = to.length();
      if (dist < 0.08) {
        var cb = walkTarget.then;
        walkTarget = null;
        charState = "idle";
        charTimer = 1.6 + Math.random() * 3.5;
        if (cb) cb();
      } else {
        to.normalize();
        character.position.addScaledVector(to, Math.min(dist, dt * 1.1));
        // Lean toward the walk without ever turning away from the player.
        facing = to.x > 0 ? 0.42 : -0.42;
        walkPhase += dt * 8.5;
        var swing = Math.sin(walkPhase) * 0.6;
        legs.userData.leg0.rotation.x = swing;
        legs.userData.leg1.rotation.x = -swing;
        arms.userData.arm0.rotation.x = -swing * 0.7;
        arms.userData.arm1.rotation.x = swing * 0.7;
        // A little hop on each step: the whole body bounces, not just the legs.
        character.position.y = Math.abs(Math.sin(walkPhase)) * 0.045;
      }
    } else {
      character.position.y = lerp(character.position.y, 0, Math.min(1, dt * 8));
      var ease = Math.min(1, dt * 8);
      legs.userData.leg0.rotation.x = lerp(legs.userData.leg0.rotation.x, 0, ease);
      legs.userData.leg1.rotation.x = lerp(legs.userData.leg1.rotation.x, 0, ease);
    }

    if (charState === "idle") {
      var idleSwing = Math.sin(t * 1.5) * 0.09;
      arms.userData.arm0.rotation.x = lerp(arms.userData.arm0.rotation.x, idleSwing, Math.min(1, dt * 5));
      arms.userData.arm1.rotation.x = lerp(arms.userData.arm1.rotation.x, -idleSwing, Math.min(1, dt * 5));
      facing = lerpAngle(facing, 0, Math.min(1, dt * 2));
      charTimer -= dt;
      if (charTimer <= 0) walkTo(pickWanderSpot());
    }

    if (charState === "tap") {
      actionTimer -= dt;
      var punch = Math.sin(Math.max(0, 1 - actionTimer / 0.32) * Math.PI);
      arms.userData.arm1.rotation.x = -punch * 1.6;
      arms.userData.arm0.rotation.x = -punch * 0.5;
      character.position.y = punch * 0.07;
      head.position.y = 1.19 - punch * 0.02;
      if (actionTimer <= 0) {
        charState = "idle";
        charTimer = 2 + Math.random() * 3;
        head.position.y = 1.19;
      }
    }

    if (charState === "eat") {
      actionTimer -= dt;
      character.userData.plate.visible = true;
      var bite = Math.sin(t * 9) * 0.5 + 0.5;
      arms.userData.arm0.rotation.x = -1.0 - bite * 0.5;
      head.rotation.x = bite * 0.2;
      if (actionTimer <= 0) {
        character.userData.plate.visible = false;
        head.rotation.x = 0;
        charState = "idle";
        charTimer = 1.5;
      }
    }

    if (charState === "work") {
      var bob = Math.sin(t * 5) * 0.5 + 0.5;
      arms.userData.arm0.rotation.x = -1.1 - bob * 0.25;
      arms.userData.arm1.rotation.x = -1.1 - (1 - bob) * 0.25;
      torso.position.y = 0.66 + bob * 0.015;
    }

    character.rotation.y = lerpAngle(character.rotation.y, facing, Math.min(1, dt * 7));
  }

  function updatePet(dt, t) {
    if (!slots.pet || !slots.pet.group.visible) return;
    var p = slots.pet.group;
    p.userData.tail.rotation.z = -0.7 + Math.sin(t * 7) * 0.5;
    p.userData.head.position.y = 0.32 + Math.sin(t * 2.4) * 0.014;

    petTimer -= dt;
    if (petTarget === null && petTimer <= 0) {
      petTarget = -0.9 + Math.random() * 1.9;
    }
    if (petTarget !== null) {
      var dx = petTarget - p.position.x;
      if (Math.abs(dx) < 0.05) {
        petTarget = null;
        petTimer = 2 + Math.random() * 4;
        p.position.y = 0;
      } else {
        var step = Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.5);
        p.position.x += step;
        // Face the way it trots, keeping the tilt that gives it depth.
        p.rotation.y = lerp(p.rotation.y, step > 0 ? 0 : Math.PI, Math.min(1, dt * 5));
        p.position.y = Math.abs(Math.sin(t * 9)) * 0.03;
      }
    }
  }

  /* ---------------------------------------------------------------- weather */

  var WEATHER_COLORS = {
    snow: [0xffffff, 0xe4f4ff],
    petal: [0xffc9dd, 0xffb0c8],
    confetti: [0xffd9a0, 0x9ec8f0, 0xf5b8c4, 0xa8dda0],
    leaf: [0xf0c088, 0xe0a070],
    sun: [0xffe9a3, 0xffd98a],
  };

  function setWeather(kind) {
    if (weather) {
      root.remove(weather.group);
      disposeTree(weather.group);
      weather = null;
    }
    if (!kind) return;
    var colors = WEATHER_COLORS[kind] || WEATHER_COLORS.confetti;
    var group = new THREE.Group();
    var bits = [];
    for (var i = 0; i < 34; i++) {
      var color = colors[i % colors.length];
      var geo = kind === "snow"
        ? new THREE.SphereGeometry(0.04, 8, 6)
        : new THREE.SphereGeometry(0.045, 8, 6);
      var m = new THREE.Mesh(geo, flat(color, 0.95));
      if (kind !== "snow") m.scale.set(1.2, 0.5, 1);
      m.position.set(
        -VIEW_W / 2 + Math.random() * VIEW_W,
        Math.random() * 5.5,
        0.7 + Math.random() * 0.5
      );
      m.userData.speed = 0.22 + Math.random() * 0.35;
      m.userData.spin = (Math.random() - 0.5) * 2.5;
      m.userData.sway = Math.random() * Math.PI * 2;
      group.add(m);
      bits.push(m);
    }
    root.add(group);
    weather = { group: group, bits: bits, kind: kind };
  }

  function updateWeather(dt, t) {
    if (!weather) return;
    weather.bits.forEach(function (m) {
      m.position.y -= m.userData.speed * dt;
      m.rotation.z += m.userData.spin * dt;
      m.position.x += Math.sin(t * 1.2 + m.userData.sway) * dt * 0.14;
      if (m.position.y < -1.6) {
        m.position.y = 5.5;
        m.position.x = -VIEW_W / 2 + Math.random() * VIEW_W;
      }
    });
  }

  /* ------------------------------------------------------------- day cycle */

  // `room` tints the unlit wall and floor; the lights handle everything else.
  var DAY = {
    day: {
      sky: 0xbfe8ff, hill: [0xaee0a8, 0x9ad49a], sun: 0xfff6e8, sunI: 1.15,
      hemiI: 1.0, amb: 0xffffff, ambI: 0.85, bg: 0xdfeaf2,
      room: new THREE.Color(1, 1, 1),
    },
    sunset: {
      sky: 0xffc9a0, hill: [0x9ec49a, 0x8ab08a], sun: 0xffd2a8, sunI: 1.0,
      hemiI: 0.8, amb: 0xffe4d4, ambI: 0.7, bg: 0xe8c9b8,
      room: new THREE.Color(0.98, 0.82, 0.7),
    },
    night: {
      sky: 0x3a4470, hill: [0x50608a, 0x45547a], sun: 0xa8b8e8, sunI: 0.35,
      hemiI: 0.45, amb: 0xc4cfea, ambI: 0.55, bg: 0x2a3050,
      room: new THREE.Color(0.42, 0.48, 0.72),
    },
  };
  var dayPhase = "day";

  function setDaylight(phase, angle) {
    dayPhase = phase;
    var p = DAY[phase] || DAY.day;
    windowSky.material.color.set(p.sky);
    windowSun.visible = phase !== "night";
    windowHills.forEach(function (m, i) {
      m.material.color.set(p.hill[i % p.hill.length]);
    });
    sun.color.set(p.sun);
    sun.intensity = p.sunI;
    hemi.intensity = p.hemiI;
    ambient.color.set(p.amb);
    ambient.intensity = p.ambI;
    scene.background.set(p.bg);
    applyRoomLook();

    var a = angle != null ? angle : 0.5;
    sun.position.set(-1.2 + a * 2.4, 2.2 + Math.sin(a * Math.PI) * 2.0, -1.8);
  }

  function setLamp(on) {
    lampLight.intensity = on ? 1.3 : 0;
    if (slots.lamp && slots.lamp.group.userData.shade) {
      slots.lamp.group.userData.shade.material.color.set(on ? 0xfff3d4 : 0xeee6da);
    }
  }

  /* ------------------------------------------------------------------ coin */

  function spawnCoin() {
    if (coin) return null;
    var g = new THREE.Group();
    var disc = cyl(0.16, 0.16, 0.04, 0xffd98a, 24);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    g.position.set(-1.4 + Math.random() * 2.8, 1.4 + Math.random() * 1.6, 0.9);
    g.traverse(function (o) {
      if (o.isMesh) o.userData.pick = "coin";
    });
    root.add(g);
    coin = g;
    rebuildPicks();
    return g;
  }

  function removeCoin() {
    if (!coin) return;
    root.remove(coin);
    disposeTree(coin);
    coin = null;
    rebuildPicks();
  }

  /* ------------------------------------------------------------ preview art */

  var prevRenderer = null, prevScene = null, prevCam = null;

  function previewImage(key, tier, size) {
    size = size || 132;
    if (!BUILDERS[key]) return null;
    if (!prevRenderer) {
      prevRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      prevRenderer.setSize(size, size);
      prevScene = new THREE.Scene();
      prevCam = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
      var l = new THREE.DirectionalLight(0xffffff, 1.4);
      l.position.set(2, 3, 3);
      prevScene.add(l);
      prevScene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 1.4));
    }
    while (prevScene.children.length > 2) prevScene.remove(prevScene.children[2]);

    var g = BUILDERS[key](tier);
    prevScene.add(g);

    var bounds = new THREE.Box3().setFromObject(g);
    var centre = bounds.getCenter(new THREE.Vector3());
    var radius = bounds.getSize(new THREE.Vector3()).length() * 0.5;
    var dist = (radius / Math.sin((prevCam.fov * Math.PI) / 360)) * 1.02;
    prevCam.position.set(centre.x + dist * 0.6, centre.y + dist * 0.4, centre.z + dist * 0.72);
    prevCam.lookAt(centre);

    prevRenderer.render(prevScene, prevCam);
    var url = prevRenderer.domElement.toDataURL("image/png");
    prevScene.remove(g);
    disposeTree(g);
    return url;
  }

  /* ------------------------------------------------------------------- loop */

  var camera2D = { halfW: VIEW_W / 2, halfH: VIEW_W / 2 };

  function tick() {
    requestAnimationFrame(tick);
    if (!ready) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    updateCharacter(dt, t);
    updatePet(dt, t);
    updateWeather(dt, t);

    if (slots.plant && slots.plant.group.userData.leaves) {
      slots.plant.group.userData.leaves.rotation.y = Math.sin(t * 0.8) * 0.09;
    }
    if (coin) {
      coin.rotation.y += dt * 2.4;
      coin.position.y += Math.sin(t * 2.4) * dt * 0.25;
    }
    if (slots.tv && slots.tv.group.visible && slots.tv.group.userData.light) {
      var flick = 0.55 + Math.sin(t * 9) * 0.15;
      slots.tv.group.userData.light.intensity = dayPhase === "night" ? flick * 1.3 : flick * 0.4;
    }

    renderer.render(scene, camera);
  }

  /* -------------------------------------------------------------------- API */

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdfeaf2);
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    camera.position.set(0, 0, 12);

    root = new THREE.Group();
    scene.add(root);

    slots.room = { group: buildRoom() };
    root.add(slots.room.group);

    windowGroup = buildWindow();
    windowGroup.position.set(1.0, 2.85, -0.92);
    root.add(windowGroup);

    hemi = new THREE.HemisphereLight(0xffffff, 0xe8dcc8, 1.0);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    sun = new THREE.DirectionalLight(0xfff6e8, 1.15);
    sun.position.set(-2.6, 4.2, 6);
    scene.add(sun);
    sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0.8, 0);
    scene.add(sunTarget);
    sun.target = sunTarget;

    lampLight = new THREE.PointLight(0xffd9a0, 0, 4.2, 2);
    lampLight.position.set(LAYOUT.lamp.pos[0], 1.2, LAYOUT.lamp.pos[2] + 0.6);
    scene.add(lampLight);

    character = buildCharacter();
    character.position.copy(SPOTS.centre);
    root.add(character);

    Object.keys(BUILDERS).forEach(function (key) {
      mountSlot(key, 1);
      slots[key].group.visible = false;
    });

    ready = true;
    resize(canvas.clientWidth || 390, canvas.clientHeight || 500);
    tick();
    return true;
  }

  function resize(w, h) {
    if (!ready) return;
    renderer.setSize(w, h, false);

    var aspect = w / Math.max(h, 1);
    var halfW = VIEW_W / 2;
    var halfH = halfW / aspect;
    camera2D.halfW = halfW;
    camera2D.halfH = halfH;

    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    // Sit the camera so the wall/floor seam lands FLOOR_FRAC up from the bottom.
    camera.position.y = halfH * (1 - 2 * FLOOR_FRAC);
    camera.updateProjectionMatrix();
  }

  function setFurniture(key, level, tier) {
    if (!ready) return;
    if (tiers[key] !== tier) {
      mountSlot(key, tier);
      tiers[key] = tier;
    }
    slots[key].group.visible = true;
  }

  function setItem(key, level, tier) {
    if (!ready) return;
    if (key === "room") {
      applyRoomTier(tier);
      return;
    }
    if (!BUILDERS[key]) return;
    var owned = level > 0;
    if (owned && tiers[key] !== tier) {
      mountSlot(key, tier);
      tiers[key] = tier;
    }
    if (slots[key]) slots[key].group.visible = owned;
    if (key === "lamp" && !owned) setLamp(false);
  }

  function setSleeping(on) {
    if (!ready) return;
    if (on) {
      charState = "sleep";
      walkTarget = null;
    } else if (charState === "sleep") {
      charState = "idle";
      charTimer = 0.4;
      character.position.set(SPOTS.bed.x, 0, SPOTS.bed.z);
      character.rotation.z = 0;
    }
  }

  function setWorking(on) {
    if (!ready || charState === "sleep") return;
    if (on && charState !== "work") {
      walkTo(SPOTS.tv.clone(), function () {
        charState = "work";
      });
    } else if (!on && charState === "work") {
      charState = "idle";
      charTimer = 1;
    }
  }

  function action(kind) {
    if (!ready || charState === "sleep") return;
    if (kind === "tap") {
      charState = "tap";
      actionTimer = 0.32;
    } else if (kind === "eat") {
      walkTo(SPOTS.fridge.clone(), function () {
        charState = "eat";
        actionTimer = 1.6;
      });
    }
  }

  var _v = new THREE.Vector3();
  function screenPos(key, w, h) {
    if (!ready || !slots[key] || !slots[key].group.visible) return null;
    var layout = LAYOUT[key];
    if (!layout) return null;
    _v.set(
      layout.pos[0] + layout.anchor[0],
      layout.pos[1] + layout.anchor[1],
      layout.pos[2] + layout.anchor[2]
    );
    _v.project(camera);
    if (_v.z > 1 || _v.x < -1.05 || _v.x > 1.05 || _v.y < -1.05 || _v.y > 1.05) return null;
    return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h };
  }

  function pick(nx, ny) {
    if (!ready) return null;
    pointer.set(nx * 2 - 1, -(ny * 2 - 1));
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(picks, false);
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].object.userData.pick) return hits[i].object.userData.pick;
    }
    return null;
  }

  // The room is flat, so there is nothing to orbit. These stay as no-ops so
  // game.js keeps one code path for pointer handling.
  function dragStart() {}
  function dragMove() { return false; }
  function dragEnd() {}

  return {
    init: init,
    resize: resize,
    setFurniture: setFurniture,
    setItem: setItem,
    setRoomTier: function (t) { if (ready) applyRoomTier(t); },
    setSleeping: setSleeping,
    setWorking: setWorking,
    setDaylight: function (phase, angle) { if (ready) setDaylight(phase, angle); },
    setLamp: function (on) { if (ready) setLamp(on); },
    setWeather: function (kind) { if (ready) setWeather(kind); },
    action: action,
    spawnCoin: spawnCoin,
    removeCoin: removeCoin,
    hasCoin: function () { return !!coin; },
    previewImage: previewImage,
    screenPos: screenPos,
    pick: pick,
    dragStart: dragStart,
    dragMove: dragMove,
    dragEnd: dragEnd,
    isReady: function () { return ready; },
  };
})();
