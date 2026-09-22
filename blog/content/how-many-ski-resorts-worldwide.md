<div class="guide-step">
<div class="guide-copy">
<p>Ask how many ski resorts exist and you get different answers because the lists are not counting the same object. Magazines round. Pass marketers count partners. Tourism boards count what sells rooms. This file, <code>ski_areas_analyzed.parquet</code>, currently has <span data-live="total">4,326</span> winter-sports rows. <span data-live="dh">3,035</span> of them are tagged <code>resort_type=downhill ski resort</code>, in <span data-live="countries">63</span> countries. That is the atlas count: mapped downhill areas after one pipeline, not a UN census. The dots on the right are those analyzed points on the same overview tiles as the <a href="../mainmap.html">main map</a>.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="world" data-center="15,30" data-zoom="1.5" data-minzoom="1"></div>
<p class="guide-caption">Worldwide analyzed ski-area points from atlas PMTiles. Scroll zoom is off.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 1. Two kinds of rows in the same file</h2>
<p>The remaining <span data-live="notDh">1,291</span> rows are <code>not a downhill ski resort</code>. Nordic centres, sliding tracks, seasonal ice parks, empty placeholders, and ticket-brand polygons with no associated downhill ways land there. Big Air Shougang and Nordic Zentrum Oberstdorf are in that bucket. They stay in the parquet so you can see what the pipeline touched. They do not add to the downhill total on <a href="../SkiResortFacts.html">Ski Resort Facts</a>. The bar chart is that split, read from S3 when this page loads.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="type"></div>
<p class="guide-caption">Current <code>ski_areas_analyzed.parquet</code>. Downhill vs everything else the extract kept.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 2. What has to be on the map to count</h2>
<p>The jobs on <a href="../DownloadData.html">Download Data</a> start from Geofabrik extracts, pull <code>landuse=winter_sports</code>, then nearby pistes and lifts, then analyze. A downhill row is a coherent winter-sports package: a boundary plus downhill ways or aerialways that belong to it. There is no minimum acreage or vertical. Chapman Hill Recreation Area in Durango, Colorado, is in the file with 4 downhill trails and 2 lifts. AfriSki in Lesotho is in it with 1 trail and 2 lifts. Both count. A marketing domain with no pistes and no lifts does not, even if the OSM name is famous.</p>
<p>The map is Chapman Hill on the wiki winter stack. Four greens and a couple of lifts are enough. That is why the global total sits in the thousands instead of a round “2,000 significant destinations.”</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="small" data-center="-107.8681,37.2823" data-zoom="14.2" data-detail="1"></div>
<p class="guide-caption">Chapman Hill, Colorado. OSM way 530501892. Four downhill trails, two lifts, still a row.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 3. Country totals from the same table</h2>
<p>Japan currently leads this file with <span data-live="japan">413</span> downhill areas. The United States is <span data-live="us">405</span>. Then Switzerland 328, Austria 264, China 229, France 217. Those are mapped objects, not famous-name lists. Japan’s outdoor mapping culture puts a lot of small hills into OSM. France’s count is lower than alpine folklore because many villages sit inside larger polygons, and some named domains are stored as <code>not a downhill ski resort</code> when they have no pistes of their own.</p>
<p>The bar chart is the top ten countries in this parquet. Check <a href="../SkiResortFacts.html">Ski Resort Facts</a> if you need the live table after the next combine_regions run.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="countries"></div>
<p class="guide-caption">Downhill rows by <code>country</code>. Japan and the US are close; the Alps split across several states.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 4. Europe still holds most of the dots</h2>
<p>Group those countries the way wiki ingest does and Europe has <span data-live="europe">1,726</span> downhill areas, Asia/Africa/Oceania <span data-live="asia">753</span>, the Americas <span data-live="americas">556</span>. The Alps cluster is obvious on the map: France, Switzerland, Austria, Italy packed into a few degrees of longitude. North America is a long tail of independents plus destination mountains. Japan is a dense island of its own. Southern Hemisphere counts are small in absolute terms; AfriSki still moves Lesotho’s total from zero to one.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="alps" data-center="8.2,46.6" data-zoom="6.2"></div>
<p class="guide-caption">Alps overview. Each point is an analyzed ski area, not a pass logo.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 5. Japan’s mapped density</h2>
<p>Zoom to Honshu and the dots fill in. That is coverage, not a claim that Japan has the most skiing. Many of those rows are small municipal hills. The same pattern shows up in the plate sizes: <span data-live="small">1,459</span> downhill areas have fewer than 10 tagged trails, <span data-live="medium">821</span> have 10–29, <span data-live="large">535</span> have 30–99, and <span data-live="mega">220</span> have 100 or more. Most of the world’s count is the small end. Mega domains are rare in the table even when they dominate magazines.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="japan" data-center="138.4,36.4" data-zoom="5.4"></div>
<p class="guide-caption">Japan analyzed points. This is why Japan’s country bar is tall.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 6. Trail-count plates, not brochure acres</h2>
<p>Those four buckets are the same cut the print atlas uses on trail counts. A Midwest rope-tow with six tagged runs sits in small. Bristol Mountain’s 39 trails sit in large on that rule, even though the wiki-copy script in the data repo still calls 39 trails a <code>small_hill</code> for paragraph length. The chart here follows the site’s 10 / 30 / 100 trail breaks. It is a count of objects, not a ranking of snow quality.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="size"></div>
<p class="guide-caption">Downhill rows by <code>downhill_trails</code>. Most mapped hills are small.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 7. A hill that barely maps still counts</h2>
<p>AfriSki is one downhill trail and two lifts in Butha-Buthe, Lesotho, 6 skiable acres in this file. Include rules do not ask whether a magazine would send a photographer. They ask whether OSM has a winter-sports package the analyze job can attach. Under-mapping is the usual way a real hill stays out: no polygon, or lifts with no downhill ways. Over-mapping goes the other way: hiking paths tagged as downhill, duplicate polygons, abandoned chairs still live. The tagging guide is how you move the global total by one row.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="afriski" data-center="28.7232,-28.8200" data-zoom="14.4" data-detail="1"></div>
<p class="guide-caption">AfriSki, Lesotho. Way 608654682. One downhill trail, two lifts.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 8. Ticket names are not extra resorts</h2>
<p>Les Arcs / Peisey-Vallandry is in the downhill table with 809 trails and 74 lifts. Paradiski, the ticket that sells those villages with La Plagne, is in the same parquet as <code>not a downhill ski resort</code>, 0 trails, 0 lifts. The brand is not a second hill. Nordic Zentrum Oberstdorf is the same kind of exclusion for cross-country. Pass lists (Epic, Ikon, Indy) are also subsets. They answer who sells a card, not how many winter-sports polygons exist. See <a href="epic-ikon-indy-europe-which-to-choose.html">Epic vs Ikon vs Indy vs Europe</a> for that question.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="arcs" data-center="6.81,45.57" data-zoom="11.2" data-detail="1"></div>
<p class="guide-caption">Les Arcs / Peisey-Vallandry (way 589005175). 809 downhill trails in this file. Paradiski is a separate OSM object with no downhill ways.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 9. Count it yourself</h2>
<p>Load <code>ski_areas_analyzed.parquet</code> from <a href="../DownloadData.html">Download Data</a> and filter <code>resort_type</code> the way this page did. Or read country totals on <a href="../SkiResortFacts.html">Ski Resort Facts</a> and pan the <a href="../mainmap.html">map</a>. If your hill is missing, add the winter-sports boundary, lifts, and downhill pistes in OSM, then wait for the next regional run. The atlas will not invent a private row. The total moves when the map does.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="books"></div>
<p class="guide-caption">Europe / Asia-Africa-Oceania / Americas, same country lists as wiki ingest.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Takeaway</h2>
<p>The useful worldwide number is downhill rows in one GeoParquet, rebuilt the same way everywhere. Right now that is <span data-live="dh">3,035</span>. It is good for seeing how widespread mapped skiing is, where OSM is dense, and where a volunteer day would add a hill. It is not a government statistic and it will not stay put. Start on the <a href="../mainmap.html">map</a>, confirm in the parquet, and tag when the geometry is the thing that is wrong.</p>
</div>
<div class="guide-visual">
<div class="guide-links">
<p>Same objects this page counted.</p>
<p><a href="../SkiResortFacts.html">Ski Resort Facts</a></p>
<p><a href="../mainmap.html">Interactive map</a></p>
<p><a href="https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet">ski_areas_analyzed.parquet</a></p>
<p><a href="how-to-tag-a-ski-resort-in-openstreetmap.html">How to tag a ski resort</a></p>
<p class="guide-caption">OSM is ODbL. Counts are the analyzed copy plus <code>resort_type</code>.</p>
</div>
</div>
</div>
