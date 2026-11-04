// Check individual files and the exact concatenations used in Code Editor.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const directory = 'gee';
const common = fs.readFileSync(directory + '/00_common.js', 'utf8');
const entries = fs.readdirSync(directory).filter(name => /^0[1-5]_.*\.js$/.test(name));
assert.equal(entries.length, 5);
const aoi = JSON.parse(fs.readFileSync('configs/aoi.json', 'utf8'));
const bounds = common.match(/ee\.Geometry\.Rectangle\((\[[^\]]+\])/)[1];
assert.deepEqual(JSON.parse(bounds), aoi.bbox);
new vm.Script(common, {filename: '00_common.js'});
for (const entry of entries) {
  const code = fs.readFileSync(directory + '/' + entry, 'utf8');
  new vm.Script(code, {filename: entry});
  new vm.Script(common + '\n' + code, {filename: 'combined_' + entry});
}
console.log('Five Earth Engine entry points and shared code parse. AOI matches config.');
