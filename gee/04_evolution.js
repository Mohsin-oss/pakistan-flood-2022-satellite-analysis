// Exploratory calendar windows. Historical selected dates are unavailable.
var windows = [
  ['2022-08-29', '2022-09-30'], ['2022-10-01', '2022-10-31'],
  ['2022-11-01', '2022-11-30'], ['2022-12-01', '2022-12-31'],
  ['2023-01-01', '2023-01-31'], ['2023-02-01', '2023-02-28'],
  ['2023-03-01', '2023-03-31'], ['2023-04-01', '2023-04-30'],
  ['2023-05-01', '2023-05-31'], ['2023-06-01', '2023-06-30']
];
// Run a single window per export. Areas use the observed part of the calibration domain.
var checkpoint = 0;
var dates = windows[checkpoint];
var inputs = calibration();
var image = composite([windowRange(dates[0], dates[1])]);
var domain = inputs.domain.and(valid(image));
var flood = classify(image, inputs.baseline, domain);
var stats = summarize([
  km2(inputs.domain, 'calibration_domain_km2'), km2(domain, 'observed_domain_km2'),
  km2(flood.select('raw'), 'raw_km2'), km2(flood.select('clean'), 'clean_km2')
]);
exportRows('stage4_' + dates[0].replace(/-/g, ''), [
  ee.Feature(null, stats).set({start_date: dates[0], end_date: dates[1]})
]);
