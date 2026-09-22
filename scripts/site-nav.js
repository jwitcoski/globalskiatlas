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
      '<a class="header-links" href="' + href("wiki/main.html") + '" role="menuitem">Resort pages</a>' +
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

    if (!document.getElementById("gsa-skip")) {
    var skip = document.createElement("a");
    skip.id = "gsa-skip";
    skip.className = "skip-link";
    skip.href = "#main";
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
  }
  if (!document.getElementById("main")) {
    var mainTarget = document.querySelector(".map-wrapper, main, section");
    if (mainTarget) mainTarget.id = "main";
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".header-dropdown-group.is-open").forEach(function (g) {
      g.classList.remove("is-open");
    });
  });
  document.querySelectorAll(".header-dropdown-group").forEach(function (g) {
    g.addEventListener("focusin", function () {
      g.classList.add("is-open");
    });
    g.addEventListener("focusout", function (ev) {
      if (!g.contains(ev.relatedTarget)) g.classList.remove("is-open");
    });
  });
})();
