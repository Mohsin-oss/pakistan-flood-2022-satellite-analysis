"""Audit Earth Engine CSV exports using only the Python standard library."""

import argparse
import csv
import math
import statistics
from pathlib import Path


APRIL = [f"april_{day:02}_km2" for day in (1, 6, 11, 16, 21, 26)]
ARCHIVE_FIELDS = {
    "stage5_june_recovery_matched": (
        "june_02_05_km2", "june_17_20_km2",
        "early_june_qualifies", "mid_june_qualifies", "both_june_qualify",
        "early_june_coverage_percent", "mid_june_coverage_percent",
    ),
    "stage5_late_june_recovery_matched": (
        "june_17_20_km2", "june_22_25_km2",
        "june_17_20_qualifies", "june_22_25_qualifies", "both_qualify",
        "mid_coverage_percent", "late_coverage_percent",
    ),
}


def close(actual, expected, field):
    if not math.isclose(float(actual), expected, rel_tol=1e-9, abs_tol=1e-7):
        raise ValueError(f"{field}: expected {expected}, found {actual}")


def recovery(path, rows):
    if len(rows) != 1:
        raise ValueError("Expected one matched comparison per CSV")
    row = rows[0]
    historical = ARCHIVE_FIELDS.get(path.stem)
    area_keys = historical[:2] if historical else ("first_km2", "second_km2")
    matched = float(row["matched_domain_km2"])
    calibration = float(row["calibration_domain_km2"])
    if not 0 < matched <= calibration + 1e-7:
        raise ValueError("Expected a positive matched domain inside calibration domain")
    areas = {key: float(row[key]) for key in APRIL + list(area_keys)}
    if any(not 0 <= area <= matched + 1e-7 for area in areas.values()):
        raise ValueError("Classified area falls outside the matched domain")
    background = [areas[key] for key in APRIL]
    mean = statistics.mean(background)
    sd = statistics.stdev(background)
    lower, upper = max(0, mean - 2 * sd), mean + 2 * sd
    passes = [lower <= areas[key] <= upper for key in area_keys]
    coverage = 100 * matched / calibration
    if historical:
        expected = {
            "preflood_mean_km2": mean, "preflood_sample_sd_km2": sd,
            "recovery_lower_km2": lower, "recovery_upper_km2": upper,
            "matched_coverage_percent": coverage,
            historical[2]: passes[0], historical[3]: passes[1],
            historical[4]: all(passes),
        }
        for key, value in expected.items():
            close(row[key], value, key)
        checkpoint_coverages = [float(row[key]) for key in historical[5:]]
    else:
        checkpoint_coverages = [
            100 * float(row[key]) / calibration
            for key in ("first_valid_km2", "second_valid_km2")
        ]
    if any(not coverage - 1e-7 <= value <= 100 + 1e-7 for value in checkpoint_coverages):
        raise ValueError("Checkpoint coverage inconsistent with matched coverage")
    print(f"{path.name}: {matched:.2f} km² ({coverage:.2f}%)")
    print(f"  April mean={mean:.2f}, sample SD={sd:.2f}, envelope={lower:.2f}–{upper:.2f} km²")
    for index, (key, qualifies) in enumerate(zip(area_keys, passes)):
        prefix = ("first", "second")[index]
        label = key if historical else f"{row[prefix + '_start']} to {row[prefix + '_end']}"
        print(f"  {label}: {areas[key]:.2f} km², qualifies={qualifies}")
    print(f"  Both checkpoints qualify: {all(passes)}")


def otsu(bins):
    bins = sorted((center, count) for center, count in bins if count > 0)
    if len(bins) < 2:
        raise ValueError("Otsu requires at least two occupied bins")
    total_count = sum(count for _, count in bins)
    total_sum = sum(center * count for center, count in bins)
    left_count = left_sum = 0
    best_score = -1
    threshold = None
    for index, (center, count) in enumerate(bins[:-1]):
        left_count += count
        left_sum += center * count
        right_count = total_count - left_count
        separation = left_sum / left_count - (total_sum - left_sum) / right_count
        score = left_count * right_count * separation ** 2
        if score > best_score:
            best_score = score
            threshold = (center + bins[index + 1][0]) / 2
    return threshold


def histogram(path, rows):
    for band in ("mndwi", "change"):
        bins = [(float(row["center"]), float(row["count"])) for row in rows if row["band"] == band]
        print(f"{path.name}: {band} diagnostic Otsu midpoint={otsu(bins):.15g}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["recovery", "otsu"])
    parser.add_argument("csv", type=Path, nargs="+")
    args = parser.parse_args()
    audit = recovery if args.kind == "recovery" else histogram
    for path in args.csv:
        with path.open(encoding="utf-8-sig", newline="") as stream:
            audit(path, list(csv.DictReader(stream)))


if __name__ == "__main__":
    main()
