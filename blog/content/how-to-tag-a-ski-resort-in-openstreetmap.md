Global Ski Atlas only works if OpenStreetMap has decent ski data. When a hill is missing from the [interactive map](../mainmap.html), it's usually because someone never drew the boundary, tagged the lifts wrong, or split one resort across features our pipeline can't merge yet.

OSM is a community map. Fix tags at your local hill and you improve the atlas, the [wiki](../wiki/browse.html), the [ski game](/playable/), and the downloads on [Download Data](../DownloadData.html). This is the guide I wish every mapper had before their first edits.

## What we need for a resort to show up

Anchor polygon: `landuse=winter_sports`. Inside or near it:

- `piste:type=downhill` ways (with `piste:difficulty` when you can)
- `aerialway=*` lifts (chair, gondola, drag, carpet — not pylons)

All three layers = a complete entry. Boundary with no pistes or lifts = stub at best. Great pistes with no winter_sports boundary = hard for us to group stats consistently.

We focus on **downhill**. Nordic tracks (`piste:type=nordic`) are valuable OSM data but outside the core atlas unless they share a clearly tagged alpine area.

## Step 1: the winter_sports boundary

Trace the operational ski domain in iD or JOSM — not the whole range, not just the parking lot.

```
landuse=winter_sports
name=Example Mountain Resort
```

Add `name:en` when the local name isn't obvious. Big Alpine domains sometimes need `site=ski` relations or clear `operator` tags so mappers know how areas connect.

**Common screw-up:** polygon big enough to include backcountry, summer hiking, and the next valley. Our pipeline analyzes geometry inside this boundary; oversized polygons inflate acreage. [Stats explained](ski-resort-stats-explained.html) for how those numbers work.

## Step 2: lifts

One way per lift line, tower to tower:

```
aerialway=chair_lift
aerialway=detachable
aerialway=gondola
aerialway=cable_car
aerialway=drag_lift
aerialway=t-bar
aerialway=platter
aerialway=magic_carpet
```

Add `name`, `oneway=yes` when uphill-only. Follow the cable, not the run underneath.

**Screw-up:** tagging pylons as lifts, or `aerialway=yes` with no type. Vague tags break [Lift Facts](../SkiLiftFacts.html).

## Step 3: downhill pistes

Centerline of each run, **downhill direction**:

```
piste:type=downhill
piste:difficulty=intermediate
name=Bluebird
```

`novice`, `easy`, `intermediate`, `advanced`, `expert`, `freeride` — OSM convention. US green/blue/black don't map 1:1 to every country; consistency within one area matters more.

Optional: `piste:grooming`, `lit=yes`, `oneway=yes`.

**Screw-up:** pistes along lift lines, `highway=path` without `piste:type=downhill`, or every service road as a ski trail. Inflates counts in [resort comparison](../resort-comparison.html).

## Step 4: base stuff (nice to have)

`tourism=hotel`, `amenity=restaurant`, `highway=service`, `website` on the area or a node. Helps orientation; not always required for inclusion.

## Step 5: sanity check before upload

Zoom out — does the polygon look like a ski area? Click each lift — right `aerialway`? Pistes — difficulties make sense relative to each other? Duplicate `landuse=winter_sports` for one resort?

Preview in the [ski game](/playable/). Same OSM features we ingest. Wrong in-game usually means wrong in OSM.

## Mistakes that keep resorts out

| Problem | What happens |
| --- | --- |
| No `landuse=winter_sports` | Hard to identify as one unit |
| Pistes missing `piste:type=downhill` | Excluded from downhill stats |
| Lifts as paths or pipelines | Lift count hits zero |
| Indoor / dry only | May not meet outdoor downhill criteria |

Abandoned areas: `disused:aerialway=yes` rather than deleting history. Active seasonal ops stay tagged.

## How edits reach the atlas

We don't scrape resort PDFs. Regional OSM extracts → 11-step pipeline on [Download Data](../DownloadData.html): extract winter_sports, nearby features, lifts, pistes, enrich, analyze, GeoParquet, buffers, names, elevation, combine globally.

Edits appear after the next pipeline run — not instant, but permanent and open. [Wiki](../wiki/browse.html) and [map](../mainmap.html) both consume the same dataset.

## Use the ski game as a feedback loop

The [ski game](/playable/) turns OSM into playable runs. Stress test for your mapping: lift missing, pistes floating, boundary framing empty wilderness = tagging gap.

**Open in OSM** jumps to the editor. **I fixed it in OSM** lets you tell us. Map, play, fix — that's the loop we want.

## Etiquette

Read the [OSM winter sports wiki](https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dwinter_sports). Don't trace proprietary trail maps. One complete small resort beats rough outlines worldwide.

Trail map colors: [how to read a ski trail map](how-to-read-ski-trail-map.html).

Pick a hill you know. Check the [map](../mainmap.html). Missing or thin? Add boundary, lifts, pistes. Preview in the [game](/playable/). Submit changeset.

Big picture: [how many resorts worldwide](how-many-ski-resorts-worldwide.html).
