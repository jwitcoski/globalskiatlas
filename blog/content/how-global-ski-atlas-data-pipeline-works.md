<div class="guide-step">
<div class="guide-copy">
<p>The worked example is Bristol Mountain, south of Canandaigua in the Finger Lakes. In the current GeoParquet it has 39 downhill ways, 6 lifts, and 149 skiable acres. Those figures come from OSM way 320434895, the pistes and aerialways attached to it, and one analyzed row in <code>ski_areas_analyzed.parquet</code>. The 3D scene on the right is that same package on a heightfield. If a trail is missing in OSM, it is missing here after the next ingest.</p>
</div>
<div class="guide-visual">
<div class="hero-montage-embed guide-clay-embed" id="guide-clay-embed">
<div id="guide-clay-stage" class="hero-montage-stage" aria-label="Bristol Mountain 3D map"></div>
</div>
<p class="guide-caption">Bristol in 3D. <a href="/playable/?resort=bristol_mountain_ski_resort_united_states_of_ame">Open the playable scene</a>.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<p>The 2D map is the wiki winter basemap with the same PMTiles pistes and lifts the rest of the site uses. Pan it. After a pipeline run, tagged objects show up here. Keep this view next to iD or JOSM when a count moves. The rest of the page follows this hill through extract, analyze, parquet, and the pages that read the table.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="intro2d" data-center="-77.4136,42.7426" data-zoom="13.2"></div>
<p class="guide-caption">Bristol on the wiki 2D map. Same layers as <a href="../wiki/browse.html">the atlas wiki</a>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 1. Start from OpenStreetMap</h2>
<p>Resort websites count mountains in different units: gladed acres, summit-to-base vertical you cannot ski in one run, trail totals that split every pitch into named segments. OSM is the shared geometry: a <code>landuse=winter_sports</code> polygon, <code>piste:type=downhill</code> ways, and <code>aerialway=*</code> lifts anyone can inspect. Global Ski Atlas does not keep a private ski graph. We ingest those objects, apply the same spatial rules in every region, and publish the result on the <a href="../mainmap.html">map</a>, in <a href="../SkiResortFacts.html">Ski Resort Facts</a>, and on <a href="../DownloadData.html">Download Data</a>.</p>
<p>Bristol's ski-area object is OSM way 320434895. The tags on that way today are <code>landuse=winter_sports</code>, <code>leisure=sports_centre</code>, <code>name=Bristol Mountain Ski Resort</code>, the resort website, Wikidata, and Wikipedia. That is the record the extract job keys on. Trails and chairs live as other ways inside or next to this polygon. If this way is missing or unclosed, Bristol never becomes a row. The tagging walkthrough for drawing that kind of object is <a href="how-to-tag-a-ski-resort-in-openstreetmap.html">how to tag a ski resort in OpenStreetMap</a>.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="area" data-center="-77.4136,42.7426" data-zoom="13.6"></div>
<p class="guide-caption">MapTiler aerial and OSM way 320434895. The table is the live tag set from the OSM extract saved with this post.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 2. Extract nearby pistes and lifts</h2>
<p>Raw planet files are huge. The jobs listed on <a href="../DownloadData.html">Download Data</a> pull winter-sports areas from a Geofabrik extract, then take OSM features within about 2 km (<code>osm_nearby</code>), then split out piste and lift geometries. On Bristol that nearby grab is messy on purpose: <code>pistes.parquet</code> currently has 43 rows whose <code>Ski Area</code> field is Bristol Mountain Ski Resort, and <code>lifts.parquet</code> has 84. Analyzed totals are 39 downhill trails and 6 lifts. The extra lift rows are other OSM ways that sat inside the search window (unnamed lines, non-aerialway leftovers) and still inherited the ski-area name. The analyze step is what keeps Galaxy Express and Lunar Launch and drops the junk.</p>
<p>Named downhill ways in that extract include Sunset Way, Upper Meteor, Beta, Orion's Belt, Morning Star, Lower Infinity, and Hale Bopp, most of them already tagged <code>piste:lit=yes</code>. The chairs in the lift file include Sunset Double, Galaxy Express Quad, Morning Star Quad, Rocket Triple, Comet Express Quad, and the Lunar Launch carpet. Those names are OSM, copied forward. The map on the left is aerial plus the same ski PMTiles the wiki uses, so you can see the lines the extract is trying to attach to the teal polygon from step 1.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="satski" data-center="-77.4136,42.7426" data-zoom="13.8"></div>
<p class="guide-caption">Aerial plus atlas piste and lift tiles. Green, blue, and black follow American <code>piste:difficulty</code>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 3. Analyze one hill under the same rules</h2>
<p>Analyze attaches counts to the winter-sports geometry. For Bristol the current row says 759 acres inside the OSM polygon (<code>total_area_acres</code>) and 149 acres of skiable terrain (<code>skiable_terrain_acres</code>). The first number is the closed way, woods and parking included. The second is downhill geometry used as a proxy for what you can ski. <code>downhill_trails</code> is 39. Difficulty breaks out as 1 novice, 11 easy, 22 intermediate, 4 advanced, 1 expert. <code>lift_types</code> is <code>chair lift: 5, magic carpet: 1</code>. Night skiing is yes, with 36 lit pistes. Elevation columns on this row are still empty, so vertical drop is empty too. That is the file, not a guess from the brochure.</p>
<p>The bar chart is those five difficulty columns from <code>ski_areas_analyzed.parquet</code>, loaded in the browser from the same S3 object the download page links. Bristol is a blue hill in that table: more than half the tagged runs are intermediate. A marketing pie that paints everything "more difficult" is using a different unit.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="mix"></div>
<p class="guide-caption">Difficulty mix for Bristol, read from the analyzed parquet at page load.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 4. Put Bristol next to the rest of New York</h2>
<p>The same parquet has 28 New York downhill areas with at least one trail. Gore sits at 119 trails and 749 skiable acres. Whiteface is 98 and 422. Holiday Valley 68 and 232. Bristol is 39 and 149, near Catamount (40 / 129) and Holimont (42 / 84). The scatter plots <code>downhill_trails</code> against <code>skiable_terrain_acres</code> for every New York row in that file. Teal is Bristol. If OSM grows a new named run at Bristol, the next combine_regions job should move the teal dot right by one trail, and maybe up a few acres if the new way adds area.</p>
<p>The jobs stay mechanical so Japan, Colorado, and the Finger Lakes share the same columns. <a href="../about.html">About</a> covers the cloud side (containers, object storage, catalogs). This page is what those jobs mean for one hill: one row, neighbors you can plot.</p>
</div>
<div class="guide-visual">
<div class="guide-chart" data-chart="scatter"></div>
<p class="guide-caption">New York downhill areas from <code>ski_areas_analyzed.parquet</code>. Bristol is the teal point.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 5. Publish GeoParquet, then reuse the table</h2>
<p>Processed output lands as GeoParquet on S3. Parquet is columnar, so facts pages can scan trail counts without parsing a planet file. GeoParquet adds geometry so maps can draw the same features. The four public files are <code>ski_areas_analyzed.parquet</code>, <code>ski_areas.parquet</code>, <code>lifts.parquet</code>, and <code>pistes.parquet</code>, linked from <a href="../DownloadData.html">Download Data</a>. The website, the wiki, comparison, and those downloads are supposed to read that set.</p>
<p>The table on the right is a slice of Bristol's analyzed row as hyparquet returns it in this browser: ids, acres, trails, lifts, mix, night skiing, website. <code>total_trail_mi</code>, <code>longest_trail_mi</code>, and <code>avg_trail_mi</code> are all 0.23 on this build. Thirty-nine trails cannot average 0.23 miles and also sum to 0.23 miles. That is a pipeline bug you can see in the file, the same as a missing chair in OSM.</p>
</div>
<div class="guide-visual">
<div data-chart="row"></div>
<p class="guide-caption">Selected columns from Bristol's row in <code>ski_areas_analyzed.parquet</code>.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 6. What the products actually draw</h2>
<p>Once the files are public, the surfaces split. The <a href="../mainmap.html">interactive map</a> draws resort locations and, in closer, trail and lift tiles. <a href="../resort-comparison.html">Resort comparison</a> and tier rank read the same stats columns. The <a href="../wiki/browse.html">wiki</a> page for a hill sits on that structured row. <a href="ski-resort-stats-explained.html">Ski resort stats explained</a> is how to read the columns. A tagging fix in OSM can show up on all of those after the next regional run. Emailing a one-off correction to this website would update one screenshot and leave the parquet stale.</p>
<p>The map here is the wiki 2D view again, because that is the product that most closely matches the parquet geometry: winter contours, the ski-area outline, difficulty-colored pistes, orange lifts. If this map and the analyzed row disagree, start with OSM, then the extract, then analyze. The website is last.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="intro2d" data-center="-77.4136,42.7426" data-zoom="13.4"></div>
<p class="guide-caption">Same wiki 2D stack as the intro. This is what comparison and facts are summarizing.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 7. When a number looks wrong</h2>
<p>Most "atlas bugs" are upstream or late. A missing hill usually means no coherent winter-sports geometry, or no pistes and lifts that survive inclusion rules. Tiny acres against a brochure usually means incomplete downhill ways or a polygon that stops at the lodge. A weird mix usually means missing <code>piste:difficulty</code> or a regional scheme you did not expect. A stale lift usually means OSM still has a chair that was cut, or the pipeline has not ingested the edit yet.</p>
<p>Work Bristol in that order. Search it on the <a href="../mainmap.html">map</a> and zoom until trails should appear. Read the row in <a href="../SkiResortFacts.html">Ski Resort Facts</a> or comparison. Open way <a href="https://www.openstreetmap.org/way/320434895">320434895</a> and the named pistes. Download the parquet if you need the machine-readable proof. Fix OSM with the tagging guide, then wait for the next build. The same loop updates OsmAnd, Wikipedia maps, and this atlas together. It is slower than editing a private database.</p>
</div>
<div class="guide-visual">
<div class="guide-links">
<p>Bristol's public objects, in the order the pipeline reads them.</p>
<p><a href="https://www.openstreetmap.org/way/320434895" rel="noopener noreferrer" target="_blank">OSM way 320434895</a></p>
<p><a href="https://www.openstreetmap.org/edit#map=15/42.743/-77.414" rel="noopener noreferrer" target="_blank">Open iD on Bristol</a></p>
<p><a href="https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet">ski_areas_analyzed.parquet</a></p>
<p><a href="../DownloadData.html">All four GeoParquet files</a></p>
<p class="guide-caption">OSM is ODbL. The parquet is the analyzed copy of those objects plus derived stats.</p>
</div>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 8. Draft the wiki paragraph</h2>
<p>The wiki lead is a separate job from analyze. <code>generate_resort_copy_bedrock.py</code> in the data repo reads the parquet row, sets a layout tier from size, then gathers Wikipedia summaries and DuckDuckGo snippets (Brave too, if a key is set). Those snippets go through miners, a curator, a Nova draft, a critic, and an editor, then a trim or expand pass so the word count lands in the plate band. Small hills are 90–100 words. Medium is 140–175, large 180–220, mega 520–680. Bristol's 39 trails and 149 skiable acres fall in that script's <code>small_hill</code> bucket, so you get the short plate. The markdown is bulk-loaded by <code>wiki-bulk-update-resort-content.js</code>. A person with a wiki account can still replace it.</p>
<p>The writer prompt says not to recap vertical, lift counts, acreage, or trail counts. Those columns already sit next to the prose as resort facts. The paragraph should come from the research bullets: place, landform, history, and on bigger plates maybe a pass or a season note. Small tier only runs history and landform miners, so the box is a thin web pass under a 90-word cap. South Bristol and the Finger Lakes are the place facts the searches are for. Trail mix stays in the parquet table from step 5 and on the wiki facts panel.</p>
</div>
<div class="guide-visual">
<div class="guide-draft">
<p>Bristol Mountain Ski Resort in South Bristol, New York, within the Finger Lakes region, offers a unique skiing experience. Its location provides a distinct backdrop, contrasting with typical alpine settings. Skiers enjoy the blend of natural beauty and recreational opportunities. The resort's trails and facilities cater to various skill levels, ensuring enjoyment for all. Bristol Mountain's integration into the local community adds charm and accessibility, making it a favored destination for both local and out-of-town skiers. The resort stands out for its scenic surroundings and community connection, enhancing the overall skiing experience.</p>
</div>
<p class="guide-caption">Small-plate wiki lead for Bristol (target 90–100 words). Stats stay in the facts panel on the <a href="../wiki/resort.html?page=bristol-mountain-ski-resort-new-york">wiki page</a>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Takeaway</h2>
<p>The site is the front of that path: OSM geometry in, the same spatial jobs in the middle, GeoParquet and maps out, then a sized wiki lead that is not supposed to repeat the facts table. Bristol is small enough that you can hold the polygon, the 39 ways, the 6 lifts, and the parquet row at once. When a local hill looks thin, ask which of those objects is missing. Start on the <a href="../mainmap.html">map</a>, check <a href="../DownloadData.html">Download Data</a>, and edit OSM when the geometry is wrong.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="area" data-center="-77.4136,42.7426" data-zoom="13.2"></div>
<p class="guide-caption">Back to way 320434895. The analyzed row is derived from this polygon plus the pistes and lifts inside the extract window.</p>
</div>
</div>
