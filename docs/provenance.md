# Artifact provenance

| Item | Source | Status |
| --- | --- | --- |
| Scripts 01–06 in `gee/` | User-supplied Stage 1–5 reconstructions, compacted by removing decorative comments | All six ran in Earth Engine. See [reviewed reruns](methodology.md#reviewed-reruns) for the historical comparisons and their limits. |
| [stage5_june_recovery_matched.csv](../results/tables/stage5_june_recovery_matched.csv) | Existing Earth Engine export recovered locally | Byte-preserved historical export. Recomputed envelope, flags and area ratio agree with CSV. |
| [stage5_late_june_recovery_matched.csv](../results/tables/stage5_late_june_recovery_matched.csv) | Existing Earth Engine export recovered locally | Byte-preserved historical export. Recomputed envelope, flags and area ratio agree with CSV. |
| April/May checkpoint results | project-01 discussion and May–June Work handoff | Reported numbers. Raw exports unavailable. |
| Stage 1–4 historical outputs | Historical study | Scene inventory, coverage tables, composites, histograms, maps and evolution exports unavailable in the accessible sources. |
| June candidate screening | Historical study | Raw screening output unavailable. |

Historical exports remain separate from new runs. For any new artifact record the source collection IDs and acquisition IDs, AOI and grid, masks, thresholds and patch settings, inclusive observation windows, domain definition and area, script commit, Earth Engine task ID and completion status, and file checksum.

## Stage 9 package

The historical inventory above is retained for traceability. The package also includes reviewed rerun CSVs for Stages 3–6, original June recovery exports, local Stage 6 audits and metrics, five Stage 7 exports and three final figures. See [source manifest](source_manifest.json), [input checksums](input_checksums.json), [validation record](validation.json) and [reproduction guide](reproduction.md). Scripts 08–12 are packaging reconstructions whose fresh cloud execution remains unverified.
