/**
 * Add lift stations at both ends of lift lines
 * @param {Array} liftFeatures - Array of lift features 
 * @param {Object} layerGroup - Leaflet layer group to add stations to
 */
window.addLiftStations = function(liftFeatures, layerGroup) {
    if (!liftFeatures || !layerGroup) return;
    
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
        
        layerGroup.addLayer(createLiftMarker(startPoint));
        layerGroup.addLayer(createLiftMarker(endPoint));
    }
}; 