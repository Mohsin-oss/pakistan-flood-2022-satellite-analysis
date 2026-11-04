var inputs = calibration();
var change = inputs.event.subtract(inputs.baseline).rename('change');
var histogram = inputs.event.addBands(change).updateMask(inputs.domain).reduceRegion({
  reducer: ee.Reducer.histogram(256), geometry: aoi, crs: crs,
  crsTransform: grid, maxPixels: 1e9, tileScale: 4
});

function histogramRows(band) {
  var data = ee.Dictionary(ee.Algorithms.If(histogram.get(band), histogram.get(band),
    ee.Dictionary({bucketMeans: [], histogram: []})));
  var centers = ee.List(data.get('bucketMeans'));
  var counts = ee.List(data.get('histogram'));
  return centers.zip(counts).map(function(bin) {
    bin = ee.List(bin);
    return ee.Feature(null, {band: band, center: bin.get(0), count: bin.get(1)});
  });
}
exportRows('stage3_otsu_histograms', histogramRows('mndwi').cat(histogramRows('change')));
var flood = classify(inputs.event, inputs.baseline, inputs.domain);
exportRows('stage3_event_areas', [ee.Feature(null, summarize([
  km2(inputs.domain, 'calibration_domain_km2'),
  km2(flood.select('raw'), 'raw_km2'), km2(flood.select('clean'), 'clean_km2')
]))]);
Export.image.toDrive({
  image: flood.toByte().unmask(255, false), description: 'stage3_event_classification',
  region: aoi, crs: crs, crsTransform: grid, maxPixels: 1e9,
  fileFormat: 'GeoTIFF', formatOptions: {noData: 255}
});
