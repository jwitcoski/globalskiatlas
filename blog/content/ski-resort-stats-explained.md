Every resort page shows numbers. Few explain them.

Vertical drop, skiable acres, trail count, lift total — websites repeat these until they feel objective. They're not. Marketing rounds up, counts connectors differently, sometimes includes terrain you can't reach from a lift.

Global Ski Atlas publishes stats from the same OpenStreetMap geometry everywhere so you can compare a Colorado mom-and-pop to a Tyrolean valley on equal footing. What each stat means in our dataset, where mapped data diverges from brochures, and how to use [resort comparison](../resort-comparison.html) once you understand the columns.

## Mapped vs marketing

| Source | Optimizes for | Weak spot |
| --- | --- | --- |
| Resort marketing | Impressiveness, pass value | Inconsistent definitions |
| Proprietary trail maps | Navigation | Not machine-readable |
| OSM + our pipeline | Consistency, global coverage | Incomplete where untagged |

We don't scrape PDF trail maps. Tags and geometries through the pipeline on [Download Data](../DownloadData.html). Reproducible — download GeoParquet and verify — but may under-count unmapped resorts or over-count messy polygons.

Map looks thin, brochure looks huge? Usually missing OSM, not math bugs. Fix tags: [tagging guide](how-to-tag-a-ski-resort-in-openstreetmap.html). Or fly it in the [ski game](/playable/).

## Vertical drop

**What you think:** highest lift-served point to main base — the poster number.

**What we compute:** relief from DEM + tagged elevations inside the resort boundary — skiable high/low from analyzed geometry, not one sign at the lodge.

**Why they differ:** marketing uses highest terminal to lowest base even if you can't ski that line; we may include sub-peaks inside the polygon; incomplete lift tagging skews until someone adds summit/base nodes.

Useful for bucket sorting (1,000 ft vs 3,000 ft), not precise bragging. Pair with trail mix before "big vertical" = "hard skiing."

## Skiable acres

**What you think:** lift-served groomed and gladed terrain you'd ski in a day.

**What we compute:** area of mapped downhill piste geometry inside the boundary, acres from m²/hectares.

**Why they differ:** marketing includes hike-to bowls, double-counts ridge sides; we count drawn `piste:type=downhill` — unmapped gladed = invisible; oversized `landuse=winter_sports` inflates acreage (tagging error).

[Largest resorts](largest-ski-resorts-in-the-world.html) by mapped size often surprise US-marketing natives.

## Trail count

**What you think:** named runs on the paper map — "200 trails!"

**What we compute:** distinct OSM ways tagged `piste:type=downhill` after dedup heuristics.

**Why they differ:** one logical run split upper/lower = two; cat tracks tagged pistes; unmapped runs = zero.

Drives size categories on [trail facts](../SkiTrailFacts.html). Fifteen mapped trails ≠ one hundred fifty — even if both say "big."

## Lift count

**What you think:** chairs, gondolas, surface lifts you ride — sometimes excluding carpets or counting one detachable quad as one "lift."

**What we compute:** mapped `aerialway=*` in the resort window, typed for [lift facts](../SkiLiftFacts.html).

**Why they differ:** rope tows/carpets inconsistently mapped; chondola one way or two; `disused:` lifts lingering in OSM.

One lift / twenty trails vs twenty lifts / twenty trails — different day. [Lift types](ski-lift-types-explained.html).

## Elevation

Summit/base-like elevations from DEM + tagged nodes. Feed vertical and map popups. Marketing summit names sometimes peak above where lifts actually stop. We follow skiable geometry, not signage poetry.

## Trail mix

**What you think:** green/blue/black pie chart.

**What we compute:** distribution of `piste:difficulty` among mapped downhill pistes.

**Why they differ:** US vs Europe ≠ 1:1 OSM values; untagged runs in "unknown"; local grading norms — Austrian "easy" may feel US intermediate.

Best beginner stat when well-tagged. [Beginners post](best-ski-resorts-for-beginners.html).

## Other fields you might see

Country/region from admin enrichment. Lat/long for sorting ([edge of the world](northernmost-southernmost-ski-resorts.html)). Category buckets (small/medium/mega) from trail thresholds. Buffer geometry for web maps — not skiable area.

## Compare fairly

[Resort comparison](../resort-comparison.html) → add candidates → sort by priority → cross-check [map](../mainmap.html) → [drive time](../DriveTimeMap.html) or [trip planner](../TripPlannerMap.html) for logistics.

Stats narrow shortlists; they don't replace snow reports, lessons, or village vibe. Full framework: [how to choose](how-to-choose-a-ski-resort.html).

## When numbers look wrong

1. Check OSM — missing `piste:type=downhill` or `aerialway`
2. Check boundary — oversized `landuse=winter_sports`
3. Check pipeline date — lag behind live edits
4. [Ski game](/playable/) — missing runs in-game = missing in data
5. Contribute fixes

SQL-level proof: [Download Data](../DownloadData.html).

Definitions stay constant across countries because we chose mapped OSM geometry. Marketing numbers = vibe. Atlas numbers = comparison. When brochures and maps disagree, trust the reproducible source — then fix OSM so the next pipeline run tells a truer story.
