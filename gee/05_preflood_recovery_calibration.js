// STAGE 5 — PRE-FLOOD RECOVERY CALIBRATION
//
// Six independent April 2022 holdout windows
// One common valid-pixel domain
// One batch CSV export

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var CLEAR = 0.60;
var T_EVENT = 0.10994999254541872;
var T_CHANGE = 0.4200440926570086;
var MIN_PIXELS = 25;

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

      return img.updateMask(
        img.select('cs_cdf').gte(CLEAR)
      ).select(['B3', 'B11']);

    })
    .median()
    .clip(aoi);
}

// 2. LOCKED MAY–JUNE 2022 BASELINE

var baseline = composite([
  '2022-05-06',
  '2022-05-11',
  '2022-05-18',
  '2022-05-26',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
]);

// 3. INDEPENDENT APRIL HOLDOUTS

var pairs = [
  ['2022-04-01', '2022-04-03'],
  ['2022-04-06', '2022-04-08'],
  ['2022-04-11', '2022-04-13'],
  ['2022-04-16', '2022-04-18'],
  ['2022-04-21', '2022-04-23'],
  ['2022-04-26', '2022-04-28']
];

var names = [
  'APR01', 'APR06', 'APR11',
  'APR16', 'APR21', 'APR26'
];

var holdouts = pairs.map(function(pair) {
  return composite(pair);
});

// 4. CALIBRATION DOMAIN

function validMask(img) {

  return img.mask().reduce(
    ee.Reducer.min()
  );
}

var common = validMask(baseline);

holdouts.forEach(function(img) {

  common = common.and(
    validMask(img)
  );

});

// 5. LOCKED CLASSIFIER

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

// 6. AREA BANDS

var px = ee.Image.pixelArea()
  .divide(1e6);

var backgroundBands = holdouts.map(
  function(img, i) {

    var classified = classify(img);

    return px
      .multiply(classified.unmask(0))
      .updateMask(common)
      .rename(names[i]);
  }
);

var domainBand = px
  .updateMask(common)
  .rename('DOMAIN');

var stack = ee.Image.cat(
  [domainBand].concat(backgroundBands)
);

// 7. SINGLE SPATIAL AGGREGATION

var totals = stack.reduceRegion({

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

// 8. BACKGROUND STATISTICS

var background = ee.List(
  names.map(function(name) {
    return value(name);
  })
);

var mean = ee.Number(
  background.reduce(
    ee.Reducer.mean()
  )
);

var squared = background.map(function(x) {

  return ee.Number(x)
    .subtract(mean)
    .pow(2);
});

// Sample SD: denominator = n - 1 = 5

var sd = ee.Number(
  squared.reduce(
    ee.Reducer.sum()
  )
).divide(5).sqrt();

var lower = mean.subtract(
  sd.multiply(2)
).max(0);

var upper = mean.add(
  sd.multiply(2)
);

// 9. RESULT FEATURE

var result = ee.Feature(null, {

  calibration_domain_km2: value('DOMAIN'),

  april_01_km2: value('APR01'),
  april_06_km2: value('APR06'),
  april_11_km2: value('APR11'),
  april_16_km2: value('APR16'),
  april_21_km2: value('APR21'),
  april_26_km2: value('APR26'),

  preflood_mean_km2: mean,

  preflood_sample_sd_km2: sd,

  recovery_lower_km2: lower,

  recovery_upper_km2: upper,

  holdout_count: 6,

  method: 'mean_plus_minus_2_sample_sd'
});

// 10. BATCH CSV EXPORT

Export.table.toDrive({

  collection: ee.FeatureCollection([result]),

  description: 'stage05_preflood_calibration',

  folder: 'Pakistan_Flood_Research',

  fileNamePrefix: 'stage05_preflood_calibration',

  fileFormat: 'CSV'
});

print('Pre-flood calibration export configured');
