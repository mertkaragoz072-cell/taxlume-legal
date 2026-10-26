import { IndexedDbStorage } from '../persistence/indexedDb';
import { SaveManager } from '../persistence/save';
import { UI } from '../ui/ui';
import { GameRenderer } from '../world/renderer';
import { Game } from './game';

async function boot(): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const ui = document.getElementById('ui')!;
  const renderer = new GameRenderer(canvas);
  const game = new Game(renderer, new SaveManager(new IndexedDbStorage()));
  const info = await game.init();
  new UI(ui, game);
  if (info.recovered) game.bus.emit('warning', info.source === 'backup' ? 'Save was damaged — restored from backup.' : 'Save was damaged — started a new game.');
  else if (info.source === 'save') game.bus.emit('info', 'Welcome back — progress loaded.');

  // Lifecycle: persist when the app is backgrounded or closed. The sim clock never
  // advances from real time, so pausing/resuming cannot corrupt it.
  const flush = () => void game.save();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
  window.setInterval(flush, 30000);
  (window as unknown as { game: Game }).game = game;
}

void boot();
