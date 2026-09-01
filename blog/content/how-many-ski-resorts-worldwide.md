Ask ten people how many ski resorts exist worldwide and you'll get ten different answers — usually somewhere between 2,000 and 6,000. Nobody's lying on purpose. They're just counting different things. Some lists only include places with gondolas and hotels. Others count every rope tow on a city hill. Some merge Les Trois Vallées into one entry; others split it by village.

We took a narrower path: **mapped downhill ski areas** from OpenStreetMap, analyzed the same way everywhere. This post is how we count, what the number looks like by continent, where the data is thin, and what we leave out on purpose.

## What actually gets counted

Each atlas entry starts with an OSM polygon tagged `landuse=winter_sports`. That's the managed ski domain — lifts, pistes, base stuff — not the whole mountain range.

Near that boundary we pull:

- Ways tagged `piste:type=downhill`
- Ways tagged `aerialway=*` (chairs, gondolas, drags, etc.)

Then we run analysis (trail counts, lifts, skiable area, elevation) and merge regions into a global GeoParquet file. Pipeline details live on [Download Data](../DownloadData.html). You can poke results on the [interactive map](../mainmap.html), [Ski Resort Facts](../SkiResortFacts.html), or download the raw files.

**Included when:**

1. There's a `landuse=winter_sports` geometry
2. At least one downhill piste *or* lift shows up in the nearby extract
3. We haven't merged it as a duplicate of a neighbor

We don't require minimum vertical or acreage. A one-lift community hill counts if it's tagged coherently. That pushes our total above "major destination only" lists — on purpose.

Size rankings use different thresholds. See [Largest Ski Resorts](largest-ski-resorts-in-the-world.html) and [stats explained](ski-resort-stats-explained.html).

## The global total (and why it's a range)

Exact numbers move every pipeline run. OSM editors add hills in Hokkaido; someone cleans up duplicate polygons in Vermont. As of our latest combined dataset, we're in the ballpark of **3,500–4,500** distinct downhill areas worldwide, depending on edge cases.

That's intentional honesty. Check [Ski Resort Facts](../SkiResortFacts.html) for live aggregates or filter the [map](../mainmap.html) by country and count yourself.

We report **resort count**, not **lift ticket count**. Les Trois Vallées might be one polygon or several — whatever local mappers drew.

## By continent (rough picture)

**Europe** has the densest culture and usually the best OSM winter coverage. The Alps alone contribute hundreds of areas. Scandinavia, Pyrenees, Balkans, Eastern Europe add long tails of small hills.

**North America** has fewer polygons but bigger average size. The US long tail of Midwest and Northeast knolls is well represented. Private clubs and hills with restrictive map policies stay under-mapped.

**Asia** — Japan, Korea, China lead. Japan's count jumped after several mapping pushes. India and Turkey are smaller but growing.

**Oceania and Africa** — NZ and Australia dominate Oceania. African downhill is rare; Morocco's Atlas Mountains are the main story. Small regions mean each new tag shifts totals.

**South America** — Chile and Argentina in the Andes. See [northernmost and southernmost](northernmost-southernmost-ski-resorts.html) for geographic extremes.

## Countries that usually top the list

France, Italy, Austria, Switzerland, Germany, the United States, Canada, Japan, China, South Korea, New Zealand, Australia — the usual suspects, in varying order.

The US ranks high partly because we count hundreds of small independents, not because we have more Alps-scale terrain than Europe. Japan's climb in the rankings is real resort density *and* better community mapping.

Planning travel? Use [trip planner](../TripPlannerMap.html) and [drive time](../DriveTimeMap.html), not country rank alone.

## Where OSM lies to you (sort of)

**Under-mapping** — boundary with no lifts or pistes inside. Fix: [tagging guide](how-to-tag-a-ski-resort-in-openstreetmap.html).

**Over-mapping** — hiking paths tagged as pistes, huge polygons. Inflates stats.

**Duplicates and stale names** — double boundaries, local spellings on the [wiki](../wiki/browse.html), pipeline lag behind live edits.

**Marketing vs geometry** — pass domains ≠ one polygon. [Epic vs Ikon coverage](epic-pass-vs-ikon-pass-resort-coverage.html).

## What we exclude

Nordic-only areas without downhill pistes or alpine lifts. Dry slopes and indoor domes (mostly). Heli/cat-only ops with no mapped in-bounds pistes. Abandoned areas when lifts and runs are gone from the map. A lone `winter_sports` polygon with neither lifts nor pistes — that's a placeholder, not a resort.

Snow parks count when tagged as downhill pistes. They don't create a new resort by themselves.

Hills with pistes but no lifts sometimes still appear — rope tows get tagged inconsistently. [Lift types](ski-lift-types-explained.html) context helps.

## Compared to other published totals

Commercial directories often say **2,000–2,500** "significant" resorts using revenue or vertical cutoffs we don't use. We're higher because we include small hills and honor OSM geometry over marketing domains — reproducible via [Download Data](../DownloadData.html).

Want to pick a resort instead of counting them? [How to Choose a Ski Resort](how-to-choose-a-ski-resort.html) or [resort comparison](../resort-comparison.html).

## Help close the gaps

Fastest way to change the global count: tag your local hill. Follow [How to Tag a Ski Resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html), sanity-check in the [ski game](/playable/), submit OSM edits. Eastern Europe, South America, and Central Asia are still the biggest opportunities.

We're building a worldwide downhill atlas from open data — not selling passes. The count is a snapshot of mapping progress as much as geography. Explore on the [map](../mainmap.html), drill into [Resort Facts](../SkiResortFacts.html), fix what you know is wrong.
