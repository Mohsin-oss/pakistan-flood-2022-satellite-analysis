# 2022 Pakistan Flood Satellite Analysis

Reproducible Sentinel-2 satellite analysis of the 2022 Pakistan floods, including inundation dynamics, recovery assessment, validation, and uncertainty analysis using Google Earth Engine and Python.

## Study area and status

The provisional Dadu–Qambar study area in Sindh is recorded in [the AOI config](configs/aoi.json). The bounding box uses west, south, east, north order in WGS 84.

- **Stage 5 · Recovery assessment** — Completed in the working study, with caveats. Two original June exports are archived. The six reconstructed scripts have been run in Earth Engine, with results documented in the methodology.
- **Stage 6 · Independent validation** — Underway. Reference selection, comparison design, and results are pending in this repository.

Sentinel-2 classifications represent candidate inundation. Clouds, shadows, missing observations, and classification errors can affect mapped extent. A decrease in classified water can indicate apparent recession where both dates have valid observations. It cannot establish recovery of land use, livelihoods, or infrastructure by itself.

## Reproduction setup

1. Use the latest stable Python release available when you set up the project. Record the exact version with `python --version` for reproducibility. Create a virtual environment with `python -m venv .venv` and activate it. Check that the starter pins in `requirements.txt` support your Python release, then install them with `python -m pip install -r requirements.txt`.
2. Use the Earth Engine Code Editor with an authorized project. The provisional AOI is available in `configs/aoi.json`. Follow the [Earth Engine run guide](gee/README.md).
3. Keep source imagery and local exports under `data/raw/` and derived analysis inputs under `data/processed/`. Put reviewed, shareable summaries under `results/tables/` and `results/figures/`.
4. Record inputs, observation dates, valid coverage, parameters, grid, and export provenance before interpreting results. See the [Stage 6 checklist](docs/stage-06-validation.md).

### Workflow and checks

**01 Sensor availability → 02 Baseline → 03 August classification → 04 Two-window comparison → 05 Recovery calibration → 06 Matched recovery**

Each Earth Engine script runs independently. See the [methodology and rerun results](docs/methodology.md), [provenance](docs/provenance.md) and [data dictionary](docs/data-dictionary.md).

Run these checks from the repository root. The CSV audit uses the Python standard library.

```sh
node tests/check_js.js
python -m unittest discover -s tests
python src/audit.py recovery results/tables/stage5_june_recovery_matched.csv results/tables/stage5_late_june_recovery_matched.csv
```

The checks cover JavaScript syntax, shared AOI consistency, the Otsu utility and historical recovery arithmetic. The methodology records which rerun summaries could be compared with historical values.

## Licensing

MIT is proposed for original code, pending owner adoption. Imagery, reference products, and other third-party data retain their source terms. Record those terms before distributing derived files.
