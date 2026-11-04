// STAGE 2 — PRE-FLOOD BASELINE CONSTRUCTION
// Seven-date composite selected in research

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var CLEAR = 0.60;

Map.centerObject(aoi, 8);

// 1. COMPOSITE FUNCTION

function composite(dates) {

  var start = ee.Date(dates[0]);

  var end = ee.Date(
    dates[dates.length - 1]
  ).advance(1, 'day');

  var s2 = ee.ImageCollection(
    'COPERNICUS/S2_SR_HARMONIZED'
  )
  .filterBounds(aoi)
  .filterDate(start, end);

  var cs = ee.ImageCollection(
    'GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED'
  )
  .filterBounds(aoi)
  .filterDate(start, end);

  var linked = s2.linkCollection(
    cs, ['cs_cdf']
  );

  return linked
    .map(function(img) {
      return img.set(
        'date_key',
        img.date().format('YYYY-MM-dd')
      );
    })
    .filter(ee.Filter.inList('date_key', dates))
    .map(function(img) {

      return img
        .updateMask(
          img.select('cs_cdf').gte(CLEAR)
        )
        .select([
          'B2', 'B3', 'B4',
          'B8', 'B11', 'B12'
        ]);
    })
    .median()
    .clip(aoi);
}

// 2. ORIGINAL FOUR-DATE BASELINE

var fourDates = [
  '2022-05-18',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
];

var baseline4 = composite(fourDates);

// 3. FINAL SEVEN-DATE BASELINE

var sevenDates = [
  '2022-05-06',
  '2022-05-11',
  '2022-05-18',
  '2022-05-26',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
];

var baseline7 = composite(sevenDates);

// 4. VALID-PIXEL MASKS

function validMask(img) {

  return img.select([
    'B3', 'B11'
  ]).mask().reduce(ee.Reducer.min());
}

var valid4 = validMask(baseline4);
var valid7 = validMask(baseline7);

// 5. COVERAGE CALCULATION

var px = ee.Image.pixelArea();

var areaStack = ee.Image.cat([

  px.rename('total'),

  px.updateMask(valid4).rename('four'),

  px.updateMask(valid7).rename('seven')

]);

var stats = areaStack.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e10,
  tileScale: 8
});

var total = ee.Number(stats.get('total'));
var area4 = ee.Number(stats.get('four'));
var area7 = ee.Number(stats.get('seven'));

print('Four-date coverage (%):',
  area4.divide(total).multiply(100));

print('Seven-date coverage (%):',
  area7.divide(total).multiply(100));

// 6. VISUAL INSPECTION

var rgb = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000
};

Map.addLayer(
  baseline4,
  rgb,
  'Original 4-date baseline',
  false
);

Map.addLayer(
  baseline7,
  rgb,
  'Final 7-date baseline'
);

Map.addLayer(
  valid7.selfMask(),
  {palette: ['00FF00']},
  'Valid 7-date coverage',
  false
);

print('STAGE 2 BASELINE COMPLETE');
