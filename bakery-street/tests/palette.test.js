import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASE, PAL, INK, cssTokens } from '../src/palette.js';

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('the six base colours are the art-direction standard', () => {
  assert.deepEqual(BASE, { cream: '#F5E6C8', vanilla: '#E8D2A8', honey: '#C99A61', terracotta: '#B85F3B', brown: '#795238', green: '#7D9855' });
});

test('style.css :root carries exactly the generated palette tokens (one source of truth: src/palette.js)', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  for (const line of cssTokens()) assert.ok(css.includes(line), `style.css is missing or has a stale token: ${line}`);
});

test('text and button colours stay readable', () => {
  assert.ok(contrast(INK, PAL.cream) >= 7, 'dark brown text on cream');
  assert.ok(contrast(INK, PAL.vanilla) >= 6, 'dark brown text on vanilla');
  assert.ok(contrast('#FFFFFF', PAL.greenDark) >= 4.5, 'white on the green button body');
  assert.ok(contrast('#FFFFFF', PAL.terracottaDark) >= 4.5, 'white on the terracotta accent');
});
