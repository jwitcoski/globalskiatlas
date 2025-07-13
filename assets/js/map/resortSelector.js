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
    const searchInput = document.getElementById('resortSearchInput');
    const searchButton = document.getElementById('searchButton');
    
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
        
        // Set up search functionality event listeners
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
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
            countrySelect.innerHTML = '<option value="">Network error - please check your connection</option>';
            
            // Add a helpful message for users
            const errorMessage = document.createElement('p');
            errorMessage.style.color = '#e74c3c';
            errorMessage.style.fontSize = '0.9em';
            errorMessage.style.marginTop = '10px';
            errorMessage.innerHTML = '⚠️ Unable to load resort data. Please check your internet connection and try refreshing the page.';
            
            // Insert the error message after the resort selector
            const resortSelection = document.getElementById('resort-selection');
            if (resortSelection) {
                resortSelection.appendChild(errorMessage);
            }
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
    
    /**
     * Handle resort search
     */
    async function handleSearch() {
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            alert('Please enter a resort name to search.');
            return;
        }
        
        // Limit search term length to prevent excessive API calls
        if (searchTerm.length < 2) {
            alert('Please enter at least 2 characters to search.');
            return;
        }
        
        try {
            // Show loading state
            searchButton.disabled = true;
            searchButton.textContent = 'Searching...';
            
            // Since the search endpoint is not working, we'll implement a client-side search
            // using the existing resort data that we've already loaded
            const results = await performClientSideSearch(searchTerm);
            
            // Reset search UI
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
            
            if (results.length === 0) {
                alert('No resorts found matching your search. Please try a different name or use the dropdown menus below.');
                return;
            }
            
            if (results.length === 1) {
                // Direct match found - select this resort
                selectResortFromSearchResult(results[0]);
            } else {
                // Multiple matches - show them in a dropdown
                showSearchResults(results);
            }
            
        } catch (error) {
            console.error('Error searching for resorts:', error);
            alert('An error occurred while searching. Please try using the dropdown menus below instead.');
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
        }
    }
    
    /**
     * Perform client-side search using loaded resort data
     */
    async function performClientSideSearch(searchTerm) {
        const results = [];
        const searchLower = searchTerm.toLowerCase();
        
        console.log('Searching for:', searchTerm);
        
        // First, search through all loaded resort data
        for (const countryId in resortData.resorts) {
            const resorts = resortData.resorts[countryId];
            console.log(`Searching in ${countryId}:`, resorts.length, 'resorts');
            for (const resort of resorts) {
                if (resort.name.toLowerCase().includes(searchLower)) {
                    console.log('Found match:', resort.name);
                    results.push(resort);
                }
            }
        }
        
        // If no results found in loaded data, search through major countries
        if (results.length === 0) {
            console.log('No results in loaded data, searching major countries...');
            
            // Make sure we have countries loaded first
            if (!resortData.countries || resortData.countries.length === 0) {
                console.log('No countries loaded, loading countries first...');
                try {
                    const response = await fetch(`${API_BASE_URL}/countries`);
                    if (response.ok) {
                        const data = await response.json();
                        resortData.countries = data.countries || [];
                    }
                } catch (error) {
                    console.error('Failed to load countries:', error);
                    return results;
                }
            }
            
            // Try to load resorts from major states/provinces instead of countries
            const majorStates = [
                { country: 'United States', states: ['Pennsylvania', 'Colorado', 'California', 'Vermont', 'New York', 'Utah'] },
                { country: 'Canada', states: ['British Columbia', 'Alberta', 'Quebec', 'Ontario'] },
                { country: 'France', states: ['Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur'] },
                { country: 'Switzerland', states: ['Graubünden', 'Valais', 'Bern'] },
                { country: 'Austria', states: ['Tirol', 'Salzburg', 'Vorarlberg'] },
                { country: 'Italy', states: ['Trentino-Alto Adige', 'Valle d\'Aosta', 'Lombardia'] }
            ];
            
            for (const country of resortData.countries) {
                const majorStateList = majorStates.find(ms => ms.country === country.name);
                if (majorStateList) {
                    console.log('Loading states for:', country.name);
                    try {
                        // First get states for this country
                        const stateResponse = await fetch(`${API_BASE_URL}/states?country=${encodeURIComponent(country.id)}`);
                        if (stateResponse.ok) {
                            const stateData = await stateResponse.json();
                            const states = stateData.states || [];
                            
                            // Filter to major states only
                            const majorStatesForCountry = states.filter(state => 
                                majorStateList.states.includes(state.name)
                            );
                            
                            console.log(`Found ${majorStatesForCountry.length} major states for ${country.name}`);
                            
                            // Load resorts for each major state
                            for (const state of majorStatesForCountry) {
                                try {
                                    const resortResponse = await fetch(`${API_BASE_URL}/resorts?province=${encodeURIComponent(state.id)}`);
                                    if (resortResponse.ok) {
                                        const resortData = await resortResponse.json();
                                        const stateResorts = resortData.resorts || [];
                                        
                                        console.log(`Loaded ${stateResorts.length} resorts for ${state.name}`);
                                        
                                        // Store the loaded resorts for future searches
                                        resortData.resorts[state.id] = stateResorts;
                                        
                                        for (const resort of stateResorts) {
                                            if (resort.name.toLowerCase().includes(searchLower)) {
                                                console.log('Found match in', state.name + ':', resort.name);
                                                results.push(resort);
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.warn(`Failed to load resorts for ${state.name}:`, error);
                                }
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to load states for ${country.name}:`, error);
                    }
                }
            }
        }
        
        console.log('Total search results:', results.length);
        return results;
    }
    
    /**
     * Select a resort directly from search result
     */
    function selectResortFromSearchResult(resort) {
        // Save the selected resort ID
        window.selectedResortId = resort.id;
        
        // Show the previously hidden sections
        document.getElementById('content').style.display = 'block';
        document.getElementById('ai-description').style.display = 'block';
        document.getElementById('resort-stats-container').style.display = 'block';
        
        // Load the map scripts
        if (typeof loadMapScripts === 'function') {
            loadMapScripts();
        } else {
            console.error('loadMapScripts function not available');
        }
        
        // Scroll to the map section
        document.getElementById('content').scrollIntoView({ behavior: 'smooth' });
        
        // Update page URL to include the resort
        const resortName = resort.name.toLowerCase().replace(/\s+/g, '-');
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('resort', resort.id);
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Show search results in the resort dropdown
     */
    function showSearchResults(results) {
        // Reset the dropdowns to search results mode
        resetDropdown(countrySelect, 'Search Results');
        resetDropdown(stateSelect, 'Search Results');
        countrySelect.disabled = true;
        stateSelect.disabled = true;
        
        // Populate resort dropdown with search results
        resortSelect.innerHTML = '<option value="">Select from search results</option>';
        
        results.forEach(resort => {
            const option = document.createElement('option');
            option.value = resort.id;
            
            // Include location info in the display name
            let displayText = resort.name;
            if (resort.province && resort.country) {
                displayText += ` (${resort.province}, ${resort.country})`;
            } else if (resort.country) {
                displayText += ` (${resort.country})`;
            }
            
            option.textContent = displayText;
            
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
        
        // Enable the resort dropdown
        resortSelect.disabled = false;
        
        // Focus on the resort dropdown
        resortSelect.focus();
    }
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 