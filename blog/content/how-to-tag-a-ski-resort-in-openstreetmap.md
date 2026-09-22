<div class="guide-step">
<div class="guide-copy">
<p>The worked example is Montage Mountain in Scranton, Pennsylvania. Ten steps take you from an OpenStreetMap account to a hill other maps can actually read. Copy the tags when a step has a snippet. You are editing OpenStreetMap itself. Global Ski Atlas, ski-tracking apps, Wikipedia, and a pile of other maps query those same objects later. The 3D scene on the right is that same OSM geometry on a heightfield. A trail that does not snap, a wood drawn over a run, or a chair tagged twice shows up as soon as you look at it.</p>
</div>
<div class="guide-visual">
<div class="hero-montage-embed guide-clay-embed" id="guide-clay-embed">
<div id="guide-clay-stage" class="hero-montage-stage" aria-label="Montage Mountain 3D map"></div>
</div>
<p class="guide-caption">Montage in 3D. <a href="/playable/?resort=montage_mountain_pa">Open the playable scene</a> if you want to ski it.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<p>The 2D map is the same live wiki map: winter basemap, OSM ski-area outline, pistes by difficulty, and lifts. Pan it. That is how tagged objects show up in the atlas after the next ingest. Keep both views around while you work in iD. When the account is live, the next job is the resort boundary.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="intro2d" data-center="-75.6587,41.3532" data-zoom="13"></div>
<p class="guide-caption">Montage on the wiki 2D map: winter basemap, OSM pistes and lifts. Same layers as <a href="../wiki/browse.html">the atlas wiki</a>.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 1. Log into OpenStreetMap</h2>
<p>OpenStreetMap is a shared geographic database that anyone can edit. A ski lift, a woodlot, a lodge phone number, and a parking aisle all live there as tagged objects. When an edit is uploaded and passes ordinary review, every product that reads OSM can pick it up on its next refresh. Global Ski Atlas is one of those products. So are OsmAnd, Wikipedia maps, a lot of ski-tracking apps, and municipal tools that have nothing to do with skiing. You are adding records to the same public dataset those apps already query.</p>
<p>Log into OSM itself. There is no tagging form on globalskiatlas.com. An account on openstreetmap.org is free. It is what proves you made the change, and it is what lets other mappers leave a note if they disagree with a boundary or a lift type. Create the account, confirm the email, and log in. Until you do that, the iD editor in the browser will let you look around but it will not let you save. The links in the right column go to signup, login, and a ready-made iD view centered on Montage Mountain so you are not hunting for Scranton by hand.</p>
<p>iD is the default editor at openstreetmap.org and it is enough for this whole walkthrough. JOSM is faster once you already live in it, and you can keep using it if that is your habit, but nothing in these ten steps requires a separate install. Pick a hill you have actually skied. Imagery and the printed trail map only line up if you already know which clearing is a green and which is a service road. Montage is the worked example because the atlas already has a complete package there, so you can compare what you see in iD with a finished hill. When the account is live and iD is sitting on that mountain, start with the resort boundary.</p>
</div>
<div class="guide-visual">
<div class="guide-links">
<p>Signup, login, and the editor all live on openstreetmap.org. Open iD on Montage once you are logged in and leave it there for the rest of the steps.</p>
<p><a href="https://www.openstreetmap.org/user/new" rel="noopener noreferrer" target="_blank">Create an OSM account</a></p>
<p><a href="https://www.openstreetmap.org/login" rel="noopener noreferrer" target="_blank">Log in</a></p>
<p><a href="https://www.openstreetmap.org/edit#map=15/41.353/-75.659" rel="noopener noreferrer" target="_blank">Open iD on Montage Mountain</a></p>
<p class="guide-caption">iD shows aerial imagery and existing OSM ways in one window. Saving requires the account from the first link.</p>
</div>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 2. Tag the resort boundary</h2>
<p>The first object you draw is a closed way around the hill, and the tag on that way is <code>landuse=winter_sports</code>. That polygon is the ski area in OSM. Everything later in this guide (woods, buildings, roads, lifts, trails) should sit inside it or clearly belong to the same operation. On Montage the way is 45096232, named Montage Mountain Ski Area. In iD, click around the signed in-bounds terrain and the base that the resort actually runs, then close the way so the first node and the last node are the same point. A line that does not close is not an area, and the atlas cannot treat it as a resort.</p>
<p>Follow ropes, trail-map edges, and the lower carpets that still belong to the hill. Do not swallow the next ridge because the satellite snow looks continuous, and do not stop at the parking-lot curb if the learning slope is still part of the ticket. An oversized polygon inflates mapped acres in every stats table that reads OSM. An undersized one leaves chairs and runs floating outside the area, which is how lifts get orphaned in extracts. The teal outline on the map here is that OSM way, drawn on MapTiler aerial. It is not the 1000-foot analysis buffer the atlas adds later for joining nearby geometry.</p>
<p>While the way is selected, add every contact field you can verify from the resort website or a sign on the building: <code>name</code>, <code>website</code>, <code>phone</code>, <code>email</code>, <code>operator</code>, and <code>sport=skiing</code> when that is what they sell. Copy the URL and the phone number as they are published. Do not invent a website because a search result looked close. Those tags ride with the area into search boxes and info panels in any app that reads the object, including this atlas after the next ingest. Trees are next, and you can see them on the same aerial without a trail map.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="area" data-center="-75.6587,41.3532" data-zoom="14"></div>
<p class="guide-caption">MapTiler aerial, OSM way 45096232. The popup lists every tag currently on that polygon. Click the fill for the tags.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 3. Start with trees</h2>
<h3>Tag a lone tree as a point</h3>
<p>A node is the right geometry when there is one tree you can point at: a specimen in a parking island, a landmark next to the lodge, a leftover pine in the middle of a beginner pad. In iD, drop a point on the trunk you see in aerial (or on the crown if winter imagery hides the stem) and set <code>natural=tree</code>. Add <code>leaf_type</code> when you can tell needle from broadleaf. Routers, 3D scenes, and anyone counting hazards treat that node as a single thing at a coordinate. Do not sprinkle hundreds of tree nodes through a wood that you are about to draw as a polygon. That duplicates the stand and makes the next mapper think the forest has no area.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="point" data-center="-75.66352,41.35220" data-zoom="18"></div>
<p class="guide-caption">OSM node 4197751666 at Montage, tagged <code>natural=tree</code>. The point sits on the crown.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h3>Tag a row of trees as a line</h3>
<p>Use a way when the trees form a linear feature: a windbreak, a hedge, a line of evergreens along a driveway or lot. Draw the way along the row, not as a skinny rectangle, and tag it <code>natural=tree_row</code>. On Montage, way 418589994 is an avenue of needleleaved evergreens; the extra tags <code>leaf_type=needleleaved</code>, <code>leaf_cycle=evergreen</code>, and <code>denotation=avenue</code> tell you what kind of row it is. Length and alignment are the facts that matter, as they are for a fence or a road. A string of individual <code>natural=tree</code> nodes along that same path is worse: you lose the row as one object, and every app has to guess that the points belong together. Save nodes for trees that actually stand alone.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="line" data-center="-75.66345,41.35115" data-zoom="18"></div>
<p class="guide-caption">OSM way 418589994, a <code>natural=tree_row</code>. Follow the line along the evergreens, not around them as an area.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h3>Tag a stand of woods as a polygon</h3>
<p>When trees cover a patch of ground, draw a closed way around the canopy and tag it <code>natural=wood</code> (or <code>landuse=forest</code> where that is how the local community maps timber). Way 1219906134 at Montage is a small wood island between trails. Close the way so the first and last nodes are the same. 3D and land-cover tools need a filled shape. Keep the polygon on the trees. Do not drag it across a signed downhill trail or a lift line. Those corridors stay empty so the piste and aerialway steps have somewhere to go, and so a skier reading OSM does not see forest drawn on top of a groomer.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="polygon" data-center="-75.65570,41.35290" data-zoom="17.5"></div>
<p class="guide-caption">OSM way 1219906134, <code>natural=wood</code>. The fill is the stand. Trails beside it stay out of the polygon.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 4. Buildings</h2>
<p>Trace the roof you can see on aerial as a closed way and tag it <code>building=yes</code>. That is enough. Use a more specific value when you know the use (<code>retail</code>, <code>commercial</code>, <code>industrial</code>, <code>garage</code>). Name the building if a sign does. The example here is way 45096266, Montage Mountain Ski Lodge, with city and state address tags already on it. Doors can wait. Do not throw one giant rectangle over the whole plaza. The lodge occupies ground, so it is a polygon. A node labeled "lodge" does not give anyone a footprint to walk around or to extrude in 3D.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="building" data-center="-75.66195,41.35075" data-zoom="18"></div>
<p class="guide-caption">OSM way 45096266, <code>building=yes</code>, name Montage Mountain Ski Lodge. The outline follows the roof.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 5. Roads</h2>
<p>Map the public drive in as an open way connected to the rest of the highway network. Montage's approach is <code>highway=tertiary</code> named Montage Mountain Road (way 10900232 in this view). Lanes through a lot are <code>highway=service</code>, with <code>service=parking_aisle</code> or <code>driveway</code> when that is what they are. Routers need a path they can follow. If the ski area has no incoming highway, navigation apps cannot send anyone to the lodge. Name the way if the street sign does, and keep it snapped to the next road at both ends.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="road" data-center="-75.66344,41.35118" data-zoom="17.2"></div>
<p class="guide-caption">OSM way 10900232, Montage Mountain Road. A highway is a line joined to the network, not an area.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 6. Parking</h2>
<p>Draw the lot as a closed way and tag it <code>amenity=parking</code>. Way 262152878 at Montage is a customer surface lot run by Montage Mountain Ski Area, <code>fee=no</code>, gravel. Split overflow lots if they are separate shapes on the ground. Add <code>access</code> and <code>fee</code> when you know them. The lot is the filled stall field; the aisles inside it stay lines from the previous step. Keep a lot outside <code>landuse=winter_sports</code> if it is not part of the ski operation. A parking node at the entrance is a last resort when you cannot see the stall field.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="parking" data-center="-75.6655,41.3509" data-zoom="16"></div>
<p class="guide-caption">OSM way 262152878, <code>amenity=parking</code>. Fill is the lot. Aisles stay service ways.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h2>Step 7. Lifts</h2>
<p>Each lift is one way along the cable from the lower terminal to the upper. Tag that way, not the pylons. Montage's Phoebe Snow is way 44670021: <code>aerialway=chair_lift</code>, <code>aerialway:occupancy=4</code>, <code>name=Phoebe Snow</code>. Learning carpets are <code>aerialway=magic_carpet</code>. Lift-count tools in <a href="../SkiLiftFacts.html">Ski Lift Facts</a> count those ways. Two parallel ways for one chair double the count. Draw uphill when you can, and stop at the terminals you can see on aerial, not halfway up the cable.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="lift" data-center="-75.66424,41.35483" data-zoom="15.2"></div>
<p class="guide-caption">OSM way 44670021, Phoebe Snow. One chair, one way, terminals at the ends.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 8. Draw downhill as a line</h2>
<h3>Tag a centerline</h3>
<p>Open the printed trail map next to the aerial and draw one open way down the middle of the snow. That way is the downhill piste. Tag it <code>piste:type=downhill</code>, plus <code>name</code> and <code>piste:difficulty</code> from the map you are holding. Smoke at Montage is way 44670024: expert, lit, <code>route=ski</code>. US greens are usually <code>novice</code> or <code>easy</code>, blues <code>intermediate</code>, blacks <code>advanced</code> or <code>expert</code>. Rate this hill against itself. Draw along the snow people ski, not along the chair cable. A centerline is what GPS tracks and connected-run tools walk. If you skip the line because you plan to draw a polygon later, those tools have nothing to follow. Untagged runs disappear from mix charts.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="trail" data-center="-75.66343,41.35485" data-zoom="15.4"></div>
<p class="guide-caption">OSM way 44670024, Smoke. One downhill piste as a centerline. Click the line for every tag.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h3>Snap the nodes where trails meet</h3>
<p>Where two downhill ways meet, they must share a node. Smoke (44670024) and Cannonball (44670028) both start at the same point on Montage. A two-meter gap looks fine on a screenshot and breaks every GPS track that tries to continue from one run onto the other. In iD, drag the end until the node highlights and joins. In JOSM, merge the end nodes. Split a trail only when the geometry itself changes, such as a named fork. Extra splits inflate trail counts. Unsigned backcountry lines stay out of the downhill inventory. This is still step 8: you are finishing the line network before you start drawing trail polygons.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="snap" data-center="-75.66315,41.35240" data-zoom="17.4"></div>
<p class="guide-caption">Smoke and Cannonball share the white node. Click a line for its tags, or the node for the join.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 9. Tag trail polygons</h2>
<h3>Close a piste as an area</h3>
<p>A wide face is a closed way with the same downhill tags plus <code>area=yes</code>. Boomer at Montage is way 419774830: <code>piste:type=downhill</code>, <code>piste:difficulty=expert</code>, <code>piste:grooming=mogul</code>, <code>natural=grassland</code>, <code>lit=yes</code>. White Lightning next to it is 419774825 with the same pattern. Trace the snow you can see between the trees, close the ring, and keep the centerline from step 8 if one already exists. The polygon is the skiable patch. The line is still the route. Do not delete the centerline because you drew an area. Apps that count trails and apps that shade acres are reading different objects.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="pistepoly" data-center="-75.6648,41.3549" data-zoom="15.8"></div>
<p class="guide-caption">Boomer and White Lightning as area pistes, plus the wood they share nodes with. Click a fill for tags.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h3>Snap polygons to each other and to the trees</h3>
<p>Adjacent trail polygons should share nodes along the common edge, as Smoke and Cannonball share an end. Boomer and White Lightning already do that on the expert face. Where the snow meets the trees, reuse the wood's nodes instead of drawing a second wiggly line a meter into the stand. Way 1219914249 is a <code>natural=wood</code> polygon that shares a long run of nodes with Boomer. Overlapping snow and forest at the same coordinates is a mess in every extract. A gap between them is a fake glade. In iD, merge along the edge until the vertices highlight. Do not cover the wood with <code>piste:type=downhill</code>.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="pistepoly-snap" data-center="-75.6649,41.3552" data-zoom="17.2"></div>
<p class="guide-caption">Boomer, White Lightning, and wood 1219914249. The green fill is trees, not a trail.</p>
</div>
</div>

<div class="guide-step guide-step--flip">
<div class="guide-copy">
<h2>Step 10. Other piste types, then upload</h2>
<h3>Cross country, terrain parks, and snowtubing</h3>
<p>Not every snow path is a downhill trail. Cross-country is <code>piste:type=nordic</code>. Montage has a short way named Nordic (44670035) tagged <code>piste:grooming=classic</code>, <code>piste:difficulty=intermediate</code>, and <code>route=ski</code>. Draw those as open ways along the track. A terrain park is <code>piste:type=snow_park</code>, usually an area. Snowtubing and sledding are <code>piste:type=sled</code>. Leave <code>piste:type=downhill</code> for alpine skiing and snowboarding on a marked run. If you tag a park or a tubing hill as downhill, mix charts, difficulty pies, and the playable slope all treat it as another black or green. Montage does not currently have a snow_park or sled object in OSM, so do not invent one here. Use those tags when the hill actually has the feature.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="nordic" data-center="-75.6518,41.3504" data-zoom="17.2"></div>
<p class="guide-caption">OSM way 44670035, named Nordic. <code>piste:type=nordic</code>, not downhill. Click the line for the tags.</p>
</div>
</div>

<div class="guide-step">
<div class="guide-copy">
<h3>Check, upload, wait</h3>
<p>Zoom out until the hill still reads as one <code>landuse=winter_sports</code> area, which on Montage is way 45096232. Zoom in on a carpet, a chair, a downhill line, an area piste against a wood, and the nordic track if the hill has one. Woods should sit beside trails, not under them. Line ends and polygon edges should share nodes. Buildings and parking should be closed ways. Then upload from iD with a changeset comment that names the resort, for example "Montage Mountain: lodge, parking, Phoebe Snow, Smoke, Boomer area." Later you and other mappers will search that comment.</p>
<p>The atlas is not live. We ingest Geofabrik extracts through the pipeline on <a href="../DownloadData.html">Download Data</a>. After the next build, the same objects show up on the <a href="../mainmap.html">map</a>, the facts tables, comparison, and the <a href="/playable/">ski game</a>. A rope-tow hill needs this same checklist, just fewer objects.</p>
</div>
<div class="guide-visual">
<div class="guide-map-host is-home" data-kind="review" data-center="-75.6587,41.3532" data-zoom="14"></div>
<p class="guide-caption">Same winter-sports polygon as step 2. If this still looks like one hill, you are ready to upload.</p>
</div>
</div>
