/**
 * Map integration file that connects all the modular map style components
 */
window.initMapStyles = function(map) {
    if (!map) {
        console.error('Map not initialized for style integration');
        return;
    }
    
    // Define reusable layer groups for different features
    const mapLayers = {
        labels: L.layerGroup().addTo(map),
        features: L.layerGroup().addTo(map),
        buildings: L.layerGroup().addTo(map),
        parking: L.layerGroup().addTo(map),
        water: L.layerGroup().addTo(map),
        lifts: L.layerGroup().addTo(map),
        forest: L.layerGroup().addTo(map),
        boundaries: L.layerGroup().addTo(map)
    };
    
    // Helper function to process GeoJSON data and apply styles
    function processResortDataWithStyles(data) {
        if (!data || !data.features) {
            console.error('Invalid GeoJSON data structure');
            return;
        }
        
        // Clear any existing layers
        Object.values(mapLayers).forEach(layer => layer.clearLayers());
        
        // Filter and organize features by type
        const categorizedFeatures = {
            winterSports: data.features.filter(f => 
                f.properties && f.properties.landuse === "winter_sports"
            ),
            lineAndPolygon: data.features.filter(f => 
                f.geometry && (f.geometry.type.includes("LineString") || f.geometry.type.includes("Polygon"))
            ),
            buildings: data.features.filter(f => 
                f.properties && f.properties.building
            ),
            parking: data.features.filter(f => 
                f.properties && (f.properties.parking === "surface" || f.properties.amenity === "parking") &&
                !['Point', 'MultiPoint'].includes(f.geometry.type)
            ),
            water: data.features.filter(f => 
                f.properties && (f.properties.natural === "water" || f.properties.water)
            ),
            lift: data.features.filter(f => 
                f.properties && f.properties.aerialway &&
                !['Point', 'MultiPoint'].includes(f.geometry.type)
            ),
            forest: data.features.filter(f => 
                f.properties && (f.properties.natural === "wood" || f.properties.landuse === "forest") &&
                ["Polygon", "MultiPolygon"].includes(f.geometry.type)
            ),
            gladed: data.features.filter(f => 
                f.properties && f.properties.gladed === "yes" &&
                ["Polygon", "MultiPolygon"].includes(f.geometry.type)
            )
        };
        
        // Process forest areas with tree markers
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
            }).addTo(mapLayers.forest);
            
            // Add tree markers using dedicated function
            if (window.createForestTriangles) {
                window.createForestTriangles(feature).forEach(marker => 
                    marker.addTo(mapLayers.forest)
                );
            }
        });
        
        // Process gladed areas (simplified version of createForestTriangles)
        categorizedFeatures.gladed.forEach(feature => {
            // Logic similar to the createForestTriangles but simplified for gladed areas
            // This would create sparser tree patterns for gladed ski areas
            
            // Calculate area
            const bounds = L.geoJSON(feature).getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const area = (ne.lng - sw.lng) * (ne.lat - sw.lat);
            
            // Lower density for gladed areas
            const baseDensity = 0.00006;
            const numTrees = Math.max(10, Math.min(200, 
                Math.floor(Math.sqrt(area) * 100 * baseDensity)
            ));
            
            console.log(`Gladed area: ${area.toFixed(6)}, Trees: ${numTrees}`);
            
            // Create sparse tree pattern
            const polygon = turf.feature(feature.geometry);
            let attempts = 0;
            
            while (attempts < numTrees * 5) {
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
                        
                        L.marker([lat, lng], {
                            icon: treeIcon,
                            interactive: false
                        }).addTo(mapLayers.forest);
                    }
                } catch(e) {
                    continue;
                }
            }
        });
        
        // Add non-forest features using style function
        const nonForestFeatures = categorizedFeatures.lineAndPolygon.filter(f => 
            !(f.properties?.natural === "wood" || 
              f.properties?.landuse === "forest" ||
              f.properties?.natural === "water" || 
              f.properties?.water)
        );
        
        // Use styleFeature function if available
        if (window.styleFeature) {
            L.geoJSON(nonForestFeatures, {
                style: window.styleFeature,
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
            }).addTo(mapLayers.features);
        }
        
        // Add category-specific features to their layers
        function addCategoryToLayer(features, layer, popupPrefix) {
            if (window.styleFeature) {
                L.geoJSON(features, {
                    style: window.styleFeature,
                    onEachFeature: (feature, layer) => {
                        const name = feature.properties?.name;
                        layer.bindPopup(name ? 
                            `<strong>${name}</strong><br>${popupPrefix}` : 
                            popupPrefix);
                    }
                }).addTo(layer);
            }
        }
        
        // Add different feature types to their respective layers
        addCategoryToLayer(categorizedFeatures.buildings, mapLayers.buildings, "Building");
        addCategoryToLayer(categorizedFeatures.parking, mapLayers.parking, "Parking Area");
        addCategoryToLayer(categorizedFeatures.water, mapLayers.water, "Water Feature");
        addCategoryToLayer(categorizedFeatures.lift, mapLayers.lifts, "Ski Lift");
        
        // Add lift stations using dedicated function
        if (window.addLiftStations) {
            window.addLiftStations(categorizedFeatures.lift, mapLayers.lifts);
        }
        
        // Add labels to the map
        if (window.addTrailLabels) {
            window.addTrailLabels(categorizedFeatures.lineAndPolygon, mapLayers.labels);
        }
        
        // Add boundary labels
        if (window.addBoundaryLabels) {
            window.addBoundaryLabels(categorizedFeatures.winterSports, mapLayers.labels);
        }
        
        // Return layers and categorized features for further processing
        return {
            layers: mapLayers,
            features: categorizedFeatures
        };
    }
    
    // Expose function to the global scope
    window.processResortDataWithStyles = processResortDataWithStyles;
    
    return {
        layers: mapLayers,
        processData: processResortDataWithStyles
    };
}; 