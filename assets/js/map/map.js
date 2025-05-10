// Global variables for map data
let map, geojsonLayer, resortBoundaryLayer, liftsLayer, trailsLayer, poiLayer;
let resortData = null;
let currentResortId = null;
let mapStyleHandler = null; // Store the map style handler

// Entry point function called after all scripts are loaded
window.initMapWithResort = function(resortId) {
    console.log('Initializing map with resort:', resortId);
    initMap();
    loadResortData(resortId);
};

// Initialize the map
function initMap() {
    // Check if map is already initialized
    if (map) {
        console.log('Map already initialized');
        return;
    }
    
    // Set up the Leaflet map with initial view (will be adjusted later)
    map = L.map('map-container', {
        center: [40.0583, -79.0850], // Default center - will be updated based on resort data
        zoom: 14, // Default zoom - will be updated based on resort data
        maxZoom: 18,
        minZoom: 10,
        zoomControl: false // We'll add custom zoom controls
    });
    
    // Add custom zoom control
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    
    // Add base map tile layer (CartoDB Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Initialize map styles after the map is created
    if (window.initMapStyles) {
        mapStyleHandler = window.initMapStyles(map);
    }
    
    // Add the legend to the map
    if (window.createLegend) {
        window.createLegend().addTo(map);
    }
    
    console.log('Map initialized successfully');
}

// Load resort data
function loadResortData(resortId) {
    if (!resortId) return;
    
    currentResortId = resortId;
    console.log('Loading resort data for:', resortId);
    
    // Show loading indicator
    document.getElementById('map-container').classList.add('loading');
    
    // Load resort data from S3
    d3.json(`https://winter-sports-geojson.s3.us-east-1.amazonaws.com/${resortId}.geojson`)
        .then(data => {
            console.log('Resort data loaded successfully');
            window.resortData = data; // Make it globally available
            resortData = data;
            
            // Process the resort data
            processResortData(data);
            
            // Fit map to the resort boundary
            fitMapToResortBoundary(data);
            
            // Update resort statistics if the function is available
            if (typeof window.initResortStatistics === 'function') {
                window.initResortStatistics(data);
            }
            
            document.getElementById('map-container').classList.remove('loading');
        })
        .catch(error => {
            console.error("Error loading resort data:", error);
            document.getElementById('map-container').classList.remove('loading');
            alert("Failed to load resort data. Please try again later.");
        });
}

// Fit map to resort boundary
function fitMapToResortBoundary(data) {
    if (!data || !data.features) {
        console.warn('No features found in resort data');
        return;
    }
    
    try {
        // Filter to only get winter_sports features for setting the bounds
        const winterSportsFeatures = data.features.filter(f => 
            f.properties && f.properties.landuse === "winter_sports"
        );
        
        // Use winter sports features if available, otherwise fall back to all features
        let boundaryLayer;
        
        if (winterSportsFeatures.length > 0) {
            console.log('Fitting map to winter sports boundaries');
            boundaryLayer = L.geoJSON(winterSportsFeatures);
        } else {
            console.log('No winter sports boundaries found, using all features');
            boundaryLayer = L.geoJSON(data);
        }
        
        // Get the bounds
        const bounds = boundaryLayer.getBounds();
        
        // Check if bounds are valid (not empty)
        if (bounds.isValid()) {
            // Fit the map to the bounds with some padding
            map.fitBounds(bounds, {
                padding: [50, 50], // Add padding (in pixels)
                maxZoom: 16        // Don't zoom in too far
            });
        } else {
            console.warn('Invalid bounds for resort data');
        }
    } catch (error) {
        console.error('Error fitting map to resort boundary:', error);
    }
}

// Process resort data
function processResortData(data) {
    console.log('Processing resort data');
    
    if (!data || !data.features) {
        console.error('Invalid GeoJSON data structure');
        return;
    }
    
    // Use the new modular style system if available
    if (mapStyleHandler && mapStyleHandler.processData) {
        const result = mapStyleHandler.processData(data);
        
        // Create layer controls (optional)
        createLayerControls(result.layers);
        
        // Update any additional UI elements based on the data
        updateResortInfo(data);
        
    } else {
        console.error('Map style handler not initialized!');
    }
}

// Create layer controls for toggling different map features
function createLayerControls(layers) {
    // Remove any existing controls
    const existingControl = document.querySelector('.leaflet-control-layers');
    if (existingControl) {
        existingControl.remove();
    }
    
    // Define base layers
    const baseLayers = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map),
        "Aerial": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Imagery &copy; Esri',
            maxZoom: 19
        }),
        "None": L.tileLayer('', {
            attribution: 'No Background',
            maxZoom: 19
        })
    };
    
    // Define overlay layers
    const overlays = {
        "Ski Trails & Boundaries": layers.features,
        "Labels": layers.labels,
        "Buildings": layers.buildings,
        "Parking": layers.parking,
        "Water": layers.water,
        "Lifts": layers.lifts,
        "Forests": layers.forest
    };
    
    // Add layer control
    const layerControl = L.control.layers(baseLayers, overlays, {
        position: 'topright',
        collapsed: false
    }).addTo(map);
    
    // Apply styling to the layer control after a short delay to ensure it's in the DOM
    setTimeout(function() {
        // Apply layer control styling if the function exists
        if (window.applyLegendStyling) {
            window.applyLegendStyling();
        }
        
        // Make the control collapsible
        const controlContainer = document.querySelector('.leaflet-control-layers');
        if (controlContainer) {
            // Add toggle button
            const collapseButton = document.createElement('div');
            collapseButton.className = 'layer-control-collapse';
            collapseButton.innerHTML = '×';
            collapseButton.title = 'Hide layer control';
            
            // Add title
            const layerTitle = document.createElement('div');
            layerTitle.className = 'layer-control-title';
            layerTitle.innerHTML = 'Layers';
            
            // Add layer icon for collapsed state
            const layerIcon = document.createElement('div');
            layerIcon.className = 'layer-icon';
            
            // Attach toggle functionality
            collapseButton.addEventListener('click', function() {
                const isExpanded = !controlContainer.classList.contains('layer-control-collapsed');
                
                if (isExpanded) {
                    controlContainer.classList.add('layer-control-collapsed');
                    collapseButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
                    collapseButton.title = 'Show layer control';
                } else {
                    controlContainer.classList.remove('layer-control-collapsed');
                    collapseButton.innerHTML = '×';
                    collapseButton.title = 'Hide layer control';
                }
            });
            
            // Add elements to the control
            controlContainer.appendChild(collapseButton);
            controlContainer.appendChild(layerTitle);
            controlContainer.appendChild(layerIcon);
        }
    }, 200);
}

// Update resort info in the UI
function updateResortInfo(data) {
    // Extract resort name from the data
    const resortFeatures = data.features.filter(f => 
        f.properties && f.properties.landuse === "winter_sports" && f.properties.name
    );
    
    if (resortFeatures.length > 0) {
        const resortName = resortFeatures[0].properties.name;
        document.title = `${resortName} Trail Map`;
        
        // Update any other UI elements that need the resort name
        const resortTitleElement = document.getElementById('resort-title');
        if (resortTitleElement) {
            resortTitleElement.textContent = resortName;
        }
    }
}

// Expose functions to global scope
window.loadResortData = loadResortData;