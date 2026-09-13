#!/usr/bin/env node
/**
 * Write MAPBOX_ACCESS_TOKEN into scripts/map-config.js at deploy time
 * so the public pk token is not stored in git (GitHub push protection).
 */
const fs = require('fs');
const path = require('path');

const token = String(process.env.MAPBOX_ACCESS_TOKEN || '').trim().replace(/'/g, '');
const file = path.join(__dirname, 'map-config.js');
let src = fs.readFileSync(file, 'utf8');
if (!/const MAPBOX_ACCESS_TOKEN = '/.test(src)) {
  console.error('map-config.js is missing MAPBOX_ACCESS_TOKEN');
  process.exit(1);
}
src = src.replace(
  /const MAPBOX_ACCESS_TOKEN = '[^']*'/,
  `const MAPBOX_ACCESS_TOKEN = '${token}'`
);
fs.writeFileSync(file, src);
console.log(token ? 'Injected MAPBOX_ACCESS_TOKEN into map-config.js' : 'MAPBOX_ACCESS_TOKEN not set; Drive Time will show a warning');
