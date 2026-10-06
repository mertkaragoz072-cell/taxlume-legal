// Bölüm bilgisi: stage numarası → ad/tema. Liste bitince başa döner ("MEADOWLANDS II"). Veri: data/chapters.json.
import { CHAPTERS } from '../core/config.js';
export function chapterInfo(stage) {
  const list = CHAPTERS.chapters, st = Math.max(1, stage), i = (st - 1) % list.length, loop = Math.floor((st - 1) / list.length) + 1;
  const c = list[i] || { id: 'chapter', name: 'BÖLÜM', theme: 'meadow' };
  return { ...c, stage, loop, name: loop > 1 ? `${c.name} ${'★'.repeat(loop - 1)}` : c.name };    // tüm haritalar bitince başa döner: "MEADOWLANDS ★"
}
