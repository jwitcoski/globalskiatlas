const assert = require("assert");
const { linkResortMentions } = require("./ai-resort-links.js");

const pages = [
  { pageId: "aspen-snowmass-colorado-united-states", englishName: "Aspen Snowmass", pageType: "resort" },
  { pageId: "st-anton-austria", title: "St. Anton", pageType: "resort" },
  { pageId: "whistler-blackcomb-canada", englishName: "Whistler Blackcomb", pageType: "resort" },
  { pageId: "country-austria", title: "Austria", pageType: "country" },
  { pageId: "vail-a", name: "Vail" },
  { pageId: "vail-b", name: "Vail" },
  { pageId: "unknown-vologda", name: "Freestyle" },
  { pageId: "breckenridge-colorado", name: "Breckenridge" },
];

const html = linkResortMentions(
  "Try Aspen Snowmass, then St. Anton or Whistler Blackcomb. Austria and Vail stay plain. <script>",
  pages
);

assert.ok(html.includes('href="/wiki/resort.html?page=aspen-snowmass-colorado-united-states"'));
assert.ok(html.includes('href="/wiki/resort.html?page=st-anton-austria"'));
assert.ok(html.includes('href="/wiki/resort.html?page=whistler-blackcomb-canada"'));
assert.ok(!html.includes("page=country-austria"));
assert.ok(!/>Vail</.test(html) && html.includes("Vail"));
assert.ok(html.includes("&lt;script&gt;"));
assert.ok(!html.includes("Aspen</a> Snowmass"));

const md = linkResortMentions(
  "### Making coffee\n\n#### Equipment:\n1. **French Press**: rich flavor at Whistler Blackcomb.\n- Insulated mug\n\nPlain line.",
  pages
);
assert.ok(md.includes("<h3>Making coffee</h3>"));
assert.ok(md.includes("<h4>Equipment:</h4>"));
assert.ok(md.includes("<strong>French Press</strong>"));
assert.ok(md.includes("<ol>") && md.includes("<ul>"));
assert.ok(md.includes('href="/wiki/resort.html?page=whistler-blackcomb-canada"'));
assert.ok(!md.includes("###"));

const places = linkResortMentions(
  "Try freestyle skiing, then ski at Breckenridge. Breckenridge alone stays plain.",
  pages
);
assert.ok(!places.includes("unknown-vologda"));
assert.ok(places.includes("breckenridge-colorado"));
assert.equal((places.match(/breckenridge-colorado/g) || []).length, 1);
console.log("ai-resort-links ok");
