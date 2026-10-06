// data/*.json içeriği boot sırasında bu nesnelere yüklenir (bkz. loadData).
// Modüller canlı referansı import eder; değerler yüklenince dolar.
export const CONFIG = {};
export const ENEMY_TYPES = {};
export const WORLD = {};      // data/world_props.json: prop boyutları, dekor kuralları, bulut/ada katmanları
export const WAVES = {};        // data/waves.json
export const UPGRADES = { base: {}, list: [], builds: [], categories: {}, epicMultiplier: 2, buildAffinityWeight: 1.6, rarities: {}, maxDistinct: 4 };   // data/upgrades.json
export const CARDS = { maxEquipped: 3, cards: [] };   // data/cards.json: kart sistemi tanımları (CardSystem)
export const SKILLS = {};      // data/skills.json: yetenek tanımları (buton id → ayarlar)
export const ANIMS = {};
export const HERO = { id: 'male', fromUrl: false };
export function setHero(id) { HERO.id = ANIMS[id] ? id : 'male'; ANIMS.hero = ANIMS[HERO.id]; }
// Oynanabilir kahramanlar (seçim ekranı): id → görünen ad. 'female' (animasyonlu sheet) yalnız ?hero=female ile açılan geliştirme alternatifidir.
export const HEROES = [{ id: 'male', name: 'Erkek Savaşçı' }, { id: 'heroine', name: 'Kadın Savaşçı' }];   // aktif kahraman: data/config.json → player.character veya URL ?hero=female      // ANIMS.male = data/male_animations.json (kare listesi, fps, pivot, ölçek)

export async function loadData(base = 'data/') {
  const get = async (f) => {
    const res = await fetch(base + f);
    if (!res.ok) throw new Error(`${base + f} yüklenemedi (${res.status})`);
    return res.json();
  };
  const [config, enemies, manifest, male, world, enemyAnims, female, heroine, skills, waves, upgrades, cards] = await Promise.all([
    get('config.json'), get('enemies.json'), get('asset_manifest.json'), get('male_animations.json'), get('world_props.json'), get('enemy_animations.json'), get('female_animations.json'), get('heroine_animations.json'), get('skills.json'), get('waves.json'), get('upgrades.json'), get('cards.json'),
  ]);
  Object.assign(CONFIG, config);
  Object.assign(ENEMY_TYPES, enemies);
  ANIMS.male = male; ANIMS.female = female;
  ANIMS.heroine = heroine;
  Object.assign(SKILLS, skills);
  Object.assign(CARDS, cards);
  Object.assign(WAVES, waves);
  Object.assign(UPGRADES, { base: upgrades.base, list: upgrades.upgrades, builds: upgrades.builds, categories: upgrades.categories, epicMultiplier: upgrades.epicMultiplier, buildAffinityWeight: upgrades.buildAffinityWeight, rarities: upgrades.rarities, maxDistinct: upgrades.maxDistinct || 0 });
  const q = new URLSearchParams(location.search).get('hero');
  HERO.fromUrl = !!(q && ANIMS[q]);
  setHero(HERO.fromUrl ? q : (config.player.character || 'male'));
  ANIMS.enemies = enemyAnims;      // tür → { tuval, pivot, ölçek, anims: walk/attack/hurt/death }
  Object.assign(WORLD, world);
  return manifest;
}
