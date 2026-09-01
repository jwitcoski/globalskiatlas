## Why OpenStreetMap tagging matters for the atlas

Global Ski Atlas is not a pass vendor or a resort marketing site. We build a standardized worldwide downhill ski atlas from [OpenStreetMap](https://www.openstreetmap.org/) (OSM) so skiers can compare resorts on the same terms. If a hill is missing from the [interactive map](../mainmap.html), it is usually because the underlying OSM data is incomplete, mis-tagged, or split across features that our pipeline cannot yet merge.

That is where you come in. OSM is a community map. When you add or fix tags for a ski area, you improve the atlas, the [wiki](../wiki/browse.html), the [ski game](/playable/), and the downloadable datasets on [Download Data](../DownloadData.html). This guide is our flagship contribution post: what counts for inclusion, how to tag it step by step, what goes wrong most often, and how your edits flow through our pipeline.

## What counts as a downhill ski resort in our dataset

We anchor each resort on a **winter sports area** polygon tagged `landuse=winter_sports`. That polygon represents the managed ski domain: lifts, pistes, base areas, and related infrastructure. Inside or near that boundary we look for:

- **Downhill pistes** — ways tagged `piste:type=downhill` (sometimes with `piste:difficulty` for green/blue/black)
- **Lifts** — ways tagged `aerialway=*` (chairlift, gondola, drag_lift, cable_car, and others)

A resort typically needs all three layers to appear as a complete entry. A `landuse=winter_sports` polygon with no mapped pistes or lifts will show up as a stub at best. Conversely, excellent piste and lift mapping with no winter_sports boundary makes it harder for us to group features into one resort and compute [Ski Resort Facts](../SkiResortFacts.html) consistently.

We focus on **downhill** skiing. Cross-country tracks (`piste:type=nordic`), snowshoe routes, and general winter recreation without lifts are valuable OSM data, but they are outside the core downhill atlas unless they share a clearly tagged winter_sports area with alpine terrain.

## Step 1: Draw or fix the winter_sports boundary

Start with the ski area outline. In iD or JOSM, trace the polygon that encloses the resort's operational domain — not the entire mountain range, and not just the parking lot.

```xml
landuse=winter_sports
name=Example Mountain Resort
```

Add `name:en` if the local name is not obvious to international users. If the resort is part of a larger ski domain (common in the Alps), use `site=ski` on a relation or document the relationship in `operator` and `ref` tags so mappers understand how areas connect.

**Common mistake:** drawing a huge polygon that includes backcountry, summer hiking trails, or neighboring valleys. Our pipeline buffers and analyzes geometry inside this boundary; oversized polygons inflate skiable acreage and distort stats. See [stats explained](ski-resort-stats-explained.html) for how those numbers are computed.

## Step 2: Map lifts as aerialways

Each lift line should be a way (or relation for complex systems) with an `aerialway` tag. Match the real lift type:

```xml
aerialway=chair_lift
aerialway=detachable_chair_lift
aerialway=gondola
aerialway=mixed_lift
aerialway=drag_lift
aerialway=t-bar
aerialway=platter
aerialway=cable_car
aerialway=magic_carpet
```

Add `name`, `aerialway:occupancy` where known, and `oneway=yes` when traffic is uphill-only. Chairlifts and gondolas should follow the centerline of the lift path between terminals, not the ski run underneath.

**Common mistake:** tagging a hiking trail or service road as a lift, or leaving `aerialway=yes` without a specific type. Vague tags make it impossible to classify lift inventory in [Ski Lift Facts](../SkiLiftFacts.html) or compare resorts fairly.

## Step 3: Map downhill pistes

Pistes are ways (or relations for segmented runs) following the centerline of the trail:

```xml
piste:type=downhill
piste:difficulty=intermediate
name=Bluebird
```

Difficulty values follow OSM convention: `novice`, `easy`, `intermediate`, `advanced`, `expert`, and `freeride` where appropriate. In North America, `easy` often corresponds to green circles and `intermediate` to blue squares; European resorts sometimes use different local schemes, so consistency within one area matters more than forcing US color names.

Optional but helpful tags:

```xml
piste:grooming=classic
lit=yes
oneway=yes
```

**Common mistake:** tracing pistes along lift lines, omitting `piste:type=downhill` (leaving only `highway=path`), or mapping every service road as a ski trail. Unmarked forest roads tagged as pistes inflate trail counts on the [resort comparison](../resort-comparison.html) tool.

## Step 4: Connect base areas, buildings, and access

While not always required for inclusion, these tags improve discoverability:

```xml
tourism=hotel
amenity=restaurant
highway=service
```

Parking and ticket plazas help other mappers orient. If the resort has a well-known official website, `website` and `contact:website` on the winter_sports relation or a representative node are welcome.

## Step 5: Validate before you save

Before uploading your changes:

1. Zoom out — does the winter_sports polygon look like a ski area, not a county?
2. Click each lift — does `aerialway` match what is on the ground?
3. Spot-check pistes — do difficulties make sense relative to each other?
4. Search for duplicate boundaries — two overlapping `landuse=winter_sports` polygons for one resort will confuse aggregation.

If you are unsure how a tag renders, preview the area in our [ski game](/playable/). The game builds playable terrain from the same OSM features we ingest. When something looks wrong in-game, the data is often wrong in OSM.

## Common mistakes that keep resorts out of the atlas

| Problem | Effect |
| --- | --- |
| No `landuse=winter_sports` | Resort hard to identify as a unit |
| Pistes without `piste:type=downhill` | Trails excluded from downhill stats |
| Lifts tagged as `man_made=pipeline` or paths | Lift count drops to zero |
| Resort split across countries with no names | Duplicate or orphan entries after merge |
| Indoor / dry slopes only | May not meet downhill outdoor criteria |

Abandoned ski areas are a gray zone. If lifts are removed but pistes remain visible, document with `disused:aerialway=yes` rather than deleting history. Active resorts with seasonal closures should stay tagged; use `seasonal=*` where relevant.

For a deeper look at what we measure once tags are correct, read [What Ski Resort Stats Actually Mean](ski-resort-stats-explained.html).

## How your edits reach Global Ski Atlas

We do not scrape resort websites for trail maps. We process regional OSM extracts through an 11-step pipeline (documented on [Download Data](../DownloadData.html)):

1. Extract `landuse=winter_sports` features from Geofabrik PBF files
2. Pull nearby OSM features within roughly 2 km of each ski area
3. Extract lift lines and piste geometries
4. Enrich with boundaries and administrative context
5. Analyze — trail counts, elevation, skiable area, lift totals
6. Export to GeoParquet
7. Build display buffers for web maps
8. Translate and normalize names
9. Attach elevation and contours
10. Re-export analyzed CSV
11. Combine regional outputs into one global dataset

Fresh OSM edits appear in our maps after the next extract and pipeline run — not instantly, but on a predictable cadence. The [wiki](../wiki/browse.html) and [interactive map](../mainmap.html) both consume this unified dataset.

## Use the ski game as a tagging sandbox

Our experimental [ski game](/playable/) turns OSM pistes and lifts into playable downhill runs. It is a stress test for your mapping: if a lift does not register, if pistes float off the terrain, or if the resort boundary frames empty wilderness, you have found a tagging gap worth fixing.

When the game detects issues, use **Open in OSM** to jump directly to the resort relation in the OpenStreetMap editor. Fix tags there, wait for the next data refresh, and reload the game to verify. That loop — map, play, fix — is exactly how we want contributors to engage with open data.

You can also cross-check neighboring resorts on the [trip planner](../TripPlannerMap.html) or [drive time map](../DriveTimeMap.html) once your area is indexed.

## Etiquette and resources

- Read the [OSM wiki page on winter sports](https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dwinter_sports) before large edits
- Discuss uncertain boundaries on regional OSM forums or changeset comments
- Do not copy proprietary trail maps; trace from permitted imagery or GPS
- Prefer improving one complete small resort over adding rough outlines worldwide

If you are comparing your work to commercial trail maps, see [How to Read a Ski Trail Map](how-to-read-ski-trail-map.html) for color systems and symbols.

## What to do next

Pick a resort you know well. Check whether it exists on the [interactive map](../mainmap.html). If it is missing or thin, add the winter_sports polygon, lifts, and downhill pistes using the tags above. Preview in the [ski game](/playable/), submit your OSM changeset, and watch the atlas improve for everyone.

For the big-picture view of how many resorts exist globally and where OSM is strong or thin, continue with [How Many Ski Resorts Are There in the World?](how-many-ski-resorts-worldwide.html).
