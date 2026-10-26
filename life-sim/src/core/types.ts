export type LocationId =
  | 'home'
  | 'gym'
  | 'office'
  | 'grocery'
  | 'cafe'
  | 'restaurant'
  | 'clothing'
  | 'tattoo'
  | 'barber'
  | 'city'
  | 'park'
  | 'beach'
  | 'cinema'
  | 'nightclub'
  | 'clinic';

export type ExerciseId = 'bench' | 'squat' | 'deadlift' | 'pullup' | 'curl' | 'cardio';

export type TransactionCategory =
  | 'wages'
  | 'rent'
  | 'bills'
  | 'groceries'
  | 'food'
  | 'gym'
  | 'entertainment'
  | 'shopping'
  | 'personalization'
  | 'health'
  | 'travel'
  | 'other';

export type HomeRoom = 'bedroom' | 'study' | 'living' | 'kitchen' | 'bathroom';
export const HOME_ROOMS: HomeRoom[] = ['bedroom', 'study', 'living', 'kitchen', 'bathroom'];

/** Immediate stat changes an item or activity can apply (needs: hunger is "reduction" = negative). */
export interface Effects {
  hunger?: number;
  hydration?: number;
  energy?: number;
  health?: number;
  happiness?: number;
  wellbeing?: number;
  sleepiness?: number;
  /** Negative = recovery (burns workout recovery debt). */
  fatigue?: number;
  xp?: number;
  skillOffice?: number;
}
