// Tidies place names and addresses from OpenStreetMap / GeoNames for display:
// spacing around punctuation, doubled punctuation, and ALL CAPS / all lowercase.
// Used by scripts/build-statewide.mjs and scripts/tidy-locations.mjs.

// Lowercase connecting words (except at the start of a name).
const SMALL_WORDS = new Set(['a', 'an', 'and', 'n', 'at', 'by', 'de', 'del', 'for', 'in', 'la', 'near', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);
// Short forms that should stay in capitals.
const ACRONYMS = new Set(['alps', 'almps', 'amlps', 'atm', 'aups', 'bpcl', 'bsf', 'bsnl', 'cbse', 'cisf', 'crpf', 'csi', 'fci', 'ghs', 'ghss', 'glp', 'glps', 'gup', 'gups', 'gvhss', 'hdfc', 'hp', 'hs', 'hss', 'hsss', 'icici', 'idbi', 'iocl', 'iti', 'kfc', 'ksfe', 'kseb', 'ksrtc', 'lic', 'lp', 'lps', 'mes', 'nh', 'ngo', 'po', 'pta', 'pwd', 'rto', 'sbi', 'sh', 'tvs', 'uae', 'ups', 'vhss', 'ymca', 'ywca']);
// Capitalised words that look like acronyms in ALL CAPS text but aren't.
const TITLE_SHORT = new Set(['al', 'st', 'dr', 'mt', 'no', 'rd', 'jn', 'nr', 'sri', 'sree']);

const NON_LATIN = /[^\u0000-ɏ -⁯]/; // Malayalam, Tamil, etc.
const LETTER = /\p{L}/u;

export function tidyPunctuation(text) {
  if (typeof text !== 'string') return text;
  let s = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  s = s.replace(/\.{2,}/g, '.')                          // "Showroom.." -> "Showroom."
    .replace(/-{2,}/g, '-')                              // "--" -> "-"
    .replace(/([,;:])(?:\s*[,;:.])+/g, '$1')            // ",," ", ," ",." -> ","
    .replace(/\s+([,.;:!?)])/g, '$1')                   // "Hospital , Kochi" -> "Hospital, Kochi"
    .replace(/\(\s+/g, '(')                             // "( x" -> "(x"
    .replace(/([,;])(?=[^\s\d])/g, '$1 ')               // "Station,Varkala" -> "Station, Varkala" (keeps 1,000)
    .replace(/([\p{L}\p{N}])\(/gu, '$1 (')               // "Hospital(PTH)" -> "Hospital (PTH)"
    .replace(/\)(?=[\p{L}\p{N}])/gu, ') ')               // ")Railway" -> ") Railway"
    .replace(/\b([A-Za-z][a-z]+)\.(?=[A-Z][a-z]|[A-Z]{2,}\b)/g, '$1. ') // "St.Joseph" -> "St. Joseph"
    .replace(/\b([A-Za-z][a-z]{2,})\.(?=[a-z]{3,})/g, (m, word, offset, all) => /www|https?|\.(com|in|org|net)\b/i.test(all) ? m : `${word}. `) // "Hospital.nalukody"
    .replace(/(\S+) -(?=\S)|(\S+)- (?=\S)/g, (m, a, b, offset, all) => { // uneven hyphens
      const left = a ?? b, next = all.slice(offset + m.length);
      return left.replace(/^[^A-Za-z]+/, '').length <= 3 && /^[a-z]/.test(next) ? `${left}-` : `${left} - `;
    })
    .replace(/^[\s,.;:\-–]+|[\s,;:\-–]+$/g, '')        // stray punctuation at the ends
    .replace(/ {2,}/g, ' ');
  // A trailing full stop after a normal word ("Showroom.") — keep it after short forms ("Ltd.", "P.O.").
  const last = s.split(' ').pop();
  if (s.endsWith('.') && last.length > 5 && !last.slice(0, -1).includes('.')) s = s.slice(0, -1);
  return s;
}

function capitaliseWord(word, first, fromCaps) {
  const match = word.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  const [, pre, core, post] = match;
  if (!core || /\d/.test(core)) return word;
  if (core.includes('-')) return pre + core.split('-').map((part, i) => capitaliseWord(part, first && i === 0, fromCaps)).join('-') + post;
  const lower = core.toLowerCase();
  if (ACRONYMS.has(lower.replace(/\./g, ''))) return pre + core.toUpperCase() + post;
  if (!first && SMALL_WORDS.has(lower)) return pre + lower + post;
  if (fromCaps) {
    const letters = lower.replace(/[^a-z]/g, '');
    // Keep things like "KSRTC", "AMLP", "AKGMGHSS", "G", "AL" in capitals: no vowels after the first letter.
    if (!TITLE_SHORT.has(letters) && (letters.length <= 2 || !/[aeiouy]/.test(letters.slice(1)))) return word;
  }
  return pre + lower.charAt(0).toUpperCase() + lower.slice(1) + post;
}

export function tidyCase(text) {
  if (typeof text !== 'string' || NON_LATIN.test(text) || !LETTER.test(text)) return text;
  const letters = text.replace(/[^A-Za-z]/g, '');
  const allCaps = letters.length > 4 && letters === letters.toUpperCase();
  const words = text.split(' ');
  // "HILL TOP school": a long shouted word means short capitalised neighbours are shouting too, not acronyms.
  const shouting = words.some(w => { const p = w.replace(/[^A-Za-z]/g, ''); return p.length >= 4 && p === p.toUpperCase() && /[AEIOU]/.test(p) && !ACRONYMS.has(p.toLowerCase()); });
  return words.map((word, i) => {
    const plain = word.replace(/[^A-Za-z]/g, '');
    if (!plain) return word;
    if (allCaps) return capitaliseWord(word, i === 0, true);
    if (plain === plain.toLowerCase()) return capitaliseWord(word, i === 0, false);    // "vidya" -> "Vidya"
    if ((plain.length >= 4 || (shouting && plain.length === 3)) && plain === plain.toUpperCase()) return capitaliseWord(word, i === 0, true); // "HILL" in mixed text
    return word; // already mixed case, e.g. "McDonald's", "eSevai"
  }).join(' ');
}

// Fixing capitals can reveal spacing to fix (e.g. "GOVT.LPS" -> "Govt.lps" -> "Govt. LPS"), so repeat until stable.
const settle = fn => text => {
  let current = text;
  for (let i = 0; i < 4; i++) { const next = fn(current); if (next === current) break; current = next; }
  return current;
};

export const tidyName = settle(name => {
  if (typeof name !== 'string') return name;
  const tidy = tidyCase(tidyPunctuation(name));
  return tidy || name;
});

export const tidyAddress = settle(address => {
  if (typeof address !== 'string') return address;
  const parts = tidyPunctuation(address).split(',').map(part => tidyCase(tidyPunctuation(part))).filter(Boolean);
  // Drop repeated parts ("Thrissur, Thrissur, Kerala"), keeping the last, broadest position.
  const seen = new Set();
  const kept = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    const key = parts[i].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); kept.unshift(parts[i]);
  }
  return kept.join(', ') || address;
});

const searchKey = text => text.normalize('NFKC').toLocaleLowerCase().replace(/[,\s]+/g, ' ').trim();

// Row: [id, name, lat, lon, address, aliases, kind, source]. If tidying changes how a name is
// typed (e.g. "St.Joseph" -> "St. Joseph"), the original spelling is kept as a search alias.
export function tidyLocationRow(row) {
  const [id, name, lat, lon, address, aliases, ...rest] = row;
  const cleanName = tidyName(name);
  const extra = searchKey(cleanName) !== searchKey(name) && !aliases.includes(name) ? [name] : [];
  return [id, cleanName, lat, lon, tidyAddress(address), [...aliases, ...extra], ...rest];
}
