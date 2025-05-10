/**
 * Resort Selector Module for Ski Atlas Interactive Map
 * Handles populating dropdowns and loading resort data
 */
(function() {
    // DOM Elements
    const countrySelect = document.getElementById('countrySelect');
    const stateSelect = document.getElementById('stateSelect');
    const resortSelect = document.getElementById('resortSelect');
    const goButton = document.getElementById('goButton');
    const thumbnailImage = document.getElementById('thumbnailImage');
    const noMapMessage = document.getElementById('noMapMessage');
    
    // API Endpoints
    const API_BASE_URL = 'https://h7ji2md7tc.execute-api.us-east-1.amazonaws.com/prod/selector'; // Updated API endpoint
    
    // Data structures
    let resortData = {
        countries: [],
        states: {},
        resorts: {}
    };
    
    /**
     * Initialize the module
     */
    function init() {
        console.log('Resort Selector initialized');
        
        // Fetch initial data to populate countries
        fetchCountryData();
        
        // Set up event listeners
        countrySelect.addEventListener('change', handleCountryChange);
        stateSelect.addEventListener('change', handleStateChange);
        resortSelect.addEventListener('change', handleResortChange);
        goButton.addEventListener('click', handleGoButtonClick);
    }
    
    /**
     * Fetch country data from API
     */
    async function fetchCountryData() {
        try {
            // Show loading state
            countrySelect.innerHTML = '<option value="">Loading countries...</option>';
            
            // Fetch countries
            const response = await fetch(`${API_BASE_URL}/countries`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            // Store country data
            resortData.countries = data.countries || [];
            
            // Populate country dropdown
            populateCountryDropdown();
            
        } catch (error) {
            console.error('Error fetching country data:', error);
            countrySelect.innerHTML = '<option value="">Error loading countries</option>';
        }
    }
    
    /**
     * Populate country dropdown with data
     */
    function populateCountryDropdown() {
        // Clear and add default option
        countrySelect.innerHTML = '<option value="">Select a country</option>';
        
        // Add options for each country
        resortData.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });
        
        // Enable dropdown
        countrySelect.disabled = false;
    }
    
    /**
     * Handle country selection change
     */
    async function handleCountryChange() {
        // Reset dependent dropdowns
        resetDropdown(stateSelect, 'Select a state');
        resetDropdown(resortSelect, 'Select a ski resort');
        
        const countryId = countrySelect.value;
        
        if (!countryId) {
            // No country selected, disable dependent dropdowns
            stateSelect.disabled = true;
            resortSelect.disabled = true;
            return;
        }
        
        try {
            // Show loading state
            stateSelect.innerHTML = '<option value="">Loading states/regions...</option>';
            stateSelect.disabled = false;
            
            // Fetch states for the selected country
            const response = await fetch(`${API_BASE_URL}/states?country=${countryId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            // Store state data
            resortData.states[countryId] = data.states || [];
            
            // Check if country has states
            if (resortData.states[countryId].length > 0) {
                // Populate state dropdown
                populateStateDropdown(countryId);
            } else {
                // Country has no states, fetch resorts directly
                stateSelect.disabled = true;
                await fetchResortsForCountry(countryId);
            }
            
        } catch (error) {
            console.error('Error fetching state data:', error);
            stateSelect.innerHTML = '<option value="">Error loading states</option>';
            stateSelect.disabled = true;
        }
    }
    
    /**
     * Handle state selection change
     */
    async function handleStateChange() {
        // Reset resort dropdown
        resetDropdown(resortSelect, 'Select a ski resort');
        
        const countryId = countrySelect.value;
        const stateId = stateSelect.value;
        
        if (!stateId) {
            // No state selected, disable resort dropdown
            resortSelect.disabled = true;
            return;
        }
        
        try {
            // Show loading state
            resortSelect.innerHTML = '<option value="">Loading resorts...</option>';
            resortSelect.disabled = false;
            
            // Fetch resorts for the selected state
            const response = await fetch(`${API_BASE_URL}/resorts?province=${stateId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            // Store resort data using state ID as key
            resortData.resorts[stateId] = data.resorts || [];
            
            // Populate resort dropdown
            populateResortDropdown(stateId);
            
        } catch (error) {
            console.error('Error fetching resort data:', error);
            resortSelect.innerHTML = '<option value="">Error loading resorts</option>';
            resortSelect.disabled = true;
        }
    }
    
    /**
     * Populate state dropdown with data for the selected country
     */
    function populateStateDropdown(countryId) {
        // Clear and add default option
        stateSelect.innerHTML = '<option value="">Select a state</option>';
        
        // Add options for each state
        const states = resortData.states[countryId] || [];
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.id;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
        
        // Enable dropdown
        stateSelect.disabled = false;
    }
    
    /**
     * Fetch resorts directly for a country (when no states exist)
     */
    async function fetchResortsForCountry(countryId) {
        try {
            // Show loading state
            resortSelect.innerHTML = '<option value="">Loading resorts...</option>';
            resortSelect.disabled = false;
            
            // Fetch resorts for the selected country
            const response = await fetch(`${API_BASE_URL}/resorts?country=${countryId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            // Store resort data using country ID as key
            resortData.resorts[`country_${countryId}`] = data.resorts || [];
            
            // Populate resort dropdown
            populateResortDropdown(`country_${countryId}`);
            
        } catch (error) {
            console.error('Error fetching resort data for country:', error);
            resortSelect.innerHTML = '<option value="">Error loading resorts</option>';
            resortSelect.disabled = true;
        }
    }
    
    /**
     * Populate resort dropdown with data for the selected state or country
     */
    function populateResortDropdown(parentId) {
        // Clear and add default option
        resortSelect.innerHTML = '<option value="">Select a ski resort</option>';
        
        // Add options for each resort
        const resorts = resortData.resorts[parentId] || [];
        resorts.forEach(resort => {
            const option = document.createElement('option');
            option.value = resort.id;
            option.textContent = resort.name;
            // Add data attributes for resort details
            if (resort.hasMap) {
                option.dataset.hasMap = "true";
            }
            if (resort.thumbnailUrl) {
                option.dataset.thumbnailUrl = resort.thumbnailUrl;
            }
            if (resort.mapUrl) {
                option.dataset.mapUrl = resort.mapUrl;
            }
            resortSelect.appendChild(option);
        });
        
        // Enable dropdown
        resortSelect.disabled = false;
    }
    
    /**
     * Handle resort selection change
     */
    function handleResortChange() {
        const selectedOption = resortSelect.options[resortSelect.selectedIndex];
        const resortId = resortSelect.value;
        
        if (!resortId) {
            // No resort selected, hide thumbnail
            hideResortThumbnail();
            return;
        }
        
        // Check if resort has a map available
        if (selectedOption.dataset.hasMap === "true" && selectedOption.dataset.thumbnailUrl) {
            // Show thumbnail
            showResortThumbnail(selectedOption.dataset.thumbnailUrl);
        } else {
            // No map available
            showNoMapMessage();
        }
    }
    
    /**
     * Handle Go button click
     */
    function handleGoButtonClick() {
        const resortId = resortSelect.value;
        const selectedOption = resortSelect.options[resortSelect.selectedIndex];
        
        if (!resortId) {
            alert('Please select a resort first.');
            return;
        }
        
        // Show the previously hidden sections
        document.getElementById('content').style.display = 'block';
        document.getElementById('ai-description').style.display = 'block';
        document.getElementById('resort-stats-container').style.display = 'block';
        
        // Save the selected resort ID for later use
        window.selectedResortId = resortId;
        
        // Load the map scripts (which will then load the resort data)
        if (typeof loadMapScripts === 'function') {
            loadMapScripts();
        } else {
            console.error('loadMapScripts function not available');
        }
        
        // Scroll to the map section
        document.getElementById('content').scrollIntoView({ behavior: 'smooth' });
        
        // Update page URL to include the resort
        const resortName = selectedOption.textContent.toLowerCase().replace(/\s+/g, '-');
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('resort', resortId);
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Show resort thumbnail image
     */
    function showResortThumbnail(imageUrl) {
        if (thumbnailImage && noMapMessage) {
            thumbnailImage.src = imageUrl;
            thumbnailImage.style.display = 'block';
            noMapMessage.style.display = 'none';
        }
    }
    
    /**
     * Hide resort thumbnail image
     */
    function hideResortThumbnail() {
        if (thumbnailImage && noMapMessage) {
            thumbnailImage.src = '';
            thumbnailImage.style.display = 'none';
            noMapMessage.style.display = 'none';
        }
    }
    
    /**
     * Show "No Map Available" message
     */
    function showNoMapMessage() {
        if (thumbnailImage && noMapMessage) {
            thumbnailImage.style.display = 'none';
            noMapMessage.style.display = 'block';
        }
    }
    
    /**
     * Reset dropdown to initial state
     */
    function resetDropdown(dropdown, defaultText) {
        dropdown.innerHTML = `<option value="">${defaultText}</option>`;
        dropdown.disabled = true;
    }
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 