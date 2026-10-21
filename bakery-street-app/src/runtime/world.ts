// Everything the game consists of, created once: the game rules (src/game), the scenes (src/scene) and the save. The UI reads from it.
import { PLAYER } from "../config.js";
import { Game } from "../game/game.js";
import { Cafe } from "../game/customers.js";
import { Quests } from "../game/quests.js";
import { DailyReward } from "../game/daily.js";
import { Settings } from "../game/settings.js";
import { SaveManager, safeStorage } from "../game/save.js";
import { Exploration } from "../game/exploration.js";
import { Research } from "../game/research.js";
import { Town } from "../game/town.js";
import { Progression } from "../game/progression.js";
import { StreetScene } from "../scene/street-scene.js";
import { InteriorScene } from "../scene/interior-scene.js";
import { MarketScene } from "../scene/market-scene.js";
import { ExploreScene } from "../scene/explore-scene.js";
import { MARKET_PROPS, BOOKSHOP_PROPS } from "../scene/scene-props.js";
import { bakery } from "../buildings/bakery.js";
import { bookshop } from "../buildings/bookshop.js";
import { market } from "../buildings/market.js";
import { NativeStorage } from "./storage";

export type SceneId = "street" | "interior" | "market" | "bookshop" | "explore";

export interface World {
  storage: NativeStorage;
  settings: any; game: any; progression: any; town: any; exploration: any; research: any; quests: any; daily: any; cafe: any; saves: any;
  scenes: Record<SceneId, any>;
  /** problems reported by the save code, shown to the player */
  problems: string[];
  loadResult: { status: string; summary: string };
}

/** Builds the world on top of an already hydrated storage; restores the save and credits production finished while the app was closed. */
export function createWorld(storage: NativeStorage, onProblem: (msg: string) => void): World {
  const store = safeStorage(storage);
  const problems: string[] = [];
  const report = (m: string) => { problems.push(m); onProblem(m); };
  const settings = new Settings(store, { onProblem: ({ message }: { message: string }) => report(message) });
  settings.load();
  const game = new Game(PLAYER);
  const progression = new Progression(game);
  const town = new Town(game);
  const exploration = new Exploration(game);
  const research = new Research(game);
  const quests = new Quests(game);
  const daily = new DailyReward(game);
  const cafe = new Cafe(game);
  const saves = new SaveManager(game, store, { onProblem: ({ message }: { message: string }) => report(message), onRecover: () => {} });
  saves.attach();
  const scenes = {
    street: new StreetScene(),
    interior: new InteriorScene(game),
    market: new MarketScene("market", "market", MARKET_PROPS as any),
    bookshop: new MarketScene("bookshop", "bookshop", BOOKSHOP_PROPS as any),
    explore: new ExploreScene(exploration),
  };
  const loaded = saves.load();
  const finished: Record<string, number> = {};
  const off = game.on("complete", ({ product }: { product: string }) => { finished[product] = (finished[product] ?? 0) + 1; });
  game.tick();
  off?.();
  const summary = Object.entries(finished).map(([id, n]) => `${(game.productsDef as any)[id].icon} ×${n}`).join("  ");
  bakery.configure();
  bookshop.configure();
  market.configure();
  return { storage, settings, game, progression, town, exploration, research, quests, daily, cafe, saves, scenes, problems, loadResult: { status: loaded.status, summary } };
}
