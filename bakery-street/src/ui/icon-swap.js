// Replaces the emoji of products and ingredients with the supplied icon pictures everywhere in the page (panels, toasts, chips).
// The game data keeps plain emoji (readable fallback, tests); a MutationObserver swaps them as text appears, so no UI code has to care.
import { PRODUCTS, INGREDIENTS } from '../data/economy.js';
import { ICON_IDS } from '../assets.js';

const EMOJI = { '💰': 'coin', '✨': 'xp', '💎': 'gem', '🎁': 'gift', '🔒': 'lock', '⏱': 'timer', '✅': 'check', '⬆': 'arrow', '🛒': 'basket', '🧾': 'receipt',
  '🔥': 'u-oven', '⚡': 'u-speed', '🗄': 'u-showcase', '🪑': 'u-tables', '📖': 'r-knowledge', '🧺': 'r-efficient', '🏷': 'r-seller', '🎭': 'r-culture', '🛠': 'r-equipment', '🎯': 'q-target', '🏭': 'q-line', '🧭': 'q-explorer' };   // keys without the emoji variation selector (U+FE0F)
const bare = (e) => e.replace(/\uFE0F/g, '');
for (const [id, d] of Object.entries({ ...PRODUCTS, ...INGREDIENTS })) if (ICON_IDS.includes(id) && d.icon) EMOJI[bare(d.icon)] = id;
const RE = new RegExp(`((?:${Object.keys(EMOJI).join('|')})\\uFE0F?)`, 'u');

function swap(node) {
  const text = node.nodeValue;
  if (!RE.test(text)) return;
  const frag = document.createDocumentFragment();
  for (const part of text.split(new RegExp(RE.source, 'gu'))) {
    if (EMOJI[bare(part)]) {
      const img = document.createElement('img');
      img.className = 'gi'; img.alt = part; img.src = `assets/icons/${EMOJI[bare(part)]}.webp`; img.draggable = false;
      frag.append(img);
    } else if (part) frag.append(document.createTextNode(part));
  }
  node.replaceWith(frag);
}

function scan(root) {
  if (root.nodeType === 3) { swap(root); return; }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  found.forEach(swap);
}

export function installIconSwap(root = document.body) {
  scan(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') swap(r.target);
      else r.addedNodes.forEach(scan);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
