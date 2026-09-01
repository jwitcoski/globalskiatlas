## Why "largest" depends on what you measure

Every winter, ski magazines publish lists of the world's biggest resorts. Les 3 Vallées claims more than 600 kilometers of pistes. Portes du Soleil advertises a dozen valleys and hundreds of lifts. Park City and Canyons merged into one of North America's largest footprints. The numbers are impressive — and they rarely agree with each other.

Global Ski Atlas takes a different approach. Instead of repeating marketing copy, we rank downhill ski areas by **mapped terrain**: the total length of tagged `piste` ways inside each resort boundary, drawn from [OpenStreetMap](https://www.openstreetmap.org/). That gives you a single, comparable yardstick across continents. It is not perfect — coverage varies, and some resorts tag more aggressively than others — but it is honest, reproducible, and updated as mappers improve the data.

If you want the live leaderboard, open the [interactive map](../mainmap.html) and sort resorts by trail kilometers, or use [resort comparison](../resort-comparison.html) to pit two giants side by side. The rankings below describe resorts that consistently appear near the top of our dataset. **Exact order shifts as OSM grows**; treat this as a guided tour of the usual suspects, not a frozen medal table.

For a deeper dive into what "skiable kilometers" actually means in our pipeline, see [ski resort stats explained](ski-resort-stats-explained.html).

## Our methodology in plain language

We build resort polygons from OSM landuse and boundary tags, then clip every downhill `piste` line inside each area. Summing those line lengths yields **mapped trail kilometers** — our primary size metric. We also count lifts (`aerialway=*`), vertical span from elevation tags, and trail difficulty mix where mappers have added `piste:difficulty`.

What this captures well:

- Interconnected ski domains where pistes are mapped as one network (French mega-resorts, Austrian valleys, large US consolidations).
- Growth over time as volunteers trace new terrain, gladed runs, and connector trails.

What it can miss or understate:

- Off-piste and ungroomed terrain that is not tagged as `piste`.
- Resorts whose marketing area is larger than what is mapped on OSM today.
- Double-counting at shared boundaries when two resort polygons overlap (we deduplicate where possible, but edge cases remain).

Marketing brochures often cite "skiable acres," "hectares," or "kilometers of slopes" using proprietary definitions. Mapped kilometers let you compare [Les 3 Vallées](https://www.openstreetmap.org/) to [Matterhorn Ski Paradise](https://www.openstreetmap.org/) on the same scale — even when their websites use different units.

## Marketing numbers vs mapped reality

Resort PR teams have every incentive to maximize the headline figure. Common tactics include counting hiking paths, snowshoe routes, or lift-served summer trails; merging stats across loosely affiliated villages; and rounding up generously.

Mapped data is messier but more neutral. A French domain might show fewer kilometers than its brochure until a local mapper spends a week tracing every blue run in Val Thorens. A US resort might look enormous on OSM because volunteers meticulously mapped every gladed connector, while a similarly sized Austrian neighbor looks smaller simply because nobody has drawn the lines yet.

That is why we publish both: the atlas shows what is **on the map today**, and our articles explain the gap. When you plan a trip, use marketing for vibe and photos; use mapped stats for apples-to-apples scale. The [resort facts](../SkiResortFacts.html) pages aggregate both perspectives where we can.

## Ten resorts that dominate the mapped-size conversation

The following areas routinely rank among the largest in Global Ski Atlas by mapped trail length. Names and regions are stable; **precise rankings are not** — check the live dataset before you quote a number.

### Les 3 Vallées, France

The benchmark European mega-resort: Méribel, Courchevel, Val Thorens, and a web of lifts linking multiple valleys. On OSM, the interconnected piste network is one of the densest on the planet. Beginners get vast nursery zones; experts get high-alpine bowls and long cruisers. Mapped size here reflects decades of French mapping enthusiasm as much as physical scale.

### Portes du Soleil, France / Switzerland

Twelve resorts straddling the border, one lift ticket philosophy. The mapped footprint is enormous because the domain is genuinely sprawling — Morzine, Avoriaz, Champéry, and others share pistes across passes. Boundary tagging matters: when mappers treat Portes du Soleil as one logical area, it competes with Les 3 Vallées for the top spot.

### Matterhorn Ski Paradise (Zermatt / Cervinia), Switzerland / Italy

Glacier skiing, high altitude, and a binational lift network. Zermatt's car-free village and Cervinia's southern exposure create one of the longest seasons in the Alps. Mapped kilometers climb as cross-border connectors and glacier runs get traced.

### Sella Ronda / Dolomiti Superski, Italy

Not always a single polygon in OSM, but the Sella Ronda circuit and the wider Dolomiti Superski pass illustrate how Italian domains scale when multiple valleys share infrastructure. Corvara, Selva, and Canazei anchor a limestone playground that mapping projects continue to expand.

### Arlberg, Austria

St. Anton, Lech, Zürs, and Stuben — linked since the Vaillant Arena connection. Austrian trail tagging is typically thorough; the Arlberg often punches above already-large marketing claims in mapped data.

### Paradiski (Les Arcs / La Plagne), France

Two historically separate mega-resorts joined by the Vanoise Express. The combined piste graph is a textbook case of merger-driven scale: each side alone is huge; together they challenge the French top tier.

### Espace Killy (Tignes / Val d'Isère), France

High-altitude, glacier-backed, and lift-dense. Tignes and Val d'Isère function as one ski area for pass holders; OSM mappers increasingly reflect that unity in boundary and piste tagging.

### Park City / Canyons / Deer Valley area, Utah, USA

North America's poster child for consolidation. Vail Resorts' Park City footprint plus adjacent areas creates a mapped blob that rivals European domains in extent — though US trail tagging density still varies by volunteer community.

### Lake Tahoe region, California / Nevada, USA

Several large resorts (Palisades Tahoe, Heavenly, Northstar, Kirkwood) sit close together. Individually they are large; collectively the Tahoe basin is one of the biggest concentrations of lift-served terrain in the Americas. Whether they appear as one ranked entity depends on how resort boundaries are drawn in OSM.

### Niseko United, Japan

Powder fame meets expanding mapped coverage. Hirafu, Hanazono, Niseko Village, and Annupuri link into a growing network. Japanese piste tagging has improved rapidly; Niseko's mapped size has climbed accordingly in recent atlas builds.

Honorable mentions that often sit just outside the top ten in live data: **La Plagne** and **Les Arcs** individually, **Grandvalira** (Andorra), **Whistler Blackcomb** (British Columbia), and **Jungfrau Ski Region** (Switzerland). Whistler's marketing acreage is legendary; its mapped rank depends heavily on how completely coastal BC trails are traced.

## How to use the atlas to settle a bet

Open the [interactive map](../mainmap.html), search for any resort above, and inspect trail kilometers in the popup. Add a second resort in [resort comparison](../resort-comparison.html) to see lift counts, vertical, and difficulty mix side by side. Filter by country on [trail facts](../SkiTrailFacts.html) if you want the longest individual runs inside a domain.

Planning a trip across multiple giants? The [trip planner](../TripPlannerMap.html) helps chain resorts by drive time. Curious how many ski areas exist globally? Read [how many ski resorts worldwide](how-many-ski-resorts-worldwide.html).

## Ski the data: try the experimental game

Numbers on a map are one thing; skiing them is another. Our [experimental ski game](/playable/) loads real OSM piste geometry and lets you ride simplified versions of actual trails — a playful way to feel how large resorts differ in layout and vertical. It is research software, not a replacement for a lift ticket, but it makes the dataset tangible. Pick a famous name from this list, find it in the game menu, and notice how Les 3 Vallées's sprawl compares to a compact eastern US hill.

## The takeaway

The world's largest ski resorts are real, and they are mostly the names you already know. What changes when you use open data is **how** you measure them: mapped kilometers reward interconnected, well-tagged domains and punish areas still waiting for volunteer cartographers. Trust the live atlas for rankings; use this article for context. And when a resort brochure claims another ten kilometers of "new terrain," check whether those lines exist on OSM yet — someone still has to draw them.
