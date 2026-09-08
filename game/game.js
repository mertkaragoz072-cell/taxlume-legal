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
    items: { rug: 0, lamp: 0, picture: 0, shelf: 0, tv: 0, room: 0, pet: 0 },
    pet: { happiness: 100 },
    perkPoints: 0,
    perks: { critChance: 0, critMult: 0, comboCap: 0, offlineRate: 0, energySaver: 0 },
    taps: 0,
    muted: false,
    edu: 0,
    eduStudy: null,
    job: null,
    jobXp: 0,
    working: false,
    bank: { balance: 0, level: 0 },
    quests: { day: 0, list: [] },
    ach: {},
    stats: {
      taps: 0, earned: 0, eats: 0, sleeps: 0, upgrades: 0, workSec: 0, golds: 0, crits: 0, petFeeds: 0,
      scratches: 0, scratchWins: 0, scratchWon: 0, jackpots: 0,
      bestTap: 0, bestCombo: 0, bestStreak: 0,
    },
    scratch: { day: 0, freeUsed: false, card: null },
    legacy: 0,
    prestiges: 0,
    streak: { day: 0, count: 0 },
    viewRoom: "bedroom",
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
    pet: { name: "Evcil Hayvan", icon: "🐶", baseCost: 6000, growth: 1.5, bonus: 0.035, maxLevel: 9 },
  };

  // Legacy points (earned from prestige and legacy-tagged achievements) buy permanent perks.
  var PERKS = {
    critChance: { name: "Şanslı Vuruş", icon: "🎯", desc: "Kritik vuruş şansı +%2", maxLevel: 5 },
    critMult: { name: "Güçlü Vuruş", icon: "💪", desc: "Kritik çarpanı +1", maxLevel: 5 },
    comboCap: { name: "Kombo Ustası", icon: "🔥", desc: "Maksimum kombo +5", maxLevel: 5 },
    offlineRate: { name: "Pasif Kazanç", icon: "🌙", desc: "Çevrimdışı kazanç oranı +%1", maxLevel: 5 },
    energySaver: { name: "Dayanıklılık", icon: "🔋", desc: "Tıklama enerji maliyeti -0.3", maxLevel: 5 },
  };

  function perkCost(key) {
    return state.perks[key] + 1; // 1, 2, 3... legacy points per level
  }
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
    lotteryBtn: document.getElementById("lotteryBtn"),
    recordsBtn: document.getElementById("recordsBtn"),
    eventBtn: document.getElementById("eventBtn"),
    eventChip: document.getElementById("eventChip"),
    eventFx: document.getElementById("eventFx"),
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
    windows: document.querySelectorAll(".window"),
    nightOverlay: document.getElementById("nightOverlay"),
    lampLight: document.getElementById("lampLight"),
    fxLayer: document.getElementById("fxLayer"),
    rewardCard: document.getElementById("rewardCard"),
    rewardIcon: document.getElementById("rewardIcon"),
    rewardTitle: document.getElementById("rewardTitle"),
    rewardSub: document.getElementById("rewardSub"),
    muteBtn: document.getElementById("muteBtn"),
    panel: document.getElementById("panel"),
    panelTitle: document.getElementById("panelTitle"),
    panelSub: document.getElementById("panelSub"),
    panelBody: document.getElementById("panelBody"),
    panelClose: document.getElementById("panelClose"),
    workChip: document.getElementById("workChip"),
    comboChip: document.getElementById("comboChip"),
    petItem: document.querySelector('.room-item[data-item="pet"]'),
    petMeterFill: document.getElementById("petMeterFill"),
    buySheet: document.getElementById("buySheet"),
    buyTitle: document.getElementById("buyTitle"),
    buyClose: document.getElementById("buyClose"),
    buyPrevNow: document.getElementById("buyPrevNow"),
    buyPrevNext: document.getElementById("buyPrevNext"),
    buyCapNow: document.getElementById("buyCapNow"),
    buyCapNext: document.getElementById("buyCapNext"),
    buyStats: document.getElementById("buyStats"),
    buyConfirm: document.getElementById("buyConfirm"),
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
      // Nested objects added later must not be half-filled by an older save.
      merged.bank = Object.assign({}, defaultState.bank, parsed.bank);
      merged.quests = Object.assign({}, defaultState.quests, parsed.quests);
      merged.stats = Object.assign({}, defaultState.stats, parsed.stats);
      merged.streak = Object.assign({}, defaultState.streak, parsed.streak);
      merged.ach = Object.assign({}, parsed.ach);
      merged.pet = Object.assign({}, defaultState.pet, parsed.pet);
      merged.perks = Object.assign({}, defaultState.perks, parsed.perks);
      merged.scratch = Object.assign({}, defaultState.scratch, parsed.scratch);
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
      // A hungry pet still keeps the player company, but only pulls half its weight.
      var factor = key === "pet" && state.pet.happiness <= 0 ? 0.5 : 1;
      mult += SHOP_ITEMS[key].bonus * state.items[key] * factor;
    });
    return mult;
  }

  function tapValue() {
    return Math.round(tapBase() * homeMultiplier() * eventMultiplier());
  }

  function effectiveOfflineRate() {
    return OFFLINE_EARN_RATE + 0.01 * state.perks.offlineRate;
  }

  function offlineRatePerSecond() {
    return tapValue() * effectiveOfflineRate();
  }

  function tapEnergyCost() {
    return Math.max(0.5, TAP_ENERGY_COST - 0.3 * state.perks.energySaver);
  }

  function critChance() {
    return CRIT_CHANCE + 0.02 * state.perks.critChance;
  }

  function critMultiplier() {
    return CRIT_MULT + state.perks.critMult;
  }

  function comboCap() {
    return COMBO_MAX + 5 * state.perks.comboCap;
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

  function pushPill(text, bad, crit) {
    var el = document.createElement("div");
    el.className = "floater-pill" + (bad ? " bad" : "") + (crit ? " crit" : "");
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
    renderHud();
    renderNavBadges();
    // Only the time-driven tabs need rebuilding on every tick; the others
    // would rip out the row the player is about to tap.
    if (panelTab === "school" || panelTab === "job" || panelTab === "bank") renderPanel();
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
    renderPet();
  }

  var PET_FEED_COST = 40;

  function petHungry() {
    return state.pet.happiness <= 30;
  }

  function renderPet() {
    if (state.items.pet <= 0) return;
    var node = els.petItem;
    node.classList.toggle("hungry", petHungry());
    els.petMeterFill.style.width = state.pet.happiness + "%";
  }

  function feedPet() {
    if (state.items.pet <= 0) return;
    if (state.pet.happiness >= 100) {
      showToast("Miniğin zaten tok, mutlu görünüyor!");
      return;
    }
    if (state.money < PET_FEED_COST) {
      sfx.deny();
      showToast("Mama için yeterli paran yok.");
      return;
    }
    state.money -= PET_FEED_COST;
    state.pet.happiness = clamp(state.pet.happiness + 35, 0, 100);
    bumpStat("petFeeds", 1);
    els.petItem.classList.remove("fed-pop");
    void els.petItem.offsetWidth;
    els.petItem.classList.add("fed-pop");
    pushPill("+35 🦴", false);
    sfx.coin();
    render();
    saveState();
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
    openBuySheet("item", key);
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
    els.windows.forEach(function (w) {
      w.classList.remove("day", "sunset", "night");
      w.classList.add(phase);
    });
    els.nightOverlay.style.background = phase === "sunset" ? "#c8562a" : "#1b2350";
    els.nightOverlay.style.opacity =
      phase === "night" ? (state.isSleeping ? "0.5" : "0.4") : phase === "sunset" ? "0.12" : "0";
    els.lampLight.classList.toggle("on", phase === "night" && state.items.lamp > 0);

    els.scene.classList.remove("room-t1", "room-t2", "room-t3");
    els.scene.classList.add("room-t" + itemTier(state.items.room));

    // The depth layers need the sky phase too: the light pooled on the floor
    // fades as the sun goes down.
    els.scene.classList.remove("sky-day", "sky-sunset", "sky-night");
    els.scene.classList.add("sky-" + phase);
  }

  /* ---------- Rooms ----------
     The home is two rooms. Only the mounted one is on screen, which is what
     makes the bed and the fridge feel like they live somewhere: to eat you
     walk to the kitchen, to sleep you go back to the bedroom. */
  var ROOM_NAMES = { bedroom: "Yatak Odası", kitchen: "Mutfak" };

  function setRoom(name, quiet) {
    if (!ROOM_NAMES[name]) return;
    if (name !== "bedroom" && state.isSleeping) {
      showToast("Önce uyanmalısın.");
      return;
    }
    state.viewRoom = name;
    document.querySelectorAll(".room-view").forEach(function (view) {
      view.classList.toggle("active", view.getAttribute("data-room") === name);
    });
    els.scene.classList.toggle("in-kitchen", name === "kitchen");
    if (!quiet) sfx.coin();
    render();
    saveState();
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
    els.muteBtn.textContent = state.muted ? "🔇" : "🔊";
  }

  /* ---------- Sound effects (synthesised, no assets) ---------- */
  var audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, at, dur, type, gain) {
    if (!audioCtx || state.muted) return;
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain || 0.15, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  var sfx = {
    tap: function () {
      if (!ensureAudio()) return;
      tone(900, audioCtx.currentTime, 0.05, "triangle", 0.06);
    },
    purchase: function () {
      if (!ensureAudio()) return;
      var t = audioCtx.currentTime;
      tone(523, t, 0.1, "triangle", 0.14);
      tone(659, t + 0.1, 0.1, "triangle", 0.14);
      tone(784, t + 0.2, 0.1, "triangle", 0.14);
      tone(1046, t + 0.3, 0.3, "triangle", 0.16);
    },
    coin: function () {
      if (!ensureAudio()) return;
      var t = audioCtx.currentTime;
      tone(1046, t, 0.08, "square", 0.06);
      tone(1568, t + 0.08, 0.16, "square", 0.06);
    },
    deny: function () {
      if (!ensureAudio()) return;
      var t = audioCtx.currentTime;
      tone(220, t, 0.14, "sawtooth", 0.08);
      tone(170, t + 0.14, 0.2, "sawtooth", 0.08);
    },
  };

  /* ---------- Purchase sheet: see the old model, the new model, pay, replace ---------- */
  var buyCtx = null;

  var PREVIEW_PAINT = {
    bed: [
      ["woodStop1", "stop-color", ["wood", 0]], ["woodStop2", "stop-color", ["wood", 1]],
      ["blanketStop1", "stop-color", ["blanket", 0]], ["blanketStop2", "stop-color", ["blanket", 1]],
      ["bedTrim", "fill", ["trim"]], ["bedKnob1", "fill", ["knob"]], ["bedKnob2", "fill", ["knob"]], ["bedKnob3", "fill", ["knob"]],
    ],
    fridge: [
      ["fridgeStop1", "stop-color", ["body", 0]], ["fridgeStop2", "stop-color", ["body", 1]], ["fridgeStop3", "stop-color", ["body", 2]],
      ["fridgeHandle1", "fill", ["handle"]], ["fridgeHandle2", "fill", ["handle"]],
      ["fridgeBodyStroke", "stroke", ["handle"]], ["fridgeDivider", "stroke", ["handle"]],
    ],
    plant: [
      ["plantLeaf1", "fill", ["leaf", 0]], ["plantLeaf2", "fill", ["leaf", 1]], ["plantLeaf3", "fill", ["leaf", 2]],
      ["plantLeaf4", "fill", ["leaf", 2]], ["plantLeaf5", "fill", ["leaf", 1]],
      ["plantPotBody", "fill", ["pot", 0]], ["plantPotBodyModern", "fill", ["pot", 0]],
      ["plantPotRim", "fill", ["pot", 1]], ["plantPotRimModern", "fill", ["pot", 1]],
    ],
  };

  function buildPreview(kind, key, level, container, suffix) {
    container.textContent = "";
    container.className = "preview";
    if (level <= 0) {
      var empty = document.createElement("div");
      empty.className = "preview-empty";
      empty.textContent = "Yok";
      container.appendChild(empty);
      return;
    }
    var tier = kind === "furniture" ? furnitureTier(level) : itemTier(level);
    container.classList.add("tier-" + tier);
    var src = kind === "furniture" ? els[UPGRADE_ELS[key].item] : document.querySelector('.room-item[data-item="' + key + '"]');
    var svg = src ? src.querySelector("svg") : null;
    if (!svg) {
      var em = document.createElement("div");
      em.className = "preview-emoji";
      em.textContent = SHOP_ITEMS[key].icon;
      container.appendChild(em);
      return;
    }
    // Clone the item's art with unique ids so each preview keeps its own gradients/clips.
    var html = svg.outerHTML
      .replace(/id="([^"]+)"/g, 'id="$1' + suffix + '"')
      .replace(/url\(#([^)]+)\)/g, "url(#$1" + suffix + ")");
    container.insertAdjacentHTML("beforeend", html);
    if (kind === "furniture") {
      var palette = TIER_PALETTES[key][tier - 1];
      PREVIEW_PAINT[key].forEach(function (rule) {
        var node = container.querySelector("#" + rule[0] + suffix);
        if (!node) return;
        var value = palette[rule[2][0]];
        if (rule[2].length > 1) value = value[rule[2][1]];
        node.setAttribute(rule[1], value);
      });
    }
  }

  function purchaseInfo(kind, key) {
    var isF = kind === "furniture";
    var cfg = isF ? FURNITURE_CONFIG[key] : SHOP_ITEMS[key];
    var level = isF ? state.furniture[key] : state.items[key];
    var tierOf = isF ? furnitureTier : itemTier;
    var names = isF ? FURNITURE_TIER_NAMES : ITEM_TIER_NAMES;
    var maxed = level >= cfg.maxLevel;
    return {
      isF: isF,
      cfg: cfg,
      level: level,
      maxed: maxed,
      cost: maxed ? 0 : isF ? furnitureCost(key) : itemCost(key),
      tierNow: tierOf(level),
      tierNext: tierOf(level + 1),
      names: names,
      bonusNow: isF ? cfg.bonus * (level - 1) : cfg.bonus * level,
      bonusNext: isF ? cfg.bonus * level : cfg.bonus * (level + 1),
      levelsToNextTier: (function () {
        for (var l = level + 1; l <= cfg.maxLevel; l++) if (tierOf(l) !== tierOf(level)) return l - level;
        return 0;
      })(),
    };
  }

  function openBuySheet(kind, key) {
    var info = purchaseInfo(kind, key);
    if (info.maxed) {
      showToast(info.cfg.name + " zaten en üst model!");
      return;
    }
    buyCtx = { kind: kind, key: key };
    var newModel = info.tierNext !== info.tierNow || (!info.isF && info.level === 0);
    var isNew = !info.isF && info.level === 0;

    els.buyTitle.textContent = isNew ? info.cfg.name + " satın al" : info.cfg.name + " yükselt";
    buildPreview(kind, key, info.level, els.buyPrevNow, "_a");
    buildPreview(kind, key, info.level + 1, els.buyPrevNext, "_b");
    els.buyCapNow.textContent = info.level > 0 ? info.names[info.tierNow] + " · Sv " + info.level : "Sahip değilsin";
    els.buyCapNext.textContent =
      info.names[info.tierNext] + " · Sv " + (info.level + 1) + (newModel ? " · YENİ MODEL" : "");

    var multNow = homeMultiplier();
    var multNext = multNow + info.cfg.bonus;
    var base = tapBase();
    els.buyStats.textContent = "";
    var lines = [
      "Kazanç bonusu: +%" + Math.round(info.bonusNow * 100) + " → +%" + Math.round(info.bonusNext * 100),
      "Tık başına: " + formatMoney(Math.round(base * multNow)) + " → " + formatMoney(Math.round(base * multNext)),
      "Çevrimdışı: " + formatMoney(Math.round(base * multNow * effectiveOfflineRate() * 3600)) + "/sa → " + formatMoney(Math.round(base * multNext * effectiveOfflineRate() * 3600)) + "/sa",
    ];
    if (!newModel && info.levelsToNextTier > 0) {
      lines.push(info.levelsToNextTier + " seviye sonra: " + info.names[info.tierNow + 1] + " model");
    }
    lines.forEach(function (text, i) {
      var div = document.createElement("div");
      if (newModel && i === 0) {
        var tag = document.createElement("span");
        tag.className = "new-model";
        tag.textContent = isNew ? "🆕 Yeni eşya  " : "✨ Üst model  ";
        div.appendChild(tag);
      }
      div.appendChild(document.createTextNode(text));
      els.buyStats.appendChild(div);
    });

    var poor = state.money < info.cost;
    els.buyConfirm.textContent = (isNew ? "Satın Al · " : "Yükselt · ") + formatMoney(info.cost);
    els.buyConfirm.classList.toggle("poor", poor);
    els.buySheet.classList.add("open");
  }

  function closeBuySheet() {
    els.buySheet.classList.remove("open");
    buyCtx = null;
  }

  function spawnDust(node) {
    var rect = node.getBoundingClientRect();
    var scene = els.scene.getBoundingClientRect();
    for (var i = 0; i < 8; i++) {
      var d = document.createElement("span");
      d.className = "dust";
      d.style.left = rect.left - scene.left + rect.width / 2 - 7 + "px";
      d.style.top = rect.bottom - scene.top - 10 + "px";
      var angle = Math.PI + (i / 7) * Math.PI;
      d.style.setProperty("--dx", Math.cos(angle) * (30 + Math.random() * 30) + "px");
      d.style.setProperty("--dy", Math.sin(angle) * 22 - 6 + "px");
      els.scene.appendChild(d);
      (function (n) {
        setTimeout(function () {
          n.remove();
        }, 700);
      })(d);
    }
  }

  function spawnNewTag(node) {
    var tag = document.createElement("span");
    tag.className = "new-tag";
    tag.textContent = "YENİ!";
    node.appendChild(tag);
    setTimeout(function () {
      tag.remove();
    }, 2300);
  }

  var moneyAnim = null;
  function animateMoney(from, to) {
    var start = performance.now();
    var dur = 700;
    cancelAnimationFrame(moneyAnim);
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      els.moneyText.textContent = formatMoney(from + (to - from) * eased);
      if (p < 1) moneyAnim = requestAnimationFrame(step);
    }
    moneyAnim = requestAnimationFrame(step);

    var drop = document.createElement("span");
    drop.className = "money-drop";
    drop.textContent = "−" + formatMoney(from - to);
    var phone = els.phone.getBoundingClientRect();
    var wallet = els.moneyText.getBoundingClientRect();
    drop.style.left = wallet.left - phone.left + "px";
    drop.style.top = wallet.bottom - phone.top + 2 + "px";
    els.phone.appendChild(drop);
    setTimeout(function () {
      drop.remove();
    }, 1000);
  }

  function confirmPurchase() {
    if (!buyCtx) return;
    var kind = buyCtx.kind;
    var key = buyCtx.key;
    var info = purchaseInfo(kind, key);
    if (info.maxed) return closeBuySheet();
    if (state.money < info.cost) {
      sfx.deny();
      showToast("Yetersiz para! Gerekli: " + formatMoney(info.cost));
      return;
    }

    var moneyBefore = state.money;
    state.money -= info.cost;
    bumpStat("upgrades", 1);
    if (info.isF) state.furniture[key] += 1;
    else state.items[key] += 1;
    var newModel = info.tierNext !== info.tierNow || (!info.isF && info.level === 0);
    var node = info.isF ? els[UPGRADE_ELS[key].item] : document.querySelector('.room-item[data-item="' + key + '"]');

    closeBuySheet();
    animateMoney(moneyBefore, state.money);
    sfx.purchase();

    function finish() {
      render();
      if (node) {
        node.classList.remove("swap-out");
        node.classList.add("swap-in");
        spawnDust(node);
        if (newModel) spawnNewTag(node);
        setTimeout(function () {
          node.classList.remove("swap-in");
        }, 650);
      }
      if (newModel) {
        celebrate(
          info.isF ? "✨" : info.cfg.icon,
          info.level === 0 && !info.isF ? info.cfg.name + " alındı!" : info.cfg.name + " yenilendi!",
          info.names[info.tierNext] + " model · +%" + Math.round(info.bonusNext * 100) + " kazanç"
        );
      } else {
        sfx.coin();
        showToast(info.cfg.name + " seviye " + (info.level + 1) + "! Kazanç arttı.");
      }
      if (els.shop.classList.contains("open")) renderShop();
      saveState();
    }

    if (node && info.level > 0) {
      node.classList.add("swap-out");
      setTimeout(finish, 270);
    } else {
      finish();
    }
  }

  /* =====================================================================
     Progression systems: education, career, bank, quests, achievements,
     combos, golden coins and prestige.
     ===================================================================== */

  var EDU = [
    { name: "İlkokul", icon: "🎒", cost: 0, mins: 1, bonus: 0.1 },
    { name: "Lise", icon: "📗", cost: 5000, mins: 3, bonus: 0.15 },
    { name: "Üniversite", icon: "🎓", cost: 40000, mins: 8, bonus: 0.25 },
    { name: "Yüksek Lisans", icon: "📜", cost: 250000, mins: 15, bonus: 0.4 },
    { name: "Doktora", icon: "🔬", cost: 1500000, mins: 30, bonus: 0.6 },
    { name: "Profesörlük", icon: "📖", cost: 8000000, mins: 45, bonus: 0.8 },
    { name: "Nobel Ödülü", icon: "🏅", cost: 60000000, mins: 90, bonus: 1.2 },
  ];

  var JOBS = {
    courier: { name: "Kurye", icon: "🛵", edu: 1, income: 8 },
    waiter: { name: "Garson", icon: "🍽️", edu: 1, income: 14 },
    cashier: { name: "Kasiyer", icon: "🧾", edu: 2, income: 25 },
    office: { name: "Ofis Elemanı", icon: "🗂️", edu: 2, income: 60 },
    teacher: { name: "Öğretmen", icon: "👨‍🏫", edu: 3, income: 120 },
    dev: { name: "Yazılımcı", icon: "💻", edu: 3, income: 180 },
    pilot: { name: "Pilot", icon: "✈️", edu: 3, income: 300 },
    lawyer: { name: "Avukat", icon: "⚖️", edu: 4, income: 380 },
    doctor: { name: "Doktor", icon: "🩺", edu: 4, income: 520 },
    ceo: { name: "CEO", icon: "🏢", edu: 5, income: 1600 },
    investor: { name: "Yatırımcı", icon: "📈", edu: 6, income: 5200 },
    astronaut: { name: "Astronot", icon: "🚀", edu: 7, income: 16000 },
  };
  var JOB_XP_PER_LEVEL = 600; // seconds worked per promotion
  var JOB_MAX_LEVEL = 8;

  var BANK_MAX_LEVEL = 5;
  var BANK_BASE_RATE = 0.02; // per hour
  var BANK_RATE_STEP = 0.006;
  var BANK_UPGRADE_COST = [50000, 250000, 1000000, 5000000, 25000000];

  var PRESTIGE_MIN_EARNED = 10000000;
  var LEGACY_BONUS = 0.05;

  /* ---------- Seasonal events ----------
     Dates are real calendar days, so the room and the economy change with
     the year. from/to are [month (1-12), day] and may wrap around New Year. */
  var EVENTS = [
    { id: "newyear", name: "Yılbaşı", icon: "🎄", from: [12, 24], to: [1, 2], mult: 2, fx: "snow", desc: "Kar yağıyor, tüm kazanç iki katı!" },
    { id: "spring", name: "Bahar Şenliği", icon: "🌸", from: [3, 20], to: [3, 27], mult: 1.5, fx: "petal", desc: "Çiçekler açtı, kazanç ×1.5" },
    { id: "kids", name: "23 Nisan Çocuk Bayramı", icon: "🎈", from: [4, 22], to: [4, 24], mult: 2, fx: "confetti", desc: "Bayram coşkusu, kazanç ×2" },
    { id: "youth", name: "19 Mayıs Gençlik Bayramı", icon: "🏃", from: [5, 18], to: [5, 20], mult: 1.75, fx: "confetti", desc: "Gençlik enerjisi, kazanç ×1.75" },
    { id: "summer", name: "Yaz Festivali", icon: "🏖️", from: [6, 20], to: [7, 5], mult: 1.5, fx: "sun", desc: "Yaz tatili başladı, kazanç ×1.5" },
    { id: "victory", name: "30 Ağustos Zafer Bayramı", icon: "🇹🇷", from: [8, 29], to: [8, 31], mult: 2, fx: "confetti", desc: "Zafer kutlaması, kazanç ×2" },
    { id: "halloween", name: "Cadılar Bayramı", icon: "🎃", from: [10, 29], to: [11, 1], mult: 1.75, fx: "leaf", desc: "Ürkütücü geceler, kazanç ×1.75" },
    { id: "republic", name: "29 Ekim Cumhuriyet Bayramı", icon: "🎆", from: [10, 28], to: [10, 30], mult: 2.5, fx: "confetti", desc: "En büyük bayram, kazanç ×2.5" },
  ];

  var WEEKEND_EVENT = {
    id: "weekend", name: "Hafta Sonu", icon: "🎉", mult: 1.25, fx: "confetti",
    desc: "Cumartesi ve pazar kazanç ×1.25",
  };

  // Day-of-year index, so a range that wraps past New Year still compares cleanly.
  function dayOfYear(d) {
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }

  function eventIsOn(ev, now) {
    var year = now.getFullYear();
    var today = dayOfYear(now);
    var start = dayOfYear(new Date(year, ev.from[0] - 1, ev.from[1]));
    var end = dayOfYear(new Date(year, ev.to[0] - 1, ev.to[1]));
    return start <= end ? today >= start && today <= end : today >= start || today <= end;
  }

  // Ranges can overlap (29 Ekim falls inside Cadılar Bayramı); the player
  // always gets the most generous of the events running that day.
  function activeEvent() {
    var now = new Date();
    var best = null;
    EVENTS.forEach(function (ev) {
      if (eventIsOn(ev, now) && (!best || ev.mult > best.mult)) best = ev;
    });
    if (best) return best;
    var wd = now.getDay();
    return wd === 0 || wd === 6 ? WEEKEND_EVENT : null;
  }

  function eventMultiplier() {
    var ev = activeEvent();
    return ev ? ev.mult : 1;
  }

  // Milliseconds until an event's next start, so the panel can count down to it.
  function msUntilEvent(ev) {
    var now = new Date();
    for (var y = 0; y < 2; y++) {
      var start = new Date(now.getFullYear() + y, ev.from[0] - 1, ev.from[1]);
      if (start > now) return start - now;
    }
    return 0;
  }

  function formatDays(ms) {
    var days = Math.ceil(ms / 86400000);
    return days <= 1 ? "yarın" : days + " gün sonra";
  }

  var QUEST_POOL = [
    { id: "tap150", icon: "👆", stat: "taps", target: 150, text: "150 kez dokun", reward: 30 },
    { id: "tap400", icon: "👆", stat: "taps", target: 400, text: "400 kez dokun", reward: 80 },
    { id: "crit8", icon: "💥", stat: "crits", target: 8, text: "8 kritik vuruş yap", reward: 60 },
    { id: "gold3", icon: "🪙", stat: "golds", target: 3, text: "3 altın para topla", reward: 70 },
    { id: "eat3", icon: "🍗", stat: "eats", target: 3, text: "3 kez yemek ye", reward: 40 },
    { id: "sleep2", icon: "🛏️", stat: "sleeps", target: 2, text: "2 kez uyu", reward: 40 },
    { id: "upg2", icon: "⬆️", stat: "upgrades", target: 2, text: "2 eşya yükselt", reward: 90 },
    { id: "work300", icon: "💼", stat: "workSec", target: 300, text: "5 dakika çalış", reward: 70 },
    { id: "work900", icon: "💼", stat: "workSec", target: 900, text: "15 dakika çalış", reward: 140 },
    { id: "scratch2", icon: "🎟️", stat: "scratches", target: 2, text: "2 kazı kazan oyna", reward: 80 },
    { id: "feed3", icon: "🦴", stat: "petFeeds", target: 3, text: "Miniğini 3 kez besle", reward: 50 },
  ];

  var ACHIEVEMENTS = [
    { id: "tap1", icon: "👆", name: "İlk Dokunuş", desc: "İlk kez dokun", money: 500, test: function (s) { return s.stats.taps >= 1; } },
    { id: "tap1k", icon: "🖐️", name: "Bin Dokunuş", desc: "1.000 kez dokun", money: 5000, test: function (s) { return s.stats.taps >= 1000; } },
    { id: "tap10k", icon: "🙌", name: "On Bin Dokunuş", desc: "10.000 kez dokun", money: 60000, test: function (s) { return s.stats.taps >= 10000; } },
    { id: "earn100k", icon: "💵", name: "İlk 100 Bin", desc: "Toplam $100.000 kazan", money: 10000, test: function (s) { return s.stats.earned >= 100000; } },
    { id: "earn1m", icon: "💰", name: "Milyoner", desc: "Toplam $1.000.000 kazan", money: 100000, test: function (s) { return s.stats.earned >= 1000000; } },
    { id: "earn10m", icon: "🤑", name: "Multimilyoner", desc: "Toplam $10.000.000 kazan", legacy: 1, test: function (s) { return s.stats.earned >= 10000000; } },
    { id: "lvl10", icon: "⭐", name: "Seviye 10", desc: "10. seviyeye ulaş", money: 25000, test: function (s) { return s.level >= 10; } },
    { id: "edu3", icon: "🎓", name: "Üniversiteli", desc: "Üniversiteyi bitir", money: 50000, test: function (s) { return s.edu >= 3; } },
    { id: "edu5", icon: "🔬", name: "Doktor Unvanı", desc: "Doktorayı bitir", legacy: 1, test: function (s) { return s.edu >= 5; } },
    { id: "job1", icon: "💼", name: "İlk İş", desc: "Bir işe gir", money: 5000, test: function (s) { return !!s.job; } },
    { id: "work1h", icon: "⏱️", name: "Mesai", desc: "Toplam 1 saat çalış", money: 40000, test: function (s) { return s.stats.workSec >= 3600; } },
    { id: "ceo", icon: "🏢", name: "Patron", desc: "CEO olarak çalış", legacy: 1, test: function (s) { return s.job === "ceo"; } },
    { id: "shopAll", icon: "🛒", name: "Ev Sahibi", desc: "Marketteki tüm eşyaları al", money: 80000, test: function (s) { return Object.keys(SHOP_ITEMS).every(function (k) { return s.items[k] > 0; }); } },
    { id: "maxItem", icon: "✨", name: "En İyisi", desc: "Bir eşyayı MAX seviyeye çıkar", money: 150000, test: function (s) { return Object.keys(SHOP_ITEMS).some(function (k) { return s.items[k] >= SHOP_ITEMS[k].maxLevel; }) || Object.keys(FURNITURE_CONFIG).some(function (k) { return s.furniture[k] >= FURNITURE_CONFIG[k].maxLevel; }); } },
    { id: "bank1m", icon: "🏦", name: "Yatırımcı", desc: "Bankada $1.000.000 tut", money: 120000, test: function (s) { return s.bank.balance >= 1000000; } },
    { id: "streak7", icon: "🔥", name: "Sadık Oyuncu", desc: "7 gün üst üste oyna", legacy: 1, test: function (s) { return s.streak.count >= 7; } },
    { id: "prestige1", icon: "🌟", name: "Yeni Hayat", desc: "İlk kez yeniden doğ", money: 0, test: function (s) { return s.prestiges >= 1; } },
    { id: "edu7", icon: "🏅", name: "Nobel Sahibi", desc: "Nobel Ödülü'nü kazan", legacy: 2, test: function (s) { return s.edu >= 7; } },
    { id: "astronaut", icon: "🚀", name: "Yıldızlara", desc: "Astronot olarak çalış", legacy: 2, test: function (s) { return s.job === "astronaut"; } },
    { id: "scratchWin", icon: "🎟️", name: "Şansın Açık", desc: "Kazı kazanda ilk kez kazan", money: 20000, test: function (s) { return s.stats.scratchWins >= 1; } },
    { id: "jackpot", icon: "👑", name: "Büyük İkramiye", desc: "Kazı kazanda jackpot yakala", legacy: 2, test: function (s) { return s.stats.jackpots >= 1; } },
    { id: "petLove", icon: "🐶", name: "Can Yoldaşı", desc: "Miniğini 50 kez besle", money: 60000, test: function (s) { return s.stats.petFeeds >= 50; } },
    { id: "combo30", icon: "🔥", name: "Kombo Kralı", desc: "30'luk kombo yap", money: 90000, test: function (s) { return s.stats.bestCombo >= 30; } },
    { id: "event1", icon: "🎉", name: "Kutlama Vakti", desc: "Bir etkinlik sırasında oyna", money: 15000, test: function () { return !!activeEvent(); } },
  ];

  /* ---------- Derived economy ---------- */
  function eduMultiplier() {
    var mult = 1;
    for (var i = 0; i < state.edu && i < EDU.length; i++) mult += EDU[i].bonus;
    return mult;
  }

  function legacyMultiplier() {
    return 1 + state.legacy * LEGACY_BONUS;
  }

  function tapBase() {
    return (100 + (state.level - 1) * 20) * eduMultiplier() * legacyMultiplier();
  }

  function jobLevel() {
    return Math.min(JOB_MAX_LEVEL, Math.floor(state.jobXp / JOB_XP_PER_LEVEL) + 1);
  }

  function salaryPerSecond() {
    if (!state.job || !JOBS[state.job]) return 0;
    return JOBS[state.job].income * (1 + 0.25 * (jobLevel() - 1)) * legacyMultiplier() * eventMultiplier();
  }

  function bankRate() {
    return BANK_BASE_RATE + BANK_RATE_STEP * state.bank.level;
  }

  function isWorking() {
    return state.working && !!state.job && !state.isSleeping && state.energy > 0;
  }

  /* ---------- Stats & quest progress ---------- */
  function bumpStat(key, amount) {
    state.stats[key] = (state.stats[key] || 0) + amount;
  }

  function questProgress(q) {
    return clamp((state.stats[q.stat] || 0) - q.start, 0, q.target);
  }

  function questReward(q) {
    return Math.round(q.reward * tapBase() * (1 + state.level * 0.15));
  }

  function todayIndex() {
    return Math.floor(Date.now() / 86400000);
  }

  function refreshQuests(force) {
    var today = todayIndex();
    if (!force && state.quests.day === today && state.quests.list.length) return;

    var seed = today * 9301 + 49297;
    var pool = QUEST_POOL.slice();
    var picked = [];
    for (var i = 0; i < 3 && pool.length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      var idx = Math.floor((seed / 233280) * pool.length);
      var base = pool.splice(idx, 1)[0];
      picked.push({
        id: base.id,
        icon: base.icon,
        text: base.text,
        stat: base.stat,
        target: base.target,
        reward: base.reward,
        start: state.stats[base.stat] || 0,
        claimed: false,
      });
    }
    state.quests = { day: today, list: picked };
  }

  function claimableQuests() {
    return state.quests.list.filter(function (q) {
      return !q.claimed && questProgress(q) >= q.target;
    }).length;
  }

  function claimableAchievements() {
    return ACHIEVEMENTS.filter(function (a) {
      return !state.ach[a.id] && a.test(state);
    }).length;
  }

  /* ---------- Daily streak ---------- */
  function checkStreak() {
    var today = todayIndex();
    if (state.streak.day === today) return;
    var prev = state.streak.day;
    state.streak.count = prev === today - 1 ? state.streak.count + 1 : 1;
    state.streak.day = today;
    if (state.streak.count > (state.stats.bestStreak || 0)) state.stats.bestStreak = state.streak.count;
    var bonus = Math.round(tapBase() * 40 * state.streak.count);
    state.money += bonus;
    bumpStat("earned", bonus);
    setTimeout(function () {
      celebrate("🔥", state.streak.count + ". gün serisi!", "Günlük bonus " + formatMoney(bonus));
      sfx.purchase();
    }, 900);
  }

  /* ---------- Combo & critical taps ---------- */
  var COMBO_WINDOW_MS = 1400;
  var COMBO_MAX = 20;
  var CRIT_CHANCE = 0.08;
  var CRIT_MULT = 5;
  var comboCount = 0;
  var comboAt = 0;
  var comboTimer = null;

  function comboMultiplier() {
    return 1 + Math.min(comboCount, comboCap()) * 0.05;
  }

  function bumpCombo() {
    var now = Date.now();
    comboCount = now - comboAt < COMBO_WINDOW_MS ? comboCount + 1 : 1;
    comboAt = now;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function () {
      comboCount = 0;
      renderHud();
    }, COMBO_WINDOW_MS);
  }

  function renderHud() {
    var showCombo = comboCount >= 3;
    els.comboChip.classList.toggle("show", showCombo);
    if (showCombo) {
      els.comboChip.textContent = "🔥 Kombo ×" + comboMultiplier().toFixed(2);
      els.comboChip.style.setProperty("--fill", Math.min(100, (comboCount / comboCap()) * 100) + "%");
    }

    var working = isWorking();
    els.workChip.classList.toggle("show", !!state.job);
    if (state.job) {
      els.workChip.textContent = working
        ? JOBS[state.job].icon + " " + formatMoney(salaryPerSecond()) + "/sn"
        : JOBS[state.job].icon + " Mesai kapalı";
      els.workChip.classList.toggle("off", !working);
    }
    els.character.classList.toggle("working", working);

    var ev = activeEvent();
    els.eventChip.classList.toggle("show", !!ev);
    if (ev) els.eventChip.textContent = ev.icon + " " + ev.name + " ×" + ev.mult;
    renderEventFx(ev);
  }

  /* ---------- Seasonal weather layer ---------- */
  var EVENT_FX_ART = {
    snow: ["❄️", "🌨️", "❄️"],
    petal: ["🌸", "🌺", "🌷"],
    confetti: ["🎊", "🎉", "✨"],
    leaf: ["🍂", "🍁", "🎃"],
    sun: ["☀️", "🌴", "🏖️"],
  };
  var eventFxId = null;

  function renderEventFx(ev) {
    var id = ev ? ev.id : null;
    if (id === eventFxId) return;
    eventFxId = id;
    els.eventFx.textContent = "";
    if (!ev) return;

    var art = EVENT_FX_ART[ev.fx] || EVENT_FX_ART.confetti;
    for (var i = 0; i < 12; i++) {
      var bit = document.createElement("span");
      bit.className = "event-bit";
      bit.textContent = art[i % art.length];
      bit.style.left = Math.random() * 96 + "%";
      bit.style.animationDelay = (Math.random() * 8).toFixed(2) + "s";
      bit.style.animationDuration = (7 + Math.random() * 6).toFixed(2) + "s";
      bit.style.fontSize = (11 + Math.random() * 9).toFixed(0) + "px";
      els.eventFx.appendChild(bit);
    }
  }

  function renderNavBadges() {
    var alerts = {
      school: state.eduStudy ? false : state.edu < EDU.length && state.money >= EDU[state.edu].cost,
      job: !state.job && state.edu >= 1,
      bank: false,
      world: claimableAchievements() > 0,
      shop: false,
    };
    navButtons.forEach(function (btn) {
      btn.classList.toggle("has-alert", !!alerts[btn.getAttribute("data-nav")]);
    });
    els.questBtn.classList.toggle("has-alert", claimableQuests() > 0);
    els.lotteryBtn.classList.toggle("has-alert", freeCardAvailable() || !!state.scratch.card);
    els.eventBtn.classList.toggle("has-alert", !!activeEvent());
    var ev = activeEvent();
    els.eventBtn.textContent = ev ? ev.icon : "🎉";
  }

  /* ---------- Golden coin ---------- */
  var goldTimer = null;

  function scheduleGoldCoin() {
    clearTimeout(goldTimer);
    goldTimer = setTimeout(spawnGoldCoin, 45000 + Math.random() * 45000);
  }

  function spawnGoldCoin() {
    scheduleGoldCoin();
    if (state.isSleeping || document.querySelector(".gold-coin")) return;

    var coin = document.createElement("button");
    coin.className = "gold-coin";
    coin.textContent = "🪙";
    coin.style.left = 12 + Math.random() * 64 + "%";
    coin.style.top = 14 + Math.random() * 34 + "%";
    coin.addEventListener("click", function (e) {
      e.stopPropagation();
      var prize = Math.round(tapValue() * 25);
      state.money += prize;
      bumpStat("earned", prize);
      bumpStat("golds", 1);
      coin.remove();
      sfx.purchase();
      celebrate("🪙", "Altın para!", "+" + formatMoney(prize));
      render();
      saveState();
    });
    els.scene.appendChild(coin);
    setTimeout(function () {
      coin.remove();
    }, 7000);
  }

  /* ---------- Generic panel ---------- */
  var panelTab = null;

  var PANEL_META = {
    school: { title: "🎓 Eğitim", build: buildSchool },
    job: { title: "💼 Kariyer", build: buildJob },
    bank: { title: "🏦 Banka", build: buildBank },
    world: { title: "🏆 Başarımlar", build: buildAchievements },
    quests: { title: "📋 Görevler", build: buildQuests },
    lottery: { title: "🎟️ Kazı Kazan", build: buildLottery },
    records: { title: "📊 Rekorlar", build: buildRecords },
    events: { title: "🎉 Etkinlikler", build: buildEvents },
  };

  function openPanel(tab) {
    panelTab = tab;
    closeShop();
    els.panel.classList.add("open");
    renderPanel();
  }

  function closePanel() {
    panelTab = null;
    els.panel.classList.remove("open");
  }

  function renderPanel() {
    if (!panelTab) return;
    var meta = PANEL_META[panelTab];
    els.panelTitle.textContent = meta.title;
    els.panelBody.textContent = "";
    meta.build();
  }

  function makeRow(icon, title, sub, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "shop-row" + (opts.rowClass ? " " + opts.rowClass : "");

    var ic = document.createElement("div");
    ic.className = "shop-icon";
    ic.textContent = icon;

    var info = document.createElement("div");
    info.className = "shop-info";
    var name = document.createElement("div");
    name.className = "shop-name";
    name.textContent = title;
    info.appendChild(name);
    if (sub) {
      var s = document.createElement("div");
      s.className = "shop-bonus";
      s.textContent = sub;
      info.appendChild(s);
    }
    if (opts.progress != null) {
      var bar = document.createElement("div");
      bar.className = "row-bar";
      var fill = document.createElement("div");
      fill.className = "row-fill";
      fill.style.width = clamp(opts.progress, 0, 100) + "%";
      bar.appendChild(fill);
      info.appendChild(bar);
    }

    row.appendChild(ic);
    row.appendChild(info);

    if (opts.button) {
      var btn = document.createElement("button");
      btn.className = "shop-buy" + (opts.buttonClass ? " " + opts.buttonClass : "");
      btn.textContent = opts.button;
      btn.disabled = !!opts.disabled;
      if (opts.onClick) btn.addEventListener("click", opts.onClick);
      row.appendChild(btn);
    }
    els.panelBody.appendChild(row);
    return row;
  }

  function addNote(text) {
    var note = document.createElement("div");
    note.className = "panel-note";
    note.textContent = text;
    els.panelBody.appendChild(note);
  }

  /* ---------- Education ---------- */
  function buildSchool() {
    els.panelSub.textContent =
      "Eğitim çarpanı ×" + eduMultiplier().toFixed(2) + " · Tık başına " + formatMoney(tapValue());

    EDU.forEach(function (course, i) {
      var done = state.edu > i;
      var current = state.eduStudy && state.eduStudy.idx === i;
      var locked = i > state.edu;
      var sub = "+%" + Math.round(course.bonus * 100) + " kalıcı kazanç · " + course.mins + " dk";
      var opts = { rowClass: done ? "done" : locked ? "locked" : "" };

      if (done) {
        opts.button = "Bitti ✓";
        opts.buttonClass = "owned";
        opts.disabled = true;
      } else if (current) {
        var left = Math.max(0, Math.round((state.eduStudy.endsAt - Date.now()) / 1000));
        sub = "Okuyorsun · " + formatDuration(left) + " kaldı";
        opts.progress = 100 - (left / (course.mins * 60)) * 100;
        opts.button = "Okuyor…";
        opts.buttonClass = "owned";
        opts.disabled = true;
      } else if (locked) {
        opts.button = "Kilitli 🔒";
        opts.buttonClass = "owned";
        opts.disabled = true;
      } else {
        var poor = state.money < course.cost;
        opts.button = course.cost ? formatMoney(course.cost) : "Ücretsiz";
        opts.buttonClass = poor ? "poor" : "";
        opts.onClick = function () {
          startStudy(i);
        };
      }
      makeRow(course.icon, course.name, sub, opts);
    });
    addNote("Eğitim hem tık başına kazancı kalıcı artırır hem de yeni işlerin kilidini açar.");
  }

  function startStudy(i) {
    var course = EDU[i];
    if (state.eduStudy) return;
    if (state.money < course.cost) {
      sfx.deny();
      showToast("Yetersiz para! Gerekli: " + formatMoney(course.cost));
      return;
    }
    state.money -= course.cost;
    state.eduStudy = { idx: i, endsAt: Date.now() + course.mins * 60000 };
    sfx.coin();
    showToast(course.name + " başladı! " + course.mins + " dakika sürecek.");
    render();
    renderPanel();
    saveState();
  }

  function tickStudy() {
    if (!state.eduStudy) return;
    if (Date.now() < state.eduStudy.endsAt) {
      if (panelTab === "school") renderPanel();
      return;
    }
    var course = EDU[state.eduStudy.idx];
    state.edu = state.eduStudy.idx + 1;
    state.eduStudy = null;
    celebrate(course.icon, course.name + " tamamlandı!", "+%" + Math.round(course.bonus * 100) + " kalıcı kazanç");
    sfx.purchase();
    if (panelTab === "school") renderPanel();
  }

  /* ---------- Career ---------- */
  function buildJob() {
    var lvl = jobLevel();
    els.panelSub.textContent = state.job
      ? JOBS[state.job].name + " · Kıdem " + lvl + "/" + JOB_MAX_LEVEL + " · " + formatMoney(salaryPerSecond()) + "/sn"
      : "Henüz bir işin yok";

    if (state.job) {
      var next = lvl < JOB_MAX_LEVEL ? (lvl * JOB_XP_PER_LEVEL - state.jobXp) : 0;
      makeRow(
        isWorking() ? "🟢" : "⏸️",
        isWorking() ? "Mesaidesin" : "Mesai kapalı",
        next
          ? "Kıdem " + (lvl + 1) + " için " + formatDuration(next) + " çalış"
          : "En yüksek kıdemdesin",
        {
          rowClass: "highlight",
          progress: lvl < JOB_MAX_LEVEL ? ((state.jobXp % JOB_XP_PER_LEVEL) / JOB_XP_PER_LEVEL) * 100 : 100,
          button: state.working ? "Paydos" : "İşe Başla",
          buttonClass: state.working ? "owned" : "",
          onClick: toggleWork,
        }
      );
    }

    Object.keys(JOBS).forEach(function (key) {
      var job = JOBS[key];
      var locked = state.edu < job.edu;
      var isCurrent = state.job === key;
      var sub = formatMoney(job.income * legacyMultiplier()) + "/sn · " + EDU[job.edu - 1].name + " gerekli";
      makeRow(job.icon, job.name, sub, {
        rowClass: isCurrent ? "done" : locked ? "locked" : "",
        button: isCurrent ? "Çalışıyorsun" : locked ? "Kilitli 🔒" : "İşe Gir",
        buttonClass: isCurrent || locked ? "owned" : "",
        disabled: isCurrent || locked,
        onClick: locked || isCurrent ? null : function () {
          takeJob(key);
        },
      });
    });
    addNote("Mesaideyken saniye başına maaş kazanırsın; oyun kapalıyken de işlemeye devam eder. Enerjin biterse mesai durur.");
  }

  function takeJob(key) {
    var job = JOBS[key];
    if (state.edu < job.edu) return;
    var changing = state.job && state.job !== key;
    state.job = key;
    if (changing) state.jobXp = 0;
    state.working = true;
    celebrate(job.icon, job.name + " işine girdin!", formatMoney(salaryPerSecond()) + "/sn maaş");
    sfx.purchase();
    render();
    renderPanel();
    saveState();
  }

  function toggleWork() {
    state.working = !state.working;
    showToast(state.working ? "Mesai başladı!" : "Paydos ettin.");
    sfx.coin();
    render();
    renderPanel();
    saveState();
  }

  /* ---------- Bank ---------- */
  function buildBank() {
    els.panelSub.textContent =
      "Faiz " + (bankRate() * 100).toFixed(1) + "%/saat · Bakiye " + formatMoney(state.bank.balance);

    var perHour = state.bank.balance * bankRate();
    makeRow("🏦", "Banka hesabı", formatMoney(perHour) + " /saat faiz kazancı", {
      rowClass: "highlight",
    });

    var amounts = [
      { label: "%25 Yatır", ratio: 0.25 },
      { label: "%50 Yatır", ratio: 0.5 },
      { label: "Tümünü Yatır", ratio: 1 },
    ];
    amounts.forEach(function (a) {
      var amount = Math.floor(state.money * a.ratio);
      makeRow("⬇️", a.label, "Cebindeki paradan " + formatMoney(amount), {
        button: "Yatır",
        buttonClass: amount <= 0 ? "poor" : "",
        onClick: function () {
          deposit(amount);
        },
      });
    });

    makeRow("⬆️", "Parayı çek", "Bankadaki " + formatMoney(state.bank.balance), {
      button: "Çek",
      buttonClass: state.bank.balance <= 0 ? "poor" : "",
      onClick: function () {
        withdraw();
      },
    });

    if (state.bank.level < BANK_MAX_LEVEL) {
      var cost = BANK_UPGRADE_COST[state.bank.level];
      makeRow("📈", "Faiz oranını yükselt", "%" + (bankRate() * 100).toFixed(1) + " → %" + ((bankRate() + BANK_RATE_STEP) * 100).toFixed(1) + "/saat", {
        button: formatMoney(cost),
        buttonClass: state.money < cost ? "poor" : "",
        onClick: function () {
          upgradeBank(cost);
        },
      });
    } else {
      makeRow("📈", "Faiz oranı", "En yüksek seviyede", { button: "MAX ✓", buttonClass: "owned", disabled: true });
    }
    addNote("Bankadaki para faiz işler; oyunu kapatsan bile birikmeye devam eder.");
  }

  function deposit(amount) {
    if (amount <= 0) {
      sfx.deny();
      showToast("Yatıracak paran yok.");
      return;
    }
    state.money -= amount;
    state.bank.balance += amount;
    sfx.coin();
    showToast(formatMoney(amount) + " bankaya yatırıldı.");
    render();
    renderPanel();
    saveState();
  }

  function withdraw() {
    if (state.bank.balance <= 0) {
      sfx.deny();
      showToast("Bankada paran yok.");
      return;
    }
    var amount = Math.floor(state.bank.balance);
    state.money += amount;
    state.bank.balance = 0;
    sfx.coin();
    showToast(formatMoney(amount) + " çekildi.");
    render();
    renderPanel();
    saveState();
  }

  function upgradeBank(cost) {
    if (state.money < cost) {
      sfx.deny();
      showToast("Yetersiz para! Gerekli: " + formatMoney(cost));
      return;
    }
    state.money -= cost;
    state.bank.level += 1;
    celebrate("📈", "Faiz oranı arttı!", "%" + (bankRate() * 100).toFixed(1) + " / saat");
    sfx.purchase();
    render();
    renderPanel();
    saveState();
  }

  function accrueBank(seconds) {
    if (state.bank.balance <= 0 || seconds <= 0) return 0;
    var gain = state.bank.balance * bankRate() * (seconds / 3600);
    state.bank.balance += gain;
    return gain;
  }

  /* ---------- Quests ---------- */
  function buildQuests() {
    refreshQuests();
    var done = state.quests.list.filter(function (q) {
      return q.claimed;
    }).length;
    els.panelSub.textContent = "Günlük görevler · " + done + "/" + state.quests.list.length + " tamamlandı";

    state.quests.list.forEach(function (q) {
      var progress = questProgress(q);
      var ready = progress >= q.target;
      makeRow(q.icon, q.text, progress + " / " + q.target + " · Ödül " + formatMoney(questReward(q)), {
        rowClass: q.claimed ? "done" : ready ? "highlight" : "",
        progress: (progress / q.target) * 100,
        button: q.claimed ? "Alındı ✓" : ready ? "Ödülü Al" : "Devam",
        buttonClass: q.claimed || !ready ? "owned" : "",
        disabled: q.claimed || !ready,
        onClick: ready && !q.claimed ? function () {
          claimQuest(q);
        } : null,
      });
    });
    addNote("Görevler her gün yenilenir. Seri bozulmadan her gün gir, günlük bonusun büyüsün!");
  }

  function claimQuest(q) {
    if (q.claimed || questProgress(q) < q.target) return;
    q.claimed = true;
    var reward = questReward(q);
    state.money += reward;
    bumpStat("earned", reward);
    state.xp += 10;
    levelUpIfReady();
    celebrate("📋", "Görev tamamlandı!", "+" + formatMoney(reward));
    sfx.purchase();
    render();
    renderPanel();
    saveState();
  }

  /* ---------- Scratch card (Kazı Kazan) ----------
     A nine-cell card: three of the same symbol anywhere wins that symbol's
     prize. Tickets and prizes both scale with tap value, so the game stays
     meaningful at every stage; the house edge keeps it from replacing taps. */
  var SCRATCH_SYMBOLS = {
    cherry: { icon: "🍒", mult: 1.5, weight: 45 },
    lemon: { icon: "🍋", mult: 2, weight: 28 },
    bell: { icon: "🔔", mult: 4, weight: 17 },
    diamond: { icon: "💎", mult: 10, weight: 7 },
    seven: { icon: "7️⃣", mult: 25, weight: 2.6 },
    crown: { icon: "👑", mult: 100, weight: 0.4 },
  };
  var SCRATCH_WIN_CHANCE = 0.22;
  var SCRATCH_TICKET_TAPS = 30; // ticket price in "taps worth of money"

  function ticketCost() {
    return Math.max(500, Math.round(tapValue() * SCRATCH_TICKET_TAPS));
  }

  function refreshScratchDay() {
    var today = todayIndex();
    if (state.scratch.day !== today) {
      state.scratch.day = today;
      state.scratch.freeUsed = false;
    }
  }

  function freeCardAvailable() {
    refreshScratchDay();
    return !state.scratch.freeUsed && !state.scratch.card;
  }

  function pickWinningSymbol() {
    var keys = Object.keys(SCRATCH_SYMBOLS);
    var total = keys.reduce(function (sum, k) {
      return sum + SCRATCH_SYMBOLS[k].weight;
    }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < keys.length; i++) {
      roll -= SCRATCH_SYMBOLS[keys[i]].weight;
      if (roll <= 0) return keys[i];
    }
    return keys[0];
  }

  function buildCardCells(winSym) {
    var keys = Object.keys(SCRATCH_SYMBOLS);
    var counts = {};
    var cells = [];
    keys.forEach(function (k) {
      counts[k] = 0;
    });

    if (winSym) {
      for (var w = 0; w < 3; w++) {
        cells.push(winSym);
        counts[winSym]++;
      }
    }
    // Fillers never reach three of a kind, so the card has exactly one result.
    while (cells.length < 9) {
      var options = keys.filter(function (k) {
        return counts[k] < 2 && k !== winSym;
      });
      var pick = options[Math.floor(Math.random() * options.length)];
      cells.push(pick);
      counts[pick]++;
    }

    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cells[i];
      cells[i] = cells[j];
      cells[j] = tmp;
    }
    return cells.map(function (sym) {
      return { sym: sym, revealed: false };
    });
  }

  function buyCard(free) {
    refreshScratchDay();
    if (state.scratch.card) return;
    var cost = free ? 0 : ticketCost();
    if (!free && state.money < cost) {
      sfx.deny();
      showToast("Bilet için yeterli paran yok.");
      return;
    }
    if (free && state.scratch.freeUsed) return;

    state.money -= cost;
    if (free) state.scratch.freeUsed = true;

    var winSym = Math.random() < SCRATCH_WIN_CHANCE ? pickWinningSymbol() : null;
    var basis = free ? ticketCost() : cost;
    state.scratch.card = {
      cells: buildCardCells(winSym),
      winSym: winSym,
      prize: winSym ? Math.round(basis * SCRATCH_SYMBOLS[winSym].mult) : 0,
      paid: cost,
      done: false,
      claimed: false,
    };
    bumpStat("scratches", 1);
    sfx.coin();
    render();
    renderPanel();
    saveState();
  }

  function revealCell(idx) {
    var card = state.scratch.card;
    if (!card || card.cells[idx].revealed) return;
    card.cells[idx].revealed = true;
    sfx.tap();
    if (card.cells.every(function (c) {
      return c.revealed;
    })) {
      finishCard();
    } else {
      renderPanel();
      saveState();
    }
  }

  function revealAll() {
    var card = state.scratch.card;
    if (!card) return;
    card.cells.forEach(function (c) {
      c.revealed = true;
    });
    finishCard();
  }

  function finishCard() {
    var card = state.scratch.card;
    if (!card || card.done) return;
    card.done = true;

    if (card.winSym) {
      var sym = SCRATCH_SYMBOLS[card.winSym];
      state.money += card.prize;
      bumpStat("earned", card.prize);
      bumpStat("scratchWins", 1);
      bumpStat("scratchWon", card.prize);
      if (card.winSym === "crown") bumpStat("jackpots", 1);
      celebrate(sym.icon, card.winSym === "crown" ? "JACKPOT!" : "Kazandın!", "+" + formatMoney(card.prize));
      sfx.purchase();
    } else {
      showToast("Bu kart tutmadı. Bir dahaki sefere!");
      sfx.deny();
    }
    render();
    renderPanel();
    saveState();
  }

  function discardCard() {
    state.scratch.card = null;
    renderPanel();
    saveState();
  }

  function buildLottery() {
    refreshScratchDay();
    var card = state.scratch.card;
    els.panelSub.textContent = freeCardAvailable()
      ? "Bugün 1 ücretsiz kartın var! · Bilet " + formatMoney(ticketCost())
      : "Bilet " + formatMoney(ticketCost()) + " · Toplam kazanç " + formatMoney(state.stats.scratchWon || 0);

    if (card) {
      var grid = document.createElement("div");
      grid.className = "scratch-grid" + (card.done ? " done" : "");
      card.cells.forEach(function (cell, idx) {
        var btn = document.createElement("button");
        btn.className = "scratch-cell" + (cell.revealed ? " open" : "");
        if (card.done && card.winSym === cell.sym) btn.classList.add("hit");
        btn.textContent = cell.revealed ? SCRATCH_SYMBOLS[cell.sym].icon : "?";
        btn.addEventListener("click", function () {
          revealCell(idx);
        });
        grid.appendChild(btn);
      });
      els.panelBody.appendChild(grid);

      if (card.done) {
        var result = document.createElement("div");
        result.className = "scratch-result" + (card.winSym ? " win" : "");
        result.textContent = card.winSym
          ? SCRATCH_SYMBOLS[card.winSym].icon + " ×3 → " + formatMoney(card.prize) + " kazandın!"
          : "Üç aynı sembol çıkmadı.";
        els.panelBody.appendChild(result);
        makeRow("🎫", "Kartı bitir", "Yeni bir bilet almak için kartı kapat", {
          rowClass: "highlight",
          button: "Yeni Kart",
          onClick: discardCard,
        });
      } else {
        makeRow("✋", "Kartı kazı", "Kutulara dokun ya da hepsini birden aç", {
          rowClass: "highlight",
          button: "Hepsini Kazı",
          onClick: revealAll,
        });
      }
    } else {
      if (freeCardAvailable()) {
        makeRow("🎁", "Günlük ücretsiz kart", "Her gün bir kart bedava, kaçırma!", {
          rowClass: "highlight",
          button: "Ücretsiz Al",
          onClick: function () {
            buyCard(true);
          },
        });
      }
      var poor = state.money < ticketCost();
      makeRow("🎟️", "Kazı kazan bileti", "9 kutudan 3'ü aynı çıkarsa ikramiye senin", {
        button: formatMoney(ticketCost()),
        buttonClass: poor ? "poor" : "",
        disabled: poor,
        onClick: poor ? null : function () {
          buyCard(false);
        },
      });
    }

    addNote("İkramiye tablosu (bilet bedelinin katı olarak)");
    Object.keys(SCRATCH_SYMBOLS).forEach(function (key) {
      var sym = SCRATCH_SYMBOLS[key];
      makeRow(sym.icon, sym.icon + " ×3", "Bilet bedelinin " + sym.mult + " katı · " + formatMoney(ticketCost() * sym.mult), {
        rowClass: "locked",
      });
    });
    addNote("Oynanan kart: " + (state.stats.scratches || 0) + " · Kazanılan: " + (state.stats.scratchWins || 0));
  }

  /* ---------- Records ---------- */
  function makeStatGrid(items) {
    var grid = document.createElement("div");
    grid.className = "stat-grid";
    items.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "stat-card" + (item.wide ? " wide" : "");
      var label = document.createElement("div");
      label.className = "stat-label";
      label.textContent = item.label;
      var value = document.createElement("div");
      value.className = "stat-value";
      value.textContent = item.value;
      card.appendChild(label);
      card.appendChild(value);
      grid.appendChild(card);
    });
    els.panelBody.appendChild(grid);
  }

  function buildRecords() {
    var s = state.stats;
    els.panelSub.textContent =
      "Seviye " + state.level + " · Gün " + state.day + " · " + state.prestiges + " kez yeniden doğdun";

    addNote("🏅 Kişisel rekorlar");
    makeStatGrid([
      { label: "En yüksek tek tık", value: formatMoney(s.bestTap || 0) },
      { label: "En uzun kombo", value: (s.bestCombo || 0) + "×" },
      { label: "En uzun giriş serisi", value: (s.bestStreak || 0) + " gün" },
      { label: "Kazı kazan kazancı", value: formatMoney(s.scratchWon || 0) },
    ]);

    addNote("📈 Toplamlar");
    makeStatGrid([
      { label: "Toplam dokunuş", value: (s.taps || 0).toLocaleString("tr-TR") },
      { label: "Toplam kazanç", value: formatMoney(s.earned || 0) },
      { label: "Kritik vuruş", value: (s.crits || 0).toLocaleString("tr-TR") },
      { label: "Altın para", value: (s.golds || 0).toLocaleString("tr-TR") },
      { label: "Çalışma süresi", value: s.workSec ? formatDuration(s.workSec) : "0d" },
      { label: "Eşya yükseltme", value: (s.upgrades || 0).toLocaleString("tr-TR") },
      { label: "Yenen yemek", value: (s.eats || 0).toLocaleString("tr-TR") },
      { label: "Uyuma", value: (s.sleeps || 0).toLocaleString("tr-TR") },
      { label: "Mama verme", value: (s.petFeeds || 0).toLocaleString("tr-TR") },
      { label: "Oynanan kart", value: (s.scratches || 0).toLocaleString("tr-TR") },
    ]);

    addNote("✖️ Aktif çarpanlar");
    var ev = activeEvent();
    makeStatGrid([
      { label: "Eğitim", value: "×" + eduMultiplier().toFixed(2) },
      { label: "Ev eşyaları", value: "×" + homeMultiplier().toFixed(2) },
      { label: "Miras", value: "×" + legacyMultiplier().toFixed(2) },
      { label: "Etkinlik", value: ev ? "×" + ev.mult.toFixed(2) : "yok" },
      { label: "Tık başına", value: formatMoney(tapValue()), wide: true },
    ]);

    addNote("Rekorlar prestijden etkilenmez; hepsi tüm hayatların toplamıdır.");
  }

  /* ---------- Seasonal events ---------- */
  function buildEvents() {
    var current = activeEvent();
    els.panelSub.textContent = current
      ? current.icon + " " + current.name + " sürüyor · kazanç ×" + current.mult
      : "Şu an aktif etkinlik yok";

    if (current) {
      makeRow(current.icon, current.name, current.desc, { rowClass: "highlight" });
    } else {
      makeRow("🎉", "Hafta Sonu Bonusu", WEEKEND_EVENT.desc, { rowClass: "locked" });
    }

    addNote("📅 Yıl boyunca etkinlikler");
    EVENTS.forEach(function (ev) {
      var on = current && current.id === ev.id;
      var when = ev.from[1] + "." + ev.from[0] + " – " + ev.to[1] + "." + ev.to[0];
      makeRow(ev.icon, ev.name, on ? "Şu an aktif! · kazanç ×" + ev.mult : when + " · ×" + ev.mult + " · " + formatDays(msUntilEvent(ev)), {
        rowClass: on ? "done" : "locked",
      });
    });
    addNote("Etkinlik günlerinde hem tık kazancın hem de maaşın çarpanla artar. Hafta sonları her zaman ×1.25!");
  }

  /* ---------- Achievements & prestige ---------- */
  function buildAchievements() {
    var unlocked = ACHIEVEMENTS.filter(function (a) {
      return state.ach[a.id];
    }).length;
    els.panelSub.textContent =
      unlocked + "/" + ACHIEVEMENTS.length + " başarım · Miras ×" + legacyMultiplier().toFixed(2) +
      " · 💎 " + state.perkPoints + " puan";

    var canPrestige = state.stats.earned >= PRESTIGE_MIN_EARNED;
    var gain = prestigeGain();
    makeRow("🌟", "Yeni Hayat (Prestij)", canPrestige
      ? "Her şeyi sıfırla, +" + gain + " miras puanı kazan (kalıcı +%" + Math.round(gain * LEGACY_BONUS * 100) + ")"
      : "Toplam " + formatMoney(PRESTIGE_MIN_EARNED) + " kazanınca açılır (" + formatMoney(state.stats.earned) + ")", {
      rowClass: canPrestige ? "highlight" : "locked",
      progress: (state.stats.earned / PRESTIGE_MIN_EARNED) * 100,
      button: canPrestige ? "Yeniden Doğ" : "Kilitli 🔒",
      buttonClass: canPrestige ? "" : "owned",
      disabled: !canPrestige,
      onClick: canPrestige ? doPrestige : null,
    });

    addNote("💎 Kalıcı Yetenekler — miras puanıyla satın al, prestij sonrası da kalır");
    Object.keys(PERKS).forEach(function (key) {
      var cfg = PERKS[key];
      var level = state.perks[key];
      var maxed = level >= cfg.maxLevel;
      var cost = perkCost(key);
      var affordable = !maxed && state.perkPoints >= cost;
      makeRow(cfg.icon, cfg.name + " (Seviye " + level + "/" + cfg.maxLevel + ")",
        cfg.desc + (maxed ? " · Maksimum seviyede" : " · Bedeli 💎 " + cost), {
        rowClass: maxed ? "done" : affordable ? "highlight" : "locked",
        progress: (level / cfg.maxLevel) * 100,
        button: maxed ? "Tamam ✓" : "Satın Al",
        buttonClass: maxed ? "owned" : affordable ? "" : "owned",
        disabled: maxed || !affordable,
        onClick: !maxed ? function () {
          buyPerk(key);
        } : null,
      });
    });

    addNote("🏆 Başarımlar");
    ACHIEVEMENTS.forEach(function (a) {
      var have = !!state.ach[a.id];
      var ready = !have && a.test(state);
      var reward = a.legacy ? "+" + a.legacy + " miras puanı" : formatMoney(a.money);
      makeRow(a.icon, a.name, a.desc + " · Ödül " + reward, {
        rowClass: have ? "done" : ready ? "highlight" : "locked",
        button: have ? "Alındı ✓" : ready ? "Ödülü Al" : "Kilitli 🔒",
        buttonClass: have ? "owned" : ready ? "" : "owned",
        disabled: have || !ready,
        onClick: ready ? function () {
          claimAchievement(a);
        } : null,
      });
    });
  }

  function claimAchievement(a) {
    if (state.ach[a.id] || !a.test(state)) return;
    state.ach[a.id] = true;
    if (a.money) {
      state.money += a.money;
      bumpStat("earned", a.money);
    }
    if (a.legacy) {
      state.legacy += a.legacy;
      state.perkPoints += a.legacy;
    }
    celebrate(a.icon, a.name, a.legacy ? "+" + a.legacy + " miras puanı" : "+" + formatMoney(a.money));
    sfx.purchase();
    render();
    renderPanel();
    saveState();
  }

  function prestigeGain() {
    return Math.max(1, Math.floor(Math.sqrt(state.stats.earned / 1000000)));
  }

  function doPrestige() {
    if (state.stats.earned < PRESTIGE_MIN_EARNED) return;
    var gain = prestigeGain();
    state.legacy += gain;
    state.perkPoints += gain;
    state.prestiges += 1;

    state.money = 0;
    state.level = 1;
    state.xp = 0;
    state.day = 1;
    state.health = 100;
    state.energy = 100;
    state.hunger = 100;
    state.isSleeping = false;
    state.furniture = { bed: 1, fridge: 1, plant: 1 };
    Object.keys(SHOP_ITEMS).forEach(function (k) {
      state.items[k] = 0;
    });
    state.edu = 0;
    state.eduStudy = null;
    state.job = null;
    state.jobXp = 0;
    state.working = false;
    state.bank.balance = 0;
    state.pet.happiness = 100;

    celebrate("🌟", "Yeni hayat başladı!", "+" + gain + " miras puanı · kalıcı ×" + legacyMultiplier().toFixed(2));
    sfx.purchase();
    render();
    renderPanel();
    saveState();
  }

  function buyPerk(key) {
    var cfg = PERKS[key];
    if (!cfg) return;
    var level = state.perks[key];
    if (level >= cfg.maxLevel) return;
    var cost = perkCost(key);
    if (state.perkPoints < cost) {
      sfx.deny();
      showToast("Yeterli miras puanın yok.");
      return;
    }
    state.perkPoints -= cost;
    state.perks[key] = level + 1;
    celebrate(cfg.icon, cfg.name + " geliştirildi!", "Seviye " + (level + 1) + "/" + cfg.maxLevel);
    sfx.purchase();
    render();
    renderPanel();
    saveState();
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

    bumpCombo();
    var crit = Math.random() < critChance();
    var earned = Math.round(tapValue() * comboMultiplier() * (crit ? critMultiplier() : 1));
    state.money += earned;
    state.energy = clamp(state.energy - tapEnergyCost(), 0, 100);
    state.xp += TAP_XP_GAIN;
    state.taps += 1;
    bumpStat("taps", 1);
    bumpStat("earned", earned);
    if (crit) bumpStat("crits", 1);
    if (earned > (state.stats.bestTap || 0)) state.stats.bestTap = earned;
    if (comboCount > (state.stats.bestCombo || 0)) state.stats.bestCombo = comboCount;

    pushPill((crit ? "KRİTİK ×" + critMultiplier() + "  " : "") + "+ " + formatMoney(earned) + " 💰", false, crit);
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
    if (state.viewRoom !== "bedroom") setRoom("bedroom", true);
    state.isSleeping = !state.isSleeping;
    if (state.isSleeping) {
      bumpStat("sleeps", 1);
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
    bumpStat("eats", 1);
    pushPill("+" + FOOD_HUNGER_GAIN + " 🍗", false);
    showToast("Karnını doyurdun!");
    characterEat();
    render();
    saveState();
  }

  function onUpgrade(key) {
    openBuySheet("furniture", key);
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

      if (isWorking()) {
        var wage = salaryPerSecond() * (PASSIVE_TICK_MS / 1000);
        state.money += wage;
        bumpStat("earned", wage);
        bumpStat("workSec", PASSIVE_TICK_MS / 1000);
        state.jobXp += PASSIVE_TICK_MS / 1000;
        state.energy = clamp(state.energy - 1, 0, 100);
        if (state.energy <= 0) {
          state.working = false;
          showToast("Enerjin bitti, mesai durdu!");
        }
      }
    }

    accrueBank(PASSIVE_TICK_MS / 1000);
    tickStudy();
    if (state.items.pet > 0) {
      state.pet.happiness = clamp(state.pet.happiness - 0.3 * (PASSIVE_TICK_MS / 3000), 0, 100);
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
    if (e.target.closest(".furniture, .upgrade-badge, .quest-icon, .side-icon, .room-item, .room-door")) return;
    var rect = els.scene.getBoundingClientRect();
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top);
    lastTapPoint = { x: e.clientX, y: e.clientY };
    lastTapAt = Date.now();
    sfx.tap();
    showTapHint(false);
    onTap();
  });

  els.bedBtn.addEventListener("click", onBed);
  els.fridgeBtn.addEventListener("click", onFridge);
  els.petItem.addEventListener("click", function (e) {
    e.stopPropagation();
    feedPet();
  });
  els.questBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    openPanel("quests");
  });
  els.lotteryBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    openPanel("lottery");
  });
  els.recordsBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    openPanel("records");
  });
  els.eventBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    openPanel("events");
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

  document.querySelectorAll(".room-door").forEach(function (door) {
    door.addEventListener("click", function (e) {
      e.stopPropagation();
      setRoom(door.getAttribute("data-goto"));
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
        closePanel();
        return;
      }
      if (target === "shop") {
        closePanel();
        openShop();
        return;
      }
      openPanel(target);
    });
  });

  function backToHome() {
    closeShop();
    closePanel();
    navButtons.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === "home");
    });
  }

  els.panelClose.addEventListener("click", backToHome);
  els.panel.addEventListener("click", function (e) {
    if (e.target === els.panel) backToHome();
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

  els.buyClose.addEventListener("click", closeBuySheet);
  els.buySheet.addEventListener("click", function (e) {
    if (e.target === els.buySheet) closeBuySheet();
  });
  els.buyConfirm.addEventListener("click", confirmPurchase);
  els.muteBtn.addEventListener("click", function () {
    state.muted = !state.muted;
    if (!state.muted) sfx.coin();
    render();
    saveState();
  });

  setInterval(function () {
    passiveTick();
  }, PASSIVE_TICK_MS);

  setRoom(state.viewRoom === "kitchen" ? "kitchen" : "bedroom", true);
  refreshQuests();
  checkStreak();
  scheduleGoldCoin();

  (function grantOfflineEarnings() {
    var elapsedSec = Math.floor((Date.now() - (state.lastSeen || Date.now())) / 1000);
    var countedSec = Math.min(Math.max(elapsedSec, 0), OFFLINE_MAX_SECONDS);
    if (state.items.pet > 0) {
      state.pet.happiness = clamp(state.pet.happiness - 0.1 * Math.max(elapsedSec, 0), 0, 100);
    }
    if (countedSec < OFFLINE_MIN_SECONDS) return;

    var idle = offlineRatePerSecond() * countedSec;
    var wages = isWorking() ? salaryPerSecond() * countedSec : 0;
    var interest = accrueBank(countedSec);
    var earnings = Math.round(idle + wages);
    if (earnings > 0) {
      state.money += earnings;
      bumpStat("earned", earnings);
      if (wages > 0) bumpStat("workSec", countedSec);
    }
    if (earnings <= 0 && interest <= 0) return;

    var parts = [];
    if (earnings > 0) parts.push(formatMoney(earnings));
    if (interest >= 1) parts.push(formatMoney(interest) + " faiz");
    showToast(formatDuration(countedSec) + " yoktun, " + parts.join(" + ") + " kazandın!");
    saveState();
  })();

  render();
})();
