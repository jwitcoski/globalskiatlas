/**
 * Assert createMapLibre wires window + visualViewport resize handlers.
 * Run: node scripts/tests/map-core-resize-check.js
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../map-core.js'), 'utf8');
const need = [
  "window.addEventListener('resize', onResize)",
  'visualViewport?.addEventListener',
  'map.resize()'
];
for (const fragment of need) {
  if (!src.includes(fragment)) {
    console.error('missing resize wiring:', fragment);
    process.exit(1);
  }
}
console.log('map-core resize wiring ok');
