Global Ski Atlas looks like an interactive map, but the map is only the last mile of a longer data story. Behind every resort popup is a pipeline that starts with volunteer OpenStreetMap edits, runs through cloud processing, and lands as GeoParquet files the website can render quickly in a browser. This guide explains that path in plain language for skiers, journalists, and mappers who want to know why a hill appears, why a trail is missing, or how to download the same building blocks we use.

## The problem the pipeline solves

Resort websites measure mountains differently. One counts gladed acres; another quotes summit-to-base vertical you cannot ski in a single run; a third invents trail totals by splitting every pitch into named segments. Comparing those pages is like comparing cars using only dealer stickers written in different units.

OpenStreetMap (OSM) offers a shared canvas: winter-sports boundaries, downhill piste ways, and aerial lifts drawn as geographic features anyone can inspect. Global Ski Atlas does not invent a private ski graph from scratch. We ingest OSM geometry, apply consistent spatial rules, and publish comparable statistics on the [interactive map](../mainmap.html), in [Ski Resort Facts](../SkiResortFacts.html), and through [Download Data](../DownloadData.html).

The pipeline exists so those rules stay the same in Japan, Colorado, and Patagonia—even when marketing language does not.

## Step 1: OpenStreetMap as the source of truth

Most downhill areas begin with a `landuse=winter_sports` polygon or related ski-area relation. Inside or near that boundary, mappers draw:

- `piste:type=downhill` ways for runs
- `aerialway=*` features for chairlifts, gondolas, T-bars, and other lifts
- Optional attributes for difficulty, name, and capacity

Coverage quality varies by region. Alpine valleys and popular U.S. destinations are often richly mapped. Remote community hills may have a boundary with few trails, or trails with no boundary. That unevenness is why atlas counts move over time and why [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html) matters as much as any chart on this site.

We do not treat OSM as flawless. We treat it as inspectable. If a statistic looks wrong, you can usually find the geometric reason on the public map.

## Step 2: Extract, analyze, and standardize

Raw planet extracts are large. The atlas pipeline pulls relevant winter-sports features (commonly via regional extracts such as Geofabrik), then analyzes them with geospatial tools so every resort is processed under the same windowing and association rules.

Typical standardization questions the pipeline answers:

- Which pistes and lifts belong to which winter-sports area?
- What vertical relief exists inside the mapped boundary?
- How much downhill geometry is present (a proxy for skiable terrain)?
- How should trail difficulty tags be summarized when systems differ by country?

Those answers become tabular attributes attached to resort geometries. The [about](../about.html) page describes the cloud side of this work—containerized jobs, object storage, and catalogs—while this article focuses on what the stages mean for users.

Importantly, the pipeline is not a human editor rewriting every mountain’s story by hand. It is a repeatable transformation. When OSM improves, a later run can improve the atlas without a one-off spreadsheet edit.

## Step 3: Publish GeoParquet for the web and for download

Processed outputs land as GeoParquet and related artifacts in cloud storage. Parquet is a columnar format that keeps analytics fast; GeoParquet adds geometry so mapping libraries can read features efficiently.

That choice enables two audiences at once:

1. **Website visitors** — the map and facts pages load standardized features without shipping an entire planet file.
2. **Researchers and builders** — the same files are linked from [Download Data](../DownloadData.html) so you can verify totals, build your own charts, or study coverage gaps.

If you are used to shapefiles or GeoJSON dumps, think of GeoParquet as a modern cousin optimized for large attribute tables plus geometry. You still get open data; you just get it in a format that scales.

## Step 4: Maps, wiki pages, and comparison tools consume the same tables

Once the files are public, product surfaces diverge:

- The [interactive map](../mainmap.html) renders resort locations and, at closer zooms, trail and lift detail.
- [Resort comparison](../resort-comparison.html) and tier tools read the same stats columns so shortlists stay consistent.
- The [online atlas wiki](../wiki/browse.html) presents per-resort pages that can sit on top of the structured data.
- Blog posts such as [ski resort stats explained](ski-resort-stats-explained.html) teach humans how to read those columns.

This shared-table design is why fixing OSM is more powerful than emailing a one-time correction. A tagging fix can flow into the next build and update map, facts, and downloads together.

## What can go wrong (and how to diagnose it)

Most “atlas bugs” are upstream or timing issues:

- **Missing hill** — no coherent winter-sports geometry yet, or no associated pistes/lifts under our inclusion rules.
- **Tiny acreage vs brochure** — downhill ways are incomplete, or the boundary is wrong.
- **Weird trail mix** — difficulty tags missing or using a regional scheme you did not expect.
- **Stale lift** — OSM not updated after a real-world removal or addition; pipeline lag behind the latest edit.

Diagnosis workflow:

1. Search the hill on the [map](../mainmap.html) and zoom until trails should appear.
2. Compare attributes in [Ski Resort Facts](../SkiResortFacts.html) or a comparison shortlist.
3. Inspect OSM itself for boundary and `piste`/`aerialway` tags.
4. Download GeoParquet from [Download Data](../DownloadData.html) if you need machine-readable proof.
5. Improve OSM using the tagging guide, then wait for a subsequent atlas build.

## Why transparency beats a black-box ranking

Global Ski Atlas does not sell passes or crown a single “best” mountain. The pipeline’s job is to keep definitions honest enough that skiers can rank mountains for themselves. That is also why we publish methodology-adjacent writing on the blog and architecture notes on [About](../about.html).

If you are evaluating the project as a data source, ask three questions:

- Can I see the geometry the stats came from?
- Can I download the tables?
- Can I improve the source when something is wrong?

For Global Ski Atlas, the answers are designed to be yes, yes, and yes—through OSM, GeoParquet, and public tools rather than a closed proprietary layer.

## Takeaway

The atlas website is the readable surface of an open ski-data pipeline: OSM geometry in, consistent spatial analysis in the middle, GeoParquet and interactive products out. Understanding that path makes the map less mysterious when a local hill looks thin, and it shows where your contribution—as a skier who maps, or a researcher who downloads—actually lands. Start with the [map](../mainmap.html), verify with [Download Data](../DownloadData.html), and improve the commons when you can.
