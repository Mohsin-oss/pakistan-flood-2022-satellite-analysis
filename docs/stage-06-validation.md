# Stage 6 independent validation

- Archive the exact Stage 5 Earth Engine script and identify the event-date candidate mask and matching valid-observation mask.
- Record reference product producer, acquisition time, footprint, class definitions, version, and reuse terms. Check independence from the candidate classification and document any shared inputs.
- Define overlap using valid candidate observations and valid reference coverage. Harmonize coordinate system, grid, class definitions, and treatment of pre-existing water. Preserve unknown pixels as unknown.
- Freeze the comparison rules before calculating metrics. Record date mismatch, excluded area, comparison counts, and limitations. Report agreement against the named reference using a confusion matrix and flood precision, recall, and intersection over union where denominators permit. If sampling, document design and weighting.
- Keep the original candidate classification separate from any tuning informed by the reference. Record the script revision, settings, source identifiers, and output filenames for each comparison.

Validation results are pending.
