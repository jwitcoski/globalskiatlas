## Every resort page shows numbers. Few explain them.

Vertical drop, skiable acres, trail count, lift total — resort websites repeat these stats until they feel objective. They are not. Marketing departments round up, count groomed connectors differently, and sometimes include terrain that is not lift-served. Global Ski Atlas publishes stats derived from the same OpenStreetMap geometry everywhere, so you can compare a Colorado mom-and-pop hill to a Tyrolean valley on equal footing.

This glossary explains what each stat means in our dataset, how we compute it, where mapped data diverges from brochures, and how to use the [resort comparison](../resort-comparison.html) tool once you understand the columns.

## Mapped data vs marketing data

| Source | What it optimizes for | Weakness |
| --- | --- | --- |
| Resort marketing | Impressiveness, season pass value | Inconsistent definitions |
| Trail maps (proprietary) | Navigation | Not machine-readable, license-bound |
| OpenStreetMap + our pipeline | Consistency, global coverage | Incomplete where untagged |

We do not scrape PDF trail maps. We analyze tags and geometries from OSM, processed through the pipeline described on [Download Data](../DownloadData.html). That means our stats are **reproducible** — you can download GeoParquet and verify — but they may under-count a resort whose pistes are not yet mapped or over-count one with messy polygons.

When in doubt, preview terrain on the [interactive map](../mainmap.html) or fly through it in the [ski game](/playable/). If the map looks thin but the brochure looks huge, the gap is usually missing OSM data, not a bug in our math. Fix tags with [How to Tag a Ski Resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html).

## Vertical drop (elevation relief)

**What skiers think it means:** how far you descend from the highest lift-served point to the main base — the "wow" number on the poster.

**What we compute:** elevation relief from analyzed terrain models and tagged feature elevations within the resort boundary — essentially the difference between high and low plausible skiing elevations derived from DEM data and OSM geometry, not from a single sign at the base lodge.

**Why they differ:**

- Marketing often uses the highest lift terminal to the lowest public base, even if you cannot ski that full line without hiking
- We may include sub-peaks with short pitches if they are inside the winter_sports polygon
- Resorts with incomplete lift tagging can skew high or low until mappers add summit and base elevations

Vertical is useful for rough bucket sorting (1,000 ft vs 3,000 ft), not for precise bragging. Pair it with trail difficulty mix before assuming "big vertical" equals "hard skiing."

## Skiable acres (and hectares)

**What skiers think it means:** lift-served groomed and gladed terrain you could reasonably ski in a day.

**What we compute:** the area of mapped downhill piste geometry (and related skiable polygons where tagged) inside the resort boundary, converted to acres from square meters or hectares.

**Why they differ:**

- Marketing acreage often includes non-lift-served bowls, hike-to terrain, or double-counts both sides of a ridge
- We count what is drawn as `piste:type=downhill` (and related tags), so unmapped gladed zones do not appear
- Over-sized `landuse=winter_sports` polygons inflate our acreage without adding trails — a tagging error, not a feature

For the largest mapped areas worldwide, see [The 10 Largest Ski Resorts in the World](largest-ski-resorts-in-the-world.html). Rankings by acreage often surprise people familiar only with US destination marketing.

## Trail count

**What skiers think it means:** named runs on the paper trail map — "200 trails!"

**What we compute:** the number of distinct OSM ways (or relation members) tagged `piste:type=downhill` within the resort extract, after deduplication heuristics.

**Why they differ:**

- Resorts split one logical run into upper/lower segments; we may count two
- Connectors and cat tracks may be tagged as pistes in OSM but unnamed on brochures
- Unmapped runs do not count at all

Trail count drives our size categories (small, medium, mega) used in charts on [Ski Trail Facts](../SkiTrailFacts.html). A resort with 15 mapped trails is a different experience than one with 150, even if both call themselves "big."

## Lift count

**What skiers think it means:** number of chairlifts, gondolas, and surface lifts you can ride — sometimes excluding magic carpets or counting a detachable quad as one "lift" even if it has two lines.

**What we compute:** mapped ways tagged `aerialway=*` within the resort nearby window, grouped by type for [Ski Lift Facts](../SkiLiftFacts.html).

**Why they differ:**

- Rope tows and carpets are inconsistently mapped
- Gondola + chair combinations (chondola) may be one way or two
- Closed or seasonal lifts may remain in OSM with `disused:` tags

Lift count matters for throughput and beginner access — a hill with one lift and 20 trails feels very different from 20 lifts and 20 trails. Read [Ski Lift Types Explained](ski-lift-types-explained.html) for how types affect your day.

## Elevation (summit and base)

We store summit-like and base-like elevations from DEM analysis and tagged nodes. These feed vertical calculations and appear in popups on the [interactive map](../mainmap.html).

Marketing summit figures sometimes use a nearby peak name while lifts stop below the true summit. Our numbers follow skiable geometry, not signage poetry.

## Trail mix (difficulty distribution)

**What skiers think it means:** percentage green / blue / black on the trail map pie chart.

**What we compute:** distribution of `piste:difficulty` tags among mapped downhill pistes — `novice`, `easy`, `intermediate`, `advanced`, `expert`, `freeride`, and untagged.

**Why they differ:**

- US vs Europe color conventions are not 1:1 with OSM values
- Many runs are left untagged; untagged trails land in an "unknown" bucket
- Resorts grade relative to local norms; an Austrian "easy" may feel like a US "intermediate"

Trail mix is the best stat for beginners if it is well-tagged. See [Best Ski Resorts for Beginners](best-ski-resorts-for-beginners.html) for how we score learning terrain.

## Secondary stats you may see

Depending on the view ([wiki](../wiki/browse.html), comparison table, or Parquet export), you may also encounter:

- **Country and region** — from administrative enrichment, not resort marketing
- **Latitude / longitude** — centroid or boundary-based, for sorting extremes ([northernmost and southernmost](northernmost-southernmost-ski-resorts.html))
- **Category labels** — derived buckets (small / medium / mega) from trail count thresholds
- **Buffer geometry** — display polygons for web maps, not skiable area

## How to compare resorts fairly

Once you understand the columns:

1. Open [resort comparison](../resort-comparison.html)
2. Add resorts you are considering — search works best with exact names from the atlas
3. Sort by the stat that matches your priority (trail count for variety, vertical for leg burn, lifts for access)
4. Cross-check terrain on the [interactive map](../mainmap.html)
5. Use [drive time map](../DriveTimeMap.html) or [trip planner](../TripPlannerMap.html) for logistics

Stats narrow a shortlist; they do not replace snow reports, lesson availability, or how you feel about a village. For a full decision framework, read [How to Choose a Ski Resort](how-to-choose-a-ski-resort.html).

## When stats look wrong

If numbers seem off:

1. **Check OSM** — missing `piste:type=downhill` or `aerialway` tags are the usual culprit
2. **Check the boundary** — an oversized `landuse=winter_sports` polygon inflates acreage
3. **Check the date** — pipeline refreshes lag live OSM edits
4. **Play the hill** in the [ski game](/playable/) — if runs are missing in-game, they are missing in data
5. **Contribute fixes** — the atlas improves when mappers improve tags

You can also inspect raw attributes via [Download Data](../DownloadData.html) if you want SQL-level proof.

## The bottom line

Ski resort stats are only as honest as their definitions. We choose mapped OpenStreetMap geometry so definitions stay constant across countries and seasons. Marketing numbers are useful for vibe; atlas numbers are useful for comparison.

Learn the vocabulary once, compare everywhere, and when brochures and maps disagree, trust the reproducible source — then fix OSM so the next pipeline run tells a truer story.
