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
    items: { rug: 0, lamp: 0, picture: 0, shelf: 0, tv: 0 },
    lastSeen: Date.now(),
  };

  // Room decor: level 0 = not owned. Levels 1-3 basic art, 4-6 standard, 7-9 modern/luxury.
  var SHOP_ITEMS = {
    rug: { name: "Halı", icon: "🧶", baseCost: 2000, growth: 1.5, bonus: 0.02, maxLevel: 9 },
    lamp: { name: "Lambader", icon: "💡", baseCost: 3500, growth: 1.5, bonus: 0.03, maxLevel: 9 },
    picture: { name: "Tablo", icon: "🖼️", baseCost: 5000, growth: 1.5, bonus: 0.03, maxLevel: 9 },
    shelf: { name: "Kitaplık", icon: "📚", baseCost: 8000, growth: 1.5, bonus: 0.04, maxLevel: 9 },
    tv: { name: "Televizyon", icon: "📺", baseCost: 12000, growth: 1.5, bonus: 0.05, maxLevel: 9 },
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
  }

  function renderRoomItems() {
    var nodes = document.querySelectorAll(".room-item");
    nodes.forEach(function (node) {
      var key = node.getAttribute("data-item");
      var level = state.items[key];
      var cfg = SHOP_ITEMS[key];
      var maxed = level >= cfg.maxLevel;

      node.classList.toggle("owned", level > 0);
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
      showToast(item.name + " alındı! +%" + Math.round(item.bonus * 100) + " kazanç");
    } else if (tierAfter !== tierBefore) {
      showToast(item.name + " yenilendi: " + ITEM_TIER_NAMES[tierAfter] + " model!");
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

    pushPill("+ $" + earned + " 💰", false);
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
    showToast(cfg.name + " seviye " + state.furniture[key] + "! Kazanç arttı.");
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
    document.getElementById(key + "UpgradeBtn").addEventListener("click", function (e) {
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
