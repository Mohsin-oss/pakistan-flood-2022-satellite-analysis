// STAGES 3–4 — AUGUST 2022 FLOOD CLASSIFICATION
//
// Event: 29–31 August 2022
// Output: candidate, slope-filtered, final classified area
// Uses one batch CSV export.

var aoi = ee.Geometry.Rectangle([
  67.20, 26.40, 68.60, 28.10
]);

var CLEAR = 0.60;

var T_EVENT = 0.10994999254541872;
var T_CHANGE = 0.4200440926570086;

var MAX_SLOPE = 5;
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

      return img
        .updateMask(
          img.select('cs_cdf').gte(CLEAR)
        )
        .select(['B3', 'B11']);

    })
    .median()
    .clip(aoi);
}

// 2. PRE-FLOOD BASELINE

var baseline = composite([
  '2022-05-06',
  '2022-05-11',
  '2022-05-18',
  '2022-05-26',
  '2022-06-07',
  '2022-06-17',
  '2022-06-27'
]);

// 3. EVENT COMPOSITE

var event = composite([
  '2022-08-29',
  '2022-08-31'
]);

// 4. COMMON VALID DATA MASK

function validMask(img) {

  return img.select(['B3', 'B11'])
    .mask()
    .reduce(ee.Reducer.min());
}

var common = validMask(baseline)
  .and(validMask(event));

// 5. MNDWI

var baselineMNDWI = baseline
  .normalizedDifference(['B3', 'B11']);

var eventMNDWI = event
  .normalizedDifference(['B3', 'B11']);

var delta = eventMNDWI.subtract(
  baselineMNDWI
);

// 6. CANDIDATE NEW INUNDATION

var candidate = eventMNDWI
  .gt(T_EVENT)
  .and(delta.gt(T_CHANGE))
  .and(baselineMNDWI.lte(T_EVENT))
  .updateMask(common)
  .selfMask();

// 7. SLOPE FILTER

var slope = ee.Terrain.slope(
  ee.Image('USGS/SRTMGL1_003')
);

var slopeFiltered = candidate
  .updateMask(slope.lte(MAX_SLOPE))
  .selfMask();

// 8. MINIMUM CONNECTED PATCH FILTER

var connected = slopeFiltered
  .connectedPixelCount(100, true);

var finalFlood = slopeFiltered
  .updateMask(
    connected.gte(MIN_PIXELS)
  )
  .selfMask();

// 9. AREA BANDS

var px = ee.Image.pixelArea().divide(1e6);

var stack = ee.Image.cat([

  px.updateMask(common)
    .rename('valid_km2'),

  px.updateMask(candidate)
    .rename('candidate_km2'),

  px.updateMask(slopeFiltered)
    .rename('slope_filtered_km2'),

  px.updateMask(finalFlood)
    .rename('final_km2')

]);

// 10. SINGLE AREA AGGREGATION

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

var validArea = value('valid_km2');
var finalArea = value('final_km2');

// 11. EXPORT NUMERICAL RESULTS

var result = ee.Feature(null, {

  event: '2022-08-29_31',

  valid_area_km2: validArea,

  candidate_area_km2:
    value('candidate_km2'),

  slope_filtered_area_km2:
    value('slope_filtered_km2'),

  final_classified_area_km2:
    finalArea,

  final_percent_of_valid:
    finalArea.divide(validArea).multiply(100),

  event_mndwi_threshold: T_EVENT,
  change_mndwi_threshold: T_CHANGE,
  max_slope_degrees: MAX_SLOPE,
  min_connected_pixels: MIN_PIXELS

});

Export.table.toDrive({
  collection: ee.FeatureCollection([result]),

  description: 'stage03_august_flood_stats',

  folder: 'Pakistan_Flood_Research',

  fileNamePrefix: 'stage03_august_flood_stats',

  fileFormat: 'CSV'
});

// 12. MAP

Map.centerObject(aoi, 8);

Map.addLayer(
  candidate,
  {palette: ['FFFF00']},
  'Candidate new inundation',
  false
);

Map.addLayer(
  slopeFiltered,
  {palette: ['FF9900']},
  'After slope filter',
  false
);

Map.addLayer(
  finalFlood,
  {palette: ['00FFFF']},
  'Final classified inundation'
);

print('August export ready — open Tasks tab');
