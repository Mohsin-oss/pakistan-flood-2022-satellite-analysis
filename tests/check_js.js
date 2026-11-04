// Check that each standalone Code Editor script parses and uses the configured AOI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const entries = fs.readdirSync('gee').filter(name => name.endsWith('.js')).sort();
assert.deepEqual(entries.map(name => name.slice(0, 2)), ['01', '02', '03', '04', '05', '06']);
const aoi = JSON.parse(fs.readFileSync('configs/aoi.json', 'utf8'));
for (const entry of entries) {
  const code = fs.readFileSync('gee/' + entry, 'utf8');
  const bounds = code.match(/ee\.Geometry\.Rectangle\(\s*(\[[^\]]+\])/);
  assert.ok(bounds, 'Expected a rectangle in ' + entry);
  assert.deepEqual(JSON.parse(bounds[1]), aoi.bbox, entry);
  new vm.Script(code, {filename: entry});
}
console.log('Six standalone Earth Engine scripts parse and match the configured AOI.');
