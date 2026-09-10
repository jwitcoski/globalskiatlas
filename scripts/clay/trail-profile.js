/** Terrain-derived trail elevation and slope metrics for selected clay trails. */

import { HEIGHT_EXAGGERATE } from "./config.js";
import { lineParts, localXZ, downsampleLine } from "./math-utils.js";

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function profileForLine(coords, center, sample, heightExaggeration) {
  const points = [];
  for (const coord of downsampleLine(coords, 96)) {
    if (!coord || coord.length < 2) continue;
    const { x, z } = localXZ(coord[0], coord[1], center);
    const height = sample(x, z);
    if (height == null || !Number.isFinite(height)) continue;
    points.push({ x, z, height });
  }
  if (points.length < 2) return null;

  if (points[0].height < points[points.length - 1].height) points.reverse();
  const scale = Math.max(0.001, Number(heightExaggeration) || HEIGHT_EXAGGERATE);
  let horizontal = 0;
  let descent = 0;
  let maxSlopePercent = 0;
  const segments = [];

  for (let i = 1; i < points.length; i += 1) {
    const run = distance(points[i - 1], points[i]);
    if (run < 0.01) continue;
    const drop = Math.max(0, (points[i - 1].height - points[i].height) / scale);
    const slopePercent = (drop / run) * 100;
    horizontal += run;
    descent += drop;
    maxSlopePercent = Math.max(maxSlopePercent, slopePercent);
    segments.push({ distance: horizontal, slopePercent });
  }

  if (!horizontal) return null;
  return {
    distanceM: horizontal,
    descentM: descent,
    averageSlopePercent: (descent / horizontal) * 100,
    maxSlopePercent,
    segments,
  };
}

export function calculateTrailProfile({ feature, center, sample, heightExaggeration = HEIGHT_EXAGGERATE }) {
  if (!feature || typeof sample !== "function") return null;
  let best = null;
  for (const coords of lineParts(feature.geometry)) {
    const candidate = profileForLine(coords, center, sample, heightExaggeration);
    if (candidate && (!best || candidate.distanceM > best.distanceM)) best = candidate;
  }
  return best;
}

export function formatSlopePercent(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : null;
}

export function formatSlope(value) {
  if (!Number.isFinite(value)) return null;
  const percent = formatSlopePercent(value);
  const degrees = Math.round((Math.atan(value / 100) * 180) / Math.PI);
  return `${percent} (${degrees}°)`;
}

export function formatMeters(value) {
  return Number.isFinite(value) ? `${Math.round(value)} m` : null;
}
