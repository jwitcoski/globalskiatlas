/**
 * Shared consumer nav: 3D first, Decide, Explore, Contribute. No book pitch.
 * Replaces .header-nav-inner when present.
 */
(function () {
  var path = (location.pathname || "").replace(/\\/g, "/");
  var prefix = "";
  if (/\/blog\//.test(path) || /\/wiki\//.test(path) || /\/playable\//.test(path)) {
    prefix = "../";
  }

  function href(file) {
    if (file.charAt(0) === "/") return file;
    return prefix + file;
  }

  var inner = document.querySelector(".header-nav-inner");
  if (!document.querySelector('link[data-gsa-banner-css]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.setAttribute("data-gsa-banner-css", "1");
    css.href = prefix + "css/gsa-job-banner.css";
    document.head.appendChild(css);
  }
  var homePath = path.replace(/\/+$/, "") || "/";
  var onHome = homePath === "/" || /\/index\.html$/i.test(homePath);

  if (inner) {
    inner.innerHTML =
      '<div class="header-dropdown-group">' +
      '<a class="header-tab header-links" href="' + href("index.html") + '" aria-haspopup="true">3D maps <i class="bi bi-chevron-down tw-text-xs"></i></a>' +
      '<div class="header-dropdown" role="menu">' +
      '<a class="header-links" href="' + href("index.html") + '" role="menuitem">Nearest 3D map</a>' +
      '<a class="header-links" href="' + href("/playable/") + '" role="menuitem">Ski Game</a>' +
      "</div></div>" +
      '<div class="header-dropdown-group">' +
      '<a class="header-tab header-links" href="' + href("DriveTimeMap.html") + '" aria-haspopup="true">Decide <i class="bi bi-chevron-down tw-text-xs"></i></a>' +
      '<div class="header-dropdown" role="menu">' +
      '<a class="header-links" href="' + href("DriveTimeMap.html") + '" role="menuitem">Drive Time</a>' +
      '<a class="header-links" href="' + href("resort-comparison.html") + '?near=1"' + (onHome ? " data-compare-current" : "") + ' role="menuitem">Compare</a>' +
      '<a class="header-links" href="' + href("pass-review.html") + '" role="menuitem">Pass match review</a>' +
      '<a class="header-links" href="' + href("TripPlannerMap.html") + '" role="menuitem">Trip Planner</a>' +
      "</div></div>" +
      '<div class="header-dropdown-group">' +
      '<a class="header-tab header-links" href="' + href("mainmap.html") + '" aria-haspopup="true">Explore <i class="bi bi-chevron-down tw-text-xs"></i></a>' +
      '<div class="header-dropdown" role="menu">' +
      '<a class="header-links" href="' + href("mainmap.html") + '" role="menuitem">Interactive map</a>' +
      '<a class="header-links" href="' + href("wiki/browse.html") + '" role="menuitem">Resort pages</a>' +
      '<a class="header-links" href="' + href("weather-map.html") + '" role="menuitem">Weather</a>' +
      "</div></div>" +
      '<div class="header-dropdown-group">' +
      '<a class="header-tab header-links" href="' + href("blog/how-to-tag-a-ski-resort-in-openstreetmap.html") + '" aria-haspopup="true">Contribute <i class="bi bi-chevron-down tw-text-xs"></i></a>' +
      '<div class="header-dropdown" role="menu">' +
      '<a class="header-links" href="' + href("blog/how-to-tag-a-ski-resort-in-openstreetmap.html") + '" role="menuitem">Edit OSM</a>' +
      '<a class="header-links" href="' + href("wiki/browse.html") + '" role="menuitem">Write wiki</a>' +
      "</div></div>" +
      '<a class="header-links" href="' + href("blog/index.html") + '">Blog</a>' +
      '<a class="header-links" href="' + href("coffee-table-book.html") + '">Book</a>' +
      '<a class="header-links" href="' + href("about.html") + '">About</a>';
  }

  document.querySelectorAll('a.footer-link[href$="bookpitch.html"], a.header-links[href$="bookpitch.html"]').forEach(function (a) {
    a.remove();
  });

  var kind = document.body && document.body.getAttribute("data-gsa-banner");
  if (!kind) return;
  var copy = {
    drive: {
      title: "Local hills within a few hours",
      next: "Open a resort in 3D from the popup, then edit OSM if trails look thin.",
    },
    map: {
      title: "Every resort on one map",
      next: "Open 3D map or Ski Game from a pin. Wiki pages are for writing the place.",
    },
    compare: {
      title: "Pick between two mountains",
      next: "Ski the winner in 3D before you book.",
    },
    wiki: {
      title: "3D map + write-up for this place",
      next: "If the clay trails look wrong, edit OSM. If the page is empty, be the first to write it.",
    },
  }[kind];
  if (!copy) return;
  var bar = document.createElement("div");
  bar.className = "gsa-job-banner";
  bar.innerHTML =
    "<strong>" +
    copy.title +
    "</strong> " +
    copy.next +
    ' <a href="' +
    href("index.html") +
    '">Home 3D</a> · <a href="' +
    href("/playable/") +
    '">Ski Game</a>';
  document.body.insertBefore(bar, document.body.firstChild);
})();
