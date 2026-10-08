<div class="guide-step">
<div class="guide-copy">
<p>A chair goes on wind hold, or a gearbox fails on a Tuesday. How much of the mountain still works? We ran that test on every lift network we could build from OpenStreetMap: close one lift, see what terrain you can no longer lap, put it back, close the next one. Power-grid engineers call this an N-1 contingency check. Of the 83 resorts with at least ten lifts in their main loop and a well-connected map, the median worst single closure takes out 12.7% of the lappable piste. Mount Snow loses under 1% no matter which chair stops. At Silver Star, closing Putnam Express cuts off 45%.</p>
</div>
<div class="guide-visual">
<div class="guide-chart guide-chart--auto" data-chart="redundancy" data-src="data/lift-redundancy.json" data-title="Lift network size vs. worst single closure" data-sub="One dot per resort. Lower is more redundant. Hover a dot for the lift."></div>
<p class="guide-caption">Filter by country, then tick one or more states or provinces. Outliers are labeled.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Turn the mountain into a graph</h2>
<p>The inputs are the public <code>lifts.parquet</code> and <code>pistes.parquet</code> files from <a href="../DownloadData.html">Download Data</a>. Every lift becomes two stations, bottom and top, joined by a one-way ride. Gondolas, cable cars, and funiculars get a ride down as well, because you can usually download them. Every downhill piste (plus <code>piste:type=connection</code> links) becomes a chain of one-way segments, pointing the way the OSM way is drawn. OSM convention is that pistes are drawn downhill and lifts bottom to top.</p>
<p>Pistes join where their vertices sit within 30 m of each other. A station connects to any piste vertex within 100 m, which covers the walk from the unload ramp to the first turn. That's the whole graph: about 3,400 lifts across 426 ski areas that have at least three lifts and some mapped downhill runs.</p>
<p>OSM isn't perfect about direction. Mount Sunapee's summit express, for example, is drawn from the summit down. So before building the graph, the script lets nearby pistes vote: runs should start near a lift's top and end near its bottom. If the vote clearly disagrees with the drawn direction, the lift is flipped. 122 of the 3,404 lifts got flipped that way. The vote isn't certain: Sunapee's express didn't get a clear enough margin to flip, so Sunapee isn't quoted anywhere below.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="sunapee" data-center="-72.077,43.326" data-zoom="13.6" data-detail="1"></div>
<p class="guide-caption">Mount Sunapee. Orange lines are lifts, colored lines are pistes, and the graph is drawn from exactly these objects.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. Define "still works"</h2>
<p>A loop is a set of stations you can circulate between forever: ski down, ride up, repeat. In graph terms it's a strongly connected component. A piste segment is <strong>lappable</strong> if you can ski onto it from a loop and ski off it back into the same loop. We measure terrain in kilometers of lappable piste, not trail count, because one long run split into six OSM ways shouldn't count six times.</p>
<p>For each lift in the main loop, the script removes the ride and recomputes every loop. Two different things can happen.</p>
<h3>Terrain lost</h3>
<p>Segments that were lappable before and aren't lappable from any loop now. This is the "that pod is closed" number, and it's what the rankings below use.</p>
<h3>Resort split</h3>
<p>Segments that are still lappable, but only from a loop that's no longer connected to the main one. Close the hinge lift and the mountain becomes two smaller resorts. You can still ski the far side if you're already there, but you can't get there from the base.</p>
<p>Each resort gets a worst single closure (the max terrain lost), a mean closure across all its loop lifts, and a worst split.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="bars" data-unit=" resorts" data-items="Under 5%:15|5–10%:15|10–20%:31|20–30%:15|30%+:7" data-title="Worst single closure, 83 resorts" data-sub="Share of lappable km lost when the worst lift stops (10+ loop lifts)"></div>
<p class="guide-caption">Most resorts with 10+ lifts have one chair worth 10–20% of their terrain.</p>
<div class="guide-map-host is-home" data-kind="vail" data-center="-106.36,39.61" data-zoom="12" data-detail="1"></div>
<p class="guide-caption">Vail. Closing Tea Cup Express loses only 2.2% of the terrain but splits 20.6% of the network (Blue Sky Basin and China Bowl) away from the front side.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. More lifts, more redundancy (mostly)</h2>
<p>Size is the first-order effect. A five-lift hill usually has one chair that is the mountain. By twenty lifts, the network has enough overlapping pods that a single failure is a nuisance rather than a closure. These medians are across every area with at least 60% of its mapped piste inside some loop:</p>
<table>
<thead><tr><th>Lifts in main loop</th><th>Areas</th><th>Median worst closure</th><th>Median mean closure</th></tr></thead>
<tbody>
<tr><td>3–5</td><td>176</td><td>33.8%</td><td>11.1%</td></tr>
<tr><td>6–9</td><td>145</td><td>22.6%</td><td>5.0%</td></tr>
<tr><td>10–19</td><td>70</td><td>14.9%</td><td>1.9%</td></tr>
<tr><td>20+</td><td>13</td><td>9.9%</td><td>1.1%</td></tr>
</tbody>
</table>
<p>The mean closure falls much faster than the worst. Big resorts are full of lifts that duplicate each other, but almost every one still has a single chair guarding a pod with nothing else on it. That chair sets the worst-case number.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="bars" data-unit="%" data-items="3–5 lifts:33.8|6–9 lifts:22.6|10–19 lifts:14.9|20+ lifts:9.9" data-title="Median worst closure by network size" data-sub="Lifts in the main loop, 404 areas"></div>
<p class="guide-caption">Each step up in size roughly takes a third off the worst case.</p>
<div class="guide-map-host is-home" data-kind="mtsnow" data-center="-72.91,42.962" data-zoom="13.4" data-detail="1"></div>
<p class="guide-caption">Mount Snow: 18 loop lifts across the Main Face, North Face, and Carinthia. The worst closure (Beartrap #14) loses 0.8%.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. The big-resort table</h2>
<p>Thirteen areas have twenty or more lifts in their main loop and clean enough connectivity to score. Sorted by worst single closure:</p>
<table>
<thead><tr><th>Ski area</th><th>Loop lifts</th><th>Lappable km</th><th>Worst closure</th><th>Worst lift</th><th>Worst split</th></tr></thead>
<tbody>
<tr><td>Vail</td><td>30</td><td>141</td><td>6.3%</td><td>Orient Express</td><td>20.6%</td></tr>
<tr><td>Deer Valley</td><td>31</td><td>161</td><td>6.4%</td><td>Vulcan Express</td><td>10.9%</td></tr>
<tr><td>Killington</td><td>22</td><td>102</td><td>7.4%</td><td>Skyeship Stage 1</td><td>0.0%</td></tr>
<tr><td>Whistler Blackcomb</td><td>33</td><td>311</td><td>8.7%</td><td>Peak Express</td><td>1.3%</td></tr>
<tr><td>Copper Mountain</td><td>21</td><td>94</td><td>9.0%</td><td>Super Bee</td><td>12.6%</td></tr>
<tr><td>Park City</td><td>40</td><td>229</td><td>11.0%</td><td>Tombstone Express</td><td>42.2%</td></tr>
<tr><td>Palisades Tahoe</td><td>28</td><td>68</td><td>11.6%</td><td>Headwall Express</td><td>10.8%</td></tr>
<tr><td>Cerro Catedral</td><td>30</td><td>56</td><td>11.8%</td><td>Telecabina Amancay</td><td>2.4%</td></tr>
<tr><td>Breckenridge</td><td>30</td><td>102</td><td>12.7%</td><td>Falcon SuperChair</td><td>0.8%</td></tr>
<tr><td>Big Sky</td><td>35</td><td>225</td><td>20.5%</td><td>Madison 8</td><td>22.2%</td></tr>
<tr><td>Winter Park</td><td>22</td><td>112</td><td>22.2%</td><td>Panoramic Express</td><td>13.6%</td></tr>
</tbody>
</table>
<p>Afton Alps (20 lifts, 0%) and Mammoth (60.7% worst split, but only 61% of its piste mapped into loops) are left out of the table. Afton is a short Minnesota hill where every lift serves the same slope. Mammoth's split number most likely reflects gaps in the map, not the mountain.</p>
<p>Killington is the interesting one: no splits at all, because so many base areas and connector trails overlap. Whistler is the best combination of size and robustness. It has 311 km of lappable terrain and nothing worse than Peak Express, whose 8.7% is the alpine bowl it serves.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="bars" data-unit="%" data-items="Vail:6.3|Deer Valley:6.4|Killington:7.4|Whistler Blackcomb:8.7|Copper Mountain:9|Park City:11|Palisades Tahoe:11.6|Cerro Catedral:11.8|Breckenridge:12.7|Big Sky:20.5|Winter Park:22.2" data-title="Big resorts: worst single closure" data-sub="20+ loop lifts, share of lappable km lost"></div>
<p class="guide-caption">Shorter bar = more redundant.</p>
<div class="guide-map-host is-home" data-kind="killington" data-center="-72.80,43.613" data-zoom="12.6" data-detail="1"></div>
<p class="guide-caption">Killington. Six peaks and multiple base areas leave no single lift that cuts the network in two.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 5. Keystone lifts</h2>
<p>Flip the question: which individual lifts guard the most terrain? These are each resort's worst closure, ranked by kilometers lost.</p>
<table>
<thead><tr><th>Lift</th><th>Ski area</th><th>Km lost</th><th>Share</th><th>Runs cut off include</th></tr></thead>
<tbody>
<tr><td>Madison 8</td><td>Big Sky</td><td>46.3</td><td>20.5%</td><td>Park Avenue, Elkhorn, Meriwether</td></tr>
<tr><td>Putnam Express</td><td>Silver Star</td><td>46.0</td><td>44.8%</td><td>Sunny Ridge, Bon Diablo, Spirit Bowl</td></tr>
<tr><td>Paradise Express</td><td>Powder Mountain</td><td>43.0</td><td>35.1%</td><td>Rendezvous, Sanctuary, Cobabe Canyon</td></tr>
<tr><td>Gem Lake Express</td><td>Big White</td><td>34.8</td><td>35.5%</td><td>Blackout, Blue Ribbon, Showdown</td></tr>
<tr><td>Sundance Express</td><td>Sun Peaks</td><td>33.7</td><td>21.8%</td><td>Three Bears, Fairways Ski Back</td></tr>
<tr><td>Peak Express</td><td>Whistler Blackcomb</td><td>26.9</td><td>8.7%</td><td>Peak to Creek, Shale Slope, Grande Finale</td></tr>
<tr><td>Tombstone Express</td><td>Park City</td><td>25.2</td><td>11.0%</td><td>Cloud 9, Sidewinder, Encore</td></tr>
<tr><td>Pine Creek Express #6</td><td>Bogus Basin</td><td>24.9</td><td>33.7%</td><td>Upper Nugget, Paradise Cat Track</td></tr>
<tr><td>Panoramic Express</td><td>Winter Park</td><td>24.8</td><td>22.2%</td><td>Primrose, Lupin, Fireberry Glade</td></tr>
<tr><td>Alpine Springs</td><td>Aspen Snowmass</td><td>24.8</td><td>20.2%</td><td>Cookies, Tom's Trace, Lodgepole</td></tr>
</tbody>
</table>
<p>The pattern is the back-side pod: a whole drainage reached over a ridge, with one high-speed chair to pull you out. Silver Star's Putnam Creek side and Big White's Gem Lake are the textbook cases. The terrain is excellent and the lift is a single point of failure. 76 of the 83 ranked resorts have a fixed-grip or detachable chair as their worst lift, not a gondola.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="bars" data-unit=" km" data-items="Madison 8:46.3|Putnam Express:46|Paradise Express:43|Gem Lake Express:34.8|Sundance Express:33.7|Peak Express:26.9|Tombstone Express:25.2|Pine Creek #6:24.9|Panoramic Express:24.8|Alpine Springs:24.8" data-title="Keystone lifts: km of piste lost" data-sub="Each resort's worst closure, ranked by distance"></div>
<p class="guide-caption">Big Sky, Silver Star, Powder Mountain, Big White, and Sun Peaks top the list.</p>
<div class="guide-map-host is-home" data-kind="silverstar" data-center="-119.055,50.365" data-zoom="12.8" data-detail="1"></div>
<p class="guide-caption">Silver Star. Everything on the Putnam Creek side drains to one chair.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 6. Splits: when one mountain becomes two</h2>
<p>Park City is the cleanest split case. Close Iron Mountain Express or the Quicksilver Gondola and the network breaks along the old Canyons–Park City boundary. Either side still runs on its own, so terrain lost is small (5.9% and 0%), but 42% of the network detaches from the other half. Anyone parked on the wrong side has a long walk or a bus ride.</p>
<p>Vail does the same thing at smaller scale. Tea Cup Express is the link between the front side and the back bowls, Blue Sky Basin, and China Bowl. Close it and Orient Express, Skyline, Pete's, Earl's, and Mongolia keep spinning, but as their own island. Deer Valley's Ruby Express (10.9%) does the same to the Empire and Lady Morgan pods.</p>
<p>Splits matter more for guests than lost terrain does. A closed pod is a shorter trail list. A split is a skier who rode over in the morning and can't get back to their car.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="bars" data-unit="%" data-items="Park City:42.2|Big Sky:22.2|Vail:20.6|Winter Park:13.6|Copper Mountain:12.6|Deer Valley:10.9|Palisades Tahoe:10.8" data-title="Worst split, big resorts" data-sub="Share of the main loop cut off (still skiable, not reachable)"></div>
<p class="guide-caption">Park City's Canyons hinge is in a class of its own.</p>
<div class="guide-map-host is-home" data-kind="parkcity" data-center="-111.55,40.655" data-zoom="12" data-detail="1"></div>
<p class="guide-caption">Park City. Two lifts form the hinge between the Canyons side (west) and the original Park City side (east).</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 7. What this model can't see</h2>
<p>This is a topology test on open map data, so read the numbers as "how the network is shaped," not "what ops will open tomorrow."</p>
<h3>Geography of the sample</h3>
<p>The current <code>lifts.parquet</code> has lift lines mostly for the Americas, plus a couple of African areas. The big Alpine domains aren't in this run, which is why The 3 Valleys and Ski Arlberg are missing. When the extract carries their lift ways, the same script will score them.</p>
<h3>No elevation</h3>
<p>Direction comes from how ways are drawn plus the flip vote. A piste drawn uphill breaks a path. A traverse drawn the wrong way can invent one. A DEM lookup would settle direction properly.</p>
<h3>Correlated failures</h3>
<p>N-1 assumes one lift fails at a time. Real wind holds close every exposed summit chair at once, which is when redundancy matters most. Lift capacity and lift lines aren't modeled either: losing one of two parallel six-packs is 0% terrain lost and still a miserable morning.</p>
<h3>Walking and roads</h3>
<p>Anything more than 100 m from a station doesn't count as connected. A village walk, a skier bridge, or a shuttle bus can join two loops that this model treats as separate.</p>
<p>The fix for most of these is upstream. Draw lifts bottom to top, draw pistes downhill, and tag catwalks and skier bridges as <code>piste:type=connection</code>. <a href="how-to-tag-a-ski-resort-in-openstreetmap.html">The tagging walkthrough</a> covers the basics, and <a href="ski-lift-types-explained.html">the lift type guide</a> covers which <code>aerialway</code> values count as uphill transport.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="bigwhite" data-center="-118.935,49.73" data-zoom="12.8" data-detail="1"></div>
<p class="guide-caption">Big White. Gem Lake Express is the only way out of 35% of the lappable terrain.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Takeaway</h2>
<p>The resorts with the best lift redundancy in this dataset are big, multi-base networks with overlapping pods: Vail, Deer Valley, Killington, and Whistler Blackcomb each stay above 90% open whichever lift you close. Mid-size eastern hills like Mount Snow and Stratton do even better on a percentage basis, because their chairs overlap on a few tightly connected faces. The most fragile networks put a whole drainage behind one chair. If your favorite runs are in that drainage, check that lift's status before you drive.</p>
<p>The script is <code>scripts/lift-redundancy.mjs</code> in the site repo. It reads the same parquet files you can download, runs in seconds once the files are cached, and has a <code>--self-test</code> with a three-chair toy mountain. For per-lift details on the atlas side, start with <a href="../SkiLiftFacts.html">Ski Lift Facts</a>.</p>
</div>
<div class="guide-visual">
<div class="guide-links">
<p>Inputs and related pages.</p>
<p><a href="../DownloadData.html">lifts.parquet and pistes.parquet</a></p>
<p><a href="../SkiLiftFacts.html">Ski Lift Facts</a></p>
<p><a href="largest-ski-resorts-in-the-world.html">Largest resorts by mapped terrain</a></p>
<p class="guide-caption">OSM data is ODbL. Redundancy figures are derived from the October 2026 extract.</p>
</div>
</div>
</div>
