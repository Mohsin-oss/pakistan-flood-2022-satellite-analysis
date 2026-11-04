// Stage 6.2 | Sentinel-2 event map and valid-observation mask

var aoi = ee.Geometry.Rectangle([67.20, 26.40, 68.60, 28.10], null, false);
var crs = 'EPSG:32642';
var grid = [20, 0, 0, 0, -20, 0];

var baselineDates = [
  '2022-05-06', '2022-05-11', '2022-05-18', '2022-05-26',
  '2022-06-07', '2022-06-17', '2022-06-27'
];
var eventDates = ['2022-08-29', '2022-08-31'];

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi);
var cloudScores = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')
  .filterBounds(aoi);

function onGrid(image) {
  return image.reproject({crs: crs, crsTransform: grid});
}

function sceneMndwi(image) {
  var green = image.select('B3').toFloat();
  var swir = image.select('B11').toFloat();
  var sum = green.add(swir);

  return onGrid(green.subtract(swir).divide(sum).rename('mndwi')
    .updateMask(sum.neq(0))
    .updateMask(image.select('cs_cdf').gte(0.60))
    .updateMask(image.select('B8A').mask())
    .updateMask(image.select('B9').mask()));
}

function composite(dates) {
  var empty = ee.Image.constant(0).float().rename('mndwi').selfMask();

  var daily = dates.map(function(date) {
    var start = ee.Date(date);
    var end = start.advance(1, 'day');

    var scenes = s2.filterDate(start, end)
      .linkCollection(cloudScores.filterDate(start, end), ['cs_cdf']);

    return onGrid(scenes.map(sceneMndwi)
      .merge(ee.ImageCollection([empty]))
      .median());
  });

  return onGrid(ee.ImageCollection.fromImages(daily).median()).clip(aoi);
}

var baseline = composite(baselineDates);
var event = composite(eventDates);

function valid(image) {
  return image.mask().unmask(0, false).gt(0).clip(aoi);
}

// Both observations must be valid to evaluate the change threshold.
var domain = valid(baseline).and(valid(event));

var raw = onGrid(event.gte(0.10994999254541872)
  .and(event.subtract(baseline).gte(0.4200440926570086)))
  .updateMask(domain);

var slope = onGrid(ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')));
var candidate = onGrid(raw.and(slope.lte(5)).selfMask());

var flood = candidate.connectedPixelCount(25, true).gte(25)
  .unmask(0, false)
  .updateMask(domain)
  .rename('flood')
  .toByte();

// Band 1: 1 = flood, 0 = valid with no mapped flood, 255 = NoData.
// Band 2: 1 = valid baseline and event, 0 = invalid within the AOI,
//         255 = outside the AOI.
var validObservation = domain.rename('valid_observation').toByte();
var exportImage = flood.addBands(validObservation).unmask(255, false);

Export.image.toDrive({
  image: exportImage,
  description: 'Stage6_2_S2_Aug2022_Flood_Valid_20m',
  folder: 'Pakistan_Flood_Research',
  fileNamePrefix: 'stage6_2_s2_aug2022_flood_valid_20m',
  region: aoi,
  crs: crs,
  crsTransform: grid,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true, noData: 255}
});
