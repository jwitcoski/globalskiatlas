/**
 * Resort Statistics Generator
 * Calculates and displays statistics from the ski resort GeoJSON data
 */

// Initialize statistics object to store calculated values
let resortStats = {
    name: '',
    totalArea: 0,
    skiableArea: 0,
    liftCount: 0,
    liftTypes: {},
    trailCounts: {
        easy: 0,
        intermediate: 0,
        advanced: 0,
        expert: 0,
        freeride: 0,
        snowPark: 0,
        sled: 0
    },
    // Add trail details for hover info
    trailDetails: {
        easy: [],
        intermediate: [],
        advanced: [],
        expert: [],
        snowPark: [],
        sled: []
    },
    hasGlades: false,
    hasSnowtubing: false,
    hasSnowpark: false,
    namedTrailCount: 0,
    longestTrail: 0,        // Longest trail in miles
    averageTrailLength: 0,  // Average trail length in miles
    longestLift: 0,         // Longest lift in miles
    // Add contact information
    contactInfo: {
        website: '',
        phone: '',
        email: '',
        address: '',
        operator: '',
        description: ''
    }
};

/**
 * Calculate resort statistics from GeoJSON data
 * @param {Object} geoJsonData - The GeoJSON data
 */
function calculateResortStatistics(geoJsonData) {
    // Reset statistics
    resortStats = {
        name: '',
        totalArea: 0,
        skiableArea: 0,
        liftCount: 0,
        liftTypes: {},
        trailCounts: {
            easy: 0,
            intermediate: 0,
            advanced: 0,
            expert: 0,
            freeride: 0,
            snowPark: 0,
            sled: 0
        },
        // Add trail details for hover info
        trailDetails: {
            easy: [],
            intermediate: [],
            advanced: [],
            expert: [],
            snowPark: [],
            sled: []
        },
        hasGlades: false,
        hasSnowtubing: false,
        hasSnowpark: false,
        namedTrailCount: 0,
        longestTrail: 0,
        averageTrailLength: 0,
        longestLift: 0,
        // Add contact information
        contactInfo: {
            website: '',
            phone: '',
            email: '',
            address: '',
            operator: '',
            description: ''
        }
    };
    
    // Track unique trail names
    const uniqueTrailNames = new Set();
    
    // Track trail lengths for calculating average and longest
    let totalTrailLength = 0;
    let trailCount = 0;
    
    // Process each feature
    geoJsonData.features.forEach(feature => {
        const props = feature.properties || {};
        
        // Resort name and area
        if (props.landuse === "winter_sports") {
            // Set resort name if available
            if (props.name && !resortStats.name) {
                resortStats.name = props.name;
            }
            
            // Extract contact information
            if (props.website) resortStats.contactInfo.website = props.website;
            if (props.contact && props.contact.website) resortStats.contactInfo.website = props.contact.website;
            if (props.contact && props.contact.phone) resortStats.contactInfo.phone = props.contact.phone;
            if (props.phone) resortStats.contactInfo.phone = props.phone;
            if (props.contact && props.contact.email) resortStats.contactInfo.email = props.contact.email;
            if (props.email) resortStats.contactInfo.email = props.email;
            if (props.contact && props.contact.address) resortStats.contactInfo.address = props.contact.address;
            if (props.addr) resortStats.contactInfo.address = props.addr;
            if (props.operator) resortStats.contactInfo.operator = props.operator;
            if (props.description) resortStats.contactInfo.description = props.description;
            
            // Calculate area
            try {
                if (feature.geometry && feature.geometry.type.includes("Polygon")) {
                    const area = turf.area(feature) / 4046.86; // Convert sq meters to acres
                    resortStats.totalArea += area;
                }
            } catch(e) {
                console.error("Error calculating area for winter_sports feature:", e);
            }
        }
        
        // Skiable area and trail statistics
        if (props["piste:type"]) {
            // Calculate skiable area for polygons
            try {
                if (feature.geometry && feature.geometry.type.includes("Polygon")) {
                    const area = turf.area(feature) / 4046.86; // Convert sq meters to acres
                    resortStats.skiableArea += area;
                }
                
                // Calculate trail lengths for linear features
                if (feature.geometry && feature.geometry.type === "LineString") {
                    const lengthInMiles = turf.length(feature, {units: 'miles'});
                    
                    // Check if this is the longest trail
                    if (lengthInMiles > resortStats.longestTrail) {
                        resortStats.longestTrail = lengthInMiles;
                    }
                    
                    // Add to total trail length for average calculation
                    totalTrailLength += lengthInMiles;
                    trailCount++;
                }
            } catch(e) {
                console.error("Error calculating trail metrics:", e);
            }
            
            // Check for named trails (only linear features)
            if (props.name && feature.geometry && feature.geometry.type === "LineString") {
                uniqueTrailNames.add(props.name);
            }
            
            // Check for gladed trails
            if (props.gladed === "yes") {
                resortStats.hasGlades = true;
            }
            
            // Count trails by difficulty
            const difficulty = props["piste:difficulty"] || "intermediate";
            const pisteType = props["piste:type"];
            
            if (pisteType === "snow_park" || difficulty === "freeride") {
                resortStats.trailCounts.snowPark++;
                resortStats.hasSnowpark = true;
            } else if (pisteType === "sleigh" || pisteType === "sled") {
                resortStats.trailCounts.sled++;
                resortStats.hasSnowtubing = true;
            } else if (difficulty === "easy" || difficulty === "novice") {
                resortStats.trailCounts.easy++;
            } else if (difficulty === "intermediate") {
                resortStats.trailCounts.intermediate++;
            } else if (difficulty === "advanced") {
                resortStats.trailCounts.advanced++;
            } else if (difficulty === "expert") {
                resortStats.trailCounts.expert++;
            }
            
            // Track trail details for hover info
            if (feature.geometry && feature.geometry.type === "LineString") {
                const lengthInMiles = turf.length(feature, {units: 'miles'});
                const trailName = props.name || "Unnamed trail";
                
                const trailDetail = {
                    name: trailName,
                    length: Math.round(lengthInMiles * 100) / 100
                };
                
                // Store trail details in the appropriate category
                if (pisteType === "snow_park" || difficulty === "freeride") {
                    resortStats.trailDetails.snowPark.push(trailDetail);
                    resortStats.trailCounts.snowPark++;
                    resortStats.hasSnowpark = true;
                } else if (pisteType === "sleigh" || pisteType === "sled") {
                    resortStats.trailDetails.sled.push(trailDetail);
                    resortStats.trailCounts.sled++;
                    resortStats.hasSnowtubing = true;
                } else if (difficulty === "easy" || difficulty === "novice") {
                    resortStats.trailDetails.easy.push(trailDetail);
                    resortStats.trailCounts.easy++;
                } else if (difficulty === "intermediate") {
                    resortStats.trailDetails.intermediate.push(trailDetail);
                    resortStats.trailCounts.intermediate++;
                } else if (difficulty === "advanced") {
                    resortStats.trailDetails.advanced.push(trailDetail);
                    resortStats.trailCounts.advanced++;
                } else if (difficulty === "expert") {
                    resortStats.trailDetails.expert.push(trailDetail);
                    resortStats.trailCounts.expert++;
                }
            }
        }
        
        // Count and measure lifts (excluding pylons and stations)
        if (props.aerialway && props.aerialway !== "pylon" && props.aerialway !== "station") {
            resortStats.liftCount++;
            
            // Track lift types (exclude stations)
            const liftType = props.aerialway;
            resortStats.liftTypes[liftType] = (resortStats.liftTypes[liftType] || 0) + 1;
            
            // Calculate lift length for linear features
            try {
                if (feature.geometry && feature.geometry.type === "LineString") {
                    const lengthInMiles = turf.length(feature, {units: 'miles'});
                    
                    // Check if this is the longest lift
                    if (lengthInMiles > resortStats.longestLift) {
                        resortStats.longestLift = lengthInMiles;
                    }
                }
            } catch(e) {
                console.error("Error calculating lift length:", e);
            }
        }
    });
    
    // Set named trail count from unique names
    resortStats.namedTrailCount = uniqueTrailNames.size;
    
    // Calculate average trail length
    if (trailCount > 0) {
        resortStats.averageTrailLength = totalTrailLength / trailCount;
    }
    
    // Round area and length values
    resortStats.totalArea = Math.round(resortStats.totalArea);
    resortStats.skiableArea = Math.round(resortStats.skiableArea);
    resortStats.longestTrail = Math.round(resortStats.longestTrail * 100) / 100; // Round to 2 decimal places
    resortStats.averageTrailLength = Math.round(resortStats.averageTrailLength * 100) / 100; // Round to 2 decimal places
    resortStats.longestLift = Math.round(resortStats.longestLift * 100) / 100; // Round to 2 decimal places
    
    console.log("Resort statistics calculated:", resortStats);
}

/**
 * Update the page header with the resort name
 */
function updateResortHeader() {
    if (resortStats.name) {
        // Update page title
        document.title = `${resortStats.name} Ski Map`;
        
        // Update the h2 header
        const headerElement = document.querySelector('#main .major h2');
        if (headerElement) {
            headerElement.textContent = `${resortStats.name} Map`;
        }
    }
}

/**
 * Update the statistics section with calculated values
 */
function updateStatisticsSection() {
    // Since we're no longer using the basic stats section, go directly to creating detailed stats
    createDetailedStatistics();
}

/**
 * Create detailed statistics and charts section
 */
function createDetailedStatistics() {
    // Get the container
    const container = document.getElementById('resort-stats-container');
    if (!container) {
        console.error("Statistics container not found with ID: resort-stats-container");
        return;
    }
    
    const statsGrid = container.querySelector('.stats-grid');
    const liftTypesList = container.querySelector('.lift-types ul');
    
    // Clear existing content
    statsGrid.innerHTML = '';
    liftTypesList.innerHTML = '';
    
    // Add statistics boxes
    const statBoxes = [
        { icon: '🏔️', label: 'Total Area', value: `${resortStats.totalArea.toLocaleString()} acres` },
        { icon: '⛷️', label: 'Skiable Terrain', value: `${resortStats.skiableArea.toLocaleString()} acres` },
        { icon: '🚡', label: 'Total Lifts', value: resortStats.liftCount },
        { icon: '🚠', label: 'Longest Lift', value: `${resortStats.longestLift} mi` },
        { icon: '🎿', label: 'Named Trails', value: resortStats.namedTrailCount },
        { icon: '📏', label: 'Longest Trail', value: `${resortStats.longestTrail} mi` },
        { icon: '📊', label: 'Avg. Trail', value: `${resortStats.averageTrailLength} mi` },
        { icon: '🌲', label: 'Gladed Terrain', value: resortStats.hasGlades ? 'Yes' : 'No' },
        { icon: '🏂', label: 'Snow Park', value: resortStats.hasSnowpark ? 'Yes' : 'No' },
        { icon: '🛷', label: 'Sledding/Tubing', value: resortStats.hasSnowtubing ? 'Yes' : 'No' }
    ];
    
    statBoxes.forEach(stat => {
        const box = document.createElement('div');
        box.className = 'stat-box';
        box.innerHTML = `
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-label">${stat.label}</div>
            <div class="stat-value">${stat.value}</div>
        `;
        statsGrid.appendChild(box);
    });
    
    // Add lift types
    Object.entries(resortStats.liftTypes).forEach(([type, count]) => {
        const li = document.createElement('li');
        li.textContent = `${type.replace('_', ' ')}: ${count}`;
        liftTypesList.appendChild(li);
    });
    
    // Create chart
    createTrailPieChart();
}

/**
 * Create a pie chart for trail difficulty distribution
 */
function createTrailPieChart() {
    // Get trail counts from the resort stats
    const trailData = [
        { label: 'Easy', count: resortStats.trailCounts.easy, color: '#2f9a2f', details: resortStats.trailDetails.easy },
        { label: 'Intermediate', count: resortStats.trailCounts.intermediate, color: '#0000ff', details: resortStats.trailDetails.intermediate },
        { label: 'Advanced', count: resortStats.trailCounts.advanced, color: '#000000', details: resortStats.trailDetails.advanced },
        { label: 'Expert', count: resortStats.trailCounts.expert, color: '#ff0000', details: resortStats.trailDetails.expert },
        { label: 'Snow Park', count: resortStats.trailCounts.snowPark, color: '#ff6600', details: resortStats.trailDetails.snowPark },
        { label: 'Sled/Tubing', count: resortStats.trailCounts.sled, color: '#9966ff', details: resortStats.trailDetails.sled }
    ].filter(d => d.count > 0); // Only include trail types that exist
    
    // Clear any existing chart
    const chartDiv = document.getElementById('trail-chart');
    chartDiv.innerHTML = '';
    
    // If no trail data, show message
    if (trailData.length === 0) {
        chartDiv.innerHTML = '<p>No trail data available</p>';
        return;
    }
    
    // Set up dimensions
    const width = chartDiv.clientWidth;
    const height = 250;
    const radius = Math.min(width, height) / 3; // Slightly smaller to make room for labels
    const legendHeight = 60; // Height for the legend at the bottom
    
    // Create tooltip div for hover
    const tooltip = d3.select("body").append("div")
        .attr("class", "chart-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none")
        .style("max-width", "300px")
        .style("z-index", "1000");
    
    // Create SVG element
    const svg = d3.select("#trail-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${(height - legendHeight) / 2})`);
    
    // Generate the pie
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null); // Don't sort, use the order provided
    
    // Generate the arcs
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    
    // Generate outer arc for label positioning
    const outerArc = d3.arc()
        .innerRadius(radius * 1.2)
        .outerRadius(radius * 1.2);
    
    // Draw arc paths
    const arcs = svg.selectAll(".arc")
        .data(pie(trailData))
        .enter()
        .append("g")
        .attr("class", "arc");
    
    arcs.append("path")
        .attr("fill", d => d.data.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("d", arc)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // Show tooltip with trail details
            const details = d.data.details;
            let tooltipContent = `<strong>${d.data.label} Trails (${d.data.count})</strong><br>`;
            
            if (details.length > 0) {
                // Sort by name
                details.sort((a, b) => a.name.localeCompare(b.name));
                
                tooltipContent += "<ul style='margin: 5px 0; padding-left: 20px;'>";
                details.forEach(trail => {
                    tooltipContent += `<li>${trail.name} (${trail.length} mi)</li>`;
                });
                tooltipContent += "</ul>";
            } else {
                tooltipContent += "No named trails in this category";
            }
            
            tooltip.html(tooltipContent)
                .style("opacity", 1)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            // Highlight the hovered segment
            d3.select(this).attr("opacity", 0.8);
        })
        .on("mouseout", function() {
            // Hide tooltip
            tooltip.style("opacity", 0);
            
            // Remove highlight
            d3.select(this).attr("opacity", 1);
        });
    
    // Add callout lines and labels
    arcs.append("polyline")
        .attr("points", function(d) {
            const pos = outerArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 1.5 * (midAngle < Math.PI ? 1 : -1);
            return [arc.centroid(d), outerArc.centroid(d), pos];
        })
        .style("fill", "none")
        .style("stroke", "#999")
        .style("stroke-width", 1);
    
    // Add text labels with counts
    arcs.append("text")
        .attr("dy", ".35em")
        .attr("transform", function(d) {
            const pos = outerArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 1.6 * (midAngle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style("text-anchor", function(d) {
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return midAngle < Math.PI ? "start" : "end";
        })
        .style("fill", "#333")
        .style("font-size", "12px")
        .text(d => `${d.data.label} (${d.data.count})`);
    
    // Create legend at the bottom
    const legendG = d3.select("#trail-chart svg")
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width/2 - 120}, ${height - legendHeight + 10})`);
    
    // Add legend items in a horizontal layout
    const legendItems = legendG.selectAll(".legend-item")
        .data(trailData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${(i % 3) * 80}, ${Math.floor(i / 3) * 25})`);
    
    // Add colored squares
    legendItems.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => d.color);
    
    // Add text labels
    legendItems.append("text")
        .attr("x", 16)
        .attr("y", 10)
        .attr("font-size", "11px")
        .attr("fill", "#333")
        .text(d => d.label);
}

/**
 * Update the resort information section
 */
function updateResortInformation() {
    const resortInfoSection = document.querySelector('#content p');
    if (!resortInfoSection) return;
    
    let infoHTML = 'This interactive map shows the ski resort boundaries, lifts, and trails. Use the controls to zoom in/out and explore different areas of the resort.';
    
    // Add contact information if available
    const contactInfo = [];
    
    if (resortStats.contactInfo.description) {
        infoHTML = resortStats.contactInfo.description + '<br><br>' + infoHTML;
    }
    
    if (resortStats.contactInfo.operator) {
        contactInfo.push(`<strong>Operator:</strong> ${resortStats.contactInfo.operator}`);
    }
    
    if (resortStats.contactInfo.website) {
        const url = resortStats.contactInfo.website.startsWith('http') ? 
            resortStats.contactInfo.website : 
            'https://' + resortStats.contactInfo.website;
        contactInfo.push(`<strong>Website:</strong> <a href="${url}" target="_blank">${resortStats.contactInfo.website}</a>`);
    }
    
    if (resortStats.contactInfo.phone) {
        contactInfo.push(`<strong>Phone:</strong> ${resortStats.contactInfo.phone}`);
    }
    
    if (resortStats.contactInfo.email) {
        contactInfo.push(`<strong>Email:</strong> <a href="mailto:${resortStats.contactInfo.email}">${resortStats.contactInfo.email}</a>`);
    }
    
    if (resortStats.contactInfo.address) {
        contactInfo.push(`<strong>Address:</strong> ${resortStats.contactInfo.address}`);
    }
    
    if (contactInfo.length > 0) {
        resortInfoSection.innerHTML = infoHTML + '<div class="resort-contact-info"><h4>Contact Information</h4>' + contactInfo.join('<br>') + '</div>';
    } else {
        resortInfoSection.innerHTML = infoHTML;
    }
}

/**
 * Initialize the resort statistics module
 * @param {Object} data - The GeoJSON data from the map
 */
function initResortStatistics(data) {
    calculateResortStatistics(data);
    updateResortHeader();
    updateStatisticsSection();
    updateResortInformation();
    
    // Make sure window.resortStats is properly set
    window.resortStats = resortStats;
    
    // Trigger AI description generation if available
    console.log('Resort statistics completed, triggering AI description');
    if (window.generateAIDescription) {
        window.generateAIDescription(resortStats);
    } else {
        console.warn('AI description generator not available');
    }
}

// Export function to global scope
window.initResortStatistics = initResortStatistics; 