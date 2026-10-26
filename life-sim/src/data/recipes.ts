import type { Effects } from '../core/types';

export interface RecipeDef {
  id: string;
  name: string;
  icon: string;
  ingredients: Record<string, number>;
  /** Cooking + eating time. */
  minutes: number;
  effects: Effects;
  quality: 'basic' | 'good' | 'balanced';
}

/** Home cooking is cheaper and healthier than buying meals out; balanced meals also speed up recovery. */
export const RECIPES: RecipeDef[] = [
  { id: 'eggs_toast', name: 'Eggs on toast', icon: '🍳', ingredients: { eggs: 2, bread: 1 }, minutes: 20, quality: 'basic', effects: { hunger: -32, energy: 4, happiness: 2 } },
  { id: 'pasta_tomato', name: 'Tomato pasta', icon: '🍝', ingredients: { pasta: 1, tomato: 1 }, minutes: 25, quality: 'good', effects: { hunger: -42, energy: 6, happiness: 3, health: 1 } },
  { id: 'chicken_rice', name: 'Chicken & rice', icon: '🍛', ingredients: { chicken: 1, rice: 1, tomato: 1 }, minutes: 40, quality: 'balanced', effects: { hunger: -58, energy: 8, happiness: 4, health: 3, fatigue: -8 } },
];

export const recipeById = (id: string): RecipeDef | undefined => RECIPES.find((r) => r.id === id);
