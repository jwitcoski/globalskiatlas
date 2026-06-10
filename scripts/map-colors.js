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
