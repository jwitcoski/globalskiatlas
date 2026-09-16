/** GA4 helpers for existing gtag (G-KJGNL3KJL0). No extra vendors. */
(function () {
  var once = Object.create(null);

  window.gsaEvent = function (name, params) {
    if (typeof gtag !== "function") return;
    gtag("event", name, Object.assign({ send_to: "G-KJGNL3KJL0" }, params || {}));
  };

  window.gsaEventOnce = function (name, params) {
    if (once[name]) return;
    once[name] = true;
    window.gsaEvent(name, params);
  };

  window.gsaLoadAds = function () {
    if (window.__gsaAdsLoaded) return;
    window.__gsaAdsLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  };

  var path = (location.pathname || "").replace(/\/+$/, "") || "/";
  var onHome = path === "/" || /\/index\.html$/i.test(path);
  if (!onHome) return;

  window.gsaEventOnce("homepage_view");

  function bindHome() {
    var cta = document.querySelector("[data-hero-open-mountain]");
    if (cta) {
      cta.addEventListener("click", function () {
        window.gsaEvent("hero_primary_tap", { mountain: cta.getAttribute("data-mountain") || cta.textContent.trim() });
      });
    }
    var form = document.getElementById("home-search");
    var input = document.getElementById("home-search-q");
    if (input) {
      input.addEventListener("focus", function () {
        window.gsaEventOnce("home_search_focus");
      });
    }
    if (form) {
      form.addEventListener("submit", function () {
        var q = input ? String(input.value || "").trim() : "";
        window.gsaEvent("home_search_submit", { q: q });
      });
    }
    document.addEventListener("click", function (e) {
      var play = e.target.closest("[data-hero-play], #ski-game-missing-go");
      if (play) window.gsaEvent("playable_start", { href: play.getAttribute("href") || "" });
    });
    function onReady() {
      window.gsaLoadAds();
    }
    if (typeof requestIdleCallback !== "undefined") requestIdleCallback(onReady, { timeout: 4000 });
    else setTimeout(onReady, 2500);
    document.addEventListener("pointerdown", onReady, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindHome);
  else bindHome();
})();
