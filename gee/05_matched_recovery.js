var holdouts = ['01', '06', '11', '16', '21', '26'].map(function(day) {
  var start = ee.Date('2022-04-' + day);
  return composite([ee.DateRange(start, start.advance(3, 'day'))]);
});
var pairs = [
  [['2023-04-21', '2023-04-23'], ['2023-05-16', '2023-05-18']],
  [['2023-05-16', '2023-05-18'], ['2023-06-02', '2023-06-05']],
  [['2023-06-02', '2023-06-05'], ['2023-06-17', '2023-06-20']],
  [['2023-06-17', '2023-06-20'], ['2023-06-22', '2023-06-25']]
];
var comparison = 2;
var pair = pairs[comparison];
var checkpoints = pair.map(function(dates) {
  return composite([windowRange(dates[0], dates[1])]);
});
var inputs = calibration();
var domain = holdouts.concat(checkpoints).reduce(function(common, image) {
  return common.and(valid(image));
}, inputs.domain);
var holdoutNames = ['april_01_km2', 'april_06_km2', 'april_11_km2', 'april_16_km2',
  'april_21_km2', 'april_26_km2'];
var names = holdoutNames.concat(['first_km2', 'second_km2']);
var bands = holdouts.concat(checkpoints).map(function(image, index) {
  return km2(classify(image, inputs.baseline, domain).select('clean'), names[index]);
});
bands.push(km2(domain, 'matched_domain_km2'), km2(inputs.domain, 'calibration_domain_km2'));
checkpoints.forEach(function(image, index) {
  bands.push(km2(inputs.domain.and(valid(image)), ['first_valid_km2', 'second_valid_km2'][index]));
});
var row = ee.Feature(null, summarize(bands)).set({
  first_start: pair[0][0], first_end: pair[0][1],
  second_start: pair[1][0], second_end: pair[1][1]
});
exportRows('stage5_reconstructed_pair_' + comparison, [row]);
