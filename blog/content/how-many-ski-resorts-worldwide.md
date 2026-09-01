## The question sounds simple. The answer is not.

Ask ten ski publications how many ski resorts exist worldwide and you will get ten different numbers — often between 2,000 and 6,000. The spread is not laziness. It is methodology. Some counts include every tow rope on a city hill; others only count destinations with gondolas and hotels. Some merge interconnected Alpine domains into one "resort"; others split them by lift ticket.

Global Ski Atlas takes a different approach. We count **mapped downhill ski areas** that meet consistent OpenStreetMap criteria, then analyze them with the same pipeline everywhere. This post explains our global count methodology, how resorts distribute across continents, which countries lead the list, where OSM coverage is thin, and what we deliberately exclude.

## Our counting methodology

Each entry in the atlas starts with an OSM feature tagged `landuse=winter_sports`. We treat that polygon as the resort boundary — the managed winter-sports domain, not an entire mountain range.

Within roughly two kilometers of that boundary we extract:

- Ways tagged `piste:type=downhill`
- Ways tagged `aerialway=*` (chairlifts, gondolas, surface lifts, cable cars, and related types)

We then run analysis steps (trail counts, lift totals, skiable area, elevation) and merge regional outputs into a global GeoParquet dataset. The full pipeline is documented on [Download Data](../DownloadData.html). You can explore results on the [interactive map](../mainmap.html), in [Ski Resort Facts](../SkiResortFacts.html), or by downloading raw files for your own queries.

**A resort is included in our primary downhill inventory when:**

1. It has a identifiable `landuse=winter_sports` geometry
2. It has at least one mapped downhill piste *or* at least one mapped lift inside the nearby extract window
3. It is not flagged as a duplicate merge of a neighboring entry

We do **not** require a minimum vertical drop, acreage, or lift count for basic inclusion. A one-lift community hill counts if it is tagged coherently. That choice favors completeness and fairness over prestige filtering — but it also means our total is higher than lists that only count "major" destinations.

For size-based rankings, we apply separate thresholds. See [The 10 Largest Ski Resorts in the World](largest-ski-resorts-in-the-world.html) for mapped-terrain leaders and [stats explained](ski-resort-stats-explained.html) for how acreage and trail counts are derived.

## What the current global total looks like

Exact numbers shift every pipeline run as OSM editors improve coverage. As of our latest combined global dataset, the atlas indexes on the order of **3,500–4,500** distinct downhill ski areas worldwide, depending on how you treat edge cases (adjacent polygons, seasonal ops, and incomplete tagging).

That range is intentional honesty. OSM is live. A strong mapping weekend in Hokkaido or the Pyrenees can add dozens of entries; duplicate cleanup can remove some. Check [Ski Resort Facts](../SkiResortFacts.html) for live aggregates, or filter the [interactive map](../mainmap.html) by country to reproduce the count yourself.

We report **resort count**, not **lift ticket count**. Les Trois Vallées may appear as one winter_sports polygon or several, depending on how local mappers structured relations. We do not manually merge marketing domains unless OSM geometry already reflects that grouping.

## Resorts by continent

Continental totals are useful for spotting coverage bias, not for bragging rights.

### Europe

Europe has the densest ski culture and generally the strongest OSM winter-sports coverage. The Alps alone contribute hundreds of mapped areas across France, Italy, Austria, and Switzerland. Scandinavia, the Pyrenees, the Balkans, and Eastern Europe add long tails of small community hills.

Detailed European piste mapping can make mapped acreage exceed brochure figures when every connector is traced.

### North America

The United States and Canada combine a moderate number of resorts with high mapping quality at destination mountains. The US long tail of small Midwest and Northeast hills is well represented relative to population. State-level breakdowns are in [Which U.S. States Have the Most Ski Resorts?](us-states-most-ski-resorts.html).

Private clubs and hills with restrictive map policies remain under-mapped.

### Asia

Japan, South Korea, and China dominate Asian totals. Japan's resort count surged in OSM after several mapping initiatives; powder destinations and small local hills both appear. India, Kazakhstan, and Turkey add smaller but growing footprints.

### Oceania and Africa

New Zealand and Australia account for most Oceania entries. African downhill skiing is rare but real — Morocco's Atlas Mountains are the primary example. Both regions are small enough that each tagged entry shifts continental totals noticeably.

### South America

Chile and Argentina lead, with Andean resorts mapped at varying detail. For geographic extremes, see [Skiing at the Edge of the World](northernmost-southernmost-ski-resorts.html).

## Top countries by resort count

Country rankings change with OSM edits, but patterns are stable:

| Region | Countries often near the top |
| --- | --- |
| Europe | France, Italy, Austria, Switzerland, Germany |
| North America | United States, Canada |
| Asia | Japan, China, South Korea |
| Oceania | New Zealand, Australia |

The United States typically ranks among the top three globally by raw count — not because it has more skiable terrain than the Alps, but because it has hundreds of independent small hills, many of them mapped as separate `landuse=winter_sports` polygons.

Japan's rise in the rankings reflects both real resort density and improved OSM community work. If you are planning travel, cross-check counts with the [trip planner](../TripPlannerMap.html) and [drive time map](../DriveTimeMap.html) rather than assuming country rank equals quality.

## OpenStreetMap caveats you should know

Our count is only as good as OSM. Major caveats:

**Under-mapping** — no `landuse=winter_sports` polygon, or lifts without pistes. Fix with our [how to tag guide](how-to-tag-a-ski-resort-in-openstreetmap.html).

**Over-mapping** — hiking paths tagged as pistes, or oversized polygons, inflate stats.

**Duplicates, naming, and stale extracts** — double boundaries, local spellings on the [wiki](../wiki/browse.html), and pipeline lag behind live OSM edits.

**Marketing vs geometry** — pass domains do not always match one polygon. See [Epic Pass vs Ikon Pass](epic-pass-vs-ikon-pass-resort-coverage.html).

## What we exclude

To keep a downhill atlas comparable worldwide, we exclude or de-emphasize:

- **Nordic-only areas** without downhill pistes or alpine lifts
- **Dry slopes and indoor domes** unless clearly tagged as downhill practice facilities within winter_sports (many are omitted entirely)
- **Heli-ski or cat-ski-only operations** with no lift-served in-bounds pistes mapped
- **Abandoned areas** with no active lifts and pistes removed from the map (historic data may remain in OSM but drop out of analyzed stats)
- **Features with no lifts and no pistes** — a lone `landuse=winter_sports` polygon with neither is a placeholder at best

Snow parks (`piste:type=snow_park`) and gladed runs count toward terrain when tagged as downhill pistes; they do not create a new resort on their own.

Areas without lifts *but* with multiple mapped downhill pistes may still appear — common at small rope-tow hills where the "lift" is a surface drag tagged inconsistently. That is why lift-type literacy matters; see [Ski Lift Types Explained](ski-lift-types-explained.html).

## How this compares to other published totals

Commercial directories often report **2,000–2,500** "significant" resorts using revenue or vertical thresholds we avoid. The atlas count is higher because we include small hills and honor OSM geometry over marketing domains — reproducible via [Download Data](../DownloadData.html).

If you want to choose among resorts rather than count them, move on to [How to Choose a Ski Resort](how-to-choose-a-ski-resort.html) or compare shortlists side by side on [resort comparison](../resort-comparison.html).

## Help close the gaps

The fastest way to change global totals is local tagging. Pick an under-mapped region, follow [How to Tag a Ski Resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html), validate in the [ski game](/playable/), and submit OSM changes. Rural hills in Eastern Europe, South America, and Central Asia remain the largest opportunities for count *and* quality gains.

We are building a worldwide downhill atlas from open data — not selling passes, not endorsing destinations. The number of resorts is a snapshot of community mapping progress as much as geography. Explore the current snapshot on the [interactive map](../mainmap.html), drill into [Ski Resort Facts](../SkiResortFacts.html), and improve the count where you ski.
