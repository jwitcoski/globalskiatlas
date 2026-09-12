Ask how many ski resorts exist worldwide and you will hear wildly different answers. Magazines round to a memorable number. Pass marketers count only partner mountains. National tourism boards count what sells rooms. Global Ski Atlas answers with one repeatable method: we count mapped downhill ski areas from OpenStreetMap that meet consistent geometric criteria, analyze them with the same pipeline everywhere, and publish the results on the [interactive map](../mainmap.html) and in [Ski Resort Facts](../SkiResortFacts.html).

The honest global count is therefore both a geographic fact and a snapshot of community mapping progress. This guide explains our inclusion rules, why commercial totals diverge, what continental patterns look like in open data, where coverage is thin, and how you can verify or improve the number yourself.

## Why every “global count” disagrees

Different lists are not measuring the same object. One source may require a minimum vertical drop. Another may merge an entire French mega-domain into a single ticket brand. A third may exclude municipal hills that never advertise internationally. Indoor snow domes, heli-ski bases, and nordic centers muddy the definition further.

Global Ski Atlas deliberately chooses a mapper-facing definition:

- Start from `landuse=winter_sports` geometry
- Associate nearby downhill pistes and aerial lifts
- Include the area when the winter-sports package is coherent enough to treat as a downhill ski area
- Avoid revenue, branding, or “destination only” thresholds

That means a Midwest community hill can sit in the same dataset as a Tyrolean valley, as long as both are tagged coherently. It also means the live total moves whenever OSM editors add hills, split duplicates, or clean bad polygons. Treat any single headline number as approximate order of magnitude, not an official census.

## How we define a resort in the atlas

The pipeline documented on [Download Data](../DownloadData.html) begins with regional OpenStreetMap extracts from Geofabrik, then works through a multi-step process that extracts winter sports areas, lifts, and pistes and analyzes them into comparable resort records.

In plain language, a typical included resort has:

- An identifiable winter-sports boundary
- At least one mapped downhill piste or lift in the surrounding analysis window
- Enough geometry that the features read as one ski area rather than scattered noise

We do not require a minimum acreage or vertical. Small hills count. We generally exclude nordic-only areas without downhill terrain, most indoor domes, heli-only operations without mapped in-bounds runs, and placeholders that lack both lifts and pistes. Marketing domains that sell one ticket across many villages may appear as one polygon or several, depending on how local mappers drew relations and boundaries. We report resort objects from mapped geometry, not from lift-ticket branding.

Researchers can download the GeoParquet outputs and reproduce aggregates instead of taking a blog claim on faith. That reproducibility is the point of an open atlas.

## What “on the order of thousands” means in practice

As of recent combined builds, the atlas indexes on the order of a few thousand distinct downhill areas worldwide. Exact live totals shift as editors add remote hills, delete duplicates, or retag boundaries. Europe often contributes a large share of well-mapped polygons. North America contributes fewer areas on average but many larger footprints, plus a long tail of independent US hills. Asia’s mapped count has grown as Japan and other regions gained mapper attention. Oceania, Africa, and South America add smaller but meaningful footprints where each new coherent tag can move regional rankings.

Commercial directories that report only “significant” destinations often land nearer two thousand resorts because they apply size, revenue, or amenity filters we deliberately avoid. Neither approach is uniquely “correct.” They answer different questions. Ours answers: how many downhill ski areas are coherently mapped in OpenStreetMap and processed by one global method?

Always check current aggregates on [Ski Resort Facts](../SkiResortFacts.html) rather than quoting an outdated round number from memory.

## Continental patterns without turning them into a scoreboard

Continental totals reflect real ski geography and mapping culture at the same time.

**Europe.** The Alps dominate density. France, Austria, Switzerland, Italy, and neighboring ranges produce hundreds of mapped areas, including interconnected domains that challenge any simple “one resort” definition. Mapping quality is often high because local communities and outdoor mappers have spent years tracing pistes.

**North America.** Destination mountains in the Rockies and Sierra are well known, but the independent Midwestern and Northeastern hills add a large share of count. That pattern is why [which U.S. states have the most ski resorts](us-states-most-ski-resorts.html) looks different from a list of famous powder destinations.

**Asia.** Japan’s mapped coverage has improved markedly in places with strong outdoor communities. Elsewhere in Asia, coverage is patchier: some resorts are richly drawn, others appear as thin lift lines without complete trail networks.

**Southern Hemisphere and elsewhere.** Chile, Argentina, New Zealand, Australia, and a handful of African hills matter seasonally and geographically even when their absolute counts are smaller. Under-mapping is more common here, so the atlas count is a lower bound on reality until local tagging catches up.

Use the [main map](../mainmap.html) to see density with your own eyes. Dot clusters tell you as much as a table of country totals.

## Gaps, duplicates, and other ways the count moves

OpenStreetMap coverage is uneven, so our count is only as good as the map beneath it.

Under-mapping excludes real hills until someone follows [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html). Typical gaps:

- Boundary present but no lifts or pistes inside
- Lifts present but no winter-sports polygon to group them
- New chairs built after the last local mapping surge
- Small family hills never traced because nobody edited after a ski day

Over-mapping inflates totals and stats until boundaries are corrected:

- Hiking paths tagged as downhill pistes
- Oversized polygons that swallow neighboring valleys
- Duplicate resort polygons for the same hill
- Abandoned infrastructure still tagged as active

Interconnected domains create a third ambiguity. Les Trois Vallées may appear as one object or several depending on relations. The same is true for other Alpine networks. We prefer transparent geometry over forcing a single marketing brand into the database. That choice can make “resort count” diverge from “ticket domains,” which is useful to know when you compare size rankings in [largest ski resorts in the world](largest-ski-resorts-in-the-world.html).

## What we intentionally leave out

Being clear about exclusions prevents false precision:

- Nordic-only centers without downhill terrain
- Most indoor snow domes
- Heli-ski meeting points without mapped in-bounds alpine runs
- Empty placeholders with neither lifts nor pistes
- Pure backcountry zones that are not managed ski areas

Pass coverage lists are also not global resort censuses. Epic, Ikon, Indy, and European multi-resort products cover subsets of the world’s hills. Understanding those subsets is a separate question covered in [Epic vs Ikon vs Indy vs Europe](epic-ikon-indy-europe-which-to-choose.html) and [Epic Pass vs Ikon Pass coverage](epic-pass-vs-ikon-pass-resort-coverage.html).

## How to verify the number yourself

You do not have to trust a paragraph on a blog.

1. Browse live country and global aggregates on [Ski Resort Facts](../SkiResortFacts.html)
2. Explore density visually on the [interactive map](../mainmap.html)
3. Compare a shortlist in [resort comparison](../resort-comparison.html) to see how individual objects are represented
4. Download GeoParquet from [Download Data](../DownloadData.html) if you want to count rows yourself
5. Preview a questionable area in the [ski game](/playable/) and open the same place in OSM if geometry looks incomplete

If your local hill is missing, the fix is upstream tagging, not a support ticket asking us to invent a private record. Add or repair the winter-sports boundary, lifts, and downhill pistes, then wait for the next regional pipeline run.

## What the global count is good for—and what it is not

The worldwide total is useful for:

- Understanding how widespread downhill skiing actually is beyond brochure destinations
- Comparing mapping completeness across regions
- Grounding debates that start from a single round magazine number
- Prioritizing where volunteer tagging would help skiers the most

It is not useful as a claim of official government statistics, a ranking of “best” mountains, or a frozen figure you can cite for years without checking the live atlas. Counts move with OSM. That is a feature of open data, not a failure of it.

Global Ski Atlas does not sell passes or endorse destinations. We publish comparable open data so skiers can explore on the [map](../mainmap.html), compare in [resort comparison](../resort-comparison.html), and improve the census where they ski. Check live aggregates on [Ski Resort Facts](../SkiResortFacts.html). When your hill is missing or mis-drawn, tag it—the global total changes one coherent resort at a time.
