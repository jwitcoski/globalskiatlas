/**
 * Add ski area boundary labels
 * @param {Array} boundaryFeatures - Array of boundary features
 * @param {Object} layerGroup - Leaflet layer group to add labels to
 */
window.addBoundaryLabels = function(boundaryFeatures, layerGroup) {
    if (!boundaryFeatures || boundaryFeatures.length === 0 || !layerGroup) {
        console.log("No winter sports features available for boundary labels");
        return;
    }
    
    // Find winter sports areas with names
    const namedWinterSportsAreas = boundaryFeatures.filter(f => 
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
                                      class="boundary-label-text">
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
            
            layerGroup.addLayer(label);
        } catch (error) {
            console.error("Error adding boundary label:", error);
        }
    });
}; 