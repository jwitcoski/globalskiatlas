// Wait for DOM to be fully loaded before initializing the map
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map and global variables
    const map = L.map('map-container').setView([40.0269, -79.2972], 13);
    let winterSportsFeatures = [];
    let lineAndPolygonFeatures = [];

    // Create and organize layers
    const layers = {
        base: {
            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map),
            aerial: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Imagery &copy; Esri',
                maxZoom: 19
            }),
            none: L.tileLayer('', {
                attribution: 'No Background',
                maxZoom: 19
            })
        },
        feature: {
            labels: L.layerGroup().addTo(map),
            features: L.layerGroup().addTo(map),
            buildings: L.layerGroup().addTo(map),
            parking: L.layerGroup().addTo(map),
            water: L.layerGroup().addTo(map),
            lifts: L.layerGroup().addTo(map),
            forest: L.layerGroup().addTo(map)
        }
    };

    // Configure layer controls
    const baseLayers = {
        "OpenStreetMap": layers.base.osm,
        "Aerial Imagery": layers.base.aerial,
        "No Background": layers.base.none
    };

    const overlays = {
        "Ski Trails & Boundaries": layers.feature.features,
        "Trail Labels": layers.feature.labels,
        "Buildings": layers.feature.buildings,
        "Parking": layers.feature.parking,
        "Water": layers.feature.water,
        "Lifts": layers.feature.lifts,
        "Forests": layers.feature.forest
    };

    // Add controls
    var layerControl = L.control.layers(baseLayers, overlays, {
        position: 'topright',
        collapsed: false
    }).addTo(map);

    // Apply styling fix to ensure controls are visible and add collapse functionality
    setTimeout(function() {
        // Fix checkbox visibility
        const controlCheckboxes = document.querySelectorAll('.leaflet-control-layers input');
        controlCheckboxes.forEach(checkbox => {
            checkbox.style.display = 'inline-block';
            checkbox.style.visibility = 'visible';
            checkbox.style.opacity = '1';
            checkbox.style.pointerEvents = 'auto';
        });
        
        // Make layer control collapsible
        const layerControl = document.querySelector('.leaflet-control-layers');
        if (layerControl) {
            // Add toggle button and label
            const collapseButton = document.createElement('div');
            collapseButton.className = 'layer-control-collapse';
            collapseButton.innerHTML = 'Ã—';
            collapseButton.title = 'Hide layer control';
            
            // Create layer title element
            const layerTitle = document.createElement('div');
            layerTitle.className = 'layer-control-title';
            layerTitle.innerHTML = 'Layers';
            
            // Add layer icon for collapsed state
            const layerIcon = document.createElement('div');
            layerIcon.className = 'layer-icon';
            
            // Attach toggle functionality
            collapseButton.addEventListener('click', function() {
                const isExpanded = !layerControl.classList.contains('layer-control-collapsed');
                
                if (isExpanded) {
                    layerControl.classList.add('layer-control-collapsed');
                    collapseButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
                    collapseButton.title = 'Show layer control';
                } else {
                    layerControl.classList.remove('layer-control-collapsed');
                    collapseButton.innerHTML = 'Ã—';
                    collapseButton.title = 'Hide layer control';
                }
            });
            
            // Add the elements to the control
            layerControl.appendChild(collapseButton);
            layerControl.appendChild(layerTitle);
            layerControl.appendChild(layerIcon);
        }
        
        // Make legend collapsible
        const mapLegend = document.querySelector('.map-legend');
        if (mapLegend) {
            // Add toggle button
            const legendCollapseButton = document.createElement('div');
            legendCollapseButton.className = 'legend-collapse-button';
            legendCollapseButton.innerHTML = 'Ã—';
            legendCollapseButton.title = 'Hide legend';
            
            // Attach toggle functionality
            legendCollapseButton.addEventListener('click', function() {
                const isExpanded = !mapLegend.classList.contains('legend-collapsed');
                
                if (isExpanded) {
                    mapLegend.classList.add('legend-collapsed');
                    legendCollapseButton.innerHTML = 'â˜°';
                    legendCollapseButton.title = 'Show legend';
                } else {
                    mapLegend.classList.remove('legend-collapsed');
                    legendCollapseButton.innerHTML = 'Ã—';
                    legendCollapseButton.title = 'Hide legend';
                }
            });
            
            mapLegend.prepend(legendCollapseButton);
        }
    }, 100);

    L.control.scale({position: 'bottomleft', imperial: true, metric: true}).addTo(map);

    // Add legend to map - make sure this is after map initialization but before data loading
    try {
        console.log("Adding legend to map");
        const legend = createLegend();
        map.addControl(legend);
        document.querySelector('.map-legend').style.zIndex = '900';
    } catch (error) {
        console.error("Error adding legend:", error);
    }

    /**
     * Creates forest triangle patterns with density based on area size
     * @param {Object} feature - GeoJSON feature
     * @returns {Array} Array of tree markers
     */
    function createForestTriangles(feature) {
        // Get feature bounds
        const bounds = L.geoJSON(feature).getBounds();
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        
        // Calculate area
        const width = northEast.lng - southWest.lng;
        const height = northEast.lat - southWest.lat;
        const area = width * height;
        
        // Determine number of trees based on area
        let numTrees;
        if (area > 0.01) {
            const baseDensityLarge = 200;
            numTrees = Math.min(2000, Math.max(200, Math.floor(baseDensityLarge * Math.pow(area, 0.6))));
            console.log(`LARGE Forest area: ${area.toFixed(6)}, Trees: ${numTrees}`);
        } else {
            const baseDensity = 0.0005;
            const minTrees = 20;
            const maxTrees = 750;
            const scaleFactor = Math.sqrt(area) * 200;
            numTrees = Math.max(minTrees, Math.min(maxTrees, Math.floor(scaleFactor * baseDensity)));
            //console.log(`Regular Forest area: ${area.toFixed(6)}, Trees: ${numTrees}`);
        }
        
        // Create tree markers using grid system for better distribution
        const treeMarkers = [];
        const polygon = turf.feature(feature.geometry);
        const maxAttempts = numTrees * 3;
        let attempts = 0;
        
        // Setup grid for distribution
        const gridSize = Math.ceil(Math.sqrt(numTrees * 1.5));
        const cellWidth = width / gridSize;
        const cellHeight = height / gridSize;
        const filledCells = new Set();
        
        // Tree icon template
        const createTreeIcon = (size = 10) => {
            return L.divIcon({
                className: 'tree-icon',
                html: `<svg width="${size}" height="${size}" viewBox="0 0 10 10">
                        <path d="M5,0 L0,10 L10,10 Z" fill="rgba(84, 176, 74, 0.2)" stroke="rgba(1, 50, 32, 0.2)" stroke-width="0.5"/>
                      </svg>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            });
        };
        
        while (treeMarkers.length < numTrees && attempts < maxAttempts) {
            attempts++;
            
            // Try to find an empty cell first
            let cellX, cellY, cellKey;
            let maxCellTries = 5;
            const useCellPlacement = filledCells.size < gridSize * gridSize * 0.75;
            
            if (useCellPlacement) {
                do {
                    cellX = Math.floor(Math.random() * gridSize);
                    cellY = Math.floor(Math.random() * gridSize);
                    cellKey = `${cellX}-${cellY}`;
                    maxCellTries--;
                } while (filledCells.has(cellKey) && maxCellTries > 0);
                
                if (maxCellTries > 0) {
                    filledCells.add(cellKey);
                    
                    // Place tree within the cell
                    const cellLng = southWest.lng + cellX * cellWidth + Math.random() * cellWidth;
                    const cellLat = southWest.lat + cellY * cellHeight + Math.random() * cellHeight;
                    
                    try {
                        const point = turf.point([cellLng, cellLat]);
                        if (turf.booleanPointInPolygon(point, polygon)) {
                            const treeMarker = L.marker([cellLat, cellLng], {
                                icon: createTreeIcon(),
                                interactive: false
                            });
                            treeMarkers.push(treeMarker);
                        }
                    } catch(e) {
                        continue;
                    }
                }
            } else {
                // Random placement as fallback
                const lng = southWest.lng + Math.random() * width;
                const lat = southWest.lat + Math.random() * height;
                
                try {
                    const point = turf.point([lng, lat]);
                    if (turf.booleanPointInPolygon(point, polygon)) {
                        const treeMarker = L.marker([lat, lng], {
                            icon: createTreeIcon(),
                            interactive: false
                        });
                        treeMarkers.push(treeMarker);
                    }
                } catch(e) {
                    continue;
                }
            }
        }
        
        //console.log(`Placed ${treeMarkers.length} trees for forest area: ${area.toFixed(6)}`);
        return treeMarkers;
    }

    /**
     * Style features based on properties
     * @param {Object} feature - GeoJSON feature
     * @returns {Object} Style object for Leaflet
     */
    function styleFeature(feature) {
        // Default style
        let style = {
            weight: 2,
            opacity: 1,
            color: '#000000',
            fillOpacity: 0.2,
            fillColor: '#cccccc'
        };
        
        const props = feature.properties || {};
        
        // Apply specific styles based on feature type
        if (props.landuse === "winter_sports") {
            style.color = '#000000';
            style.weight = 2;
            style.fillOpacity = 0;
            style.dashArray = '10, 5';
        } else if (props.building) {
            style.color = '#a4b7bc';
            style.fillColor = '#a4b7bc';
            style.weight = 1;
            style.fillOpacity = 0.6;
        } else if (props.parking === "surface" || props.amenity === "parking") {
            style.color = '#c8533c';
            style.fillColor = '#c8533c';
            style.weight = 1;
            style.fillOpacity = 0.4;
        } else if (props.aerialway) {
            style.color = '#fc1a1a';
            style.weight = 0.26;
            style.opacity = 1;
        } else if (props.natural === "water" || props.water) {
            style.color = '#a5bfdd';
            style.fillColor = '#a5bfdd';
            style.fillOpacity = 0.5;
            style.weight = 0.5;
        } else if (props.natural === "wood" || props.landuse === "forest") {
            style.color = 'rgba(1, 50, 32, 0.5)';
            style.weight = 0.5;
            style.fillOpacity = 0.8;
        } else if (props["piste:type"]) {
            // Handle piste features
            const isPolygon = feature.geometry.type.includes("Polygon");
            
            if (props["piste:type"] === "snow_park" || props["piste:difficulty"] === "freeride") {
                style.color = '#ff7f00';
                style.fillColor = '#ff7f00';
                style.weight = isPolygon ? 0.5 : 3;
                style.opacity = isPolygon ? 0.3 : 1;
                style.fillOpacity = isPolygon ? 0.3 : 0;
            } else if (props["piste:type"] === "sleigh" || props["piste:type"] === "sled") {
                style.color = '#2200ff';
                style.fillColor = '#2200ff';
                style.weight = isPolygon ? 0.5 : 3;
                style.opacity = isPolygon ? 0.3 : 1;
                style.fillOpacity = isPolygon ? 0.3 : 0;
            } else {
                // Style based on difficulty
                switch(props["piste:difficulty"]) {
                    case "easy":
                    case "novice":
                        style.color = '#2F9A2F';
                        style.fillColor = '#2F9A2F';
                        break;
                    case "intermediate":
                        style.color = '#0769d2';
                        style.fillColor = '#0769d2';
                        break;
                    case "advanced":
                    case "expert":
                        style.color = '#000000';
                        style.fillColor = '#000000';
                        break;
                    default:
                        style.color = '#E87E8D';
                        style.fillColor = '#E87E8D';
                }
                style.weight = isPolygon ? 0.5 : 3;
                style.opacity = isPolygon ? 0.3 : 1;
                style.fillOpacity = isPolygon ? 0.3 : 0;
            }
        } else {
            // General boundary styling
            style.color = '#E87E8D';
            style.fillColor = '#E5B636';
            style.weight = 1.5;
            style.fillOpacity = 0.3;
        }
        
        return style;
    }

    /**
     * Add trail labels to the map
     */
    function addLabelsToMap() {
        layers.feature.labels.clearLayers();
        //console.log("Clearing and adding new labels");
        
        let labelCount = 0;
        
        lineAndPolygonFeatures.forEach(feature => {
            // Only process actual trails with names
            if (!feature.properties || 
                !feature.properties["piste:type"] || 
                !feature.properties.name || 
                feature.geometry.type.includes("Polygon")) {
                return;
            }
            
            // Validate piste type
            const pisteType = feature.properties["piste:type"];
            const validTypes = ['downhill', 'yes', 'nordic', 'connection', 'sleigh', 'sled', 'snow_park'];
            if (!validTypes.includes(pisteType)) return;
            
            try {
                // Extract coordinates from feature
                let coordinates = [];
                if (feature.geometry.type === "LineString") {
                    coordinates = feature.geometry.coordinates;
                } else if (feature.geometry.type === "MultiLineString") {
                    // Find longest segment
                    let maxLength = 0;
                    feature.geometry.coordinates.forEach(segment => {
                        if (segment.length > maxLength) {
                            maxLength = segment.length;
                            coordinates = segment;
                        }
                    });
                }
                
                if (coordinates.length === 0) return;
                
                // Get difficulty and prepare label
                const pisteDifficulty = feature.properties["piste:difficulty"] || "intermediate";
                const name = feature.properties.name;
                let difficultySymbol, difficultyColor;
                
                // Determine symbol and color
                switch (pisteDifficulty) {
                    case "easy":
                    case "novice":
                        difficultySymbol = "â—";  // Green circle
                        difficultyColor = "#2F9A2F";
                        break;
                    case "intermediate":
                        difficultySymbol = "â– ";  // Blue square
                        difficultyColor = "#0769d2";
                        break;
                    case "advanced":
                        difficultySymbol = "â—†";  // Black diamond
                        difficultyColor = "#000000";
                        break;
                    case "expert":
                        difficultySymbol = "â—†â—†"; // Double black diamond
                        difficultyColor = "#000000";
                        break;
                    case "freeride":
                        difficultySymbol = "â—†â—‡"; // Black+white diamond
                        difficultyColor = "#ff7f00";
                        break;
                    default:
                        difficultySymbol = "â– ";  // Default: blue square
                        difficultyColor = "#0769d2";
                }
                
                // Calculate label position and angle
                const middleIndex = Math.floor(coordinates.length / 2);
                const middlePoint = coordinates[middleIndex];
                
                let angle = 0;
                if (coordinates.length > 1) {
                    const prevPoint = coordinates[Math.max(0, middleIndex - 1)];
                    const nextPoint = coordinates[Math.min(coordinates.length - 1, middleIndex + 1)];
                    
                    angle = Math.atan2(
                        nextPoint[1] - prevPoint[1],
                        nextPoint[0] - prevPoint[0]
                    ) * 180 / Math.PI;
                    
                    // Make text readable left-to-right
                    if (angle > 90 || angle < -90) {
                        angle += 180;
                    }
                }
                
                // Add gladed symbol if needed
                const gladedSymbol = feature.properties.gladed === "yes" ? "â–² " : "";
                const labelText = `${difficultySymbol} ${gladedSymbol}${name}`;
                
                // Create label
                const labelIcon = L.divIcon({
                    className: `piste-label piste-${pisteDifficulty}`,
                    html: `<div style="
                        position: relative;
                        white-space: nowrap;
                        transform: rotate(${angle}deg);
                        transform-origin: center;
                        background: transparent;
                        padding: 2px 4px;
                        line-height: 1;
                    ">
                        <span style="
                            font-family: Arial, sans-serif;
                            font-weight: bold;
                            color: ${difficultyColor};
                            font-size: 12px;
                            text-shadow: 
                                1px 1px 0 white,
                                -1px 1px 0 white,
                                1px -1px 0 white,
                                -1px -1px 0 white,
                                0px 1px 0 white,
                                0px -1px 0 white,
                                1px 0px 0 white,
                                -1px 0px 0 white;
                            paint-order: stroke fill;
                            stroke: white;
                            stroke-width: 3px;
                        ">${labelText}</span>
                    </div>`,
                    iconSize: [150, 30],
                    iconAnchor: [75, 15]
                });
                
                // Add marker
                const label = L.marker([middlePoint[1], middlePoint[0]], {
                    icon: labelIcon,
                    interactive: false,
                    zIndexOffset: 1000
                });
                
                layers.feature.labels.addLayer(label);
                labelCount++;
            } catch (error) {
                console.error("Error adding label:", error, feature);
            }
        });
        
        //console.log(`Added ${labelCount} labels to the map`);
    }

    /**
     * Add lift stations at both ends of lift lines
     */
    function addLiftStations(liftFeatures) {
        liftFeatures.forEach(feature => {
            if (feature.geometry.type === "LineString") {
                const coordinates = feature.geometry.coordinates;
                addLiftMarkers(coordinates[0], coordinates[coordinates.length - 1]);
            } else if (feature.geometry.type === "MultiLineString") {
                feature.geometry.coordinates.forEach(line => {
                    addLiftMarkers(line[0], line[line.length - 1]);
                });
            }
        });
        
        function addLiftMarkers(startPoint, endPoint) {
            const createLiftMarker = (point) => {
                return L.circleMarker([point[1], point[0]], {
                    radius: 5,
                    color: '#000',
                    fillColor: '#fc1a1a',
                    fillOpacity: 1,
                    weight: 1
                });
            };
            
            layers.feature.lifts.addLayer(createLiftMarker(startPoint));
            layers.feature.lifts.addLayer(createLiftMarker(endPoint));
        }
    }

    /**
     * Add ski area boundary labels
     */
    function addBoundaryLabels() {
        if (!winterSportsFeatures || winterSportsFeatures.length === 0) {
            console.log("No winter sports features available for boundary labels");
            return;
        }
        
        // Find winter sports areas with names
        const namedWinterSportsAreas = winterSportsFeatures.filter(f => 
            f.properties && f.properties.name && 
            (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
        );
        
        namedWinterSportsAreas.forEach(feature => {
            try {
                // Get feature bounds and name
                const featureLayer = L.geoJSON(feature);
                const bounds = featureLayer.getBounds();
                const areaName = feature.properties.name;
                
                // Extract coordinates for boundary
                let coordinates = [];
                
                if (feature.geometry.type === "Polygon") {
                    coordinates = feature.geometry.coordinates[0];
                } else if (feature.geometry.type === "MultiPolygon") {
                    // Find largest polygon
                    let maxArea = 0;
                    let largestPolygon = null;
                    
                    feature.geometry.coordinates.forEach(polygon => {
                        const outerRing = polygon[0];
                        
                        // Approximate area calculation
                        let area = 0;
                        for (let i = 0; i < outerRing.length - 1; i++) {
                            const p1 = outerRing[i];
                            const p2 = outerRing[i + 1];
                            area += Math.abs((p2[0] - p1[0]) * (p2[1] + p1[1]));
                        }
                        
                        if (area > maxArea) {
                            maxArea = area;
                            largestPolygon = outerRing;
                        }
                    });
                    
                    coordinates = largestPolygon;
                }
                
                if (!coordinates || coordinates.length === 0) return;
                
                // Find top point for label placement
                let maxLat = -90;
                let maxLatIndex = 0;
                
                coordinates.forEach((coord, index) => {
                    if (coord[1] > maxLat) {
                        maxLat = coord[1];
                        maxLatIndex = index;
                    }
                });
                
                // Get segment around top point
                const segmentLength = 30;
                const startIndex = Math.max(0, maxLatIndex - segmentLength);
                const endIndex = Math.min(coordinates.length - 1, maxLatIndex + segmentLength);
                const segmentCoords = coordinates.slice(startIndex, endIndex + 1);
                
                // Create SVG path
                let svgPath = "M ";
                segmentCoords.forEach((coord, index) => {
                    svgPath += `${coord[0]},${coord[1]} `;
                    if (index < segmentCoords.length - 1) {
                        svgPath += "L ";
                    }
                });
                
                // Create unique ID for path
                const pathId = `boundary-path-${feature.id || Math.random().toString(36).substring(2, 9)}`;
                
                // Create label
                const labelIcon = L.divIcon({
                    className: 'boundary-label',
                    html: `
                        <svg width="${bounds.getEast() - bounds.getWest()}px" height="${bounds.getNorth() - bounds.getSouth()}px" 
                             viewBox="${bounds.getWest()} ${bounds.getSouth()} ${bounds.getEast() - bounds.getWest()} ${bounds.getNorth() - bounds.getSouth()}">
                            <defs>
                                <path id="${pathId}" d="${svgPath}" />
                            </defs>
                            <text>
                                <textPath href="#${pathId}" 
                                          startOffset="50%" text-anchor="middle" 
                                          font-family="Arial, sans-serif" font-weight="bold" 
                                          font-size="14px" fill="black" stroke="white" stroke-width="2px" paint-order="stroke">
                                    ${areaName}
                                </textPath>
                            </text>
                        </svg>
                    `,
                    iconSize: [bounds.getEast() - bounds.getWest(), bounds.getNorth() - bounds.getSouth()],
                    iconAnchor: [0, 0]
                });
                
                // Add to map
                const label = L.marker([bounds.getSouth(), bounds.getWest()], {
                    icon: labelIcon,
                    interactive: false
                });
                
                layers.feature.labels.addLayer(label);
            } catch (error) {
                console.error("Error adding boundary label:", error);
            }
        });
    }

    // Load resort data
    d3.json("https://winter-sports-geojson.s3.us-east-1.amazonaws.com/seven-springs-mountain-resort.geojson")
        .then(data => {
            // Filter relevant features
            const allRelevantFeatures = data.features.filter(f => {
                if (!f.properties) return false;
                const p = f.properties;
                
                return p.landuse === "winter_sports" || 
                       p["piste:type"] || 
                       p.natural === "water" || p.natural === "wood" ||
                       p.sport === "skiing" || p.sport === "snowboard" ||
                       p.landuse === "forest" ||
                       p.building ||
                       p.parking === "surface" || p.amenity === "parking" ||
                       p.water || 
                       p.aerialway ||
                       (p.boundary === "protected_area" && p.leisure === "resort");
            });
            
            // Organize features by category
            lineAndPolygonFeatures = allRelevantFeatures.filter(f => 
                f.geometry.type.includes("LineString") || f.geometry.type.includes("Polygon")
            );
            
            winterSportsFeatures = allRelevantFeatures.filter(f => 
                f.properties.landuse === "winter_sports"
            );
            
            const categorizedFeatures = {
                building: allRelevantFeatures.filter(f => f.properties.building),
                parking: allRelevantFeatures.filter(f => 
                    (f.properties.parking === "surface" || f.properties.amenity === "parking") &&
                    !['Point', 'MultiPoint'].includes(f.geometry.type)
                ),
                water: allRelevantFeatures.filter(f => 
                    f.properties.natural === "water" || f.properties.water
                ),
                lift: allRelevantFeatures.filter(f => 
                    f.properties.aerialway &&
                    !['Point', 'MultiPoint'].includes(f.geometry.type)
                ),
                forest: allRelevantFeatures.filter(f => 
                    (f.properties.natural === "wood" || f.properties.landuse === "forest") &&
                    ["Polygon", "MultiPolygon"].includes(f.geometry.type)
                ),
                gladed: allRelevantFeatures.filter(f => 
                    f.properties.gladed === "yes" &&
                    ["Polygon", "MultiPolygon"].includes(f.geometry.type)
                )
            };
            
            // Process forest areas
            categorizedFeatures.forest.forEach(feature => {
                // Add forest boundary
                L.geoJSON(feature, {
                    style: {
                        color: 'rgba(1, 50, 32, 0.5)',
                        weight: 0.5,
                        fillOpacity: 0.1,
                        fillColor: '#54b04a'
                    },
                    onEachFeature: (feature, layer) => {
                        const name = feature.properties?.name ? feature.properties.name : "Forest Area";
                        layer.bindPopup(`<strong>${name}</strong><br>Forest Area`);
                    }
                }).addTo(layers.feature.forest);
                
                // Add tree markers
                createForestTriangles(feature).forEach(marker => 
                    marker.addTo(layers.feature.forest)
                );
            });
            
            // Process gladed areas (simplified version of createForestTriangles)
            categorizedFeatures.gladed.forEach(feature => {
                // Calculate area
                const bounds = L.geoJSON(feature).getBounds();
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                const area = (ne.lng - sw.lng) * (ne.lat - sw.lat);
                
                // Use lower density for gladed areas
                const baseDensity = 0.00006;
                const numTrees = Math.max(10, Math.min(200, 
                    Math.floor(Math.sqrt(area) * 100 * baseDensity)
                ));
                
                console.log(`Gladed area: ${area.toFixed(6)}, Trees: ${numTrees}`);
                
                // Create sparse tree pattern
                const polygon = turf.feature(feature.geometry);
                const treeMarkers = [];
                let attempts = 0;
                
                while (treeMarkers.length < numTrees && attempts < numTrees * 5) {
                    attempts++;
                    const lng = sw.lng + Math.random() * (ne.lng - sw.lng);
                    const lat = sw.lat + Math.random() * (ne.lat - sw.lat);
                    
                    try {
                        if (turf.booleanPointInPolygon(turf.point([lng, lat]), polygon)) {
                            const treeIcon = L.divIcon({
                                className: 'tree-icon',
                                html: `<svg width="8" height="8" viewBox="0 0 10 10">
                                        <path d="M5,0 L0,10 L10,10 Z" fill="rgba(84, 176, 74, 0.2)" 
                                          stroke="rgba(1, 50, 32, 0.2)" stroke-width="0.5"/>
                                      </svg>`,
                                iconSize: [8, 8],
                                iconAnchor: [4, 4]
                            });
                            
                            treeMarkers.push(L.marker([lat, lng], {
                                icon: treeIcon,
                                interactive: false
                            }).addTo(layers.feature.forest));
                        }
                    } catch(e) {
                        continue;
                    }
                }
            });
            
            // Add features excluding forests and water (handled separately)
            const nonForestFeatures = lineAndPolygonFeatures.filter(f => 
                !(f.properties?.natural === "wood" || 
                  f.properties?.landuse === "forest" ||
                  f.properties?.natural === "water" || 
                  f.properties?.water)
            );
            
            L.geoJSON(nonForestFeatures, {
                style: styleFeature,
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        let content = '<div class="feature-popup">';
                        
                        if (feature.properties.name) {
                            content += `<strong>${feature.properties.name}</strong><br>`;
                        }
                        
                        // Add interesting properties
                        ['piste:type', 'piste:difficulty', 'piste:grooming', 
                         'sport', 'landuse', 'natural', 'gladed'].forEach(prop => {
                            if (feature.properties[prop]) {
                                content += `${prop}: ${feature.properties[prop]}<br>`;
                            }
                        });
                        
                        content += '</div>';
                        layer.bindPopup(content);
                    }
                }
            }).addTo(layers.feature.features);
            
            // Add category-specific features to their layers
            function addCategoryToLayer(features, layer, popupPrefix) {
                L.geoJSON(features, {
                    style: styleFeature,
                    onEachFeature: (feature, layer) => {
                        const name = feature.properties?.name;
                        layer.bindPopup(name ? 
                            `<strong>${name}</strong><br>${popupPrefix}` : 
                            popupPrefix);
                    }
                }).addTo(layer);
            }
            
            addCategoryToLayer(categorizedFeatures.building, layers.feature.buildings, "Building");
            addCategoryToLayer(categorizedFeatures.parking, layers.feature.parking, "Parking Area");
            addCategoryToLayer(categorizedFeatures.water, layers.feature.water, "Water Feature");
            addCategoryToLayer(categorizedFeatures.lift, layers.feature.lifts, "Ski Lift");
            
            // Add lift stations
            addLiftStations(categorizedFeatures.lift);
            
            // Set initial map view
            if (winterSportsFeatures.length > 0) {
                map.fitBounds(L.geoJSON(winterSportsFeatures).getBounds(), {
                    padding: [50, 50],
                    maxZoom: 16
                });
            } else {
                map.fitBounds(L.geoJSON(lineAndPolygonFeatures).getBounds(), {
                    padding: [50, 50]
                });
            }
            
            // Add labels
            addLabelsToMap();
            addBoundaryLabels();
            
            // Update labels on map movement
            map.on('zoomend moveend', function() {
                addLabelsToMap();
                addBoundaryLabels();
            });
            
            // Apply legend styling after everything else
            setTimeout(() => {
                try {
                    console.log("Applying legend styling");
                    applyLegendStyling();
                } catch (error) {
                    console.error("Error styling legend:", error);
                }
            }, 500); // Short delay to ensure DOM elements are ready

            // Extract winter sports area name and set the page title
            const winterSportsAreas = data.features.filter(f => 
                f.properties && f.properties.landuse === "winter_sports" && f.properties.name
            );
            
            if (winterSportsAreas.length > 0) {
                // Use the name of the first winter sports area with a name
                const resortName = winterSportsAreas[0].properties.name;
                document.title = `${resortName} Boundary`;
                console.log(`Set page title to: ${document.title}`);
            }

            // After processing, initialize statistics
            if (window.initResortStatistics) {
                window.initResortStatistics(data);
            }

            // Make sure to update statistics if the data is already available
            window.addEventListener('load', function() {
                setTimeout(function() {
                    if (window.initResortStatistics && window.resortStats && window.resortStats.name) {
                        updateStatisticsSection();
                    }
                }, 1000); // Add a short delay to ensure everything is processed
            });
        })
        .catch(error => {
            console.error("Error loading data:", error);
        });
});