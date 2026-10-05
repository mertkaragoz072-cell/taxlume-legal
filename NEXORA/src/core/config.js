// data/*.json içeriği boot sırasında bu nesnelere yüklenir (bkz. loadData).
// Modüller canlı referansı import eder; değerler yüklenince dolar.
export const CONFIG = {};
export const ENEMY_TYPES = {};
export const WORLD = {};      // data/world_props.json: prop boyutları, dekor kuralları, bulut/ada katmanları
export const ANIMS = {};
export const HERO = { id: 'male' };   // aktif kahraman: data/config.json → player.character veya URL ?hero=female      // ANIMS.male = data/male_animations.json (kare listesi, fps, pivot, ölçek)

export async function loadData(base = 'data/') {
  const get = async (f) => {
    const res = await fetch(base + f);
    if (!res.ok) throw new Error(`${base + f} yüklenemedi (${res.status})`);
    return res.json();
  };
  const [config, enemies, manifest, male, world, enemyAnims, female] = await Promise.all([
    get('config.json'), get('enemies.json'), get('asset_manifest.json'), get('male_animations.json'), get('world_props.json'), get('enemy_animations.json'), get('female_animations.json'),
  ]);
  Object.assign(CONFIG, config);
  Object.assign(ENEMY_TYPES, enemies);
  ANIMS.male = male; ANIMS.female = female;
  const q = new URLSearchParams(location.search).get('hero');
  HERO.id = (q === 'female' || q === 'male') ? q : (config.player.character || 'male');
  ANIMS.hero = ANIMS[HERO.id];
  ANIMS.enemies = enemyAnims;      // tür → { tuval, pivot, ölçek, anims: walk/attack/hurt/death }
  Object.assign(WORLD, world);
  return manifest;
}
