// Reconstructed workflow. Concatenate this file and one numbered entry point.
var aoi = ee.Geometry.Rectangle([67.20, 26.40, 68.60, 28.10], null, false);
var crs = 'EPSG:32642';
var grid = [20, 0, 0, 0, -20, 0];
var eventCutoff = 0.10994999254541872;
var changeCutoff = 0.4200440926570086;
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi);
var scores = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')
  .filterBounds(aoi);
var baselineDates = ['2022-05-06', '2022-05-11', '2022-05-18', '2022-05-26',
  '2022-06-07', '2022-06-17', '2022-06-27'];
var eventDates = ['2022-08-29', '2022-08-31'];

function onGrid(image) {
  return image.reproject({crs: crs, crsTransform: grid});
}

function dailyRange(day) {
  return ee.DateRange(day, ee.Date(day).advance(1, 'day'));
}

function windowRange(first, last) {
  return ee.DateRange(first, ee.Date(last).advance(1, 'day'));
}

function linked(range) {
  return s2.filterDate(range).linkCollection(scores.filterDate(range), ['cs_cdf']);
}

function mndwi(image) {
  var green = image.select('B3').toFloat();
  var swir = image.select('B11').toFloat();
  var sum = green.add(swir);
  var clear = image.select('cs_cdf').gte(0.60);
  return onGrid(green.subtract(swir).divide(sum).rename('mndwi')
    .updateMask(sum.neq(0)).updateMask(clear)
    .updateMask(image.select('B8A').mask()).updateMask(image.select('B9').mask()));
}

function composite(ranges) {
  var empty = ee.Image.constant(0).float().rename('mndwi').selfMask();
  var perWindow = ranges.map(function(range) {
    return onGrid(linked(range).map(mndwi).merge(ee.ImageCollection([empty])).median());
  });
  return onGrid(ee.ImageCollection(perWindow).median()).clip(aoi);
}

function valid(image) {
  return image.mask().unmask(0, false).gt(0).clip(aoi);
}

function calibration() {
  var baseline = composite(baselineDates.map(dailyRange));
  var event = composite(eventDates.map(dailyRange));
  return {baseline: baseline, event: event, domain: valid(baseline).and(valid(event))};
}

function classify(image, baseline, domain) {
  var change = image.subtract(baseline);
  var raw = onGrid(image.gte(eventCutoff).and(change.gte(changeCutoff)))
    .updateMask(domain).rename('raw');
  var slope = onGrid(ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')));
  var candidate = onGrid(raw.and(slope.lte(5)).selfMask());
  var clean = candidate.connectedPixelCount(25, true).gte(25)
    .unmask(0, false).updateMask(domain).rename('clean');
  return raw.addBands(clean);
}

function km2(indicator, name) {
  return ee.Image.pixelArea().multiply(indicator.unmask(0, false)).divide(1e6).rename(name);
}

function summarize(bands) {
  return ee.Image.cat(bands).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: aoi, crs: crs, crsTransform: grid,
    maxPixels: 1e9, tileScale: 4
  });
}

function exportRows(name, rows) {
  Export.table.toDrive({
    collection: ee.FeatureCollection(rows), description: name, fileFormat: 'CSV'
  });
}
