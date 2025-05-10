/**
 * Creates forest triangle patterns with density based on area size
 * @param {Object} feature - GeoJSON feature
 * @returns {Array} Array of tree markers
 */
window.createForestTriangles = function(feature) {
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
    
    return treeMarkers;
}; 