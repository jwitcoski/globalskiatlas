/**
 * This script fixes styling issues with the layer controls
 */
document.addEventListener('DOMContentLoaded', function() {
    // Apply a fix for layer controls after the map is fully loaded
    setTimeout(function() {
        const layerControls = document.querySelectorAll('.leaflet-control-layers-overlays label');
        
        if (layerControls.length > 0) {
            console.log("Applying layer control fixes to", layerControls.length, "items");
            
            layerControls.forEach(function(control) {
                // Make sure text is visible
                control.style.display = "block";
                control.style.visibility = "visible";
                control.style.opacity = "1";
                
                // Fix input checkboxes
                const checkbox = control.querySelector('input');
                if (checkbox) {
                    checkbox.style.display = "inline-block";
                    checkbox.style.visibility = "visible";
                    checkbox.style.opacity = "1";
                    checkbox.style.marginRight = "5px";
                }
                
                // Apply specific color for known layers
                const text = control.textContent.trim();
                if (text.includes('Lift')) {
                    control.style.color = "#FF0000";
                } else if (text.includes('Easy') || text.includes('Novice')) {
                    control.style.color = "#008000";
                } else if (text.includes('Intermediate')) {
                    control.style.color = "#0000FF";
                } else if (text.includes('Advanced')) {
                    control.style.color = "#000000";
                } else if (text.includes('Expert')) {
                    control.style.color = "#000000";
                    control.style.fontWeight = "bold";
                } else {
                    control.style.color = "#333";
                }
            });
            
            console.log("Layer control fixes applied successfully");
        } else {
            console.warn("No layer controls found to apply fixes");
        }
    }, 1000); // Wait 1 second after page load
}); 