/** Shared Storm ↔ atlas name / country keys for pass-roster matching. */

const GENERIC = new Set([
  'ski',
  'snow',
  'resort',
  'area',
  'areas',
  'mountain',
  'mountains',
  'village',
  'alpine',
  'park',
  'parks',
  'hills',
  'hill',
  'center',
  'centre',
  'club',
  'the',
  'les',
  'le',
  'la',
  'el',
  'de',
  'du',
  'des',
  'and',
  'of',
  'at',
  'am',
  'im',
  'an',
  'inc',
  'ag',
  'gmbh',
  'bahnen',
  'bergbahnen'
]);

export function fold(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss');
}

export function tokenize(s) {
  const raw = fold(s)
    .replace(/&/g, ' and ')
    .replace(/[:/|+]+/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bmt\b/g, 'mount')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\b3\b/g, 'three')
    .replace(/\b4\b/g, 'four')
    .replace(/\b7\b/g, 'seven')
    .trim();
  return raw.split(/\s+/).filter(Boolean);
}

export function contentTokens(s) {
  return tokenize(s).filter((t) => t.length > 1 && !GENERIC.has(t));
}

const WEAK = new Set([...GENERIC, 'mount', 'mont', 'saint', 'sainte']);

export function nameKeys(s) {
  const tokens = tokenize(s);
  const content = tokens.filter((t) => t.length > 1 && !GENERIC.has(t));
  const keys = new Set();
  const add = (arr) => {
    const k = arr.filter(Boolean).join(' ');
    if (k) keys.add(k);
  };
  add(tokens);
  add(content);
  const colon = String(s || '').split(':');
  if (colon.length > 1) {
    add(contentTokens(colon[0]));
    add(contentTokens(colon[colon.length - 1]));
  }
  const paren = String(s || '').match(/\(([^)]+)\)/);
  if (paren) add(contentTokens(paren[1]));
  return [...keys];
}

export function extraTokensAreWeak(shorter, longer) {
  const S = new Set(shorter);
  const extra = longer.filter((t) => !S.has(t));
  return extra.length > 0 && extra.every((t) => WEAK.has(t));
}

export function normalizeCountry(s) {
  const t = fold(s)
    .replace(/[^a-z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (/united states|usa|^us$|u s a|america/.test(t) && !/samoa/.test(t)) return 'united states';
  if (t.includes('czech')) return 'czechia';
  if (/united kingdom|great britain|scotland|england|wales|northern ireland|^uk$/.test(t)) {
    return 'united kingdom';
  }
  if (t.includes('korea') && t.includes('south')) return 'south korea';
  return t;
}

export function parseStormRegion(region) {
  const raw = String(region || '').replace(/\s+/g, ' ').trim();
  let country = '';
  let state = '';
  const paren = raw.match(/^japan\s*\(([^)]+)\)/i);
  if (paren) return { country: 'japan', state: fold(paren[1]).trim(), raw };
  const dash = raw.split(/\s+-\s+/);
  if (dash.length >= 2) {
    const left = dash[0];
    const right = dash.slice(1).join(' - ');
    if (/^u\.?s\.?/i.test(left) || /^united states/i.test(left)) {
      country = 'united states';
    } else if (/^europe$/i.test(left) || /^asia$/i.test(left)) {
      country = normalizeCountry(right);
    } else {
      country = normalizeCountry(left);
    }
    if (!/^europe$/i.test(left) && !/^asia$/i.test(left) && !/^u\.?s\.?/i.test(left)) {
      if (country === normalizeCountry(left)) state = fold(right).replace(/[^a-z0-9]+/g, ' ').trim();
    } else if (/^u\.?s\.?/i.test(left)) {
      state = fold(right).replace(/[^a-z0-9]+/g, ' ').trim();
    }
    return { country, state, raw };
  }
  return { country: normalizeCountry(raw), state: '', raw };
}

export function parsePassFamilies(nationalPass) {
  const s = fold(nationalPass);
  const passes = new Set();
  if (/\bepic\b/.test(s)) passes.add('epic');
  if (/\bikon\b/.test(s)) passes.add('ikon');
  if (/\bindy\b/.test(s)) passes.add('indy');
  if (/\bmc\b/.test(s) || /mountain collective/.test(s)) passes.add('mountain_collective');
  return [...passes];
}

export function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export function tokensContained(inner, outer) {
  if (!inner.length) return false;
  const O = new Set(outer);
  return inner.every((t) => O.has(t));
}
