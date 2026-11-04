# Pakistan 2022 flood satellite analysis

Sentinel-2 flood classification, June 2023 recovery assessment, comparison with UNOSAT Product 3342, and five parameter sensitivity tests.

## Verified findings

- Sentinel-2 and UNOSAT comparison over 16,496.02 km² gives flood F1 0.800 and flood IoU 66.64%.
- The slope cutoff has the largest area effect over the settings tested, with −11.18% at 3° relative to the 5° control.
- The verified 22–25 June checkpoint is within its matched pre-flood envelope. Two consecutive qualifying checkpoints were unconfirmed through 25 June.

Read the [final interpretation and captions](outputs/stage8_figures/stage8_final_interpretation_and_captions.md). Figures are available as PNG and editable SVG in that directory. The [workflow and evidence guide](docs/reproduction.md) explains which script family produced each result.

## Quick reproduction from included summaries

Use Python with the versions recorded in `environment.json`. The pinned dependencies reflect the tested local environment. A fresh installation on another machine remains to be verified.

```sh
python -m venv .venv
# Activate .venv using the command for your shell.
python -m pip install -r requirements.txt
python scripts/verify_results.py
python scripts/stage8_figure01.py
python scripts/stage8_figure02.py
python scripts/stage8_figure03.py
```

The arithmetic audit uses the Python standard library. Figure scripts read the included CSV/JSON summaries. Full spatial reproduction requires the separately acquired inputs described in [the run guide](docs/reproduction.md).

## Layout

| Directory | Contents |
|---|---|
| `gee/` | Twelve standalone Earth Engine scripts, ordered by workflow |
| `scripts/` | Successful tiled reference repair, alignment, agreement, disagreement mapping, figure generation and arithmetic audit |
| `outputs/` | Verified CSV/JSON summaries, maps, figures and final interpretation |
| `docs/` | Reproduction guide, source provenance, input and package checksums |

The 199 MB UNOSAT ZIP, source shapefiles, input GeoTIFF and derived spatial binaries are excluded from the shareable archive. Their acquisition steps and input hashes are recorded. The supplied vector repair is specific to the audited UNOSAT archive layout.

## Scientific scope

UNOSAT is a preliminary satellite reference acquired 2–4 days before the optical composite. Agreement covers only the shared valid footprint. The recovery envelope concerns the optical classification metric. Sensitivity tests vary one parameter at a time and do not estimate total uncertainty.

The Stage 1–5 and fixed-grid Stage 6–7 classifier implementations differ. Their event areas must be interpreted with their own methods and domains. The May first-return claim remains provisional because its export is missing. The 0.1412 km² control difference between local Stage 6 counting and Earth Engine Stage 7 counting is unresolved at the pixel level.

## Licensing and publication

No project-wide code license has been adopted in this package. The owner should choose a license before public reuse is encouraged. UNOSAT and satellite products retain their source terms. Review redistribution terms before adding third-party source or derived geospatial data to a public repository.

This repository contains the verified Stage 9 package. Automated checks cover script syntax, the configured study area, recovery arithmetic and the included result summaries. Full cloud and fresh-environment reproduction retain the limitations recorded in [validation status](docs/validation.json).
