/**
 * Creates a custom legend control for the map
 * @returns {L.Control} Legend control for Leaflet
 */
window.createLegend = function() {
    const LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        
        onAdd: function() {
            const div = L.DomUtil.create('div', 'map-legend');
            
            // Add legend title with class for styling when collapsed
            const titleDiv = document.createElement('div');
            titleDiv.className = 'legend-title';
            titleDiv.innerHTML = 'Map Key';
            div.appendChild(titleDiv);
            
            // Add collapsed title that will show only when collapsed
            const collapsedTitle = document.createElement('div');
            collapsedTitle.className = 'legend-collapsed-title';
            collapsedTitle.innerHTML = 'Map Key ⓘ';
            div.appendChild(collapsedTitle);
            
            // Build legend content
            let content = '';
            
            // Trail difficulties
            content += '<div class="legend-section"><strong>Trail Difficulty</strong></div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #008000;">●</div>';
            content += '<div class="legend-label">Easy / Novice</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #0000FF;">■</div>';
            content += '<div class="legend-label">Intermediate</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #000000;">◆</div>';
            content += '<div class="legend-label">Advanced</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #000000;">◆◆</div>';
            content += '<div class="legend-label">Expert</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #FF8C00;">◆◇</div>';
            content += '<div class="legend-label">Freeride</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol" style="color: #006400;">▲</div>';
            content += '<div class="legend-label">Gladed Area</div>';
            content += '</div>';
            
            // Infrastructure
            content += '<div class="legend-section"><strong>Infrastructure</strong></div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="red" stroke-width="2"/></svg></div>';
            content += '<div class="legend-label">Ski Lift</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="20" height="20"><circle cx="10" cy="10" r="5" fill="#fc1a1a" stroke="black" stroke-width="1"/></svg></div>';
            content += '<div class="legend-label">Lift Station</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="20" height="20"><rect x="5" y="5" width="10" height="10" fill="#a4b7bc" stroke="#a4b7bc" stroke-width="1"/></svg></div>';
            content += '<div class="legend-label">Building</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="20" height="20"><rect x="5" y="5" width="10" height="10" fill="#c8533c" stroke="#c8533c" stroke-width="1" fill-opacity="0.4"/></svg></div>';
            content += '<div class="legend-label">Parking</div>';
            content += '</div>';
            
            // Nature features
            content += '<div class="legend-section"><strong>Natural Features</strong></div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="20" height="20"><rect x="2" y="2" width="16" height="16" fill="#a5bfdd" stroke="#a5bfdd" stroke-width="1" fill-opacity="0.5"/></svg></div>';
            content += '<div class="legend-label">Water</div>';
            content += '</div>';
            
            content += '<div class="legend-item">';
            content += '<div class="legend-symbol"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5,0 L0,10 L10,10 Z" fill="rgba(84, 176, 74, 0.8)" stroke="rgba(1, 50, 32, 0.5)" stroke-width="0.5"/></svg></div>';
            content += '<div class="legend-label">Forest</div>';
            content += '</div>';
            
            // Create and append the content div
            const contentDiv = document.createElement('div');
            contentDiv.className = 'legend-content';
            contentDiv.innerHTML = content;
            div.appendChild(contentDiv);
            
            // Add collapse button
            const legendCollapseButton = document.createElement('div');
            legendCollapseButton.className = 'legend-collapse-button';
            legendCollapseButton.innerHTML = '×';
            legendCollapseButton.title = 'Hide map key';
            
            // Attach toggle functionality
            legendCollapseButton.addEventListener('click', function() {
                const isExpanded = !div.classList.contains('legend-collapsed');
                
                if (isExpanded) {
                    div.classList.add('legend-collapsed');
                    legendCollapseButton.innerHTML = 'ⓘ';
                    legendCollapseButton.title = 'Show map key';
                } else {
                    div.classList.remove('legend-collapsed');
                    legendCollapseButton.innerHTML = '×';
                    legendCollapseButton.title = 'Hide map key';
                }
            });
            
            div.appendChild(legendCollapseButton);
            
            // Prevent click events from propagating to map
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            
            return div;
        }
    });
    
    return new LegendControl();
}

/**
 * Applies styling to the layer control items
 * This fixes a common issue with Leaflet where control styling isn't applied properly
 */
window.applyLegendStyling = function() {
    console.log('Applying legend styling...');
    
    // Find the layer control container in the DOM
    const layerControlContainer = document.querySelector('.leaflet-control-layers');
    
    if (!layerControlContainer) {
        console.warn('Layer control container not found, will retry later');
        // Retry after a delay
        setTimeout(window.applyLegendStyling, 1000);
        return;
    }
    
    // Make sure the container is visible
    layerControlContainer.style.display = 'block';
    
    // Find all layer items within the container
    const layerItems = layerControlContainer.querySelectorAll('.leaflet-control-layers-overlays label');
    
    console.log(`Found ${layerItems.length} layer control items to style`);
    
    // Apply styles to each layer item
    layerItems.forEach((item, index) => {
        try {
            // Get the text of the label
            const layerName = item.textContent.trim();
            console.log(`Styling layer: ${layerName}`);
            
            // Add appropriate styling based on layer type
            if (layerName.includes('Trail') || layerName.includes('Piste')) {
                // Different styling based on difficulty
                if (layerName.includes('Easy') || layerName.includes('Green')) {
                    item.classList.add('legend-trail-easy');
                    item.style.color = '#008000';
                } else if (layerName.includes('Intermediate') || layerName.includes('Blue')) {
                    item.classList.add('legend-trail-intermediate');
                    item.style.color = '#0000FF';
                } else if (layerName.includes('Advanced') || layerName.includes('Black')) {
                    item.classList.add('legend-trail-advanced');
                    item.style.color = '#000000';
                } else if (layerName.includes('Expert') || layerName.includes('Double Black')) {
                    item.classList.add('legend-trail-expert');
                    item.style.color = '#000000';
                    item.style.fontWeight = 'bold';
                } else {
                    item.classList.add('legend-trail');
                    item.style.color = '#A9A9A9';
                }
            } else if (layerName.includes('Lift')) {
                item.classList.add('legend-lift');
                item.style.color = '#FF0000';
            } else if (layerName.includes('Boundary')) {
                item.classList.add('legend-boundary');
                item.style.color = '#800080';
            } else if (layerName.includes('POI')) {
                item.classList.add('legend-poi');
                item.style.color = '#FFA500';
            }
            
            // Make sure text is visible
            item.style.display = 'block';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
            
        } catch (e) {
            console.warn(`Error processing layer control item ${index}:`, e);
        }
    });
    
    console.log('Layer control styling applied successfully');
}; 