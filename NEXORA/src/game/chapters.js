// Evren/bölüm bilgisi: stage numarası → evren (world) + bölüm. Veri: data/chapters.json.
// Her evren `stagesPerWorld` (5) bölüm = 5 boss içerir; sonuncusu yenilince evren tamamlanır. Evren listesi bitince başa döner (★), zorluk stage ile artmaya devam eder.
import { CHAPTERS } from '../core/config.js';
export function chapterInfo(stage) {
  const list = CHAPTERS.worlds, per = CHAPTERS.stagesPerWorld || 5, st = Math.max(1, stage), wi = Math.floor((st - 1) / per), i = wi % list.length, loop = Math.floor(wi / list.length) + 1, inWorld = (st - 1) % per + 1;
  const w = list[i] || { id: 'world', name: 'EVREN', universe: '?', theme: 'meadow', tint: null };
  const name = loop > 1 ? `${w.name} ${'★'.repeat(loop - 1)}` : w.name, uni = wi + 1;
  return { ...w, stage, loop, name, worldIndex: wi, universeNo: uni, stageInWorld: inWorld, stagesPerWorld: per, isWorldEnd: inWorld === per, isWorldStart: inWorld === 1,
    label: `${name} · ${inWorld}/${per}`, short: `Evren ${uni} · ${inWorld}/${per}` };
}

// Evrenin düşman/boss seti (data/world_roster.json). rosterType: waves.json'daki goblin_* yuvasını bu evrenin karşılığına çevirir.
import { ROSTER } from '../core/config.js';
const setOf = (stage) => ROSTER[chapterInfo(stage).id] || {};
export const rosterType = (type, stage) => setOf(stage).roster?.[type] || type;
export const worldExtras = (stage) => setOf(stage).extras || [];
export const bossFor = (stage, fallback) => { const b = setOf(stage).bosses; return b?.length ? b[(chapterInfo(stage).stageInWorld - 1) % b.length] : fallback; };
