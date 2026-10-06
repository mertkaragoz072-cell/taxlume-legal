// Harita teması: aktif bölümün (chapters.json → theme) görünümü. Veri: data/world_props.json → themes.<id>
// (gökyüzü renkleri, uzak arka plan şeridi, zemin rengi/tonu, dekor). 'meadow' temasının tanımı yoktur → mevcut varsayılan görünüm.
import { WORLD } from '../core/config.js';
import { state } from '../game/state.js';
import { chapterInfo } from '../game/chapters.js';

let lastStage = -1, cached = null;
export function currentTheme() {
  const st = state.wave.stage;
  if (st !== lastStage) {
    lastStage = st;
    const id = chapterInfo(st).theme, t = WORLD.themes?.[id];
    cached = t ? { id, ...t } : null;
  }
  return cached;
}
