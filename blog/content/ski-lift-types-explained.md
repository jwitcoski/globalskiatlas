## Why lift type matters before you buy a ticket

You have seen the icons on trail maps: detachable quads, gondola bubbles, T-bars, magic carpets. Each solves a different problem — moving beginners uphill without panic, hauling experts to ridgelines fast, or spanning valleys too wide for chairs. Lift technology shapes your ski day as much as trail difficulty. A resort with ten high-speed quads feels smaller than one with three slow doubles serving the same acreage.

Global Ski Atlas catalogs every mapped `aerialway` in OpenStreetMap and rolls counts up per resort and country. Browse aggregates on [lift facts](../SkiLiftFacts.html), inspect individual resorts on the [interactive map](../mainmap.html), and compare lift mixes in [resort comparison](../resort-comparison.html). This guide translates OSM tagging into skier language — and flags tagging mistakes that skew the data.

If you are new to trail and lift symbology together, pair this article with [how to read a ski trail map](how-to-read-ski-trail-map.html). Mappers should read [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html).

## OpenStreetMap aerialway values (the atlas vocabulary)

OSM uses the `aerialway=*` key on ways and nodes. Common values in our dataset:

| OSM value | What skiers call it |
|-----------|---------------------|
| `chair_lift` | Fixed-grip chairlift (double, triple, quad) |
| `detachable` | High-speed (detachable) chairlift |
| `gondola` | Enclosed cabin on a loop cable |
| `cable_car` | Large aerial tram (two counterweighted cabins) |
| `mixed_lift` | Chondola — chairs and cabins on one line |
| `t-bar` | T-bar drag lift |
| `j-bar` | J-bar drag lift |
| `platter` | Poma / platter lift |
| `rope_tow` | Rope tow |
| `magic_carpet` | Conveyor surface lift |
| `drag_lift` | Generic drag when subtype unclear |
| `zip_line` | Zip line (occasionally tagged in ski areas) |

Additional tags refine experience: `aerialway:occupancy` (chairs per carrier), `aerialway:duration`, `aerialway:bubble` (weather hoods), and `aerialway:heating`. Not every mapper adds them; counts default to line geometry and primary type.

Our [lift facts](../SkiLiftFacts.html) page normalizes these values into human labels and charts global distribution — useful when you want to know whether gondolas or chairs dominate a country.

## Chairlifts: fixed grip vs detachable

### Fixed-grip chairs (`chair_lift`)

The workhorse: a continuous cable, chairs spaced closely, moderate speed. Loading requires timing; falling is embarrassing but common for beginners. Fixed grips cap throughput on busy weekends — you feel it in long mazes at the base.

OSM often tags older doubles and triples as `chair_lift` without distinguishing occupancy. Atlas counts still reveal **how reliant** a resort is on chairs vs surface lifts.

### Detachable high-speed chairs (`detachable`)

Chairs detach from the cable in the terminal, allowing slow loading and fast travel. Detachables shrink a resort psychologically — ten minutes to the summit changes where you eat lunch.

Tagging tip: some mappers use `chair_lift` plus `aerialway:detachable=yes` instead of `detachable` as the primary value. Our pipeline checks both patterns, but inconsistencies mean resort-level detachable counts can be slightly low until tags harmonize.

## Gondolas and cable cars: weather, beginners, and valley links

### Gondolas (`gondola`)

Enclosed cabins carry skis on exterior racks or require handheld gear. Gondolas shine in wind, whiteouts, and beginner transport — no load timing, less terror. Valley-to-valley links (Zermatt connectors, European village hops) are often gondolas.

Mapped gondola kilometers sometimes include summer sightseeing segments; verify winter ski operation on resort sites.

### Cable cars (`cable_car`)

Large trams on two fixed cables, usually one or two big cabins. Think Jackson Hole's Big Red or the Peak 2 Peak–class engineering showcases. OSM distinguishes `cable_car` from `gondola` by cabin style and counterweight systems; casual skiers use "gondola" for both, but data nerds should not.

## Surface and drag lifts: learning days and old-school grit

### Magic carpets (`magic_carpet`)

Rubber conveyor belts for absolute beginners. The atlas treats them as first-class citizens because they signal **learning investment**. Resorts strong in beginner data ([best resorts for beginners](best-ski-resorts-for-beginners.html)) often show carpet counts disproportionate to their fame.

### Rope tows (`rope_tow`)

Grab a rope, let it pull you uphill, try not to faceplant. Still common on Midwest hills and eastern classics. Short, cheap to operate, miserable on steep pitches — which is why you see them on bunny slopes.

### T-bars and J-bars (`t-bar`, `j-bar`)

Drag lifts with a bar between your legs or a sideways J pad. Common in Europe and the American West on narrower trails where chairs would not fit. Beginners struggle; intermediates tolerate; locals do not notice.

### Platters (`platter`)

The Poma lift: a disc between your legs. European ski clubs swear by them; Americans increasingly replace them with carpets or chairs. OSM uses `platter`; older data may say `drag_lift` generically.

## Mixed lifts and edge cases

### Chondolas (`mixed_lift`)

Installations that alternate chairs and cabins on one cable (e.g., some Doppelmayr mixed systems). Rare but growing. Tag as `mixed_lift` when both carrier types share infrastructure; do not duplicate the way as separate chair and gondola lines.

### Generic `drag_lift`

Catch-all when mappers know it is a drag but not the subtype. Atlas buckets these separately; improving tags to `t-bar` or `platter` sharpens resort profiles.

## Global mix: chairs dominate, gondolas cluster by geography

Worldwide, **chair lifts** (fixed and detachable combined) account for the majority of mapped aerialways in our dataset — North America especially. **Gondolas** concentrate in the Alps, Japan, and resorts that link villages across valleys. **Drag lifts and T-bars** remain surprisingly common in Austria, Scandinavia, and eastern Europe where narrow trails and club culture persist.

**Magic carpets** skew toward US beginner resorts and modern learning pods; many older European nurseries still use rope tows and platters.

Open [lift facts](../SkiLiftFacts.html) and sort by country: you will see Austria's drag-lift density vs Colorado's quad-heavy portfolios. That mix changes how a resort **feels** — not just how fast you reach the summit.

## Common OSM tagging mistakes (and why they matter)

Volunteer mappers power the atlas. Errors propagate into lift counts, beginner scores, and comparison tables until someone fixes them.

### Pylons tagged as lifts

The most frequent mistake: mapping lift **towers** (`aerialway=pylon` or untagged nodes) as if they were lift lines. Result: phantom lifts, zero length, or point features inflating counts. Correct pattern: one `aerialway=chair_lift` (or other type) **way** following the cable path tower to tower; pylons optional.

### Duplicated parallel ways

Remapping a lift without deleting the old way creates twins. Resort comparison then shows double the real capacity. If you edit OSM, check for overlapping ways with identical names.

### Wrong subtype

Calling a magic carpet a `rope_tow`, or a detachable quad a fixed `chair_lift`, misleads beginners researching learning terrain. Subtype accuracy matters for [beginner scoring](best-ski-resorts-for-beginners.html).

### Broken relations and resort boundaries

Lifts outside resort polygons do not count toward that resort's total even if skiers use them daily. Boundary fixes often matter more than lift retagging. See [how to tag a ski resort in OpenStreetMap](how-to-tag-a-ski-resort-in-openstreetmap.html).

If you spot errors, edit OSM or leave a note for local mappers. The atlas refreshes from community data.

## How to explore lifts in the atlas

**Resort popup** on [mainmap.html](../mainmap.html): lift count by type, named lifts where tagged.

**[Resort comparison](../resort-comparison.html)**: place Beaver Creek next to a drag-lift-heavy Austrian hill and watch detachable vs T-bar mix diverge.

**[Lift facts](../SkiLiftFacts.html)**: sort by length, elevation, or country; find record-holding gondolas and northernmost chairs.

**[Trail facts](../SkiTrailFacts.html)**: pair lift endpoints with run difficulty for full descent planning.

**[Ski game](/playable/)**: experimental terrain uses OSM geometry; trail access patterns echo real layouts.

## Lift type and resort choice

Match lifts to your group:

- **First-day beginners**: prioritize magic carpets and short fixed chairs; avoid T-bar-only mountains unless lessons include drag-lift training.
- **Families with tired kids**: gondolas and bubbles reduce wind exposure and meltdown risk.
- **Powder hounds**: detachable quads maximize lap count; gondolas matter less than snow and steeps.
- **Budget road trips**: drag-lift hills often sell cheaper tickets — see [high-count states](us-states-most-ski-resorts.html).

[How to choose a ski resort](how-to-choose-a-ski-resort.html) folds lift mix into a broader decision framework.

## The bottom line

Lift types are the plumbing of a ski area. OSM's `aerialway` vocabulary is precise enough for global statistics if mappers use it consistently. Global Ski Atlas exposes that plumbing so you compare resorts on facts, not foggy memories of one long line in 2019. Learn the types, spot the tagging errors, check [lift facts](../SkiLiftFacts.html) before you drive six hours to the wrong hill — and thank the mapper who correctly tagged the magic carpet your kid will love.
