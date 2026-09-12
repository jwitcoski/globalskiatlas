Global Ski Atlas only works when OpenStreetMap has coherent ski data. The fastest way to improve the atlas is to tag your local hill correctly in OSM so it appears on the [interactive map](../mainmap.html), feeds honest numbers into [Ski Resort Facts](../SkiResortFacts.html), and shows up in [resort comparison](../resort-comparison.html). This guide covers what we need for a downhill resort to be included, how to draw boundaries, how to map lifts and pistes, common mistakes, and how edits reach the site after the next pipeline run.

You do not need to be a professional cartographer. If you can ski the hill and read a trail map, you can usually improve the OSM geometry that powers every tool on this site—from the [wiki](../wiki/browse.html) to the experimental [ski game](/playable/) to the files on [Download Data](../DownloadData.html).

## What Global Ski Atlas looks for

We treat a downhill ski area as a coherent package of OpenStreetMap features, not a marketing brand name. In practice that means:

- A `landuse=winter_sports` polygon that outlines the managed ski domain
- Nearby downhill pistes tagged `piste:type=downhill`
- Aerial lifts tagged with `aerialway=*` values that match real infrastructure
- A clear `name` on the area (and `name:en` when the local name is not English)

We do not require a minimum vertical drop or ticket price. A community rope-tow hill counts if the geometry is coherent. A mega-domain also counts if its boundary and trails are mapped well. That same inclusion logic is what sits behind the global totals in [how many ski resorts worldwide](how-many-ski-resorts-worldwide.html).

If the boundary is missing, our pipeline struggles to group lifts and runs into one resort. If the boundary is huge and vague, every acreage and trail-length statistic becomes noisy. Good tagging is therefore both an inclusion rule and a fairness rule for stats explained in [ski resort stats explained](ski-resort-stats-explained.html).

## Draw the winter sports boundary first

Start with the polygon, not the lifts. Trace the managed ski domain: in-bounds terrain the resort operates, plus the base areas that clearly belong to that operation. Do not outline the entire mountain range. Do not stop at the parking lot alone. Do not swallow the next valley’s ski area because the ridgeline looks contiguous on satellite imagery.

Useful habits while drawing:

- Keep the polygon tight to signed or groomed in-bounds terrain
- Follow lift-served bowls and connectors when they are part of the same ticketed domain
- Stop before open backcountry that is not managed as resort terrain
- Add `name=*` that matches what skiers actually call the place

Oversized polygons inflate mapped skiable area and distort side-by-side comparison. Undersized polygons orphan lifts and runs outside the resort window. Either error makes [Ski Resort Facts](../SkiResortFacts.html) less trustworthy. A tight, accurate boundary is the first requirement for inclusion and for honest stats.

Interconnected European domains can be tricky. Les Trois Vallées or Portes du Soleil may appear as one large polygon, several linked areas, or a mix of relations depending on local mapping culture. Prefer the tagging already used by active local mappers unless you are correcting a clear error. Consistency within a region matters more than inventing a new scheme.

## Map lifts as aerialway ways

Lifts should be ways that follow the cable path from lower terminal to upper terminal. Tag them with the right `aerialway=*` value:

- `chair_lift` for fixed-grip and most detachable chairs
- `gondola` or `cable_car` for enclosed cabin lifts
- `t-bar`, `platter`, or `rope_tow` for surface lifts
- `magic_carpet` for beginner conveyor lifts
- `mixed_lift` when a chondola-style combination is clearly mapped that way

Draw the way uphill from base to summit when you can. Add `name=*` when the lift has a published name. One lift should usually be one clean way. Do not tag every pylon as its own lift. Do not trace the piste under the cable and call that the lift. Those mistakes break lift counts on [Ski Lift Facts](../SkiLiftFacts.html) and confuse the lift-type patterns described in [ski lift types explained](ski-lift-types-explained.html).

Magic carpets and rope tows are easy to forget because they look minor on a trail map. They matter for beginner scoring and for family-oriented hills highlighted in [best ski resorts for beginners](best-ski-resorts-for-beginners.html). If the learning area has three carpets and none are mapped, the atlas will understate how beginner-friendly the place is.

## Map downhill pistes with difficulty

Downhill runs need ways along trail centerlines, not along the lift cable and not along every summer hiking path that crosses the mountain. The core tags are:

- `piste:type=downhill`
- `piste:difficulty` with values such as `novice`, `easy`, `intermediate`, `advanced`, or `expert` as appropriate
- `name=*` when the run is named on the official map

Direction should match downhill flow. Split upper and lower segments only when the geometry truly changes or when local tagging already does so; unnecessary splits inflate trail counts. Gladed or tree runs that are signed as downhill trails deserve mapping too, but unsigned backcountry lines usually should not be forced into the resort’s downhill inventory.

Difficulty tags are not a universal language. US green/blue/black conventions and European color systems do not map one-to-one, and OSM’s `piste:difficulty` vocabulary sits between them. Relative accuracy inside one resort matters more than perfect cross-border equivalence. Untagged difficulty lands in an unknown bucket and weakens trail-mix tools used when skiers [choose a resort](how-to-choose-a-ski-resort.html).

## Common mistakes that keep resorts out or skew stats

Most atlas problems come from a short list of tagging errors:

- Missing `landuse=winter_sports` so lifts and pistes never become a resort object
- Boundary that covers half the range or only the lodge parking
- Hiking paths tagged as downhill pistes
- Summer roads left as ski trails
- Duplicate lift ways stacked on the same cable
- Pylons tagged as lifts
- Nordic-only loops tagged as if they were alpine domains
- Abandoned lifts left as active aerialways with no note that they are gone

Under-mapping excludes real hills until someone adds the missing pieces. Over-mapping inflates counts and trail kilometers until someone cleans the geometry. Both patterns show up when people ask [how many ski resorts exist worldwide](how-many-ski-resorts-worldwide.html) and when ranking [largest ski resorts](largest-ski-resorts-in-the-world.html) by mapped terrain.

Before you upload a large changeset, zoom out and ask whether a skier would recognize one ski area. Then zoom in and ask whether difficulties look relative to one another. That two-scale check catches most disasters.

## Validate locally before you wait for the atlas build

After saving your OSM edit, sanity-check in a few places:

1. Inspect the features on openstreetmap.org or in your editor’s validation tools
2. Confirm the boundary still reads as one resort at mid zoom
3. Spot-check a beginner area, a main chair, and one expert pitch
4. Preview geometry in the experimental [ski game](/playable/), which loads the same OSM-derived shapes we ingest
5. Use **Open in OSM** from the game when you notice a missing carpet or misdrawn run

Edits are not instant on Global Ski Atlas. We ingest regional Geofabrik extracts through the multi-step pipeline documented on [Download Data](../DownloadData.html). A correction appears after the next regional build that includes your area. That lag is real, but the payoff is permanent and open: every downstream page—map, facts tables, comparison, downloads—benefits from the same geometry.

Remote hills in Eastern Europe, the Andes, Central Asia, and parts of inland North America remain high-value mapping targets. Popular Alpine and Colorado resorts are often already dense; small community hills and newly built chairs are where a single afternoon of tagging still moves the atlas.

## A practical checklist for one resort session

If you have one evening after skiing, work in this order:

- Confirm or draw `landuse=winter_sports` with a sensible name
- Add or fix the main access lifts first
- Trace the signed downhill runs you actually skied
- Add learning-area carpets and rope tows
- Delete or retag obvious duplicates and summer-path false positives
- Recheck difficulty tags relative to the printed trail map
- Upload with a clear changeset comment naming the resort

You do not need to finish the entire mountain in one pass. A coherent boundary plus the primary lifts and a representative trail set is already a large improvement over an empty or broken entry.

## Why tagging here helps every skier downstream

Global Ski Atlas does not invent private resort databases. We analyze open geometry so skiers can compare mountains fairly instead of trusting brochure copy alone. When you fix a chairlift name, tighten a polygon, or add a missing green run, you improve:

- Discovery on the [main map](../mainmap.html)
- Aggregates and filters in [Ski Resort Facts](../SkiResortFacts.html)
- Side-by-side columns in [resort comparison](../resort-comparison.html)
- Research downloads on [Download Data](../DownloadData.html)
- Playable previews in the [ski game](/playable/)

Tagging a ski resort in OpenStreetMap is practical work, not arcane cartography. Draw the winter sports boundary, map lifts and downhill pistes with specific tags, validate at two zoom levels, and submit the changeset. The atlas improves when mappers improve OSM, and every corrected lift or green run helps the next skier choose where to go with comparable data instead of marketing adjectives alone.
