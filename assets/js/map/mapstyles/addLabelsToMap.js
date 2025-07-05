/**
 * Add trail labels to the map
 * @param {Array} lineFeatures - Array of features for generating labels
 * @param {Object} layerGroup - Leaflet layer group to add labels to
 */
window.addTrailLabels = function(lineFeatures, layerGroup) {
    if (!lineFeatures || !layerGroup) return;
    
    // Clear existing labels
    layerGroup.clearLayers();
    
    let labelCount = 0;
    
    lineFeatures.forEach(feature => {
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
            
            // Determine symbol and color
            let difficultySymbol, difficultyColor;
            switch (pisteDifficulty) {
                case "easy":
                case "novice":
                    difficultySymbol = "●";  // Green circle
                    difficultyColor = "#2F9A2F";
                    break;
                case "intermediate":
                    difficultySymbol = "■";  // Blue square
                    difficultyColor = "#0769d2";
                    break;
                case "advanced":
                    difficultySymbol = "◆";  // Black diamond
                    difficultyColor = "#000000";
                    break;
                case "expert":
                    difficultySymbol = "◆◆"; // Double black diamond
                    difficultyColor = "#000000";
                    break;
                case "freeride":
                    difficultySymbol = "◆◇"; // Black+white diamond
                    difficultyColor = "#ff7f00";
                    break;
                default:
                    difficultySymbol = "■";  // Default: blue square
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
            const gladedSymbol = feature.properties.gladed === "yes" ? "▲ " : "";
            const labelText = `${difficultySymbol} ${gladedSymbol}${name}`;
            
            // Create label with proper styling for white background effect
            const labelIcon = L.divIcon({
                className: `trail-label piste-${pisteDifficulty}`,
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
            
            layerGroup.addLayer(label);
            labelCount++;
        } catch (error) {
            console.error("Error adding label:", error, feature);
        }
    });
    
    console.log(`Added ${labelCount} trail labels to the map`);
}; 