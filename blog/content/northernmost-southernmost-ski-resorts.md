<div class="guide-step">
<div class="guide-copy">
<p>Sort downhill rows by <code>centroid_lat</code>. The northern end of this file is Nedover Alpinbakke in Norway, OSM id 1485591720, at about 78.22°N on Svalbard, with 1 tagged downhill trail. Several unnamed Norway ids sit near 69.7°N outside Tromsø. The southern end is Cerro Castor in Argentina, id 934046989, at about −54.71°, 47 trails. These are mapped objects, not a travel-magazine polar club.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="svalbard" data-center="15.657,78.216" data-zoom="12.5" data-detail="1"></div>
<p class="guide-caption">Nedover Alpinbakke, Svalbard. Northernmost centroid in this parquet.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Northern centroids</h2>
<p>The chart lists the highest latitudes in the current file. Named Svalbard first, then a cluster of Norway ways that still carry numeric names. A Russia row near 69.5°N has 36 trails. If a list claims “northernmost ski resort” and skips Svalbard, they filtered on marketing names. This extract did not.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="lats" data-pole="north" data-n="6"></div>
<p class="guide-caption">Highest <code>centroid_lat</code> among downhill rows.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Cerro Castor</h2>
<p>Tierra del Fuego. 47 downhill trails in this file. Southern Hemisphere winter is June–August. The atlas still draws it on the same winter basemap as Pennsylvania. If the tiles look sparse, that is coverage at 54°S, not a missing resort. AfriSki in Lesotho is farther from the pole and already showed up in the worldwide count post as the “one trail still counts” case.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="castor" data-center="-67.995,-54.715" data-zoom="12.8" data-detail="1"></div>
<p class="guide-caption">Cerro Castor. Southernmost downhill centroid here.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Southern centroids</h2>
<p>After Castor, another Argentina row whose English name in this extract is “The electoral district,” then New Zealand: The Remarkables, Coronet Peak, Cardrona. NZ names are stable. The Argentina name is a bad translation sitting on a real geometry. Do not rename it in a blog post. Fix OSM or the English-name job if you want it prettier.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="lats" data-pole="south" data-n="6"></div>
<p class="guide-caption">Lowest <code>centroid_lat</code>. NZ follows Patagonia.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Remarkables as the NZ check</h2>
<p>The Remarkables Ski Area, id 482928468, 25 trails, about −45.05°. Coronet Peak and Cardrona sit next door. That Queenstown cluster is the populated southern ski map. Castor is the latitude record. Svalbard is the latitude record the other way. Everything else you ski is in between, which is most of the <span data-live="dh">3,035</span> downhill rows.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="remarkables" data-center="168.815,-45.055" data-zoom="12.6" data-detail="1"></div>
<p class="guide-caption">The Remarkables. Southern skiing with a town attached.</p>
</div>
</div>
