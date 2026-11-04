// Fills every [data-stay-link] with a Stay22 hotel search for the current ?world=.
(function () {
  var GP = "https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/game_play/";

  function stayHref(w, campaign) {
    var inDay = new Date();
    inDay.setDate(inDay.getDate() + 14);
    var outDay = new Date(inDay);
    outDay.setDate(outDay.getDate() + 2);
    var q = new URLSearchParams({
      aid: "6abe4ecf20efb8597f4c40dc",
      lat: String(w.lat),
      lng: String(w.lon),
      checkin: inDay.toLocaleDateString("en-CA"),
      checkout: outDay.toLocaleDateString("en-CA"),
      adults: "2",
      campaign: campaign,
      address: [w.name, w.subtitle].filter(Boolean).join(", "),
    });
    return "https://www.stay22.com/embed/gm?" + q;
  }

  function load() {
    return Promise.all([
      fetch("./data/worlds.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
      fetch(GP + "worlds.json").then(function (r) { return r.json(); }).then(function (j) { return j.resorts || []; }).catch(function () { return []; }),
    ]).then(function (p) { return p[1].concat(p[0]); });
  }

  window.playableStayHref = stayHref;
  window.playableWorlds = load;

  var id = new URLSearchParams(location.search).get("world");
  var links = document.querySelectorAll("[data-stay-link]");
  if (!id || !links.length) return;
  load().then(function (list) {
    var w = list.filter(function (x) { return x.id === id; })[0];
    if (!w) return;
    links.forEach(function (a) {
      a.href = stayHref(w, "playable-" + (a.getAttribute("data-stay-link") || "game"));
      a.hidden = false;
    });
  });
})();
