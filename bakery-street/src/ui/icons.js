// Icons for the HUD, menus and resource pills. Pictures come from assets/icons/*.webp; the few SVGs left are small fallbacks.
const pic = (name) => `<img class="pic" alt="" draggable="false" src="assets/icons/${name}.webp">`;
export const ICONS = {
  cafe: pic('nav-cafe'),
  coin: `<svg class="ico" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#f2b21b" stroke="#8a5a12" stroke-width="3"/><circle cx="24" cy="24" r="15" fill="#ffd95a" stroke="#c98a14" stroke-width="2"/><path d="M24 12l3.4 7 7.6 1-5.5 5.3 1.3 7.6-6.8-3.7-6.8 3.7 1.3-7.6L13 20l7.6-1z" fill="#fff3b0" stroke="#c98a14" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  gem: `<svg class="ico" viewBox="0 0 48 48"><path d="M12 8h24l8 11-20 24L4 19z" fill="#3fb7f5" stroke="#145a9a" stroke-width="3" stroke-linejoin="round"/><path d="M4 19h40M16 19l8 24 8-24M12 8l4 11 8-11 8 11 4-11" fill="none" stroke="#bfe9ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8l4 11 8-11z" fill="#9fe0ff"/></svg>`,
  bolt: `<svg class="ico" viewBox="0 0 48 48"><path d="M28 3 10 27h12l-4 18 20-26H26z" fill="#ffc21a" stroke="#a45a08" stroke-width="3" stroke-linejoin="round"/><path d="M27 8 16 24h8" fill="none" stroke="#fff3a0" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  quests: pic('hud-quests'),
  mail: `<svg viewBox="0 0 48 48"><rect x="5" y="11" width="38" height="27" rx="3" fill="#fffaf0" stroke="#6a3d1c" stroke-width="2.5"/><path d="M5 14l19 14 19-14" fill="none" stroke="#6a3d1c" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="28" r="4.5" fill="#d6382e" stroke="#8a1f1a" stroke-width="1.5"/></svg>`,
  events: pic('hud-events'),
  settings: pic('hud-settings'),
  town: pic('nav-town'),
  explore: pic('nav-explore'),
  shop: `<svg viewBox="0 0 48 44"><path d="M13 17a11 11 0 0 1 22 0" fill="none" stroke="#6a3d1c" stroke-width="3.4" stroke-linecap="round"/><circle cx="17" cy="15" r="4.5" fill="#5bb83a" stroke="#2a6a1a" stroke-width="1.6"/><circle cx="29" cy="14" r="4.5" fill="#f58a1f" stroke="#8a4a08" stroke-width="1.6"/><path d="M4 18h40l-5 23H9z" fill="#d6382e" stroke="#7a1f1a" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 22l1 15M24 22v15M33 22l-1 15" stroke="#ff8a7a" stroke-width="2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#f4f0e6"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="#f4f0e6" stroke-width="2.4"/></svg>`,
  avatar: pic('hud-avatar'),
};
