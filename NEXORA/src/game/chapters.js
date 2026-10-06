// Bölüm bilgisi: stage numarası → ad/tema. Liste bitince başa döner ("MEADOWLANDS II"). Veri: data/chapters.json.
import { CHAPTERS } from '../core/config.js';
const ROMAN = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function chapterInfo(stage) {
  const list = CHAPTERS.chapters, i = (Math.max(1, stage) - 1) % list.length, loop = Math.floor((Math.max(1, stage) - 1) / list.length) + 1;
  const c = list[i] || { id: 'chapter', name: 'BÖLÜM', theme: '' };
  return { ...c, stage, loop, name: loop > 1 ? `${c.name} ${ROMAN[loop] || loop}` : c.name };
}
