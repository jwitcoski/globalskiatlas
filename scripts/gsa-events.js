/** GA4 helpers for existing gtag (G-KJGNL3KJL0). No extra vendors. */
(function () {
  var once = Object.create(null);
  var MID = "G-KJGNL3KJL0";
  var host = (location.hostname || "").toLowerCase();
  var isLocal = host === "localhost" || host === "127.0.0.1";

  if (isLocal) {
    window["ga-disable-" + MID] = true;
  }

  function linkDomain(href) {
    try {
      return new URL(href, location.href).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function resortParam() {
    var el = document.getElementById("resort-title") || document.querySelector("[data-resort-name]");
    if (el) {
      var t = (el.getAttribute("data-resort-name") || el.textContent || "").trim();
      if (t) return t;
    }
    var q = new URLSearchParams(location.search);
    return q.get("resort") || q.get("q") || "";
  }

  window.gsaEvent = function (name, params) {
    if (isLocal || typeof gtag !== "function") return;
    gtag("event", name, Object.assign({ send_to: MID }, params || {}));
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
  var onDownloadPage = /DownloadData\.html$/i.test(location.pathname) || /\/DownloadData$/i.test(path);

  function bindGlobal() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var domain = linkDomain(href);
      if (domain === "stay22.com" || /\.stay22\.com$/i.test(domain)) {
        var resort = resortParam();
        if (resort === "Loading…") resort = "";
        window.gsaEvent("stay22_click", {
          link_domain: domain || "stay22.com",
          link_url: href,
          resort: resort,
        });
      }
      if (onDownloadPage && a.closest(".download-card")) {
        window.gsaEvent("data_download", {
          link_domain: domain,
          link_url: href,
          file_name: (href.split("/").pop() || "").split("?")[0],
        });
      }
    });

    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || form.tagName !== "FORM") return;
      if (form.classList.contains("newsletter-form") || form.querySelector("#newsletter-email")) {
        window.gsaEvent("newsletter_signup", { form_id: form.id || "newsletter" });
        window.gsaEvent("form_submit", { form_id: form.id || "newsletter", form_type: "newsletter" });
        return;
      }
      if (/formspree\.io/i.test(form.getAttribute("action") || "")) {
        window.gsaEvent("form_submit", { form_id: form.id || form.className || "formspree" });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindGlobal);
  else bindGlobal();

  if (!onHome) return;

  window.gsaEventOnce("homepage_view");

  function bindHome() {
    var cta = document.querySelector("[data-hero-full-map], [data-hero-open-mountain]");
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
