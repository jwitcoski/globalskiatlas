# MapTiler Discord update – Global Ski Atlas (Fri–Sun + this week)

**Context:** Global Ski Atlas – ski resort maps and data (3k+ areas worldwide). Using MapTiler APIs for basemaps, vector tiles, Data API, and Weather.

---

## What I shipped Fri–Sun (GitHub)

**MapTiler usage:**

- **Main map & popup** – Migrated from Leaflet-only to **MapTiler vector tiles** (ski area outlines, lifts, pistes) via `api.maptiler.com/tiles/.../z/x/y.pbf`, with **winter-v4** basemap. Fixed tileset IDs, `maxNativeZoom`, and VT tooltips.
- **Weather map (new page)** – **MapTiler SDK JS v3** + **MapTiler Weather SDK** (precipitation, radar, temperature, wind, pressure). Uses Data API `features.json` for ski areas as points, BACKDROP style, and Weather layer switcher with decoded tiles.
- **"Find wettest resort"** – Popup that finds the wettest ski resort in the last/next 24h using precipitation layers + ~10:1 snowfall estimate on the live counter; mobile tweaks for legend/buttons.
- **SEO** – Full meta, OG, Twitter, canonical, JSON-LD for the weather map page.
- **Config** – Centralized MapTiler keys and tile URLs in `scripts/map-config.js` (Data API + vector tilesets + winter-v4).

So right now the stack is: **Maps API** (winter-v4 + vector tiles for outlines/lifts/pistes), **Data API** (ski areas GeoJSON), and **Weather API** (catalog + decoded layers). All working together on the main map and the new weather map.

---

## Plans this week

- **Ski Atlas wiki backed by DynamoDB** – Building out the "atlas section" of the site: resort pages with editable, Wikipedia-style text. Plan is to store resorts and region (country/state) intro pages in **DynamoDB** (e.g. `ski_atlas_resorts`, `ski_atlas_region_pages`, `ski_atlas_revisions`), with Cognito for contributors and admin moderation. Map side: keep using MapTiler for the online atlas (basemap + vector tiles); eventually join with QGIS-generated static maps and InDesign export for a print/coffee-table book. So MapTiler stays the main mapping layer; DynamoDB is for content and workflow.

If anyone's done similar "map + CMS/wiki" setups with MapTiler or has tips on high-density point layers (3k+ ski areas) with the Data API or vector tiles, happy to hear it.

---

*You can copy-paste the sections above into the MapTiler Discord. Trim or expand the "Context" line as needed.*
