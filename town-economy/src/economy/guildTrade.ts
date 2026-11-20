import { eventFields } from "../i18n/t";
import { EVENT_LOG_CAP } from "./constants";
import { storageCapacity, totalGoodsHolding } from "./formulas";
import { GOODS_BY_ID } from "./goods";
import { EconomyEvent, EconomyState, GoodId } from "./types";

/** Goods leaving for a friend or the guild's weekly order. Takes what the
 * player actually holds, up to `qty`; the guild server decided how much it
 * accepts, this only mirrors it in the player's stock. */
export function applyGuildGoodsOut(
  state: EconomyState,
  goodId: GoodId,
  qty: number,
  to: "order" | "friend"
): EconomyState {
  const good = GOODS_BY_ID[goodId];
  const held = state.goods[goodId];
  if (!good || !held) return state;
  const taken = Math.min(Math.max(0, Math.floor(qty)), Math.floor(held.holding));
  if (taken <= 0) return state;
  const holding = held.holding - taken;
  const event: EconomyEvent = {
    id: state.nextId,
    ...eventFields(state.language, to === "order" ? "msg.guildOrderGiven" : "msg.guildGiftGiven", {
      qty: taken,
      icon: good.icon,
      good: { key: good.nameKey },
    }),
    tone: "good",
  };
  return {
    ...state,
    goods: { ...state.goods, [goodId]: { ...held, holding, avgCost: holding > 0 ? held.avgCost : 0 } },
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

/** How many units of goods the warehouse can still take. */
export function guildStorageRoom(state: EconomyState): number {
  return Math.max(0, Math.floor(storageCapacity(state) - totalGoodsHolding(state)));
}

/** Goods a friend sent arriving in the warehouse. Booked at today's price, so a
 * gift is not counted as profit when it is later sold. The caller only
 * collects what fits (see guildStorageRoom), so nothing is dropped here. */
export function applyGuildGoodsIn(
  state: EconomyState,
  goodId: GoodId,
  qty: number,
  fromName: string
): EconomyState {
  const good = GOODS_BY_ID[goodId];
  const held = state.goods[goodId];
  const add = Math.floor(qty);
  if (!good || !held || add <= 0) return state;
  const holding = held.holding + add;
  const avgCost = (held.holding * held.avgCost + add * held.price) / holding;
  const event: EconomyEvent = {
    id: state.nextId,
    ...eventFields(state.language, "msg.guildGiftReceived", {
      from: fromName,
      qty: add,
      icon: good.icon,
      good: { key: good.nameKey },
    }),
    tone: "good",
  };
  return {
    ...state,
    goods: { ...state.goods, [goodId]: { ...held, holding, avgCost } },
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}
