// STAGE 5 — MULTITEMPORAL INUNDATION COMPARISON
//
// Run two windows on one common spatial domain.
// Change WINDOW_A and WINDOW_B below.
//
// All classification settings remain locked.

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var CLEAR = 0.60;
var T_EVENT = 0.10994999254541872;
var T_CHANGE = 0.4200440926570086;
var MIN_PIXELS = 25;

// 1. CHECKPOINT CATALOGUE

var WINDOWS = {

  aug_29_31: [
    '2022-08-29', '2022-08-31'
  ],

  sep_03_05: [
    '2022-09-03', '2022-09-05'
  ],

  sep_08_10: [
    '2022-09-08', '2022-09-10'
  ],

  sep_13_15: [
    '2022-09-13', '2022-09-15'
  ],

  sep_18_20: [
    '2022-09-18', '2022-09-20'
  ],

  sep_28_30: [
    '2022-09-28', '2022-09-30'
  ],

  oct_08_10: [
    '2022-10-08', '2022-10-10'
  ],

  oct_18_20: [
    '2022-10-18', '2022-10-20'
  ],

  oct_28_30: [
    '2022-10-28', '2022-10-30'
  ],

  nov_27_29: [
    '2022-11-27', '2022-11-29'
  ],

  dec_27_29: [
    '2022-12-27', '2022-12-29'
  ],

  jan_28_31: [
    '2023-01-28', '2023-01-31'
  ],

  feb_15_17: [
    '2023-02-15', '2023-02-17'
  ],

  mar_07_09: [
    '2023-03-07', '2023-03-09'
  ],

  apr_21_23: [
    '2023-04-21', '2023-04-23'
  ],

  may_16_18: [
    '2023-05-16', '2023-05-18'
  ],

  jun_02_05: [
    '2023-06-02', '2023-06-05'
  ],

  jun_17_20: [
    '2023-06-17', '2023-06-20'
  ],

  jun_22_25: [
    '2023-06-22', '2023-06-25'
  ]

};

// 2. SELECT COMPARISON

var WINDOW_A = 'aug_29_31';
var WINDOW_B = 'sep_03_05';

// Example for June:
// var WINDOW_A = 'jun_17_20';
// var WINDOW_B = 'jun_22_25';

var datesA = WINDOWS[WINDOW_A];
var datesB = WINDOWS[WINDOW_B];

// 3. COMPOSITE BUILDER

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

  return s2
    .linkCollection(cs, ['cs_cdf'])
    .map(function(img) {
      return img.set(
        'date_key',
        img.date().format('YYYY-MM-dd')
      );
    })
    .filter(
      ee.Filter.inList('date_key', dates)
    )
    .map(function(img) {
      return img
        .updateMask(
          img.select('cs_cdf').gte(CLEAR)
        )
        .select(['B3', 'B11']);
    })
    .median()
    .clip(aoi);
}

// 4. BASELINE AND TWO OBSERVATIONS

var baseline = composite([
  '2022-05-06',
  '2022-05-11',
  '2022-05-18',
  '2022-05-26',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
]);

var imageA = composite(datesA);
var imageB = composite(datesB);

// 5. COMMON VALID DOMAIN

function validMask(img) {

  return img.mask().reduce(
    ee.Reducer.min()
  );
}

var common = validMask(baseline)
  .and(validMask(imageA))
  .and(validMask(imageB));

// 6. LOCKED CLASSIFIER

var baselineMNDWI = baseline
  .normalizedDifference(['B3', 'B11']);

var flatTerrain = ee.Terrain.slope(
  ee.Image('USGS/SRTMGL1_003')
).lte(5);

function classify(img) {

  var mndwi = img
    .normalizedDifference(['B3', 'B11']);

  var delta = mndwi.subtract(
    baselineMNDWI
  );

  var candidate = mndwi
    .gt(T_EVENT)
    .and(delta.gt(T_CHANGE))
    .and(baselineMNDWI.lte(T_EVENT))
    .updateMask(common)
    .updateMask(flatTerrain)
    .selfMask();

  var connected = candidate
    .connectedPixelCount(100, true);

  return candidate
    .updateMask(
      connected.gte(MIN_PIXELS)
    )
    .selfMask();
}

// 7. AREA RASTERS

var classA = classify(imageA);
var classB = classify(imageB);

var px = ee.Image.pixelArea()
  .divide(1e6);

var areaStack = ee.Image.cat([

  px.updateMask(common)
    .rename('DOMAIN'),

  px.updateMask(classA)
    .rename('AREA_A'),

  px.updateMask(classB)
    .rename('AREA_B')

]);

// 8. ONE AREA AGGREGATION

var totals = areaStack.reduceRegion({

  reducer: ee.Reducer.sum(),

  geometry: aoi,

  scale: 20,

  maxPixels: 1e10,

  tileScale: 8

});

function value(name) {

  return ee.Number(
    ee.Algorithms.If(
      totals.get(name),
      totals.get(name),
      0
    )
  );
}

var domain = value('DOMAIN');
var areaA = value('AREA_A');
var areaB = value('AREA_B');

// 9. EXPORT RESULTS

var result = ee.Feature(null, {

  window_a: WINDOW_A,
  window_b: WINDOW_B,

  matched_domain_km2: domain,

  classified_a_km2: areaA,
  classified_b_km2: areaB,

  classified_a_percent:
    areaA.divide(domain).multiply(100),

  classified_b_percent:
    areaB.divide(domain).multiply(100),

  change_b_minus_a_km2:
    areaB.subtract(areaA)

});

var exportName =
  'stage04_' + WINDOW_A + '_' + WINDOW_B;

Export.table.toDrive({

  collection: ee.FeatureCollection([result]),

  description: exportName,

  folder: 'Pakistan_Flood_Research',

  fileNamePrefix: exportName,

  fileFormat: 'CSV'
});

// 10. OPTIONAL MAP

Map.centerObject(aoi, 8);

Map.addLayer(
  classA,
  {palette: ['FFAA00']},
  WINDOW_A,
  false
);

Map.addLayer(
  classB,
  {palette: ['00FFFF']},
  WINDOW_B,
  false
);

print('Comparison export configured:', exportName);
