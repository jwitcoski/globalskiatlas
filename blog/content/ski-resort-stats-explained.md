<div class="guide-step">
<div class="guide-copy">
<p>Brochures sell a story. This file stores mapped objects. <code>downhill_trails</code> is a count of tagged piste ways. <code>skiable_terrain_acres</code> is area from the analyzed polygon. <code>lift_types</code> is a parsed string of aerialway counts. Vertical is often empty. Bristol Mountain, way 320434895, is the same hill as the pipeline post. Use it as the unit. If a number is missing here, the pipeline did not have it. The atlas will not fill it from a press kit.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="bristol" data-center="-77.4136,42.7426" data-zoom="13.2" data-detail="1"></div>
<p class="guide-caption">Bristol on the wiki winter map. Stats come from this geometry.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Trail count is objects, not named runs</h2>
<p>OSM mappers split a named trail when the difficulty changes, when a cat-track peels off, or when two ways share a name. Bristol’s analyzed row currently reports 39 downhill trails. The extract parquet had 43 piste rows before analysis. Those two numbers are not a bug you hide. They are the difference between raw ways and the analyzed set. Marketing “26 trails” is a third counting rule. Pick one and stay with it.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="mix" data-id="320434895"></div>
<p class="guide-caption">Bristol difficulty buckets on the analyzed row.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Acres follow the polygon</h2>
<p>The 3 Valleys currently leads this file at about 12,127 mapped acres and 1,648 downhill trails, OSM id 45117869. Chapman Hill is a municipal rec area with four trails. Both rows use the same acre field. Aiguille du Midi (Chamonix) sits near 5,096 acres with 9 downhill trails in this extract: a huge polygon and almost no tagged piste ways. That is a mapping shape, not a ranking of “best terrain.”</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="top" data-metric="skiable_terrain_acres" data-n="8" data-title="Mapped acres" data-sub="skiable_terrain_acres on downhill rows"></div>
<p class="guide-caption">Top acres in the current S3 parquet.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Size plates on trail counts</h2>
<p>The site buckets downhill areas as small (&lt;10 trails), medium (10–29), large (30–99), and mega (100+). Most of the file is small: <span data-live="small">0</span> rows. Mega is <span data-live="mega">0</span>. Bristol’s 39 trails is large on that plate. The wiki-copy job in the data repo still treats 39 as a short paragraph. Do not mix those two rules when you quote a size.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="size"></div>
<p class="guide-caption">Trail-count plates, same breaks as the print atlas.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Lifts are a string you can parse</h2>
<p>Chair lifts dominate the tagged total. Platters, magic carpets, T-bars, and drag lifts still outnumber gondolas. A hill with two carpets and a chair is a beginner day. A hill with a gondola and no carpets is not. Read <code>lift_types</code> before you argue about “lift-served acres.”</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="lifts"></div>
<p class="guide-caption">Parsed from <code>lift_types</code> on downhill rows.</p>
</div>
</div>
