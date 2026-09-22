<div class="guide-step">
<div class="guide-copy">
<p>Pick a hill on the map first. Then check drive time. Then check whether the parquet row even looks like the hill you think you booked. This checklist is that order. The map on the right is Montage Mountain, OSM way 45096232, already tagged Indy in <code>pass-affiliations.json</code>. If you can read the lifts and the greens from this view, you have enough to pack. If you cannot, the OSM object is incomplete and the atlas will not invent the rest.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="detail" data-center="-75.6587,41.3532" data-zoom="13.2" data-detail="1"></div>
<p class="guide-caption">Montage, Pennsylvania. Same wiki winter stack as the tagging guide.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Drive, then snow</h2>
<p>Open <a href="../DriveTimeMap.html">Drive Time</a> from a start you actually use. A three-hour Saturday is a different object than a flight to Denver. New York, Vermont, New Hampshire, Pennsylvania, and Massachusetts fill the Northeast cluster. You do not need a destination pass to ski here. You need a car and a hill that is open. The points are downhill rows, not hotel clusters.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="ne" data-center="-73.8,43.6" data-zoom="6.1"></div>
<p class="guide-caption">Northeast downhill points. Independents sit next to the famous names.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Read the mix, not the slogan</h2>
<p>Bristol Mountain, way 320434895, is the worked example in the <a href="how-global-ski-atlas-data-pipeline-works.html">pipeline post</a>. The bars are <code>trails_novice</code> through <code>trails_expert</code> on that row. If you are bringing first-timers, look at easy and novice. If those bars are empty and the map is all black, pick another hill. Do not recap brochure vertical here. The file already has a trail mix. Use it.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="mix" data-id="320434895"></div>
<p class="guide-caption">Bristol difficulty counts from the current parquet.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Pass tags are a overlay, not the inventory</h2>
<p>This file tags <span data-live="indy">0</span> Indy, <span data-live="epic">0</span> Epic, and <span data-live="ikon">0</span> Ikon matches from the 2026–27 Storm Skiing workbook. The rest of the <span data-live="dh">3,035</span> downhill rows have no pass in that JSON. A trip plan that only lists pass partners leaves most of the map blank. Check the pass after the hill, not before.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="passes"></div>
<p class="guide-caption"><code>data/pass-affiliations.json</code> matched onto atlas ids.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Confirm the object, then buy the ticket</h2>
<p>Before you pay: the OSM name, the trail count, and the live map should match the hill on the ticket site. Chapman Hill in Durango is four greens and two lifts. If a listing promised forty runs, you have the wrong row. Open <a href="../TripPlannerMap.html">Trip Planner</a> for a multi-stop day. Then check hours, parking, and whether the carpet is running. The atlas does not know the rope is iced up this morning.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="chapman" data-center="-107.8681,37.2823" data-zoom="14.2" data-detail="1"></div>
<p class="guide-caption">Chapman Hill. Four tagged downhill trails. Still a Saturday.</p>
</div>
</div>
