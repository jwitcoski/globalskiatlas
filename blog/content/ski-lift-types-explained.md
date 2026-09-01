Lift type shapes your day as much as trail color. Ten high-speed quads make a resort feel smaller than three slow doubles serving the same acreage. Beginners panic on T-bars; families love gondolas in wind.

We catalog every mapped `aerialway` in OSM — per resort and country. [Lift facts](../SkiLiftFacts.html), [map](../mainmap.html), [comparison](../resort-comparison.html). Trail symbology: [how to read a trail map](how-to-read-ski-trail-map.html). Mappers: [tagging guide](how-to-tag-a-ski-resort-in-openstreetmap.html).

## OSM vocabulary (what we actually count)

| OSM value | Skier name |
| --- | --- |
| `chair_lift` | Fixed-grip chair |
| `detachable` | High-speed chair |
| `gondola` | Enclosed cabin |
| `cable_car` | Big tram (two cabins) |
| `mixed_lift` | Chondola |
| `t-bar`, `j-bar`, `platter` | Surface drags |
| `rope_tow` | Rope tow |
| `magic_carpet` | Conveyor |
| `drag_lift` | Generic drag |

`aerialway:occupancy`, `bubble`, `heating` — nice when mappers add them; often missing.

## Chairs: fixed vs detachable

**Fixed-grip** (`chair_lift`) — continuous cable, moderate speed, loading timing matters. Saturday mazes at the base.

**Detachable** — chairs slow in terminal, haul on the line. Ten minutes to summit changes lunch plans.

Some mappers use `chair_lift` + `aerialway:detachable=yes` instead of primary `detachable`. Counts can run slightly low until tags harmonize.

## Gondolas and cable cars

**Gondola** — enclosed, skis outside or in hand. Wind, whiteouts, beginners. Valley links in the Alps.

**Cable car** — Jackson Big Red scale. OSM distinguishes from gondola; skiers often say "gondola" for both.

## Surface lifts

**Magic carpet** — beginners. Strong signal in [beginner scoring](best-ski-resorts-for-beginners.html).

**Rope tow** — Midwest and eastern classics. Miserable on steep pitches; perfect on bunny slopes.

**T-bar / platter** — Europe and the American West on narrow trails. Beginners struggle; locals don't notice.

## Global mix (rough)

Chairs dominate worldwide, especially North America. Gondolas cluster Alps, Japan, valley-link resorts. Drags and T-bars stay common in Austria, Scandinavia, eastern Europe.

Carpets skew US learning pods; older European nurseries still have rope tows.

[Lift facts](../SkiLiftFacts.html) by country — Austria's drag density vs Colorado's quad portfolios.

## Tagging mistakes that skew data

**Pylons as lifts** — most common. One `aerialway=chair_lift` way along the cable; pylons optional, not counted as lifts.

**Duplicate parallel ways** — double capacity in comparison tables.

**Wrong subtype** — carpet tagged rope tow; detachable quad as fixed chair. Matters for beginners.

**Lifts outside resort polygon** — don't count toward that resort even if you ski them daily. Boundary fixes > lift retagging.

Edit OSM; atlas refreshes from community data.

## Explore in the atlas

Popup on [mainmap](../mainmap.html) — lift count by type. [Comparison](../resort-comparison.html) — Beaver Creek vs drag-heavy Austrian hill. [Lift facts](../SkiLiftFacts.html) — length, elevation, records. [Trail facts](../SkiTrailFacts.html) — pair endpoints with run difficulty. [Ski game](/playable/) — layout echo.

## Match lifts to your group

First-day beginners: carpets and short fixed chairs; avoid T-bar-only mountains unless lessons cover drags.

Families: gondolas reduce wind meltdowns.

Powder hounds: detachable quads for laps; gondolas secondary.

Budget road trips: drag-lift hills often cheaper — [US states](us-states-most-ski-resorts.html).

[How to choose a resort](how-to-choose-a-ski-resort.html) folds lift mix into the bigger picture.

Lifts are plumbing. OSM's `aerialway` vocabulary works if mappers use it consistently. We expose the plumbing so you compare on facts, not one long line in 2019. Learn the types, fix tagging errors, check [lift facts](../SkiLiftFacts.html) before a six-hour drive to the wrong hill.
