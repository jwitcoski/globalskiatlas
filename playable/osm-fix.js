/** OSM scenery-fix prompt for the lobby trail map and finish/DNF screens. */

const OSM_FIX_API = "/api/wiki/osm-fix-report";
let bound = false;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function osmMapUrl(ctx) {
  const lat = Number(ctx?.lat);
  const lon = Number(ctx?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return `https://www.openstreetmap.org/#map=15/${lat.toFixed(5)}/${lon.toFixed(5)}`;
  }
  const osmId = String(ctx?.winterSportsId || "").replace(/\D/g, "");
  if (osmId) return `https://www.openstreetmap.org/relation/${osmId}`;
  return "https://www.openstreetmap.org/";
}

export function osmFixContext(catalog, course, scenePath) {
  return {
    resort: String(catalog?.name || "").replace(/\s+[—-]\s+Prototype$/i, "") || "this resort",
    path: String(scenePath || catalog?.path || ""),
    course: String(course?.name || course?.displayName || ""),
    lat: catalog?.lat,
    lon: catalog?.lon,
    winterSportsId: catalog?.winter_sports_id || catalog?.id,
  };
}

function attrs(ctx) {
  return (
    `data-osm-resort="${esc(ctx.resort)}" data-osm-path="${esc(ctx.path)}" ` +
    `data-osm-course="${esc(ctx.course)}" data-osm-href="${esc(osmMapUrl(ctx))}"`
  );
}

export function osmFixHtml(ctx, compact = false) {
  const url = osmMapUrl(ctx);
  const copy = compact
    ? "Missing trees, rocks, or other scenery? This trail map is built from OpenStreetMap — please fix it there, then notify us so we can rebuild."
    : "If this route or resort is missing trees, rocks, or other scenery, please fix it in OpenStreetMap (that is where the data comes from). Then notify us that you fixed it so we can rebuild the scene.";
  return `<div class="osm-fix${compact ? " osm-fix-compact" : ""}" ${attrs(ctx)}>
    <p class="osm-fix-copy">${esc(copy)}</p>
    <div class="osm-fix-acts">
      <a class="osm-fix-link" href="${esc(url)}" target="_blank" rel="noopener">Open this resort in OSM</a>
      <button type="button" class="osm-fix-notify" data-osm-notify>I fixed it in OSM</button>
    </div>
    <form class="osm-fix-form" hidden>
      <label>What did you change or add in OSM?
        <textarea name="note" required minlength="8" maxlength="1500" rows="3"
          placeholder="e.g. added forest along the lower piste, a few rocks by the lift"></textarea>
      </label>
      <input type="text" name="website" class="osm-fix-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <button type="submit" class="btn primary">Send notification</button>
      <p class="osm-fix-status" hidden></p>
    </form>
  </div>`;
}

function ctxFromBox(box) {
  return {
    resort: box?.dataset.osmResort || "",
    path: box?.dataset.osmPath || "",
    course: box?.dataset.osmCourse || "",
    href: box?.dataset.osmHref || "",
  };
}

export function bindOsmFix() {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-osm-notify]");
    if (!btn) return;
    const box = btn.closest(".osm-fix");
    const form = box?.querySelector(".osm-fix-form");
    if (!form) return;
    form.hidden = false;
    form.querySelector("textarea")?.focus();
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest?.(".osm-fix-form");
    if (!form) return;
    e.preventDefault();
    e.stopPropagation();
    const box = form.closest(".osm-fix");
    const status = form.querySelector(".osm-fix-status");
    const note = String(new FormData(form).get("note") || "").trim();
    const honey = String(new FormData(form).get("website") || "").trim();
    if (honey) {
      if (status) {
        status.hidden = false;
        status.textContent = "Thanks — we’ll queue a rebuild.";
      }
      form.querySelector("button[type=submit]")?.setAttribute("disabled", "");
      return;
    }
    if (note.length < 8) {
      if (status) {
        status.hidden = false;
        status.textContent = "Please describe what you changed (a short sentence is enough).";
      }
      return;
    }
    const meta = ctxFromBox(box);
    const submit = form.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;
    fetch(OSM_FIX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note,
        website: honey,
        resort: meta.resort,
        path: meta.path,
        course: meta.course,
        osmUrl: meta.href,
      }),
    })
      .then((r) => {
        if (!r.ok && r.status !== 201) throw new Error(String(r.status));
        if (status) {
          status.hidden = false;
          status.textContent = "Thanks — we logged it. A rebuild of this resort is next on our list.";
        }
        form.querySelector("textarea").disabled = true;
      })
      .catch(() => {
        if (submit) submit.disabled = false;
        if (status) {
          status.hidden = false;
          status.textContent = "Could not send just now. Copy your note and try again, or email us from the wiki.";
        }
      });
  });
}
