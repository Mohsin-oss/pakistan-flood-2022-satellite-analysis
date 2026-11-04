// Start with one day. Edit the range to screen other dates.
var range = dailyRange('2022-08-29');
var optical = s2.filterDate(range);
var sar = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi)
  .filterDate(range).filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));
var modis = ee.ImageCollection('MODIS/061/MOD09GA').filterBounds(aoi).filterDate(range);
var opticalValid = valid(composite([range]));
var sarValid = sar.select('VV').merge(ee.ImageCollection([
  ee.Image.constant(0).rename('VV').selfMask()
])).mosaic();
var modisValid = modis.select('sur_refl_b04').merge(ee.ImageCollection([
  ee.Image.constant(0).rename('sur_refl_b04').selfMask()
])).mosaic();
var stats = summarize([
  km2(ee.Image.constant(1), 'aoi_km2'), km2(opticalValid, 's2_clear_km2'),
  km2(valid(sarValid), 's1_vv_footprint_km2'),
  km2(valid(modisValid), 'modis_green_footprint_km2')
]);
exportRows('stage1_sensor_coverage', [ee.Feature(null, stats).set({
  date: range.start().format('YYYY-MM-dd'), s2_granules: optical.size(),
  s2_tiles: optical.aggregate_array('MGRS_TILE').distinct().sort().join('|'),
  s1_granules: sar.size(), modis_granules: modis.size()
})]);
