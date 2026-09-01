Every winter, magazines publish lists of the world's biggest resorts. Les 3 Vallées claims 600+ km of pistes. Park City merged with Canyons. The numbers are impressive and they rarely agree.

We rank by **mapped terrain** — total length of tagged `piste` ways inside each resort boundary from OpenStreetMap. Same ruler everywhere. Not perfect (coverage varies; some resorts tag harder than others) but honest and reproducible. Live leaderboard: [interactive map](../mainmap.html) or [resort comparison](../resort-comparison.html). [Stats explained](ski-resort-stats-explained.html) for what "mapped kilometers" means.

Exact order shifts as OSM grows. Treat this as a tour of the usual suspects, not a frozen medal table.

## How we measure

Resort polygons from OSM landuse/boundary tags. Clip downhill `piste` lines inside. Sum lengths = **mapped trail kilometers**. Also count lifts, vertical from elevation tags, difficulty mix where mappers added `piste:difficulty`.

Captures well: interconnected domains (French mega-resorts, Austrian valleys, big US consolidations). Growth as volunteers trace gladed connectors.

Misses or understates: unmapped off-piste, marketing areas bigger than today's OSM, overlapping boundaries we haven't deduped yet.

Brochures cite acres and hectares with proprietary math. Mapped km lets you compare Les 3 Vallées to Zermatt on one scale — even when websites use different units.

## Marketing vs mapped

PR teams maximize headline figures — hiking paths, snowshoe routes, loosely affiliated villages, generous rounding.

Mapped data is messier but neutral. A French domain might look smaller than the brochure until someone spends a week tracing Val Thorens. A US resort might look huge because volunteers mapped every gladed connector while a similar Austrian neighbor looks small because nobody drew the lines yet.

Use marketing for vibe and photos. Use mapped stats for apples-to-apples scale. [Resort facts](../SkiResortFacts.html) where we aggregate both.

## Ten names that dominate the conversation

Rankings move; these consistently sit near the top by mapped trail length.

**Les 3 Vallées, France** — Méribel, Courchevel, Val Thorens, lift-linked valleys. Densest piste networks on the planet in OSM terms.

**Portes du Soleil, France/Switzerland** — Morzine, Avoriaz, Champéry, twelve resorts, one pass philosophy. Boundary tagging determines whether it's one ranked blob or several.

**Matterhorn Ski Paradise (Zermatt/Cervinia)** — Glacier skiing, binational lifts, long seasons.

**Sella Ronda / Dolomiti Superski, Italy** — Limestone playground; mapping projects still expanding the circuit.

**Arlberg, Austria** — St. Anton, Lech, Zürs, Stuben. Austrian tagging tends to be thorough.

**Paradiski (Les Arcs/La Plagne)** — Vanoise Express merger. Two huge areas, one graph.

**Espace Killy (Tignes/Val d'Isère)** — High altitude, glacier-backed.

**Park City / Canyons / Deer Valley area, Utah** — North American consolidation poster child. US tagging density varies by volunteer community.

**Lake Tahoe region** — Palisades, Heavenly, Northstar, Kirkwood. Individually large; collectively one of the biggest concentrations in the Americas. One ranked entity or several depends on OSM boundaries.

**Niseko United, Japan** — Powder fame, rapidly improving mapped coverage across Hirafu, Hanazono, Village, Annupuri.

Honorable mentions: La Plagne and Les Arcs solo, Grandvalira (Andorra), Whistler Blackcomb, Jungfrau. Whistler's marketing acreage is legendary; mapped rank depends on how completely coastal BC is traced.

## Settle a bet

Search any name on the [map](../mainmap.html), check trail km in the popup. Second resort in [comparison](../resort-comparison.html). [Trail facts](../SkiTrailFacts.html) for longest individual runs. [Trip planner](../TripPlannerMap.html) to chain giants. [Global count](how-many-ski-resorts-worldwide.html) for context.

## Try the ski game

Numbers on a map are one thing. [Ski game](/playable/) loads real OSM geometry — simplified, experimental, not a lift ticket. Pick a name from this list and feel how sprawl compares to a compact eastern hill.

## Takeaway

The biggest resorts are mostly the names you know. Open data changes **how** you measure them: mapped km rewards interconnected, well-tagged domains and punishes areas waiting for volunteers. Trust the live atlas for rankings; use this for context. Brochure claims ten new km? Someone still has to draw them in OSM.
