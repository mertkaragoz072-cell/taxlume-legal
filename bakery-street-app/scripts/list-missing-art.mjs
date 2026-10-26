// Lists the equipment tier pictures that exist in assets/game/interior and the ones still to be made (see EQUIPMENT_ART in src/data/economy.js):
//   node scripts/list-missing-art.mjs
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIPMENT_ART, SHOP_ITEMS } from '../src/data/economy.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'game', 'interior');
let missing = 0;
console.log('| station | tier | file | item | state |\n|---|---|---|---|---|');
for (const [line, tiers] of Object.entries(EQUIPMENT_ART)) for (const [tier, name] of Object.entries(tiers)) {
  const ok = existsSync(join(dir, `${name}.webp`)), item = SHOP_ITEMS.find((d) => d.line === line && d.tier === +tier);
  if (!ok) missing++;
  console.log(`| ${line} | ${tier} | ${name}.webp | ${item?.name ?? '—'} | ${ok ? 'ready' : 'MISSING'} |`);
}
console.log(`\n${missing} of ${Object.values(EQUIPMENT_ART).reduce((n, t) => n + Object.keys(t).length, 0)} tier pictures are missing; those stations keep their plain picture with a level badge.`);
process.exit(0);
