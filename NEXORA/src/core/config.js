// data/*.json içeriği boot sırasında bu nesnelere yüklenir (bkz. loadData).
// Modüller canlı referansı import eder; değerler yüklenince dolar.
export const CONFIG = {};
export const ENEMY_TYPES = {};

export async function loadData(base = 'data/') {
  const get = async (f) => {
    const res = await fetch(base + f);
    if (!res.ok) throw new Error(`${base + f} yüklenemedi (${res.status})`);
    return res.json();
  };
  const [config, enemies, manifest] = await Promise.all([
    get('config.json'), get('enemies.json'), get('asset_manifest.json'),
  ]);
  Object.assign(CONFIG, config);
  Object.assign(ENEMY_TYPES, enemies);
  return manifest;
}
