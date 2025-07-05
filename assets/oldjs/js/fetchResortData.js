function fetchResortData() {
    const select = document.getElementById("resortSelect");
    const officialName = select.value;

    if (officialName) {
        document.body.style.cursor = 'wait';
        const goButton = document.getElementById('goButton');
        goButton.disabled = true;
        goButton.textContent = 'Loading...';

        fetch(`https://sjtdu9sez2.execute-api.us-east-1.amazonaws.com/deploy/?official_name=${encodeURIComponent(officialName)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }
                return response.text();
            })
            .then(data => {
                // Store the fetched data in sessionStorage
                sessionStorage.setItem('resortData', data);
                // Redirect to resort.html
                window.location.href = `resort.html?official_name=${encodeURIComponent(officialName)}`;
            })
            .catch(error => {
                console.error('Error fetching resort data:', error);
                alert('Error fetching resort data: ' + error.message);
            })
            .finally(() => {
                document.body.style.cursor = 'default';
                goButton.disabled = false;
                goButton.textContent = 'Go';
            });
    } else {
        alert("Please select a ski resort");
    }
}