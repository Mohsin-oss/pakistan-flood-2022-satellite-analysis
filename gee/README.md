# Earth Engine run guide

All five entry points are reconstructions. A run requires Earth Engine access, an authorized Google Cloud project, and a Google Drive destination. The public Earth Engine collections are fetched at runtime. No private assets or Python dependencies are required for these scripts.

1. Open the Earth Engine Code Editor. Paste all of `00_common.js` into a new script and append one entry point from the table below. Use a fresh editor script for each entry point.
2. Click **Run**, then open **Tasks** and start the export you want. Download the completed exports from Drive. Keep new results separate from the archived CSVs.
3. Run Stage 1 for the intended acquisition dates first. Check the granule counts, tile IDs and usable area. Run Stage 2 next and check that each intended input date contributes usable observations and that the calibration domain is positive. Record acquisition IDs and export task IDs with new results.
4. Run Stage 3 histogram, area and raster exports separately. Run Stage 4 once per `checkpoint` index and Stage 5 once per `comparison` index. Inspect the domain sizes before interpreting area changes.

| Entry point | Output | Check |
| --- | --- | --- |
| `01_sensor_coverage.js` | One date of S1 VV / MODIS band footprint and S2 clear-area diagnostics | Coverage is bounded by the AOI. S1 and MODIS footprints measure band availability. |
| `02_composite_coverage.js` | Baseline, event, intersection and daily valid areas | Intersection is bounded by both input areas. |
| `03_event_classification.js` | Two histograms, raw and cleaned area CSV, two-band GeoTIFF | Cleaned ≤ raw ≤ calibration area. GeoTIFF values are 0, 1 and 255 (nodata). |
| `04_evolution.js` | One calendar-window area row per task | Cleaned ≤ raw ≤ observed ≤ calibration area. Compare coverage before comparing areas. |
| `05_matched_recovery.js` | One pair and six April holdouts on the shared domain | Run the recovery audit. Zero matched area means the comparison is unevaluable. |

For a downloaded histogram use `python src/audit.py otsu PATH_TO_CSV`. The diagnostic Otsu implementation maximizes between-class variance, taking the midpoint of adjacent occupied bin centers at the first maximizing split. The classifier uses the recorded thresholds. Histogram settings and tie conventions can change the diagnostic cutoffs.

For any downloaded reconstructed recovery CSV use `python src/audit.py recovery PATH_TO_CSV`. The utility computes the matched envelope, checkpoint flags and pair outcome from the exported pixel-area totals.

Each expensive table task uses a single regional reducer over stacked bands and a batch Drive export. This avoids mapped regional reducers and interactive area evaluation. If a task still exceeds resource limits, retain the error and run smaller independent tasks or materialize composites to Earth Engine assets on the same grid. Reconcile new outputs before interpreting them as a historical replication.
