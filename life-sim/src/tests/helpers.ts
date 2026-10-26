import { createNewGame, type GameState } from '../simulation/state';

/** A fresh game with the character standing in the gym (most workout tests start there). */
export function gymGame(): GameState {
  const s = createNewGame();
  s.location = 'gym';
  return s;
}

/** A fresh game with the character in the given home room. */
export function homeGame(room: GameState['room'] = 'kitchen'): GameState {
  const s = createNewGame();
  s.location = 'home';
  s.room = room;
  return s;
}
