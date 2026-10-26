import type { HomeRoom } from '../core/types';

export type PoseKind = 'stand' | 'sit' | 'lie' | 'sitLean';

/** One interactable piece of furniture. `x` is where the character stands/sits (room-local metres). */
export interface HomeObject {
  id: string;
  label: string;
  icon: string;
  x: number;
  /** Centre of the furniture / tap area when it differs from the standing spot. */
  hitX?: number;
  facing: 1 | -1;
  pose: PoseKind;
  /** Height of the surface the character rests on (seat / mattress top). */
  surfaceY: number;
  /** Width of the tap area around the object. */
  width: number;
  height: number;
}

/** Only objects with working actions are interactable; everything else in a room is set dressing. */
export interface RoomDef {
  id: HomeRoom;
  name: string;
  short: string;
  icon: string;
  /** Walkable range for the character and the camera. */
  minX: number;
  maxX: number;
  doorX: number;
  objects: HomeObject[];
}

export const ROOMS: Record<HomeRoom, RoomDef> = {
  bedroom: {
    id: 'bedroom', short: 'Bed', name: 'Bedroom', icon: '🛏️', minX: -2.9, maxX: 2.9, doorX: 2.5,
    objects: [
      { id: 'bed', label: 'Bed', icon: '🛏️', x: -1.58, hitX: -1.1, facing: 1, pose: 'lie', surfaceY: 0.5, width: 2.1, height: 0.9 },
    ],
  },
  study: {
    id: 'study', short: 'Study', name: 'Study', icon: '💻', minX: -2.9, maxX: 2.9, doorX: -2.5,
    objects: [
      { id: 'computer', label: 'Computer', icon: '💻', x: -0.3, hitX: 0.6, facing: 1, pose: 'sit', surfaceY: 0.46, width: 1.7, height: 1.3 },
    ],
  },
  living: {
    id: 'living', short: 'Living', name: 'Living room', icon: '🛋️', minX: -2.9, maxX: 2.9, doorX: -2.5,
    objects: [
      { id: 'tv', label: 'Sofa & TV', icon: '📺', x: -0.4, hitX: 0.4, facing: 1, pose: 'sitLean', surfaceY: 0.42, width: 3.0, height: 1.0 },
    ],
  },
  kitchen: {
    id: 'kitchen', short: 'Kitchen', name: 'Kitchen', icon: '🍳', minX: -2.9, maxX: 2.9, doorX: 2.5,
    objects: [
      { id: 'stove', label: 'Stove', icon: '🍳', x: -0.5, hitX: -0.5, facing: -1, pose: 'stand', surfaceY: 0, width: 0.9, height: 1.2 },
      { id: 'sink', label: 'Sink', icon: '🚰', x: 0.6, facing: -1, pose: 'stand', surfaceY: 0, width: 0.9, height: 1.2 },
      { id: 'table', label: 'Dining table', icon: '🍽️', x: 1.65, hitX: 2.3, facing: 1, pose: 'sit', surfaceY: 0.46, width: 1.8, height: 0.9 },
    ],
  },
  bathroom: {
    id: 'bathroom', short: 'Bath', name: 'Bathroom', icon: '🚿', minX: -2.9, maxX: 2.9, doorX: 2.5,
    objects: [
      { id: 'shower', label: 'Shower', icon: '🚿', x: -1.6, hitX: -1.7, facing: 1, pose: 'stand', surfaceY: 0, width: 1.4, height: 2.2 },
    ],
  },
};

export const objectById = (room: HomeRoom, id: string): HomeObject | undefined => ROOMS[room].objects.find((o) => o.id === id);
