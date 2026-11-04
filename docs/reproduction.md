# Workflow, inputs and evidence

## Two classifier families

Scripts 01–06 are the available Stage 1–5 reconstructions. They use the earlier composite and classification conventions, including the baseline-water exclusion. Their Stage 3 cleaned event area is 8,736.60 km². Reviewed rerun exports for Stages 3–6 are preserved under `outputs/stage3`, `stage4`, `stage5`, and `stage6`. Here the directory `stage6` contains a rerun of the matched recovery script, rather than independent flood-map agreement.

Script 07 is the fixed-grid event export used by the Stage 6 comparison. It uses daily median scene MNDWI, a median across selected dates, `>=` threshold comparisons, and the explicit EPSG:32642 transform `[20, 0, 0, 0, -20, 0]`. Its control is the basis of all Stage 7 tests. This version's local event count is 8,851.8960 km². These differences are methodological and must be preserved in provenance.

Scripts 08–12 are packaging reconstructions of the executed Stage 7 algorithms. They are self-contained, preserve the scenario definitions and calculation order, and add parameter metadata to each output row. Their syntax has been checked locally. They require a fresh Earth Engine execution to verify the packaged versions against the archived CSVs. Archived Stage 7 exports came from the scripts run by the user during the study.

## Earth Engine sequence

Run one complete file at a time in the Earth Engine Code Editor with an authorized project. Start batch exports through Tasks. Retain the run date, script revision, task ID and exported file hash for each rerun.

| Files | Role | Evidence included |
|---|---|---|
| 01–02 | Sensor availability and baseline diagnostics | Scripts retained; original numeric exports unavailable |
| 03–04 | Earlier event and two-window evolution | Rerun CSVs under `outputs/stage3` and `stage4` |
| 05–06 | Pre-flood envelope and matched recovery | Rerun CSVs and two historical June CSVs |
| 07 | Fixed-grid Stage 6 flood and validity export | Input hash and local alignment audit |
| 08–11 | Event threshold, change threshold, slope, patch sensitivity | Four executed-run CSVs under `outputs/stage7-mndwi` |
| 12 | Cloud cutoff sensitivity on a shared footprint | Executed-run cloud CSV in the same directory |

Historical June files in `outputs/stage5_historical` are the source for Figure 3. Preserve them when collecting new runs. The May export and complete historical evolution series are unavailable.

## Full spatial reproduction

1. Obtain the shapefile ZIP from [UNOSAT Product 3342](https://unosat.org/products/3342). Compare its SHA-256 with `docs/input_checksums.json`. Extract the original `FL20220808PAK_SHP` folder into the repository root. The repair uses the 27 August flood and analysis shapefiles and their companion files.
2. Run Earth Engine script 07 and place the downloaded image at `geotiff/stage6_2_s2_aug2022_flood_valid_20m.tif`. The recorded file hash identifies the study input. A new export can have different file bytes, so also verify its grid, band values and pixel totals.
3. Run the commands below from the repository root.

```sh
python scripts/repair_unosat3342_tiled.py
python scripts/align_unosat3342.py
python scripts/stage6_3_agreement.py
python scripts/stage6_4_disagreement.py
python scripts/verify_results.py
```

The scripts regenerate outputs at the documented paths. Use a separate checkout for experimental reruns so the archived results remain available for comparison.

The repair uses non-overlapping 10 km tiles, repairs invalid pieces, dissolves within tiles and intersects the analysis footprint. The original archive-specific ring ordering and part-count checks are retained. The recorded area difference is nominal raw signed area versus repaired dissolved area within processing tiles. It does not prove boundary identity everywhere.

The reference preparation and local AOI rasterization have different edge constructions. Alignment intersects the footprint with the densified study rectangle and the authoritative Sentinel-2 validity band. Some zero-valued flood cells are invalid observations. The mask, assessed footprint and AOI must all be applied.

The 20 m comparison contains 41,240,062 valid pixels. Its confusion matrix, in TP/FN/FP/TN order, is 13,305,161 / 1,381,840 / 5,279,646 / 21,273,415 pixels. These are the reproduction targets.

## Sensitivity targets

The first four tests have 61,051,122 valid pixels and a control of 22,130,093 flood pixels. Cloud sensitivity has the same native control, but compares 60,599,518 shared valid pixels with a matched control of 22,118,370 flood pixels. Coverage and area denominators differ between native and matched comparisons.

The standard 20 m-grid area convention counts 400 m² per cell. It differs slightly from Earth Engine pixel-area sums used in earlier recovery scripts.

## Provenance and validation

`source_manifest.json` records the source file names and original hashes of copied artifacts. Portable paths, cache paths and rerun handling were adjusted in the packaged Python scripts. `SHA256SUMS.json` records the final package contents. `environment.json` records the actual local Python and library versions. `validation.json` records the packaging checks.

The package omits failed and superseded whole-geometry repair attempts. It retains the tiled workflow that produced the reported Stage 6 figures. Local rerun success and arithmetic checks do not establish a fresh environment rerun or fresh cloud acquisition.
