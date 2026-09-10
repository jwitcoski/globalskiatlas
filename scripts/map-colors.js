/**
 * Print atlas symbology — sourced from globalskiatlas_data/atlas/map_gen/templates/styles/*.qml
 */
export const ATLAS_COLORS = {
  boundaryFill: '#fafafa',
  boundaryOutline: '#232323',
  bufferOutline: '#e8718d',
  contour: '#beb297',
  lift: '#fc541c',
  liftCasing: '#fcfcfc',
  pisteEasy: '#2f9a2f',
  pisteIntermediate: '#1f78b4',
  pisteAdvanced: '#232323',
  pisteExpert: '#ff0000',
  pisteSnowPark: '#ff7f00',
  pisteFreeride: '#ff7f00',
  pisteExtreme: '#232323',
  pisteDefault: '#7d8b8f'
};

/** Clay 3D trail palette — used by the wiki 2D map so both views match. */
export const CLAY_PISTE_HEX = {
  green: '#86efac',
  blue: '#93c5fd',
  red: '#ef4444',
  black: '#64748b',
  orange: '#f97316',
  gray: '#94a3b8',
};

function otherTagsHas(fragment) {
  return ['in', fragment, ['coalesce', ['get', 'other_tags'], '']];
}

function difficultyIs(...names) {
  const prop = ['downcase', ['to-string', ['coalesce',
    ['get', 'piste:difficulty'],
    ['get', 'difficulty'],
    ['get', 'piste_difficulty'],
    '',
  ]]];
  const checks = [];
  for (const name of names) {
    checks.push(['==', prop, name]);
    checks.push(otherTagsHas(`piste:difficulty"=>"${name}`));
  }
  return ['any', ...checks];
}

/** MapLibre line-color matching clay American / European / Japanese schemes. */
export function pisteLineColorExpression(scheme = 'american') {
  const mid = scheme === 'american' ? CLAY_PISTE_HEX.blue : CLAY_PISTE_HEX.red;
  return [
    'case',
    ['any', otherTagsHas('piste:type"=>"snow_park'), ['==', ['downcase', ['to-string', ['coalesce', ['get', 'piste:type'], ['get', 'piste_type'], '']]], 'snow_park']],
    CLAY_PISTE_HEX.orange,
    difficultyIs('novice', 'easy', 'beginner', 'green', 'learning'),
    CLAY_PISTE_HEX.green,
    difficultyIs('intermediate', 'medium', scheme === 'american' ? 'blue' : '__none__'),
    mid,
    difficultyIs('blue'),
    mid,
    difficultyIs('red'),
    scheme === 'american' ? CLAY_PISTE_HEX.red : CLAY_PISTE_HEX.red,
    difficultyIs('advanced', 'difficult', 'very_difficult', 'black', 'expert', 'extreme', 'freeride', 'double_black'),
    CLAY_PISTE_HEX.black,
    CLAY_PISTE_HEX.gray,
  ];
}
/** MapLibre line-color expression for pistes layer (other_tags OSM serialization). */
export const PISTE_LINE_COLOR = [
  'case',
  ['in', 'piste:type"=>"snow_park', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteSnowPark,
  ['in', 'piste:difficulty"=>"extreme', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteExtreme,
  ['in', 'piste:difficulty"=>"freeride', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteFreeride,
  ['in', 'piste:difficulty"=>"expert', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteExpert,
  ['in', 'piste:difficulty"=>"advanced', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteAdvanced,
  ['in', 'piste:difficulty"=>"intermediate', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteIntermediate,
  ['in', 'piste:difficulty"=>"easy', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteEasy,
  ['in', 'piste:difficulty"=>"novice', ['coalesce', ['get', 'other_tags'], '']],
  ATLAS_COLORS.pisteEasy,
  ATLAS_COLORS.pisteDefault
];
