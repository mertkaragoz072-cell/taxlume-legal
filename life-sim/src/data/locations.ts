import type { LocationId } from '../core/types';

export interface LocationDef {
  id: LocationId;
  name: string;
  icon: string;
  blurb: string;
  /** Milestone in which the location becomes playable. */
  milestone: number;
  /** Opening hours [from, to) in 24h game time; omitted = always open. */
  hours?: [number, number];
}

export const LOCATIONS: LocationDef[] = [
  { id: 'gym', name: 'Iron Works Gym', icon: '🏋️', blurb: 'Train, pay for membership.', milestone: 1, hours: [5, 23] },
  { id: 'home', name: 'Home', icon: '🏠', blurb: 'Sleep, eat, cook, shower, relax, study.', milestone: 2 },
  { id: 'office', name: 'Workplaces', icon: '💼', blurb: 'Job board, shifts, promotions.', milestone: 3 },
  { id: 'grocery', name: 'Grocery Market', icon: '🛒', blurb: 'Buy ingredients for home cooking.', milestone: 4 },
  { id: 'cafe', name: 'Café', icon: '☕', blurb: 'Coffee and snacks, meet friends.', milestone: 4 },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', blurb: 'Premium meals.', milestone: 4 },
  { id: 'city', name: 'City Center', icon: '🏙️', blurb: 'Travel hub.', milestone: 4 },
  { id: 'park', name: 'Park', icon: '🌳', blurb: 'Free, relaxing walks.', milestone: 4 },
  { id: 'beach', name: 'Beach Walk', icon: '🏖️', blurb: 'Scenic walking area.', milestone: 5 },
  { id: 'cinema', name: 'Cinema', icon: '🎬', blurb: 'Movies for happiness.', milestone: 5 },
  { id: 'nightclub', name: 'Nightclub', icon: '🪩', blurb: 'Nightlife and social events.', milestone: 5 },
  { id: 'clinic', name: 'Clinic', icon: '🏥', blurb: 'Recovery and healthcare.', milestone: 5 },
  { id: 'clothing', name: 'Clothing Store', icon: '👕', blurb: 'Tops, bottoms, shoes, accessories.', milestone: 6 },
  { id: 'barber', name: 'Barber', icon: '💈', blurb: 'Hair and grooming.', milestone: 6 },
  { id: 'tattoo', name: 'Tattoo Studio', icon: '🖋️', blurb: 'Designs and placements.', milestone: 6 },
];

export const locationById = (id: string): LocationDef | undefined => LOCATIONS.find((l) => l.id === id);
