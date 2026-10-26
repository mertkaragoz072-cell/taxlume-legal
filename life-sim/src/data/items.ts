import type { Effects } from '../core/types';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  kind: 'ingredient' | 'ready' | 'drink';
  /** Shop price (used by the grocery milestone; every purchase will go through the economy service). */
  price: number;
  /** Effects when eaten/drunk directly. Ingredients without effects can only be cooked. */
  effects?: Effects;
  /** Minutes it takes to consume. */
  minutes?: number;
  note?: string;
}

export const ITEMS: Record<string, ItemDef> = {
  bread: { id: 'bread', name: 'Bread', icon: '🍞', kind: 'ready', price: 2, effects: { hunger: -14, energy: 2 }, minutes: 5 },
  apple: { id: 'apple', name: 'Apple', icon: '🍎', kind: 'ready', price: 1, effects: { hunger: -8, hydration: 5, health: 1 }, minutes: 3 },
  noodles: { id: 'noodles', name: 'Instant noodles', icon: '🍜', kind: 'ready', price: 2, effects: { hunger: -26, energy: 2, happiness: -1 }, minutes: 8, note: 'Cheap, filling, not healthy.' },
  milk: { id: 'milk', name: 'Milk', icon: '🥛', kind: 'drink', price: 2, effects: { hunger: -5, hydration: 14, health: 1 }, minutes: 2 },
  water: { id: 'water', name: 'Bottled water', icon: '💧', kind: 'drink', price: 1, effects: { hydration: 30 }, minutes: 2 },
  eggs: { id: 'eggs', name: 'Eggs', icon: '🥚', kind: 'ingredient', price: 1, note: 'Cook them.' },
  rice: { id: 'rice', name: 'Rice (portion)', icon: '🍚', kind: 'ingredient', price: 1 },
  pasta: { id: 'pasta', name: 'Pasta (portion)', icon: '🍝', kind: 'ingredient', price: 1 },
  tomato: { id: 'tomato', name: 'Tomato', icon: '🍅', kind: 'ingredient', price: 1 },
  chicken: { id: 'chicken', name: 'Chicken breast', icon: '🍗', kind: 'ingredient', price: 4 },
};

/** What a brand-new household owns. Everything beyond this must be bought with money. */
export const START_INVENTORY: Record<string, number> = {
  bread: 3,
  apple: 3,
  noodles: 2,
  milk: 2,
  water: 3,
  eggs: 4,
  rice: 3,
  pasta: 2,
  tomato: 3,
  chicken: 2,
};
