var inputs = calibration();
var bands = [
  km2(ee.Image.constant(1), 'aoi_km2'), km2(inputs.domain, 'calibration_domain_km2'),
  km2(valid(inputs.baseline), 'baseline_valid_km2'), km2(valid(inputs.event), 'event_valid_km2')
];
baselineDates.concat(eventDates).forEach(function(day) {
  bands.push(km2(valid(composite([dailyRange(day)])), 'valid_' + day.replace(/-/g, '_') + '_km2'));
});
exportRows('stage2_composite_coverage', [ee.Feature(null, summarize(bands))]);
