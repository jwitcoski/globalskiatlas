document.addEventListener("DOMContentLoaded", function() {
    const goButton = document.getElementById("goButton");
    if (goButton) {
        goButton.addEventListener("click", fetchResortData);
    }
}); 