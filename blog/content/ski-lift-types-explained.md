<div class="guide-step">
<div class="guide-copy">
<p>OSM stores lifts as <code>aerialway=*</code> ways. The analyzer rolls them into <code>lift_types</code> like <code>chair lift: 4, magic carpet: 2</code>. Across downhill rows in this file, chair lifts lead, then platters, magic carpets, T-bars, drag lifts, gondolas, rope tows, cable cars. The map is Bristol, which the pipeline post already used: chairs on a New York hill, not a postcard gondola.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="bristol" data-center="-77.4136,42.7426" data-zoom="13.4" data-detail="1"></div>
<p class="guide-caption">Bristol lifts on the wiki stack.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. The global tagged count</h2>
<p>Chairs are the workhorse. Platters and T-bars still move Alps-sized volume on small hills. Carpets are how first-timers get up a twenty-foot slope. Gondolas are rarer than people who ski on TV think. Cable cars are rarer still. If a hill’s string is all gondola and no carpet, look at who that hill was built for.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="lifts"></div>
<p class="guide-caption">Sums parsed from <code>lift_types</code>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Tag the way, not the brand</h2>
<p>A detachable quad is still <code>aerialway=chair_lift</code> plus <code>aerialway:occupancy</code> and <code>aerialway:detachable=yes</code>. A gondola is <code>aerialway=gondola</code>. A T-bar is <code>aerialway=t-bar</code>. Mixing those, or drawing the same lift twice, is how counts inflate. The tagging guide at Montage walks the geometry. Copy those tags. Do not invent a new key for “high-speed six-pack.”</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="montage" data-center="-75.6587,41.3532" data-zoom="13.4" data-detail="1"></div>
<p class="guide-caption">Montage. Same lift tagging rules as any other hill.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Small hills run on surface lifts</h2>
<p>Chapman Hill’s two lifts are the other end of the chart. Rope tows and carpets are easy to miss in OSM if you only map what looks like a tower. Miss them and the analyzed row looks like a hill with trails and no uphill. That is a pipeline row people then call “incomplete data” when the mapper skipped the carpet.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="chapman" data-center="-107.8681,37.2823" data-zoom="14.2" data-detail="1"></div>
<p class="guide-caption">Chapman Hill. Two lifts. Map both or the row lies.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Gondolas live in the mega polygons</h2>
<p>The 3 Valleys is where gondolas and chairs stack up in one view. That is not “better.” It is a different transport problem: valleys, villages, and long links. Count lift type against the trip you are taking. A T-bar at a municipal hill and a gondola at Courchevel are both correct tags.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="3v" data-center="6.581,45.329" data-zoom="11.2" data-detail="1"></div>
<p class="guide-caption">The 3 Valleys. Many aerialways, same OSM keys.</p>
</div>
</div>
