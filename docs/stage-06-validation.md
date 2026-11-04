# Stage 6 independent validation

- Use the [Stage 6.2 export script](../gee/07_stage6_validation_export.js) to produce the event-date candidate inundation mask and matching valid-observation mask.
- Record reference product producer, acquisition time, footprint, class definitions, version, and reuse terms. Check independence from the candidate classification and document any shared inputs.
- Define overlap using valid candidate observations and valid reference coverage. Harmonize coordinate system, grid, class definitions, and treatment of pre-existing water. Preserve unknown pixels as unknown.
- Freeze the comparison rules before calculating metrics. Record date mismatch, excluded area, comparison counts, and limitations. Report agreement against the named reference using a confusion matrix and flood precision, recall, and intersection over union where denominators permit. If sampling, document design and weighting.
- Keep the original candidate classification separate from any tuning informed by the reference. Record the script revision, settings, source identifiers, and output filenames for each comparison.

Validation results are pending.

## Sentinel-2 export

The recovered Stage 6.2 Code Editor script uses the 29 and 31 August 2022 observations. The two-band GeoTIFF is exported at 20 m in EPSG:32642 with bands `flood` and `valid_observation`. The `flood` band applies the 5° slope limit and the 25-pixel connected-patch filter. Its fixed-grid implementation is separate from Script 03, and pixel-for-pixel equivalence with Script 03's final mask remains unverified.

The local alignment audit identified the expected band names and grid in the exported GeoTIFF. Pixels outside the shared valid domain are excluded from comparison. The GeoTIFF is stored locally.
