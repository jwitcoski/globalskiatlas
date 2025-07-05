/**
 * Style features based on properties
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Style object for Leaflet
 */
window.styleFeature = function(feature) {
    // Default style
    let style = {
        weight: 2,
        opacity: 1,
        color: '#000000',
        fillOpacity: 0.2,
        fillColor: '#cccccc'
    };
    
    // Check if feature has properties
    if (!feature.properties) return style;
    
    const props = feature.properties;
    
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
    } else if (props.sport === "skiing" || props.sport === "snowboard") {
        style.color = '#E87E8D';
        style.fillColor = '#E5B636';
        style.weight = 1.5;
        style.fillOpacity = 0.3;
    } else if (props.boundary === "protected_area" && props.leisure === "resort") {
        style.color = '#800080';
        style.weight = 2;
        style.fillOpacity = 0.1;
        style.dashArray = '5, 5';
    } else {
        // Set invisible style for features that slipped through filtering
        // but aren't relevant to the ski resort map
        style.opacity = 0;
        style.fillOpacity = 0;
        style.interactive = false;
    }
    
    return style;
}; 