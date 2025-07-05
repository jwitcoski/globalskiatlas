document.addEventListener('DOMContentLoaded', function() {
    // Get the modal
    var modal = document.getElementById('imageModal');
    
    // Get the image and insert it inside the modal
    var modalImg = document.getElementById("imgModal");
    
    // Get all images that should open the modal
    var images = document.querySelectorAll('.image-section img, .media-section img');
    
    // Attach click event to each image
    images.forEach(function(img) {
        img.onclick = function() {
            modal.style.display = "block";
            modalImg.src = this.src;
        }
    });
    
    // Get the <span> element that closes the modal
    var span = document.getElementById("closeModal");
    
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() { 
        modal.style.display = "none";
    }
    
    // Close the modal when clicking outside the image
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }
});
