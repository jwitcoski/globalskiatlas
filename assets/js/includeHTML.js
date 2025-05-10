// Define includeHTML as a global function
function includeHTML(callback) {
  var z, i, elmnt, file, xhttp;
  /* Loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  
  // Check if there are any includes left
  var hasIncludes = false;
  for (i = 0; i < z.length; i++) {
      if (z[i].getAttribute("include-html")) {
          hasIncludes = true;
          break;
      }
  }
  
  // If no includes left, run callback and exit
  if (!hasIncludes && typeof callback === 'function') {
      callback();
      return;
  }
  
  for (i = 0; i < z.length; i++) {
      elmnt = z[i];
      /*search for elements with a certain attribute:*/
      file = elmnt.getAttribute("include-html");
      if (file) {
          /* Make an HTTP request using the attribute value as the file name: */
          xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
              if (this.readyState == 4) {
                  if (this.status == 200) {elmnt.innerHTML = this.responseText;}
                  if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
                  /* Remove the attribute, and call this function once more: */
                  elmnt.removeAttribute("include-html");
                  includeHTML(callback);
              }
          }
          xhttp.open("GET", file, true);
          xhttp.send();
          /* Exit the function: */
          return;
      }
  }
}

// Auto-execute on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
  // Only auto-execute if not being called from elsewhere
  if (!window.includeHTMLCalled) {
    includeHTML();
  }
});