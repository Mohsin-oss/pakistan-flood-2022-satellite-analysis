# Stage 8 — Final interpretation and figure captions

Stage 8 is closed for the project workflow. This text uses the verified local June recovery exports and Stage 6–7 results. Remaining evidence limitations are recorded below. Stage 9 is next.

## Results and discussion

### Flood-map agreement

The reconstructed Sentinel-2 event map, based on observations from 29 and 31 August 2022, identified 8,851.90 km² of mapped flood area within 24,420.33 km² of valid observations in the locally rasterized study rectangle. Comparison with the UNOSAT Sentinel-1 product acquired on 27 August was restricted to 16,496.02 km² with valid coverage from both products, approximately 63.2% of the study rectangle.

Within that shared footprint, Sentinel-2 mapped 7,433.92 km² of flood area and UNOSAT identified 5,874.80 km². Both detected flooding over 5,322.06 km². Relative to UNOSAT, precision was 71.59%, recall 90.59%, flood F1 0.800, flood intersection over union 66.64%, and overall agreement 83.85% (Figure 1).

Disagreement was asymmetric. Sentinel-2-only detections covered 2,111.86 km², compared with 552.74 km² detected only by UNOSAT. The Stage 6.4 map showed a broad concentration of Sentinel-2-only detections and smaller concentrations in the opposite direction. Its 10 km cell threshold was descriptive. The causes of these spatial differences remain unresolved. Changes in inundation during the 2–4 day interval may contribute alongside differences in sensor response and processing.

### Sensitivity to processing choices

Five tests varied one parameter at a time. The slope cutoff produced the largest response over the selected settings. Reducing the maximum slope from 5° to 3° decreased mapped area by 11.18%, while increasing it to 7° increased area by 1.91% (Figure 2). Terrain filtering preceded patch cleanup, so these responses include direct exclusions and changes in which connected patches met the minimum size requirement.

Perturbing the event MNDWI threshold by ±0.02 changed area by −0.44% to +0.27%. The same perturbation to the MNDWI change threshold produced changes of −1.31% to +1.13%. Minimum patch sizes of 10 and 50 pixels, relative to the 25-pixel control, changed area by +0.72% and −0.79%.

Cloud Score+ cutoffs from 0.55 to 0.65 reduced valid coverage from 94.12% to 92.86% of the study area. Across the 24,239.81 km² valid under all three cutoffs, flood area changed by −0.067% to +0.138% relative to the matched control. The common mask was applied before patch cleanup in all three scenarios.

These tests describe area sensitivity within selected ranges. They do not establish an optimal setting, quantify total uncertainty, or test interactions among parameters. Small net changes can also conceal compensating spatial additions and removals.

### June recovery assessment

Each verified June comparison recalculated classified area and a descriptive pre-flood envelope on a shared valid footprint. The envelope used the mean ± two sample standard deviations of six April 2022 holdouts, with the lower limit clipped to zero.

On the early–mid-June footprint, areas of 102.34 km² for 2–5 June and 96.63 km² for 17–20 June exceeded the 92.93 km² upper limit. On the mid–late-June footprint, the recalculated 17–20 June area was 97.52 km², above its 93.74 km² limit. The 22–25 June area of 87.27 km² fell within that envelope (Figure 3).

The late-June observation met the adopted return-to-baseline criterion. Two consecutive qualifying checkpoints were not demonstrated through 25 June. This criterion concerns the optical classification metric. Further evidence would be needed to establish physical flood recovery.

### Scope and remaining evidence limitations

UNOSAT is a preliminary satellite reference, and the comparison covers only the shared assessment footprint. The acquisition gap, sensor differences, and reference limitations constrain interpretation of agreement scores.

Stage 6–7 used a reconstructed event workflow. Original historical grid and compositing details were only partly documented. The Stage 7 control exceeded the locally counted Stage 6.2 event area by 0.1412 km². That small difference remains unreconciled at the pixel level.

The previously reported first sampled return in May 2023 remains provisional because its local export was unavailable for verification. Figure 3 and the recovery conclusions above rely on the verified June exports.

## Final figure captions

**Figure 1. Flood-map agreement between Sentinel-2 and UNOSAT.** The Sentinel-2 composite uses observations from 29 and 31 August 2022, compared with UNOSAT Product 3342 derived from Sentinel-1 on 27 August. Areas and percentages are calculated over the 16,496.02 km² shared valid footprint on a 20 m grid. Rows show UNOSAT classes and columns show Sentinel-2 classes. Percentages use the entire shared footprint as the denominator. Flood F1 and intersection over union assess flood-class agreement, while overall agreement includes both classes. The preliminary reference and acquisition gap limit attribution of disagreements.

**Figure 2. Sensitivity of mapped flood area to five processing choices.** Each test varies one parameter while holding the other settings fixed. Markers identify lower and higher numerical settings, and lines connect the observed outcomes. Percentage changes use the relevant control. Tests 1–4 use a control flood area of 8,852.04 km² within 24,420.45 km² of valid observations. The cloud-cutoff test uses a matched control of 8,847.35 km² within a common footprint of 24,239.81 km². The tested ranges differ among parameters, and the plotted ranges describe sensitivity rather than statistical confidence intervals. The slope response includes effects of subsequent patch cleanup.

**Figure 3. June 2023 recovery checkpoints relative to matched pre-flood envelopes.** Panel A compares 2–5 and 17–20 June over 25,531.63 km². Panel B compares 17–20 and 22–25 June over 25,772.33 km². Each envelope is independently recalculated from six April 2022 holdouts on that panel's footprint. Shading spans the mean ± two sample standard deviations, with a zero lower limit. The differing 17–20 June values reflect differing spatial domains. Only 22–25 June falls within its envelope. Sustained return under the two-consecutive-checkpoint rule remained unconfirmed through 25 June.

## Evidence files

- Agreement figures and scores — `../stage6_3_agreement/confusion_matrix.csv`, `../stage6_3_agreement/agreement_metrics.json`
- Event footprint and grid — `../stage6_2_alignment/alignment_audit.json`
- Spatial disagreement — `../stage6_4_disagreement/cluster_summary.json` and `disagreement_cells_10km.csv`
- Sensitivity — the five `stage7_*.csv` exports in `../stage7-mndwi/`
- Recovery — `../stage5_historical/stage5_june_recovery_matched.csv` and `stage5_late_june_recovery_matched.csv`
- Figure sources — `../../scripts/stage8_figure01.py`, `stage8_figure02.py`, and `stage8_figure03.py`
