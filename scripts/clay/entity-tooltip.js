/** Hover tooltip for OSM-backed clay trail and lift entities. */

import { aerialwayLabel, diffLabel } from "../ski-feature-utils.js";
import { getClayTrailScheme, trailStyle } from "./trails.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createClayEntityTooltip(embed) {
  const tooltip = document.createElement("div");
  tooltip.className = "clay-entity-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  embed.appendChild(tooltip);

  return {
    show(entity, clientX, clientY) {
      if (!entity) return this.hide();
      const embedRect = embed.getBoundingClientRect();
      const title = entity.name
        || (entity.entityType === "resort" ? "Ski area" : entity.entityType === "lift" ? "Unnamed lift" : "Unnamed trail");
      const detail = entity.entityType === "resort"
        ? (entity.trails ? `${entity.trails} trails · click for wiki` : "Click for wiki page")
        : entity.entityType === "lift"
        ? aerialwayLabel(entity.aerialway)
        : diffLabel(entity.difficulty || "Unknown");
      const detailClass = entity.entityType === "lift" || entity.entityType === "resort"
        ? "clay-entity-tooltip-type"
        : "clay-entity-tooltip-difficulty";
      const detailStyle = entity.entityType === "lift" || entity.entityType === "resort"
        ? ""
        : ` style="--clay-difficulty-color: #${trailStyle(entity.difficulty, getClayTrailScheme()).color.toString(16).padStart(6, "0")}"`;
      tooltip.innerHTML = `<strong>${escapeHtml(title)}</strong><span class="${detailClass}"${detailStyle}>${escapeHtml(detail)}</span>`;
      tooltip.style.left = `${Math.max(8, clientX - embedRect.left + 12)}px`;
      tooltip.style.top = `${Math.max(8, clientY - embedRect.top - 12)}px`;
      tooltip.hidden = false;
    },
    hide() {
      tooltip.hidden = true;
    },
    dispose() {
      tooltip.remove();
    },
  };
}
