/**
 * Resort size tier map icons — hill → single peak → twin peaks → mega range.
 */
import { MAP_TIER_COLORS } from './resort-categories.js';

export const TIER_ICON_COLORS = [
  { key: 'red', hex: MAP_TIER_COLORS.small },
  { key: 'yellow', hex: MAP_TIER_COLORS.medium },
  { key: 'green', hex: MAP_TIER_COLORS.large },
  { key: 'grey', hex: '#999999' }
];

const COLOR_TO_KEY = {
  [MAP_TIER_COLORS.small]: 'red',
  [MAP_TIER_COLORS.medium]: 'yellow',
  [MAP_TIER_COLORS.large]: 'green',
  [MAP_TIER_COLORS.mega]: 'mega-blue',
  '#999999': 'grey'
};

/** Small — rolling hill */
export const hillSvg = (c, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L0 11 Q6 6 12 11 Q18 6 24 11 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;

/** Medium — single peak */
export const mountainSvg = (c, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L8 5 L16 10 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;

/** Large — twin peaks (between medium single and mega range) */
export const largeMountainsSvg = (c, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L5 10 L10 14 L12 11 L17 4 L22 9 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;

/** Mega — wide high range */
export const megaMountainsSvg = (c, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 18" width="${w}" height="${h}" style="display:block"><path d="M0 18 L3 12 L7 15 L9 8 L14 3 L18 9 L21 6 L24 11 L28 18 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.9"/></svg>`;

export function tierSvg(tier, color, w, h) {
  if (tier === 'mega') return megaMountainsSvg(color, w, h);
  if (tier === 'large') return largeMountainsSvg(color, w, h);
  if (tier === 'medium') return mountainSvg(color, w, h);
  return hillSvg(color, w, h);
}

export function getIconId(tier, color) {
  const key = COLOR_TO_KEY[color] || 'red';
  if (tier === 'mega') return 'mega-mountains-mega-blue';
  if (tier === 'large') return `large-mountains-${key}`;
  if (tier === 'medium') return `mountain-${key}`;
  return `hill-${key}`;
}

export function svgToImageData(svgString, pixelRatio = 2) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;
  const w = parseInt(svg.getAttribute('width'), 10) || 24;
  const h = parseInt(svg.getAttribute('height'), 10) || 16;
  const width = w * pixelRatio;
  const height = h * pixelRatio;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const dataUrl = 'data:image/svg+xml,' + encodeURIComponent(
    svgString.replace(/width="[^"]+"/, `width="${width}"`).replace(/height="[^"]+"/, `height="${height}"`)
  );
  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      try {
        resolve({ width, height, data: ctx.getImageData(0, 0, width, height).data });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Register hill / medium / large / mega sprites on a MapLibre map. */
export function addResortIconImages(map) {
  const jobs = TIER_ICON_COLORS.flatMap((c) => [
    svgToImageData(hillSvg(c.hex, 20, 14)).then((d) => map.addImage(`hill-${c.key}`, d)),
    svgToImageData(mountainSvg(c.hex, 26, 18)).then((d) => map.addImage(`mountain-${c.key}`, d)),
    svgToImageData(largeMountainsSvg(c.hex, 30, 19)).then((d) => map.addImage(`large-mountains-${c.key}`, d))
  ]);
  jobs.push(
    svgToImageData(megaMountainsSvg(MAP_TIER_COLORS.mega, 36, 22)).then((d) => map.addImage('mega-mountains-mega-blue', d))
  );
  return Promise.all(jobs);
}
