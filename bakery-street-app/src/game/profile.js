// The player's own touches on the game: the cafe's name (shown on the sign once the cafe has one). Kept short and printable.
export const NAME_MAX = 16;

// control characters, zero-width and line/paragraph separators become spaces
const UNWANTED = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202F]', 'g');

/** A safe cafe name: unwanted characters removed, spaces collapsed, at most NAME_MAX characters ('' when nothing usable is left). */
export function cleanName(text) {
  if (typeof text !== 'string') return '';
  return [...text.replace(UNWANTED, ' ').replace(/\s+/g, ' ').trim()].slice(0, NAME_MAX).join('').trim();
}
