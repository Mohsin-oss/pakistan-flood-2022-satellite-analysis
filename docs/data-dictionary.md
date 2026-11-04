# Output data dictionary

All area fields are in km². Dates are inclusive UTC dates. Percentages are on a 0–100 scale. The table includes field names from the archived exports and earlier reconstruction. In Script 06, the calibration domain is the intersection of the baseline and the six April holdouts. The matched domain also requires valid observations in both checkpoints.

| Field or group | Definition |
| --- | --- |
| `aoi_km2` | Full study rectangle on the analysis grid. |
| `*_granules`, `s2_tiles` | Intersecting acquisition counts and distinct Sentinel-2 MGRS tile IDs before cloud masking. |
| `*_footprint_km2` | Pixels with band data, without a dedicated sensor quality mask. |
| `s2_clear_km2`, `valid_*_km2`, `baseline_valid_km2`, `event_valid_km2` | Usable MNDWI area after reflectance and QA masks. |
| `calibration_domain_km2` | Area of valid baseline and event intersection in the reconstruction. |
| `observed_domain_km2` | Calibration domain intersected with valid pixels for one evolution window. |
| `matched_domain_km2` | Common observed area used by the pair and April holdouts. |
| `*_coverage_percent` | Valid area divided by calibration area × 100. The matched field uses the matched area as numerator. |
| `first_valid_km2`, `second_valid_km2` | Calibration area observed by each checkpoint separately, before intersecting holdouts and the other checkpoint. |
| `candidate_area_km2`, `slope_filtered_area_km2`, `final_classified_area_km2` | August candidate area before terrain filtering, after terrain filtering, and after patch cleanup. |
| `classified_a_km2`, `classified_b_km2`, `change_b_minus_a_km2` | Two classified areas on the matched domain and the second area minus the first. |
| `april_*_km2`, `june_*_km2`, `first_km2`, `second_km2` | Cleaned classifier area on the comparison's matched domain. |
| `preflood_mean_km2`, `preflood_sample_sd_km2` | Mean and sample standard deviation of the six April holdout areas. |
| `recovery_lower_km2`, `recovery_upper_km2` | Descriptive limits calculated from those holdouts. |
| `*qualifies`, `both_qualify`, `both_june_qualify` | Historical 0/1 flags for an in-envelope checkpoint or two qualifying checkpoints. |
| `band`, `center`, `count` | Histogram index name, bin center in MNDWI units and pixel count. |
| `system:index`, `.geo` | Earth Engine export metadata. The archived comparison row has no analysis geometry attached. |
