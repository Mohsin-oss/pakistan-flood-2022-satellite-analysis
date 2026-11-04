from pathlib import Path
import csv
import json

import numpy as np
import rasterio

root = Path(__file__).resolve().parents[1]
aligned = root / "outputs/stage6_2_alignment"
out = root / "outputs/stage6_3_agreement"
out.mkdir(parents=True, exist_ok=True)
audit = json.loads((aligned / "alignment_audit.json").read_text())
counts = np.zeros(4, dtype=np.int64)

with rasterio.open(root / "geotiff/stage6_2_s2_aug2022_flood_valid_20m.tif") as s2, \
     rasterio.open(aligned / "unosat3342_on_sentinel2_grid.tif") as ref:
    assert (s2.crs, s2.transform, s2.shape) == (ref.crs, ref.transform, ref.shape)
    assert s2.descriptions == ("flood", "valid_observation")
    assert ref.descriptions == ("unosat_flood", "unosat_assessed", "shared_valid")
    pixel_km2 = abs(s2.transform.determinant) / 1e6
    for _, window in ref.block_windows(3):
        reference, assessed, shared = ref.read(window=window)
        prediction, observed = s2.read(window=window)
        selected = shared == 1
        assert np.array_equal(selected, (assessed == 1) & (observed == 1))
        assert np.all(reference[selected] <= 1) and np.all(prediction[selected] <= 1)
        code = 2 * reference[selected] + prediction[selected]
        counts += np.bincount(code, minlength=4)

tn, fp, fn, tp = map(int, counts)
total = tn + fp + fn + tp
assert total == audit["areas"]["shared_valid"]["pixels"]
assert tp + fn == audit["areas"]["unosat_flood_inside_shared_valid"]["pixels"]
metrics = {
    "precision": tp / (tp + fp),
    "recall": tp / (tp + fn),
    "f1": 2 * tp / (2 * tp + fp + fn),
    "iou": tp / (tp + fp + fn),
    "overall_agreement": (tp + tn) / total,
}
matrix = [
    ("Flood detected", "Flood mapped", tp),
    ("Flood detected", "No flood mapped", fn),
    ("No flood detected", "Flood mapped", fp),
    ("No flood detected", "No flood mapped", tn),
]
with (out / "confusion_matrix.csv").open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(["unosat_3342", "sentinel_2", "pixels", "area_km2"])
    for reference, prediction, count in matrix:
        writer.writerow([reference, prediction, count, round(count * pixel_km2, 4)])

result = {
    "reference": "UNOSAT 3342 Sentinel-1, 2022-08-27",
    "prediction": "Sentinel-2 reconstruction, 2022-08-29 and 2022-08-31",
    "domain_pixels": total,
    "domain_km2": round(total * pixel_km2, 4),
    "sentinel_2_flood_km2": round((tp + fp) * pixel_km2, 4),
    "unosat_flood_km2": round((tp + fn) * pixel_km2, 4),
    "metrics": metrics,
}
(out / "agreement_metrics.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
print((out / "confusion_matrix.csv").read_text())
