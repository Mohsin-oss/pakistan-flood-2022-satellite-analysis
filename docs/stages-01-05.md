# Stages 1–5 methods and evidence

## Sensor and domain decisions

Sentinel-1 was investigated and rejected as the primary sensor based on the study's temporal and coverage diagnostics. MODIS was investigated for secondary temporal context. Sentinel-2 was chosen for the detailed analysis. The original comparative screening outputs are unavailable. The reconstruction reports S1 and MODIS band footprints alongside clear S2 coverage. A single-date footprint is insufficient to reproduce the historical selection decision.

The provisional AOI is [67.20, 26.40, 68.60, 28.10] in longitude/latitude. Reconstructed areas use pixel area on a fixed EPSG:32642 grid with 20 m pixels and transform [20, 0, 0, 0, -20, 0]. The historical grid origin and resampling are unverified.

## Composites and classification

- Use harmonized Sentinel-2 surface reflectance and link Cloud Score+ by `system:index`. Keep `cs_cdf >= 0.60`. Unlinked QA pixels remain masked. Use the B8A and B9 masks to suppress scene-edge gaps.
- Filter by AOI intersection and inclusive UTC dates. Retain complementary tiles and mask pixels independently, without a granule cloud-percentage gate. The reconstruction computes (B3 − B11)/(B3 + B11) per scene, masks a zero denominator, samples onto the fixed grid using default nearest-neighbor sampling, and takes the per-pixel median across available scenes. The seven baseline dates and two event dates each first produce daily composites so date weighting does not depend on granule count.
- The baseline dates are 6, 11, 18 and 26 May and 7, 17 and 27 June 2022. The event composite uses 29 and 31 August 2022 only. The reconstructed calibration domain is the intersection of valid baseline and valid event pixels.
- Flag pixels with event/window MNDWI ≥ 0.10994999254541872 and change from the baseline MNDWI ≥ 0.4200440926570086. The archived thresholds are recorded historical parameters. The batch histogram export lets a rerun audit their derivation. Historical histogram configuration, index/composite order and compositing operator remain unverified.
- Clean candidates with SRTM slope ≤ 5° and at least 25 connected pixels on the 20 m grid (nominally one hectare). The reconstruction uses eight-neighbor connectivity and applies the comparison-domain mask before patch cleanup. Missing terrain excludes a pixel from cleaned candidates. Historical connectivity and mask order are unverified.
- Stage 4 calendar windows span August–September, October, November and December 2022 and January through June 2023. These are exploratory settings because the historical selected scene windows are unavailable. Stage 4 areas use each window's observed subset of the fixed calibration domain. The size of that subset can vary and must accompany each estimate.

## Recovery

The independent temporal holdouts are 1–3, 6–8, 11–13, 16–18, 21–23 and 26–28 April 2022. Here independence means the windows are outside the May–June calibration dates. The six holdouts do not provide independent flood labels.

A pair is evaluated on the intersection of the calibration domain, valid pixels in all six holdouts, and valid pixels in both checkpoints. Apply the same classifier and compute cleaned area for each input on this shared domain. The baseline envelope is [max(0, mean − 2 × sample SD), mean + 2 × sample SD] over six holdout areas. A checkpoint qualifies if its area lies within this closed interval. Sustained return under the study rule requires two consecutive observed checkpoints qualifying in a matched comparison. The envelope is descriptive and does not establish a confidence interval or physical recovery.

The study chat reports 21–23 April 2023 above the envelope (287.55 km²) and 16–18 May as the first observed within-envelope checkpoint (34.72 km²). A separately reported May–early June comparison used 25,255.56 km² and reported 34.44 km² for May and 101.64 km² for early June, with an upper bound of 86.13 km². These chat-reported comparisons lack raw exports here.

| Archived comparison | Matched area | Envelope | First checkpoint | Second checkpoint |
| --- | ---: | ---: | --- | --- |
| 2–5 vs 17–20 June 2023 | 25,531.63 km² (98.36%) | 0–92.93 km² | 102.34 km², above | 96.63 km², above |
| 17–20 vs 22–25 June 2023 | 25,772.33 km² (99.28%) | 0–93.74 km² | 97.52 km², above | 87.27 km², within |

Each row has its own spatial denominator. The two 17–20 June values refer to different masks. The 22–25 June checkpoint qualified after two nonqualifying June checkpoints. A sustained return was unconfirmed through 25 June. The exports do not establish when a crossing occurred between sampled dates or whether a suitable window was missed. Optical classifier output can be affected by clouds, shadows, mixed pixels, compositing and the fixed thresholds. Neither independent spatial accuracy nor hydrologic recovery was established in Stages 1–5.

## Sources and run evidence

- [Cloud Score+ catalog and linking example](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_CLOUD_SCORE_PLUS_V1_S2_HARMONIZED)
- [Earth Engine guidance on batch computation](https://developers.google.com/earth-engine/guides/best_practices)
- [Artifact provenance](provenance.md)
