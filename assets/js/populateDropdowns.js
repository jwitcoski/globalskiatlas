let choices; // Declare choices variable at the top
let resortData = {}; // To store the fetched resort data

function populateDropdowns() {
    console.log('Starting to populate resort options');
    fetch('https://r77417vr7f.execute-api.us-east-1.amazonaws.com/DEV')
        .then(response => {
            console.log('Received response:', response);
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json(); // Parse the JSON response
        })
        .then(data => {
            console.log('Parsed data:', data);
            // Parse the body if it's a string
            if (typeof data.body === 'string') {
                resortData = JSON.parse(data.body); // Store the fetched data
            } else {
                resortData = data; // Store the fetched data directly
            }
            console.log('Resort data after parsing:', resortData); // Log the resort data structure
            populateContinents();
            countResorts(); // Call the function to count resorts
        })
        .catch(error => {
            console.error('Error fetching resort list:', error);
            alert('Error fetching resort list. Please try again later.');
        });
}

function countResorts() {
    let totalResorts = 0;

    // Count the number of resorts
    for (const continent in resortData) {
        for (const country in resortData[continent]) {
            for (const state in resortData[continent][country]) {
                const resorts = resortData[continent][country][state];
                if (Array.isArray(resorts)) {
                    totalResorts += resorts.length;
                }
            }
        }
    }

    // Update the resort count text in the appropriate element
    const resortCountElement = document.getElementById("resort-count");
    if (resortCountElement) {
        resortCountElement.textContent = `Explore over ${totalResorts} ski resorts worldwide`;
    } else {
        // Fallback for the old index.html page that might not have the resort-count element
        const heroContent = document.querySelector(".hero-content");
        if (heroContent) {
            const resortCountPara = document.createElement("p");
            resortCountPara.textContent = `Currently we have mapped ${totalResorts} skiing locations.`;
            heroContent.appendChild(resortCountPara);
        }
    }
}

function populateContinents() {
    const continentSelect = document.getElementById("continentSelect");
    const continents = Object.keys(resortData); // Assuming resortData is structured by continent

    // Clear existing options
    continentSelect.innerHTML = '<option value="">Select a continent</option>';
    
    // Sort continents alphabetically
    continents.sort();

    continents.forEach(continent => {
        const option = document.createElement("option");
        option.value = continent;
        option.textContent = continent;
        continentSelect.appendChild(option);
    });

    continentSelect.addEventListener('change', populateCountries);
}

function populateCountries() {
    const continentSelect = document.getElementById("continentSelect");
    const countrySelect = document.getElementById("countrySelect");
    const selectedContinent = continentSelect.value;

    // Clear previous options
    countrySelect.innerHTML = '<option value="">Select a country</option>';
    document.getElementById("stateSelect").innerHTML = '<option value="">Select a state</option>';
    document.getElementById("resortSelect").innerHTML = '<option value="">Select a ski resort</option>';
    document.getElementById("stateSelect").disabled = true;
    document.getElementById("resortSelect").disabled = true;

    if (selectedContinent) {
        const countries = Object.keys(resortData[selectedContinent]);
        
        // Sort countries alphabetically
        countries.sort();

        countries.forEach(country => {
            const option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
        countrySelect.disabled = false;
    }
    
    countrySelect.addEventListener('change', populateStates);
}

function populateStates() {
    const countrySelect = document.getElementById("countrySelect");
    const stateSelect = document.getElementById("stateSelect");
    const selectedCountry = countrySelect.value;
    const selectedContinent = document.getElementById("continentSelect").value;

    // Clear previous options
    stateSelect.innerHTML = '<option value="">Select a state</option>';
    document.getElementById("resortSelect").innerHTML = '<option value="">Select a ski resort</option>';
    document.getElementById("resortSelect").disabled = true;

    if (selectedCountry) {
        const states = Object.keys(resortData[selectedContinent][selectedCountry]);
        
        // Sort states alphabetically
        states.sort();

        states.forEach(state => {
            const option = document.createElement("option");
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
        stateSelect.disabled = false;
    }

    stateSelect.addEventListener('change', populateResorts);
}

function populateResorts() {
    const stateSelect = document.getElementById("stateSelect");
    const resortSelect = document.getElementById("resortSelect");
    const selectedState = stateSelect.value;
    const selectedCountry = document.getElementById("countrySelect").value;
    const selectedContinent = document.getElementById("continentSelect").value;

    // Clear previous options
    resortSelect.innerHTML = '<option value="">Select a ski resort</option>';

    if (selectedState) {
        // Log the current selections for debugging
        console.log('Selected Continent:', selectedContinent);
        console.log('Selected Country:', selectedCountry);
        console.log('Selected State:', selectedState);

        // Access the resorts data
        const resorts = resortData[selectedContinent]?.[selectedCountry]?.[selectedState];

        console.log('Resorts data:', resorts); // Log the resorts data

        if (Array.isArray(resorts)) {
            // Sort resorts alphabetically
            resorts.sort(); // Alphabetical sort

            resorts.forEach(resort => {
                const option = document.createElement("option");
                option.value = resort; // Using OfficialName as the value
                option.textContent = resort; // Using OfficialName as the display text
                resortSelect.appendChild(option);
            });
            resortSelect.disabled = false;
        } else {
            console.error('Resorts data is not an array:', resorts);
            alert('No resorts available for the selected state.');
        }
    }
}

// Call the function to populate the dropdowns on page load
populateDropdowns();