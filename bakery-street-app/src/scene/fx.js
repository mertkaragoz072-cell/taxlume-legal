// Small shared scene effects.

/** Soft steam: a few round puffs rising, swaying, growing and fading (`k` scales how much). Exported for the cups on the tables. */
export function steam(ctx, x, y, t, k = 1) {
  for (let i = 0; i < 4; i++) {
    const p = (((t * 0.45 + i / 4) % 1) + 1) % 1, a = Math.sin(p * Math.PI) * 0.42 * k;
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(255,250,240,${a})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(p * 5 + i * 1.7) * 9, y - p * 58, 5 + p * 10, 0, 7); ctx.fill();
  }
}
