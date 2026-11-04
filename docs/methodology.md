# Methodology and run checks

These standalone Earth Engine scripts reconstruct the Stage 1–5 workflow. The figures below summarize the reviewed Earth Engine reruns.

## Observations and classification

- The provisional Dadu–Qambar AOI is [67.20, 26.40, 68.60, 28.10] in west, south, east, north order. The sensor audit counts intersecting acquisitions and reports Sentinel-2 dates with at least 50% clear coverage at the audit scale.
- Use harmonized Sentinel-2 surface reflectance and Cloud Score+ with `cs_cdf >= 0.60`. The seven-date pre-flood baseline uses 6, 11, 18 and 26 May and 7, 17 and 27 June 2022. The August event uses 29 and 31 August.
- Apply the recorded MNDWI thresholds of 0.10994999254541872 for event water and 0.4200440926570086 for change. The classifier excludes baseline water, applies the 5° slope limit and retains patches of at least 25 connected pixels. Area reductions use a 20 m scale. The connected-pixel operation is scale-sensitive, so the nominal one-hectare interpretation needs fixed-grid verification.
- The two-window comparison reports areas on the same valid pixels. Each pair can have a different common domain, so pairwise totals need a shared domain before being treated as one time series.

## Recovery

Use six independent temporal holdouts starting 1, 6, 11, 16, 21 and 26 April 2022. Compute the descriptive envelope as the mean ± two sample standard deviations, with the lower bound floored at zero. The paired recovery script recomputes the envelope from holdout classifications on the same valid pixels as both checkpoints. Two consecutive qualifying checkpoints are required for sustained return under the study rule. The late-June pair contained one qualifying checkpoint.

## Reviewed reruns

| Script | Observed check |
| --- | --- |
| 01 | 25 Sentinel-1 scenes over 11 dates, 78 Sentinel-2 tiles over 13 dates, 32 Terra and 32 Aqua granules. Eight Sentinel-2 dates passed the coverage gate. |
| 02 | Four-date coverage 78.2016% versus approximately 78.164% historically. Seven-date coverage 100% in both. |
| 03 | Candidate 9,068.25 km², slope-filtered 8,852.16 km², cleaned 8,736.60 km² and valid 24,432.10 km². All four match the recorded historical areas at two decimals. |
| 04 | Matched area 24,406.94 km². Classified areas 8,731.27 km² for 29–31 August and 7,523.00 km² for 3–5 September 2022. The export reconciles internally. An independent historical export for that exact pair was unavailable. |
| 05 | Upper limit 93.91 km², matching the historical value and the recomputation from six holdouts. |
| 06 | The default June 2023 pair matches the archived areas to two decimals. The matched area is 25,772.33 km² and the upper limit is 93.74 km². The 17–20 June checkpoint is above the envelope at 97.52 km². The 22–25 June checkpoint qualifies at 87.27 km². |

These checks establish execution and, where a historical comparison was available, agreement in the reported summaries. The classified areas represent candidate inundation. Independent reference agreement and physical recovery require separate evidence. See [provenance](provenance.md).

## Later-stage evidence

The scope above is the Stage 1–5 reconstruction. The fixed-grid Stage 6–7 classifier differs; see the [reproduction guide](reproduction.md) for its controls and grid. Reference agreement, sensitivity tests and final interpretation are now included under `outputs/`. The 0.1412 km² Stage 6/7 control difference remains unresolved at pixel level. Reference agreement does not establish physical recovery.
