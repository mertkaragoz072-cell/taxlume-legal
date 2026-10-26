import { isOpen, openingText } from '../navigation/travel';
import type { GameState } from '../simulation/state';
import { hasMembership } from './membership';

/**
 * The single rule for whether the character may train right now:
 * at the gym, while it is open, with a valid membership (by in-game time).
 * Returns the reason training is blocked, or null when allowed.
 */
export function trainBlockReason(state: GameState): string | null {
  if (state.location !== 'gym') return 'You need to be at the gym to train.';
  if (!isOpen('gym', state.time)) return `The gym is closed (open ${openingText('gym')}).`;
  if (!hasMembership(state)) return 'Your gym pass has expired. Buy a new one to keep training.';
  return null;
}

export const canTrainNow = (state: GameState): boolean => trainBlockReason(state) === null;
