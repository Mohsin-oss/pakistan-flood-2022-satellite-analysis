// STAGE 5 — MATCHED-DOMAIN RECOVERY COMPARISON
//
// Two post-flood checkpoints
// Six pre-flood April holdouts
// Same spatial domain for every comparison
//
// Batch CSV export

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var CLEAR = 0.60;
var T_EVENT = 0.10994999254541872;
var T_CHANGE = 0.4200440926570086;
var MIN_PIXELS = 25;

// 1. SELECT TWO CHECKPOINTS

var WINDOWS = {

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

// Change these two variables for another comparison.

var WINDOW_A = 'jun_17_20';
var WINDOW_B = 'jun_22_25';

// 2. COMPOSITE FUNCTION

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

// 3. ORIGINAL PRE-FLOOD BASELINE

var baseline = composite([
  '2022-05-06',
  '2022-05-11',
  '2022-05-18',
  '2022-05-26',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
]);

// 4. SIX APRIL 2022 HOLDOUTS

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

// 5. TWO POST-FLOOD COMPOSITES

var imageA = composite(
  WINDOWS[WINDOW_A]
);

var imageB = composite(
  WINDOWS[WINDOW_B]
);

// 6. CALIBRATION AND MATCHED MASKS

function validMask(img) {

  return img.mask().reduce(
    ee.Reducer.min()
  );
}

var calibrationMask = validMask(baseline);

holdouts.forEach(function(img) {

  calibrationMask = calibrationMask.and(
    validMask(img)
  );

});

var validA = calibrationMask.and(
  validMask(imageA)
);

var validB = calibrationMask.and(
  validMask(imageB)
);

var matchedMask = validA.and(validB);

// 7. LOCKED CLASSIFIER

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
    .updateMask(matchedMask)
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

// 8. CLASSIFIED AREA BANDS

var px = ee.Image.pixelArea()
  .divide(1e6);

function areaBand(img, name) {

  return px
    .multiply(
      classify(img).unmask(0)
    )
    .updateMask(matchedMask)
    .rename(name);
}

var backgroundBands = holdouts.map(
  function(img, i) {

    return areaBand(
      img,
      names[i]
    );

  }
);

var bandA = areaBand(
  imageA,
  'AREA_A'
);

var bandB = areaBand(
  imageB,
  'AREA_B'
);

// 9. DOMAIN BANDS

var calibrationBand = px
  .updateMask(calibrationMask)
  .rename('CALIBRATION');

var validABand = px
  .updateMask(validA)
  .rename('VALID_A');

var validBBand = px
  .updateMask(validB)
  .rename('VALID_B');

var matchedBand = px
  .updateMask(matchedMask)
  .rename('MATCHED');

// 10. SINGLE AREA AGGREGATION

var stack = ee.Image.cat(

  [
    calibrationBand,
    validABand,
    validBBand,
    matchedBand
  ]
  .concat(backgroundBands)
  .concat([bandA, bandB])

);

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

// 11. PRE-FLOOD STATISTICS

var backgrounds = ee.List(
  names.map(function(name) {
    return value(name);
  })
);

var mean = ee.Number(
  backgrounds.reduce(
    ee.Reducer.mean()
  )
);

var squared = backgrounds.map(function(x) {

  return ee.Number(x)
    .subtract(mean)
    .pow(2);
});

// Sample standard deviation

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

// 12. RECOVERY ASSESSMENT

var areaA = value('AREA_A');
var areaB = value('AREA_B');

var passA = areaA.gte(lower)
  .multiply(areaA.lte(upper));

var passB = areaB.gte(lower)
  .multiply(areaB.lte(upper));

var calibrationArea = value('CALIBRATION');
var matchedArea = value('MATCHED');

// 13. EXPORT FEATURE

var result = ee.Feature(null, {

  checkpoint_a: WINDOW_A,

  checkpoint_b: WINDOW_B,

  calibration_domain_km2:
    calibrationArea,

  matched_domain_km2:
    matchedArea,

  matched_coverage_percent:
    matchedArea
      .divide(calibrationArea)
      .multiply(100),

  checkpoint_a_coverage_percent:
    value('VALID_A')
      .divide(calibrationArea)
      .multiply(100),

  checkpoint_b_coverage_percent:
    value('VALID_B')
      .divide(calibrationArea)
      .multiply(100),

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

  classified_a_km2: areaA,

  classified_b_km2: areaB,

  change_b_minus_a_km2:
    areaB.subtract(areaA),

  checkpoint_a_qualifies: passA,

  checkpoint_b_qualifies: passB,

  both_qualify:
    passA.multiply(passB)

});

// 14. BATCH EXPORT

var exportName =
  'stage05_' + WINDOW_A + '_' + WINDOW_B;

Export.table.toDrive({

  collection: ee.FeatureCollection([result]),

  description: exportName,

  folder: 'Pakistan_Flood_Research',

  fileNamePrefix: exportName,

  fileFormat: 'CSV'
});

print(
  'Matched recovery export configured:',
  exportName
);
