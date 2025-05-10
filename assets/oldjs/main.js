// main.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // Populate resort options
    if (typeof populateResortOptions === 'function') {
        populateResortOptions();
    } else {
        console.error('populateResortOptions function is not defined');
    }
    
    // Add event listeners
    const resortSelect = document.getElementById('resortSelect');
    if (resortSelect) {
        console.log('Resort select element found');
        resortSelect.addEventListener('change', showThumbnail);
    } else {
        console.error('Resort select element not found');
    }

    const goButton = document.getElementById('goButton');
    if (goButton) {
        console.log('Go button found');
        goButton.addEventListener('click', fetchResortData);
    } else {
        console.error('Go button not found');
    }
});