(function () {
  "use strict";

  var SAVE_KEY = "tap-life-save-v1";

  var TAP_ENERGY_COST = 2;
  var TAP_XP_GAIN = 1;
  var SLEEP_ENERGY_PER_TICK = 6;
  var SLEEP_HUNGER_DRAIN_PER_TICK = 1;
  var PASSIVE_TICK_MS = 3000;
  var FOOD_COST = 200;
  var FOOD_HUNGER_GAIN = 40;

  var TAP_HINT_IDLE_MS = 4.5 * 60 * 1000;
  var OFFLINE_EARN_RATE = 0.05;
  var OFFLINE_MIN_SECONDS = 60;
  var OFFLINE_MAX_SECONDS = 8 * 3600;

  var FURNITURE_CONFIG = {
    bed: { name: "Yatak", baseCost: 500, growth: 1.6, bonus: 0.08, maxLevel: 20 },
    fridge: { name: "Buzdolabı", baseCost: 500, growth: 1.6, bonus: 0.08, maxLevel: 20 },
    plant: { name: "Saksı", baseCost: 250, growth: 1.5, bonus: 0.04, maxLevel: 20 },
  };

  var defaultState = {
    money: 0,
    level: 1,
    xp: 0,
    day: 1,
    health: 100,
    energy: 100,
    hunger: 100,
    isSleeping: false,
    furniture: { bed: 1, fridge: 1, plant: 1 },
    items: { rug: 0, lamp: 0, picture: 0, shelf: 0, tv: 0, room: 0 },
    taps: 0,
    lastSeen: Date.now(),
  };

  var SKY_CYCLE_MS = 6 * 60 * 1000;
  var FURNITURE_TIER_NAMES = ["", "Klasik", "Kaliteli", "Modern", "Lüks"];

  // Room decor: level 0 = not owned. Levels 1-3 basic art, 4-6 standard, 7-9 modern/luxury.
  var SHOP_ITEMS = {
    rug: { name: "Halı", icon: "🧶", baseCost: 2000, growth: 1.5, bonus: 0.02, maxLevel: 9 },
    lamp: { name: "Lambader", icon: "💡", baseCost: 3500, growth: 1.5, bonus: 0.03, maxLevel: 9 },
    picture: { name: "Tablo", icon: "🖼️", baseCost: 5000, growth: 1.5, bonus: 0.03, maxLevel: 9 },
    shelf: { name: "Kitaplık", icon: "📚", baseCost: 8000, growth: 1.5, bonus: 0.04, maxLevel: 9 },
    tv: { name: "Televizyon", icon: "📺", baseCost: 12000, growth: 1.5, bonus: 0.05, maxLevel: 9 },
    room: { name: "Oda (duvar + zemin)", icon: "🏠", baseCost: 15000, growth: 1.5, bonus: 0.04, maxLevel: 9 },
  };
  var ITEM_TIER_NAMES = ["", "Basit", "Standart", "Modern"];

  function itemTier(level) {
    if (level >= 7) return 3;
    if (level >= 4) return 2;
    return 1;
  }

  function itemCost(key) {
    var cfg = SHOP_ITEMS[key];
    return Math.round(cfg.baseCost * Math.pow(cfg.growth, state.items[key]));
  }

  var state = loadState();

  var els = {
    moneyText: document.getElementById("moneyText"),
    levelBadge: document.getElementById("levelBadge"),
    dayText: document.getElementById("dayText"),
    healthFill: document.getElementById("healthFill"),
    energyFill: document.getElementById("energyFill"),
    hungerFill: document.getElementById("hungerFill"),
    tapBtn: document.getElementById("tapBtn"),
    tapLabel: document.getElementById("tapLabel"),
    bedBtn: document.getElementById("bedBtn"),
    zzz: document.getElementById("zzz"),
    fridgeBtn: document.getElementById("fridgeBtn"),
    floaters: document.getElementById("floaters"),
    toast: document.getElementById("toast"),
    scene: document.getElementById("scene"),
    questBtn: document.getElementById("questBtn"),
    shop: document.getElementById("shop"),
    shopList: document.getElementById("shopList"),
    shopSub: document.getElementById("shopSub"),
    shopClose: document.getElementById("shopClose"),
    phone: document.querySelector(".phone"),
    avatar: document.querySelector(".avatar"),
    moneyPill: document.querySelector(".money-pill"),
    banner: document.getElementById("banner"),
    xpFill: document.getElementById("xpFill"),
    xpText: document.getElementById("xpText"),
    character: document.getElementById("character"),
    windowEl: document.getElementById("window"),
    nightOverlay: document.getElementById("nightOverlay"),
    lampLight: document.getElementById("lampLight"),
    fxLayer: document.getElementById("fxLayer"),
    rewardCard: document.getElementById("rewardCard"),
    rewardIcon: document.getElementById("rewardIcon"),
    rewardTitle: document.getElementById("rewardTitle"),
    rewardSub: document.getElementById("rewardSub"),
    plantBtn: document.getElementById("plantBtn"),
    bedUpgradeBtn: document.getElementById("bedUpgradeBtn"),
    bedCost: document.getElementById("bedCost"),
    fridgeUpgradeBtn: document.getElementById("fridgeUpgradeBtn"),
    fridgeCost: document.getElementById("fridgeCost"),
    plantUpgradeBtn: document.getElementById("plantUpgradeBtn"),
    plantCost: document.getElementById("plantCost"),

    woodStop1: document.getElementById("woodStop1"),
    woodStop2: document.getElementById("woodStop2"),
    blanketStop1: document.getElementById("blanketStop1"),
    blanketStop2: document.getElementById("blanketStop2"),
    bedTrim: document.getElementById("bedTrim"),
    bedKnob1: document.getElementById("bedKnob1"),
    bedKnob2: document.getElementById("bedKnob2"),
    bedKnob3: document.getElementById("bedKnob3"),

    fridgeStop1: document.getElementById("fridgeStop1"),
    fridgeStop2: document.getElementById("fridgeStop2"),
    fridgeStop3: document.getElementById("fridgeStop3"),
    fridgeHandle1: document.getElementById("fridgeHandle1"),
    fridgeHandle2: document.getElementById("fridgeHandle2"),
    fridgeBodyStroke: document.getElementById("fridgeBodyStroke"),
    fridgeDivider: document.getElementById("fridgeDivider"),

    plantLeaf1: document.getElementById("plantLeaf1"),
    plantLeaf2: document.getElementById("plantLeaf2"),
    plantLeaf3: document.getElementById("plantLeaf3"),
    plantLeaf4: document.getElementById("plantLeaf4"),
    plantLeaf5: document.getElementById("plantLeaf5"),
    plantPotBody: document.getElementById("plantPotBody"),
    plantPotRim: document.getElementById("plantPotRim"),
    plantPotBodyModern: document.getElementById("plantPotBodyModern"),
    plantPotRimModern: document.getElementById("plantPotRimModern"),
  };

  var floaterStack = [];

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return Object.assign({}, defaultState);
      var parsed = JSON.parse(raw);
      var merged = Object.assign({}, defaultState, parsed);
      // Migrate old saves: decor used to be owned/not-owned booleans, now it is a level.
      var items = Object.assign({}, defaultState.items);
      Object.keys(items).forEach(function (key) {
        var v = parsed.items ? parsed.items[key] : 0;
        items[key] = v === true ? 1 : typeof v === "number" ? v : 0;
      });
      merged.items = items;
      return merged;
    } catch (e) {
      return Object.assign({}, defaultState);
    }
  }

  function saveState() {
    try {
      state.lastSeen = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function homeMultiplier() {
    var mult = 1;
    Object.keys(FURNITURE_CONFIG).forEach(function (key) {
      mult += FURNITURE_CONFIG[key].bonus * (state.furniture[key] - 1);
    });
    Object.keys(SHOP_ITEMS).forEach(function (key) {
      mult += SHOP_ITEMS[key].bonus * state.items[key];
    });
    return mult;
  }

  function tapValue() {
    var base = 100 + (state.level - 1) * 20;
    return Math.round(base * homeMultiplier());
  }

  function offlineRatePerSecond() {
    return tapValue() * OFFLINE_EARN_RATE;
  }

  function furnitureCost(key) {
    var cfg = FURNITURE_CONFIG[key];
    var level = state.furniture[key];
    return Math.round(cfg.baseCost * Math.pow(cfg.growth, level - 1));
  }

  function formatMoney(n) {
    return "$" + Math.floor(n).toLocaleString("en-US");
  }

  function formatDuration(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (h > 0) return m > 0 ? h + "s " + m + "d" : h + "s";
    return Math.max(m, 1) + "d";
  }

  function xpForNextLevel() {
    return state.level * 20;
  }

  var toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove("show");
    }, 1500);
  }

  function updateFloaterPositions() {
    floaterStack.forEach(function (item, idx) {
      item.el.style.bottom = idx * 34 + "px";
      item.el.style.opacity = idx === 0 ? "1" : idx === 1 ? "0.6" : "0.3";
      item.el.style.transform = "translate(-50%, 0) scale(" + (1 - idx * 0.08) + ")";
    });
  }

  function pushPill(text, bad) {
    var el = document.createElement("div");
    el.className = "floater-pill" + (bad ? " bad" : "");
    el.textContent = text;
    el.style.bottom = "-40px";
    el.style.opacity = "0";
    els.floaters.appendChild(el);

    floaterStack.unshift({ el: el });
    while (floaterStack.length > 3) {
      var old = floaterStack.pop();
      old.el.remove();
    }
    requestAnimationFrame(updateFloaterPositions);

    setTimeout(function () {
      var idx = floaterStack.findIndex(function (item) {
        return item.el === el;
      });
      if (idx !== -1) floaterStack.splice(idx, 1);
      el.remove();
      updateFloaterPositions();
    }, 1600);
  }

  function fillClass(pct) {
    if (pct <= 20) return "low";
    if (pct <= 50) return "mid";
    return "";
  }

  var UPGRADE_ELS = {
    bed: { btn: "bedUpgradeBtn", cost: "bedCost", item: "bedBtn" },
    fridge: { btn: "fridgeUpgradeBtn", cost: "fridgeCost", item: "fridgeBtn" },
    plant: { btn: "plantUpgradeBtn", cost: "plantCost", item: "plantBtn" },
  };

  var TIER_PALETTES = {
    bed: [
      { wood: ["#b97d42", "#7a4a22"], knob: "#6f4220", blanket: ["#66c4ff", "#2f8fe6"], trim: "#ffcf33" },
      { wood: ["#c98f52", "#8a5a2c"], knob: "#8a5a2c", blanket: ["#7ed6a0", "#2f9e5c"], trim: "#ffd54f" },
      { wood: ["#d9a860", "#8a5a2c"], knob: "#4a2e12", blanket: ["#b48be0", "#7a4fc9"], trim: "#ffe066" },
      { wood: ["#f7d774", "#c9a227"], knob: "#c9a227", blanket: ["#2ecc71", "#1c8f4e"], trim: "#fff2b0" },
    ],
    fridge: [
      { body: ["#b6f3ec", "#7fe0d8", "#4fc4ba"], handle: "#2c6f6a" },
      { body: ["#bfe9ff", "#8fd0f5", "#5aa9d9"], handle: "#2b6f8f" },
      { body: ["#e6d8ff", "#c6a8f0", "#9b6fd6"], handle: "#5a3a8f" },
      { body: ["#fff2c2", "#ffd75e", "#e0ab1f"], handle: "#8a6a10" },
    ],
    plant: [
      { pot: ["#c9752a", "#8f4a1a"], leaf: ["#3fae52", "#57cc6a", "#7fe08c"] },
      { pot: ["#c97a2b", "#9c5518"], leaf: ["#43b85a", "#57cf6c", "#78e089"] },
      { pot: ["#8f8f96", "#5c5c63"], leaf: ["#57cf6c", "#78e089", "#9df0ac"] },
      { pot: ["#f7d774", "#c9a227"], leaf: ["#7be08c", "#9df0ac", "#c2ffce"] },
    ],
  };

  function furnitureTier(level) {
    if (level >= 15) return 4;
    if (level >= 10) return 3;
    if (level >= 5) return 2;
    return 1;
  }

  function applyFurnitureVisual(key, tier) {
    var palette = TIER_PALETTES[key][tier - 1];
    if (key === "bed") {
      els.woodStop1.setAttribute("stop-color", palette.wood[0]);
      els.woodStop2.setAttribute("stop-color", palette.wood[1]);
      els.blanketStop1.setAttribute("stop-color", palette.blanket[0]);
      els.blanketStop2.setAttribute("stop-color", palette.blanket[1]);
      els.bedTrim.setAttribute("fill", palette.trim);
      els.bedKnob1.setAttribute("fill", palette.knob);
      els.bedKnob2.setAttribute("fill", palette.knob);
      els.bedKnob3.setAttribute("fill", palette.knob);
    } else if (key === "fridge") {
      els.fridgeStop1.setAttribute("stop-color", palette.body[0]);
      els.fridgeStop2.setAttribute("stop-color", palette.body[1]);
      els.fridgeStop3.setAttribute("stop-color", palette.body[2]);
      els.fridgeHandle1.setAttribute("fill", palette.handle);
      els.fridgeHandle2.setAttribute("fill", palette.handle);
      els.fridgeBodyStroke.setAttribute("stroke", palette.handle);
      els.fridgeDivider.setAttribute("stroke", palette.handle);
    } else {
      els.plantLeaf1.setAttribute("fill", palette.leaf[0]);
      els.plantLeaf2.setAttribute("fill", palette.leaf[1]);
      els.plantLeaf3.setAttribute("fill", palette.leaf[2]);
      els.plantLeaf4.setAttribute("fill", palette.leaf[2]);
      els.plantLeaf5.setAttribute("fill", palette.leaf[1]);
      els.plantPotBody.setAttribute("fill", palette.pot[0]);
      els.plantPotRim.setAttribute("fill", palette.pot[1]);
      els.plantPotBodyModern.setAttribute("fill", palette.pot[0]);
      els.plantPotRimModern.setAttribute("fill", palette.pot[1]);
    }
  }

  function renderUpgradeBadges() {
    Object.keys(FURNITURE_CONFIG).forEach(function (key) {
      var cfg = FURNITURE_CONFIG[key];
      var level = state.furniture[key];
      var refs = UPGRADE_ELS[key];
      var maxed = level >= cfg.maxLevel;

      els[refs.cost].textContent = maxed ? "MAX" : formatMoney(furnitureCost(key));
      els[refs.btn].classList.toggle("maxed", maxed);
      els[refs.item].classList.toggle("is-max", maxed);

      var tier = furnitureTier(level);
      els[refs.item].classList.remove("tier-1", "tier-2", "tier-3", "tier-4");
      els[refs.item].classList.add("tier-" + tier);
      applyFurnitureVisual(key, tier);
    });
  }

  function render() {
    els.moneyText.textContent = formatMoney(state.money);
    els.levelBadge.textContent = state.level;
    els.dayText.textContent = "Gün " + state.day;

    els.healthFill.style.width = state.health + "%";
    els.healthFill.className = "bar-fill health " + fillClass(state.health);

    els.energyFill.style.width = state.energy + "%";
    els.energyFill.className = "bar-fill energy " + fillClass(state.energy);

    els.hungerFill.style.width = state.hunger + "%";
    els.hungerFill.className = "bar-fill hunger " + fillClass(state.hunger);

    els.tapBtn.classList.toggle("tired", state.energy <= 0 && !state.isSleeping);
    els.tapBtn.classList.toggle("sleeping", state.isSleeping);
    els.tapLabel.textContent = state.isSleeping ? "..." : "DOKUN";

    els.zzz.classList.toggle("show", state.isSleeping);

    renderUpgradeBadges();
    renderRoomItems();
    renderAmbient();
    renderCharacter();
    renderBanner();
    renderAvatar();
  }

  function renderRoomItems() {
    var nodes = document.querySelectorAll(".room-item");
    nodes.forEach(function (node) {
      var key = node.getAttribute("data-item");
      var level = state.items[key];
      var cfg = SHOP_ITEMS[key];
      var maxed = level >= cfg.maxLevel;

      node.classList.toggle("owned", level > 0);
      node.classList.toggle("is-max", maxed);
      node.classList.remove("tier-1", "tier-2", "tier-3");
      node.classList.add("tier-" + itemTier(level));

      document.getElementById(key + "Cost").textContent = maxed ? "MAX" : formatMoney(itemCost(key));
      document.getElementById(key + "UpgradeBtn").classList.toggle("maxed", maxed);
    });
  }

  function renderShop() {
    els.shopSub.textContent =
      "Ev çarpanı ×" + homeMultiplier().toFixed(2) + " · Tık başına " + formatMoney(tapValue());
    els.shopList.textContent = "";

    Object.keys(SHOP_ITEMS).forEach(function (key) {
      var item = SHOP_ITEMS[key];
      var level = state.items[key];
      var maxed = level >= item.maxLevel;
      var cost = itemCost(key);

      var row = document.createElement("div");
      row.className = "shop-row";

      var icon = document.createElement("div");
      icon.className = "shop-icon";
      icon.textContent = item.icon;

      var info = document.createElement("div");
      info.className = "shop-info";
      var name = document.createElement("div");
      name.className = "shop-name";
      name.textContent =
        item.name + (level > 0 ? " · " + ITEM_TIER_NAMES[itemTier(level)] + " (" + level + "/" + item.maxLevel + ")" : "");
      var bonus = document.createElement("div");
      bonus.className = "shop-bonus";
      bonus.textContent =
        level > 0
          ? "Şu an +%" + Math.round(item.bonus * level * 100) + " · her seviye +%" + Math.round(item.bonus * 100)
          : "Her seviye +%" + Math.round(item.bonus * 100) + " kazanç (tık + çevrimdışı)";
      info.appendChild(name);
      info.appendChild(bonus);

      var buy = document.createElement("button");
      buy.className = "shop-buy" + (maxed ? " owned" : state.money < cost ? " poor" : "");
      buy.textContent = maxed ? "MAX ✓" : (level > 0 ? "Yükselt " : "Satın Al ") + formatMoney(cost);
      buy.disabled = maxed;
      buy.addEventListener("click", function () {
        upgradeItem(key);
      });

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(buy);
      els.shopList.appendChild(row);
    });
  }

  function upgradeItem(key) {
    var item = SHOP_ITEMS[key];
    var level = state.items[key];
    if (level >= item.maxLevel) {
      showToast(item.name + " zaten maksimum seviyede!");
      return;
    }
    var cost = itemCost(key);
    if (state.money < cost) {
      showToast("Yetersiz para! Gerekli: " + formatMoney(cost));
      return;
    }
    state.money -= cost;
    state.items[key] = level + 1;

    var tierBefore = itemTier(level);
    var tierAfter = itemTier(level + 1);
    if (level === 0) {
      celebrate(item.icon, item.name + " alındı!", "+%" + Math.round(item.bonus * 100) + " kazanç");
    } else if (tierAfter !== tierBefore) {
      celebrate(item.icon, item.name + " yenilendi!", ITEM_TIER_NAMES[tierAfter] + " model · kazanç arttı");
    } else {
      showToast(item.name + " seviye " + (level + 1) + "! Kazanç arttı.");
    }
    render();
    if (els.shop.classList.contains("open")) renderShop();
    saveState();
  }

  function openShop() {
    renderShop();
    els.shop.classList.add("open");
  }

  function closeShop() {
    els.shop.classList.remove("open");
  }

  /* ---------- Ambient: window sky, night tint, room tier ---------- */
  function skyPhase() {
    if (state.isSleeping) return "night";
    var t = (Date.now() % SKY_CYCLE_MS) / SKY_CYCLE_MS;
    if (t < 0.45) return "day";
    if (t < 0.6) return "sunset";
    if (t < 0.9) return "night";
    return "sunset";
  }

  function renderAmbient() {
    var phase = skyPhase();
    els.windowEl.classList.remove("day", "sunset", "night");
    els.windowEl.classList.add(phase);
    els.nightOverlay.style.background = phase === "sunset" ? "#c8562a" : "#1b2350";
    els.nightOverlay.style.opacity =
      phase === "night" ? (state.isSleeping ? "0.5" : "0.4") : phase === "sunset" ? "0.12" : "0";
    els.lampLight.classList.toggle("on", phase === "night" && state.items.lamp > 0);

    els.scene.classList.remove("room-t1", "room-t2", "room-t3");
    els.scene.classList.add("room-t" + itemTier(state.items.room));
  }

  /* ---------- Character ---------- */
  var happyTimer = null;

  function renderCharacter() {
    els.character.classList.toggle("sleeping", state.isSleeping);
  }

  function characterBounce() {
    var c = els.character;
    c.classList.remove("bounce");
    void c.offsetWidth;
    c.classList.add("bounce");
    c.classList.add("happy");
    clearTimeout(happyTimer);
    happyTimer = setTimeout(function () {
      c.classList.remove("happy");
    }, 600);
  }

  function characterEat() {
    var c = els.character;
    c.classList.add("eating");
    setTimeout(function () {
      c.classList.add("happy");
    }, 700);
    setTimeout(function () {
      c.classList.remove("eating");
    }, 1500);
    setTimeout(function () {
      c.classList.remove("happy");
    }, 2300);
  }

  els.character.addEventListener("animationend", function (e) {
    if (e.animationName === "bounce") els.character.classList.remove("bounce");
  });

  /* ---------- Money flying to the wallet ---------- */
  var lastTapPoint = null;

  function flyCoin() {
    if (!lastTapPoint) return;
    var phoneRect = els.phone.getBoundingClientRect();
    var target = els.moneyText.getBoundingClientRect();
    var coin = document.createElement("span");
    coin.className = "coin-fly";
    coin.textContent = "💰";
    coin.style.left = lastTapPoint.x - phoneRect.left - 9 + "px";
    coin.style.top = lastTapPoint.y - phoneRect.top - 9 + "px";
    els.phone.appendChild(coin);
    var dx = target.left + target.width / 2 - lastTapPoint.x;
    var dy = target.top + target.height / 2 - lastTapPoint.y;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        coin.style.transform = "translate(" + dx + "px, " + dy + "px) scale(0.5)";
        coin.style.opacity = "0.2";
      });
    });
    setTimeout(function () {
      coin.remove();
      els.moneyPill.classList.remove("pop");
      void els.moneyPill.offsetWidth;
      els.moneyPill.classList.add("pop");
    }, 760);
  }

  /* ---------- Celebration ---------- */
  var rewardTimer = null;
  var CONFETTI_COLORS = ["#e0574f", "#ffd54f", "#57cc6a", "#4f8ef0", "#b48be0", "#f2a25b"];

  function celebrate(icon, title, sub) {
    for (var i = 0; i < 24; i++) {
      var p = document.createElement("span");
      p.className = "confetti";
      var angle = Math.random() * Math.PI * 2;
      var dist = 80 + Math.random() * 140;
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + 120 + "px");
      p.style.setProperty("--rot", Math.round(Math.random() * 720 - 360) + "deg");
      p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      els.fxLayer.appendChild(p);
      (function (node) {
        setTimeout(function () {
          node.remove();
        }, 1000);
      })(p);
    }
    els.rewardIcon.textContent = icon;
    els.rewardTitle.textContent = title;
    els.rewardSub.textContent = sub;
    els.rewardCard.classList.add("show");
    clearTimeout(rewardTimer);
    rewardTimer = setTimeout(function () {
      els.rewardCard.classList.remove("show");
    }, 1700);
  }

  /* ---------- Banner (tutorial -> XP bar) and avatar ---------- */
  function renderBanner() {
    var done = state.taps >= 10;
    els.banner.classList.toggle("progress", done);
    if (!done) return;
    var need = xpForNextLevel();
    els.xpFill.style.width = Math.min(100, (state.xp / need) * 100) + "%";
    els.xpText.textContent = "Seviye " + state.level + " · " + state.xp + "/" + need + " XP";
  }

  function renderAvatar() {
    var mult = homeMultiplier();
    els.avatar.textContent = mult < 1.5 ? "🧑" : mult < 2.5 ? "🧑‍💼" : mult < 4 ? "🤵" : "👑";
  }

  function levelUpIfReady() {
    var leveled = false;
    while (state.xp >= xpForNextLevel()) {
      state.xp -= xpForNextLevel();
      state.level += 1;
      state.health = clamp(state.health + 15, 0, 100);
      leveled = true;
    }
    if (leveled) showToast("Seviye atladın! Seviye " + state.level);
  }

  function checkCollapse() {
    if (state.health <= 0) {
      state.health = 60;
      state.energy = 60;
      state.hunger = 60;
      state.isSleeping = false;
      showToast("Bayıldın! Biraz dinlendirildin.");
    }
  }

  function onTap() {
    if (state.isSleeping) return;

    if (state.energy <= 0) {
      showToast("Çok yorgunsun! Yatakta uyu.");
      render();
      return;
    }

    var earned = tapValue();
    state.money += earned;
    state.energy = clamp(state.energy - TAP_ENERGY_COST, 0, 100);
    state.xp += TAP_XP_GAIN;
    state.taps += 1;

    pushPill("+ $" + earned + " 💰", false);
    characterBounce();
    flyCoin();
    levelUpIfReady();
    render();
    saveState();
  }

  function onBed() {
    if (state.energy >= 100 && !state.isSleeping) {
      showToast("Zaten dinlenmişsin!");
      return;
    }
    state.isSleeping = !state.isSleeping;
    if (state.isSleeping) {
      showToast("Uyuyorsun... Zzz");
    } else {
      showToast("Uyandın!");
    }
    render();
    saveState();
  }

  function onFridge() {
    if (state.isSleeping) {
      showToast("Önce uyanmalısın.");
      return;
    }
    if (state.hunger >= 100) {
      showToast("Aç değilsin.");
      return;
    }
    if (state.money < FOOD_COST) {
      showToast("Yemek için yeterli paran yok.");
      return;
    }
    state.money -= FOOD_COST;
    state.hunger = clamp(state.hunger + FOOD_HUNGER_GAIN, 0, 100);
    pushPill("+" + FOOD_HUNGER_GAIN + " 🍗", false);
    showToast("Karnını doyurdun!");
    characterEat();
    render();
    saveState();
  }

  function onUpgrade(key) {
    var cfg = FURNITURE_CONFIG[key];
    var level = state.furniture[key];

    if (level >= cfg.maxLevel) {
      showToast(cfg.name + " zaten maksimum seviyede!");
      return;
    }

    var cost = furnitureCost(key);
    if (state.money < cost) {
      showToast("Yetersiz para! Gerekli: " + formatMoney(cost));
      return;
    }

    state.money -= cost;
    state.furniture[key] += 1;
    var tierBefore = furnitureTier(level);
    var tierAfter = furnitureTier(level + 1);
    if (tierAfter !== tierBefore) {
      celebrate("✨", cfg.name + " yenilendi!", FURNITURE_TIER_NAMES[tierAfter] + " model · kazanç arttı");
    } else {
      showToast(cfg.name + " seviye " + state.furniture[key] + "! Kazanç arttı.");
    }
    render();
    saveState();
  }

  function passiveTick() {
    if (state.isSleeping) {
      var wasFull = state.energy >= 100;
      state.energy = clamp(state.energy + SLEEP_ENERGY_PER_TICK, 0, 100);
      state.hunger = clamp(state.hunger - SLEEP_HUNGER_DRAIN_PER_TICK, 0, 100);
      if (state.energy >= 100 && !wasFull) {
        state.isSleeping = false;
        state.day += 1;
        showToast("Günaydın! Gün " + state.day);
      }
    } else {
      state.hunger = clamp(state.hunger - 1, 0, 100);
      state.energy = clamp(state.energy - 1, 0, 100);
    }

    if (state.hunger <= 0 || state.energy <= 0) {
      state.health = clamp(state.health - 3, 0, 100);
    } else if (state.hunger > 40 && state.energy > 40) {
      state.health = clamp(state.health + 1, 0, 100);
    }

    checkCollapse();
    if (lastTapAt && Date.now() - lastTapAt > TAP_HINT_IDLE_MS) showTapHint(true);
    render();
    saveState();
  }

  var lastTapAt = 0;

  function showTapHint(show) {
    els.tapBtn.classList.toggle("hint-hidden", !show);
  }

  function spawnRipple(x, y) {
    var el = document.createElement("div");
    el.className = "tap-ripple";
    el.style.left = x + "px";
    el.style.top = y + "px";
    els.scene.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 500);
  }

  // Tapping anywhere on the room earns money; furniture, badges and icons keep their own actions.
  els.scene.addEventListener("click", function (e) {
    if (e.target.closest(".furniture, .upgrade-badge, .quest-icon, .room-item")) return;
    var rect = els.scene.getBoundingClientRect();
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top);
    lastTapPoint = { x: e.clientX, y: e.clientY };
    lastTapAt = Date.now();
    showTapHint(false);
    onTap();
  });

  els.bedBtn.addEventListener("click", onBed);
  els.fridgeBtn.addEventListener("click", onFridge);
  els.questBtn.addEventListener("click", function () {
    showToast("Görevler yakında geliyor!");
  });

  Object.keys(UPGRADE_ELS).forEach(function (key) {
    els[UPGRADE_ELS[key].btn].addEventListener("click", function (e) {
      e.stopPropagation();
      onUpgrade(key);
    });
  });

  Object.keys(SHOP_ITEMS).forEach(function (key) {
    var badge = document.getElementById(key + "UpgradeBtn");
    if (!badge) return; // items without room art (e.g. the room itself) are upgraded from the Market only
    badge.addEventListener("click", function (e) {
      e.stopPropagation();
      upgradeItem(key);
    });
  });

  var navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-nav");
      navButtons.forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      if (target === "home") {
        closeShop();
        return;
      }
      if (target === "shop") {
        openShop();
        return;
      }
      closeShop();
      var labels = {
        school: "Eğitim",
        job: "Kariyer",
        bank: "Banka",
        world: "Dünya",
      };
      showToast((labels[target] || "Bu bölüm") + " yakında geliyor!");
    });
  });

  els.shopClose.addEventListener("click", function () {
    closeShop();
    navButtons.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === "home");
    });
  });
  els.shop.addEventListener("click", function (e) {
    if (e.target === els.shop) els.shopClose.click();
  });

  setInterval(function () {
    passiveTick();
  }, PASSIVE_TICK_MS);

  (function grantOfflineEarnings() {
    var elapsedSec = Math.floor((Date.now() - (state.lastSeen || Date.now())) / 1000);
    var countedSec = Math.min(Math.max(elapsedSec, 0), OFFLINE_MAX_SECONDS);
    if (countedSec < OFFLINE_MIN_SECONDS) return;

    var earnings = Math.round(offlineRatePerSecond() * countedSec);
    if (earnings <= 0) return;

    state.money += earnings;
    showToast(
      formatDuration(countedSec) + " yoktun, " + formatMoney(earnings) + " kazandın!"
    );
    saveState();
  })();

  render();
})();
