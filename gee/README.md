# Earth Engine run guide

Open each numbered JavaScript file in a separate Earth Engine Code Editor script and run it under an authorized project. Scripts 01 and 02 report to the console. For scripts 03–06, start the CSV export in **Tasks** and keep rerun exports separate from the archived June files.

| Script | Output |
| --- | --- |
| `01_sensor_availability.js` | Sensor counts, acquisition dates and Sentinel-2 clear coverage |
| `02_preflood_baseline.js` | Four-date and seven-date baseline coverage |
| `03_august_flood_classification.js` | Event map layers and August candidate, slope-filtered, cleaned and valid areas |
| `04_multitemporal_comparison.js` | Two windows on a common valid domain, with classified areas, fractions and change |
| `05_preflood_recovery_calibration.js` | Six April holdout areas and the pre-flood envelope |
| `06_matched_recovery_comparison.js` | Two checkpoints and a recalculated envelope on their shared domain |
| `07_stage6_validation_export.js` | Two-band 20 m GeoTIFF for independent reference comparison |

Start Script 07's image export in **Tasks**. See the [Stage 6 export notes](../docs/stage-06-validation.md#sentinel-2-export).

See the [methodology and run checks](../docs/methodology.md). Run `python src/audit.py recovery` with the archived June CSV paths to audit their arithmetic.

## Stage 7 sensitivity exports

Scripts 08–12 test event MNDWI, change MNDWI, slope, minimum patch size and cloud cutoff, respectively. Run each separately and start its CSV export in **Tasks**. These five packaged scripts are reconstructions: syntax has been checked, but fresh Earth Engine execution is not yet verified. Archived sensitivity exports came from the earlier user-run scripts.

Use the [complete reproduction guide](../docs/reproduction.md) to distinguish the Stage 1–5 and fixed-grid Stage 6–7 classifier families.
