// STAGE 1 — SATELLITE AVAILABILITY AUDIT
// Pakistan floods, provisional Dadu–Qambar AOI

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var START = '2022-08-15';
var END   = '2022-09-16';

var CLEAR = 0.60;

Map.centerObject(aoi, 8);
Map.addLayer(aoi, {color: 'yellow'}, 'Study AOI');

// 1. SENSOR COLLECTIONS

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filterDate(START, END)
  .filter(ee.Filter.eq('instrumentMode', 'IW'));

var s2 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
).filterBounds(aoi).filterDate(START, END);

var cs = ee.ImageCollection(
  'GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED'
).filterBounds(aoi).filterDate(START, END);

var terra = ee.ImageCollection(
  'MODIS/061/MOD09GA'
).filterBounds(aoi).filterDate(START, END);

var aqua = ee.ImageCollection(
  'MODIS/061/MYD09GA'
).filterBounds(aoi).filterDate(START, END);

print('Sentinel-1 scenes:', s1.size());
print('Sentinel-2 tiles:', s2.size());
print('MODIS Terra granules:', terra.size());
print('MODIS Aqua granules:', aqua.size());

// These are image counts, not guaranteed full-AOI observations.

// 2. UNIQUE SENTINEL-1 ACQUISITION DATES

var s1Dates = ee.List(
  s1.aggregate_array('system:time_start')
).map(function(t) {
  return ee.Date(t).format('YYYY-MM-dd');
}).distinct().sort();

print('Sentinel-1 dates:', s1Dates);

// 3. LINK SENTINEL-2 WITH CLOUD SCORE+

var linked = s2.linkCollection(cs, ['cs_cdf'])
  .map(function(img) {
    return img.set(
      'date_key',
      img.date().format('YYYY-MM-dd')
    );
  });

var dates = ee.List(
  linked.aggregate_array('date_key')
).distinct().sort();

print('Sentinel-2 unique dates:', dates);

// 4. BUILD DAILY CLEAR-COVERAGE STACK
// One band per observation date.

var stack = ee.Image(
  dates.iterate(function(d, previous) {

    d = ee.String(d);

    var daily = linked.filter(
      ee.Filter.eq('date_key', d)
    );

    var clear = daily.map(function(img) {

      var valid = img.select('B3').mask()
        .and(img.select('B11').mask());

      return img.select('cs_cdf')
        .gte(CLEAR)
        .and(valid)
        .unmask(0)
        .rename('clear')
        .toByte();

    }).max().unmask(0);

    var bandName = ee.String('D').cat(
      ee.Date(d).format('YYYYMMdd')
    );

    return ee.Image(previous).addBands(
      clear.rename(bandName)
    );

  }, ee.Image(0).rename('placeholder'))
).select('D.*');

// 5. ONE SPATIAL AGGREGATION

var stats = stack.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 250,
  maxPixels: 1e9,
  tileScale: 8
});

// 6. DATE AND COVERAGE TABLE

var records = ee.FeatureCollection(
  dates.map(function(d) {

    d = ee.String(d);

    var band = ee.String('D').cat(
      ee.Date(d).format('YYYYMMdd')
    );

    return ee.Feature(null, {
      date: d,
      clear_percent: ee.Number(
        stats.get(band)
      ).multiply(100)
    });
  })
);

var usable = records
  .filter(ee.Filter.gte('clear_percent', 50))
  .sort('date');

print('Usable Sentinel-2 dates:',
  usable.aggregate_array('date'));

print('Clear coverage (%):',
  usable.aggregate_array('clear_percent'));

print('STAGE 1 AUDIT COMPLETE');
