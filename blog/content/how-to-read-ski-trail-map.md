<div class="guide-step">
<div class="guide-copy">
<p>On this site, piste color follows the American key: green easy, blue intermediate, black advanced, with extra tags for expert and terrain parks. Europe paints the same physics differently (blue easy, red intermediate, black hard). The map on the right is Montage with that American expression on live PMTiles. If a trail looks wrong, the OSM <code>piste:difficulty</code> is wrong or missing. The renderer is not guessing from the name.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="montage" data-center="-75.6587,41.3532" data-zoom="13.3" data-detail="1"></div>
<p class="guide-caption">Montage pistes colored American. Same layers as the wiki.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Difficulty is a tag on the way</h2>
<p>Bristol’s mix is the analyzed roll-up of those tags. Novice and easy should match the greens you see. Intermediate should match the blues. If the chart says easy and the map is black, someone retagged the ways or the analyzer and the tiles are from different days. Refresh after the next ingest before you file a bug.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="mix" data-id="320434895"></div>
<p class="guide-caption">Bristol difficulty buckets from parquet.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Lifts are the other symbol set</h2>
<p>Chairs, carpets, T-bars, gondolas: the lift chart is what those symbols add up to worldwide. On a paper map, a black dashed line might be a T-bar. In OSM it is <code>aerialway=t-bar</code>. If the paper map shows a lift the tiles do not, the way is missing or the extract did not pick it up. Tag it. Do not screenshot the brochure into the atlas.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="lifts"></div>
<p class="guide-caption">Tagged lift objects by type.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. A small map still has to snap</h2>
<p>Chapman Hill is four trails. You can see whether a way hits the lift. On a domain the size of Les Arcs, a missed snap hides in the spaghetti. The tagging guide’s snap step is the same rule at both scales: the downhill way shares a node with the lift or it does not. Preview in <a href="../wiki/browse.html">the wiki</a> before you trust a printed trail name.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="chapman" data-center="-107.8681,37.2823" data-zoom="14.3" data-detail="1"></div>
<p class="guide-caption">Chapman Hill. Easy to see a trail that does not meet a lift.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Big domains hide the mistakes</h2>
<p>Les Arcs / Peisey-Vallandry, id 589005175, has 809 downhill trails in this file. At that density a mistagged red/black is one line in a pile. Use the paper map for names and the OSM map for geometry. When they disagree, OSM wins for the atlas and the paper map wins for the ticket office. Fix OSM if you can; do not expect the parquet to store both.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="arcs" data-center="6.815,45.573" data-zoom="12" data-detail="1"></div>
<p class="guide-caption">Les Arcs. Density where a bad tag is hard to spot by eye.</p>
</div>
</div>
