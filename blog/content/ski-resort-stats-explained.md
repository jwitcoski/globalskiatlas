Every resort website repeats vertical drop, skiable acres, trail count, and lift totals until those numbers feel objective. They are often defined differently from one mountain to the next. One brochure measures summit-to-base elevation you cannot ski in a single run. Another counts gladed acreage you can only reach on a powder day. A third splits or merges trails in ways that inflate the trail list without adding variety.

Global Ski Atlas publishes statistics derived from the same OpenStreetMap geometry for every downhill area we index. That does not make the numbers perfect. It does make them comparable. This guide explains what our core stats mean, why they diverge from marketing, how trail mix and lift types behave, what to do when a figure looks wrong, and how to use [resort comparison](../resort-comparison.html) once you understand the columns.

## Why comparable definitions matter more than bigger numbers

Skiers use stats to shortlist trips. If every mountain invents its own formula, the shortlist becomes a contest of adjectives. Mapped open data will not capture every powder stash or village vibe, but it does give one methodology across Colorado mom-and-pop hills and Tyrolean valleys.

Our philosophy is simple:

- Prefer geometry you can inspect and download
- Prefer the same computation everywhere
- Prefer humility when OSM is incomplete
- Prefer fixing upstream tags over inventing private corrections

You can verify attributes in files from [Download Data](../DownloadData.html) and preview terrain on the [interactive map](../mainmap.html). That audit trail is the difference between a brochure claim and a researchable statistic.

## Vertical drop: what we measure vs what resorts advertise

Vertical drop is the most abused ski statistic. Marketing often quotes the highest summit and lowest base associated with the brand, even when no continuous run connects those points for ordinary ticket holders. Mid-mountain villages, separate pods, and hike-to ridges complicate the story further.

In atlas terms, vertical relief comes from elevation context and tagged features associated with the resort boundary. We care about skiable high and low points reflected in mapped terrain, not a single lodge sign. That can still include multiple peaks inside a large polygon. It can also understate a mountain if summit terrain is poorly mapped.

When brochure vertical dwarfs what you see in atlas tools, ask:

- Is the marketed summit actually lift-served in-bounds terrain?
- Does the base elevation include a distant parking lot or a separate valley?
- Is the OSM boundary missing the upper bowls?

Vertical is a useful filter for trip planning, especially when paired with trail mix, but it is a poor single ranking key. A tall mountain with three runs is not automatically a better vacation than a shorter hill with a rich intermediate network.

## Skiable acres and mapped trail length

Skiable acres in commercial copy are proprietary. Resorts may include hike-to bowls, loosely affiliated terrain, or both sides of a ridge in ways outsiders cannot audit. Mapped skiable area in our dataset is grounded in downhill piste geometry inside the resort boundary and related analysis—not in a marketing acreage formula.

Two consequences follow:

- Thoroughly mapped European domains often look large because volunteers traced dense trail networks
- Under-mapped hills look smaller than their brochures until someone draws the missing lines

Mapped trail length—the sum of tagged downhill ways—is often a clearer size signal than acreage claims. That is why [largest ski resorts in the world](largest-ski-resorts-in-the-world.html) leans on mapped terrain rather than brochure acres. If a French area looks “too small” relative to its reputation, the usual explanation is incomplete OSM tracing, not a conspiracy in the pipeline.

Oversized `landuse=winter_sports` polygons create the opposite problem: inflated area stats that swallow neighboring valleys. Boundary quality is half of statistical quality. See [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html) if you need the tagging checklist.

## Trail count: useful, but sensitive to drawing style

We count distinct OSM ways tagged `piste:type=downhill` after processing and deduplication logic in the pipeline. That means:

- One logical run split into upper and lower segments may appear as two trails
- Unmapped gladed runs contribute nothing
- Duplicate overlapping ways can inflate counts until cleaned
- Named connectors and cut-throughs may or may not be tagged as separate pistes

Trail count is still valuable for comparing variety, especially alongside difficulty mix. It is a weak proxy for “amount of skiing” if used alone. A mountain with fifty short cruisers can out-count a mountain with twenty long fall-line runs.

When you sort by trails in [Ski Resort Facts](../SkiResortFacts.html) or [resort comparison](../resort-comparison.html), treat the number as mapped inventory, not as a moral score. Preview the layout on the map before you trust a high count.

## Lift count and lift mix

Lifts are mapped `aerialway=*` features associated with the resort. Aggregates by type appear on [Ski Lift Facts](../SkiLiftFacts.html), and the skier-facing meaning of chairs, gondolas, T-bars, and carpets is covered in [ski lift types explained](ski-lift-types-explained.html).

Lift totals describe access and capacity potential, with caveats:

- Magic carpets and rope tows are often under-tagged
- Pylons mistakenly tagged as lifts distort totals
- Abandoned lifts may linger in OSM
- High-speed detachables change the feel of a mountain more than raw lift count suggests

A resort with fewer but faster lifts can ski “smaller” in clock time than a mountain with many slow doubles. Lift count is therefore best read together with lift types and trail layout, not as a standalone brag.

## Trail mix and difficulty tags

Trail mix—the share of easier, intermediate, and advanced tagged runs—helps beginners and progressing intermediates more than raw vertical does. Beginner-oriented scoring in [best ski resorts for beginners](best-ski-resorts-for-beginners.html) depends on those tags being present and relatively honest.

Important limitations:

- US and European difficulty languages are not interchangeable
- Untagged runs fall into an unknown bucket
- One long summit-to-base green can inflate “easy” percentage without creating a true learning area
- Expert terrain left unmapped makes a mountain look gentler than it is

Trail mix is a planning aid. It is not a substitute for reading a trail map or previewing pitch. If you are crossing regions, [how to read a ski trail map](how-to-read-ski-trail-map.html) helps translate colors and expectations before you overweight a percentage.

## When atlas numbers disagree with the brochure

Disagreement is common and usually informative. Typical causes:

- Missing `piste:type=downhill` or `aerialway` tags
- Bloated or tiny winter-sports boundaries
- Pipeline lag behind very recent OSM edits
- Marketing definitions that include terrain outside managed in-bounds skiing
- Local tagging culture that splits or merges features differently

Debugging steps that actually help:

1. Open the resort on the [interactive map](../mainmap.html) and look for missing trails or lifts
2. Preview the same geometry in the [ski game](/playable/)
3. Compare columns for a few peers in [resort comparison](../resort-comparison.html)
4. Inspect attributes in GeoParquet from [Download Data](../DownloadData.html) if you are doing research
5. Fix OSM upstream using [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html)

Do not assume the larger brochure number is automatically true. Do not assume the atlas is automatically complete. Ask which definition each number is using, then decide which definition matches your trip question.

## How to use stats without letting them choose the trip for you

Stats narrow a shortlist. They do not replace snow reports, lesson quality, lodging, village atmosphere, or drive time. A practical workflow:

- Filter by skill fit using trail mix and beginner lifts
- Check size with mapped trail length or acres, not marketing superlatives
- Sanity-check access with lift count and types
- Weigh travel cost and distance with [Drive Time Map](../DriveTimeMap.html) and the framework in [how to choose a ski resort](how-to-choose-a-ski-resort.html)
- Confirm current weather separately on the [weather map](../weather-map.html)

Ski resort statistics are only as honest as their definitions. We choose mapped OpenStreetMap geometry so those definitions stay constant across countries and seasons. Learn vertical, acres, trails, lifts, and trail mix as we compute them; compare candidates in [resort comparison](../resort-comparison.html); and when brochures and maps disagree, prefer the reproducible source—then improve OSM so the next pipeline run tells a truer story for everyone using Global Ski Atlas.
