function showThumbnail() {
    const select = document.getElementById("resortSelect");
    const resortName = select.value;
    const thumbnailImage = document.getElementById("thumbnailImage");
    const noMapMessage = document.getElementById("noMapMessage");

    if (resortName) {
        fetch(`https://sjtdu9sez2.execute-api.us-east-1.amazonaws.com/deploy/?official_name=${encodeURIComponent(resortName)}&thumbnail_only=true`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json();
                } else {
                    throw new Error("Oops, we haven't got JSON!");
                }
            })
            .then(data => {
                console.log("Received data:", data);  // Log the received data
                const continent = data.Continent || '';
                const country = data.Country || '';
                const state = data.State || '';
                const officialName = data.OfficalName || resortName;

                let imageUrl = `data/${continent}/${country}`;
                if (state) {
                    imageUrl += `/${state}`;
                }
                imageUrl += `/map/${encodeURIComponent(officialName)}.jpeg`;

                thumbnailImage.src = imageUrl;
                thumbnailImage.style.display = 'block';
                noMapMessage.style.display = 'none';

                thumbnailImage.onerror = function() {
                    thumbnailImage.style.display = 'none';
                    noMapMessage.style.display = 'block';
                    noMapMessage.textContent = 'Map not available';
                };
            })
            .catch(error => {
                console.error('Error fetching resort data:', error);
                console.error('Error details:', error.message);  // Log more error details
                thumbnailImage.style.display = 'none';
                noMapMessage.style.display = 'block';
                noMapMessage.textContent = 'Error loading map: ' + error.message;
            });
    } else {
        thumbnailImage.style.display = 'none';
        noMapMessage.style.display = 'block';
        noMapMessage.textContent = 'Please select a resort';
    }
}