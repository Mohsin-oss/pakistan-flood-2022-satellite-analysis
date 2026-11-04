// Standalone packaging reconstruction of the executed Stage 7 method.

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

function sceneMndwi(image, clearThreshold) {
  var green = image.select('B3').toFloat();
  var swir = image.select('B11').toFloat();
  var sum = green.add(swir);

  return onGrid(green.subtract(swir).divide(sum).rename('mndwi')
    .updateMask(sum.neq(0))
    .updateMask(image.select('cs_cdf').gte(clearThreshold))
    .updateMask(image.select('B8A').mask())
    .updateMask(image.select('B9').mask()));
}

function composite(dates, clearThreshold) {
  var empty = ee.Image.constant(0).float().rename('mndwi').selfMask();

  var daily = dates.map(function(date) {
    var start = ee.Date(date);
    var end = start.advance(1, 'day');

    var scenes = s2.filterDate(start, end)
      .linkCollection(cloudScores.filterDate(start, end), ['cs_cdf']);

    return onGrid(scenes.map(function(image) { return sceneMndwi(image, clearThreshold); })
      .merge(ee.ImageCollection([empty]))
      .median());
  });

  return onGrid(ee.ImageCollection.fromImages(daily).median()).clip(aoi);
}


var test = "change";
var exportName = "stage7_2_change_mndwi_sensitivity";
var settings = [{"name": "lower", "value": 0.4000440926570086}, {"name": "control", "value": 0.4200440926570086}, {"name": "higher", "value": 0.4400440926570086}];

var eventThreshold = 0.10994999254541872;
var changeThreshold = 0.4200440926570086;
var slope = onGrid(ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')));
function valid(image) {
  return image.mask().unmask(0, false).gt(0).clip(aoi);
}
var scenarios = settings.map(function(setting) {
  var baseline = composite(baselineDates, test === 'cloud' ? setting.value : 0.60);
  var event = composite(eventDates, test === 'cloud' ? setting.value : 0.60);
  return {name: setting.name, value: setting.value, baseline: baseline, event: event,
          domain: valid(baseline).and(valid(event))};
});
var control = scenarios[1];
var common = scenarios[0].domain.and(control.domain).and(scenarios[2].domain);
function classify(scenario, domain) {
  var eventCutoff = test === 'event' ? scenario.value : eventThreshold;
  var changeCutoff = test === 'change' ? scenario.value : changeThreshold;
  var maxSlope = test === 'slope' ? scenario.value : 5;
  var patch = test === 'patch' ? scenario.value : 25;
  var raw = onGrid(scenario.event.gte(eventCutoff)
    .and(scenario.event.subtract(scenario.baseline).gte(changeCutoff)))
    .updateMask(domain);
  var candidate = onGrid(raw.and(slope.lte(maxSlope)).selfMask());
  return candidate.connectedPixelCount(patch, true).gte(patch)
    .unmask(0, false).updateMask(domain);
}
var reference = classify(control, common);
var bands = [common.rename('matched'), control.domain.rename('control_valid'),
             classify(control, control.domain).rename('control_native'),
             onGrid(ee.Image.constant(1)).rename('aoi')];
scenarios.forEach(function(scenario) {
  var flood = scenario.name === 'control' ? reference : classify(scenario, common);
  bands.push(scenario.domain.rename(scenario.name + '_valid'));
  bands.push(flood.rename(scenario.name + '_flood'));
  bands.push(flood.and(reference.not()).rename(scenario.name + '_added'));
  bands.push(reference.and(flood.not()).rename(scenario.name + '_removed'));
});
var totals = ee.Image.cat(bands).reduceRegion({
  reducer: ee.Reducer.sum().unweighted(), geometry: aoi, crs: crs,
  crsTransform: grid, maxPixels: 1e9, tileScale: 8
});
function count(name) {
  var value = totals.get(name);
  return ee.Number(ee.Algorithms.If(value, value, 0));
}
function pct(value, denominator) {
  return ee.Algorithms.If(denominator.gt(0),
    value.divide(denominator.max(1)).multiply(100), null);
}
var rows = scenarios.map(function(scenario) {
  var name = scenario.name;
  var flood = count(name + '_flood');
  var delta = flood.subtract(count('control_flood'));
  var properties = {
    scenario: name,
    event_mndwi_threshold: test === 'event' ? scenario.value : eventThreshold,
    change_mndwi_threshold: test === 'change' ? scenario.value : changeThreshold,
    slope_limit_deg: test === 'slope' ? scenario.value : 5,
    min_patch_pixels: test === 'patch' ? scenario.value : 25,
    cloud_score_cutoff: test === 'cloud' ? scenario.value : 0.60,
    valid_pixels: count(name + '_valid'),
    valid_area_km2: count(name + '_valid').multiply(0.0004)
  };
  if (test === 'cloud') {
    properties.status = ee.Algorithms.If(count('matched').gt(0), 'ok', 'no_matched_pixels');
    properties.aoi_area_km2 = count('aoi').multiply(0.0004);
    properties.valid_coverage_pct_of_aoi = pct(count(name + '_valid'), count('aoi'));
    properties.matched_valid_pixels = count('matched');
    properties.matched_valid_area_km2 = count('matched').multiply(0.0004);
    properties.matched_coverage_pct_of_aoi = pct(count('matched'), count('aoi'));
    properties.matched_flood_pixels = flood;
    properties.matched_flood_area_km2 = flood.multiply(0.0004);
    properties.added_vs_matched_control_km2 = count(name + '_added').multiply(0.0004);
    properties.removed_vs_matched_control_km2 = count(name + '_removed').multiply(0.0004);
    properties.net_change_vs_matched_control_km2 = delta.multiply(0.0004);
    properties.net_change_vs_matched_control_pct = pct(delta, count('control_flood'));
    properties.control_native_valid_pixels = count('control_valid');
    properties.control_native_flood_pixels = count('control_native');
    properties.control_native_flood_area_km2 = count('control_native').multiply(0.0004);
  } else {
    properties.min_patch_ha = properties.min_patch_pixels * 0.04;
    properties.flood_pixels = flood;
    properties.flood_area_km2 = flood.multiply(0.0004);
    properties.added_vs_control_km2 = count(name + '_added').multiply(0.0004);
    properties.removed_vs_control_km2 = count(name + '_removed').multiply(0.0004);
    properties.net_change_vs_control_km2 = delta.multiply(0.0004);
    properties.net_change_vs_control_percent = pct(delta, count('control_flood'));
  }
  return ee.Feature(null, properties);
});
Export.table.toDrive({collection: ee.FeatureCollection(rows),
  description: exportName, fileNamePrefix: exportName,
  folder: 'Pakistan_Flood_Research', fileFormat: 'CSV'});
print('Open Tasks and run ' + exportName);
