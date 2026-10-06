// Olay kancaları: oyun mantığı olay yayar, UI/ses/kayıt (main.js) dinler. Mantık UI'a bağımlı olmasın diye ayrı dosya.
export const events = {
  onGameOver: null, onCoin: null, onGem: null, onLevelUp: null, onHit: null, onKill: null, onHurt: null, onSlash: null, onSkill: null,
  onWaveStart: null,      // (n, info)
  onWaveComplete: null,   // (n)
  onUpgrade: null,        // (cards, epic) — oyun duraklatılır, UI kart gösterir
  onBoss: null,           // ('spawn'|'slam'|'summon'|'enrage'|'dead')
};
