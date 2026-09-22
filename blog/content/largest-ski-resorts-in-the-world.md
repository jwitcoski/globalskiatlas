<div class="guide-step">
<div class="guide-copy">
<p>Largest here means <code>skiable_terrain_acres</code> on downhill rows in <code>ski_areas_analyzed.parquet</code>. Not skier visits. Not “connected by bus.” The 3 Valleys, OSM id 45117869, currently leads this file at about 12,127 acres and 1,648 downhill trails. Ski Arlberg, SkiWelt, and Whistler Blackcomb follow. Those acres are analyzed polygons. If OSM drew a huge winter-sports area and tagged few pistes, the acre number still goes up.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="3v" data-center="6.581,45.329" data-zoom="11.1" data-detail="1"></div>
<p class="guide-caption">The 3 Valleys. Top acres in the current extract.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. The acre ranking</h2>
<p>Read the bar chart from this parquet. France and Austria occupy most of the top. Whistler Blackcomb is the North American name that survives the cut. Tignes–Val d’Isère, Aiguille du Midi, Skicircus Saalbach, and La Plagne sit in the same list. Aiguille du Midi’s acre figure with only 9 downhill trails is the warning label: polygon size ≠ trail inventory.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="top" data-metric="skiable_terrain_acres" data-n="8" data-title="Mapped acres" data-sub="Downhill rows, current S3 file"></div>
<p class="guide-caption">Top <code>skiable_terrain_acres</code>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Trail count is a different contest</h2>
<p>Sort the same table by <code>downhill_trails</code> and The 3 Valleys still leads. Then Skicircus. Then Island Lake Cat Skiing in Canada with 1,104 tagged trails on about 1,057 acres. Cat-skiing ways explode the trail count. Whistler and Les Arcs / Peisey-Vallandry follow. If a magazine ranks “most trails,” ask which objects they counted.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="top" data-metric="downhill_trails" data-n="8" data-title="Tagged downhill trails" data-sub="Same downhill filter"></div>
<p class="guide-caption">Top <code>downhill_trails</code>. Cat skiing can outrun a famous domain.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Arlberg as a second shape</h2>
<p>Ski Arlberg, id 539407909, is the second acre row: about 6,740 acres, 485 trails. The map is the connected Austrian domain, not a single village logo. Zoom it the same way you zoomed Les 3 Vallées. If two hills both claim “biggest in the Alps,” this is the parquet’s current answer for acres.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="arlberg" data-center="10.156,47.193" data-zoom="11.3" data-detail="1"></div>
<p class="guide-caption">Ski Arlberg. Second on mapped acres in this file.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Whistler, then the rest of the file</h2>
<p>Whistler Blackcomb, id 474288286, is about 6,207 acres and 822 trails here. After a handful of Alpine polygons, the acre list drops fast. The prints and pass ads live in that thin mega band. The atlas still has <span data-live="small">0</span> small hills. Those are the majority. Largest is a short list on purpose.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="whistler" data-center="-122.926,50.081" data-zoom="11.4" data-detail="1"></div>
<p class="guide-caption">Whistler Blackcomb. The North American acre holdout in this top set.</p>
</div>
</div>
