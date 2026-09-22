const fs = require("fs");
const path = require("path");
const xml = fs.readFileSync(path.join(__dirname, "../blog/images/how-to-tag/osm-hill.xml"), "utf8");
const existing = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../blog/images/how-to-tag/osm-guide-examples.geojson"), "utf8")
);

const nodes = {};
for (const m of xml.matchAll(/<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g)) {
  nodes[m[1]] = [+m[3], +m[2]];
}

function wayFeat(id, kind) {
  const block = xml.match(new RegExp(`<way id="${id}"[\\s\\S]*?</way>`))[0];
  const tags = { kind, osm_type: "way", osm_id: id };
  for (const t of block.matchAll(/<tag k="([^"]+)" v="([^"]*)"/g)) tags[t[1]] = t[2];
  const coords = [...block.matchAll(/<nd ref="(\d+)"/g)].map((x) => nodes[x[1]]).filter(Boolean);
  const closed = coords.length >= 4 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1];
  return {
    type: "Feature",
    properties: tags,
    geometry: closed ? { type: "Polygon", coordinates: [coords] } : { type: "LineString", coordinates: coords },
  };
}

const extras = [
  wayFeat("419774830", "pistepoly"),
  wayFeat("419774825", "pistepoly"),
  wayFeat("1219914249", "pistepoly-wood"),
  wayFeat("44670035", "nordic"),
];

existing.features = existing.features.filter((f) => !["pistepoly", "pistepoly-wood", "nordic"].includes(f.properties.kind));
existing.features.push(...extras);
const out = path.join(__dirname, "../blog/images/how-to-tag/osm-guide-examples.geojson");
fs.writeFileSync(out, JSON.stringify(existing));
console.log(extras.map((f) => [f.properties.kind, f.properties.osm_id || f.properties.name, f.geometry.type, f.geometry.coordinates[0].length || f.geometry.coordinates.length]));
