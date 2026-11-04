"""Recompute recovery, agreement and sensitivity arithmetic from local exports."""
from pathlib import Path
import csv
import json
import math
import statistics

root = Path(__file__).resolve().parents[1]
out = root / 'outputs'

def rows(path):
    with path.open(newline='', encoding='utf-8-sig') as stream:
        return list(csv.DictReader(stream))

def close(a, b):
    assert math.isclose(float(a), float(b), rel_tol=1e-10, abs_tol=1e-8), (a, b)

for path in (out / 'stage5_historical').glob('*.csv'):
    row = rows(path)[0]
    april = [float(v) for k,v in row.items() if k.startswith('april_')]
    mean, sd = statistics.mean(april), statistics.stdev(april)
    low, high = max(0, mean-2*sd), mean+2*sd
    for key, value in [('preflood_mean_km2', mean), ('preflood_sample_sd_km2', sd),
                       ('recovery_lower_km2', low), ('recovery_upper_km2', high)]:
        close(row[key], value)
    close(row['matched_coverage_percent'],100*float(row['matched_domain_km2'])/float(row['calibration_domain_km2']))
    if 'june_02_05_km2' in row:
        pairs = [('june_02_05_km2','early_june_qualifies'),('june_17_20_km2','mid_june_qualifies')]
        both = 'both_june_qualify'
    else:
        pairs = [('june_17_20_km2','june_17_20_qualifies'),('june_22_25_km2','june_22_25_qualifies')]
        both = 'both_qualify'
    flags = [int(low <= float(row[area]) <= high) for area, _ in pairs]
    for flag, (_, name) in zip(flags, pairs):
        close(row[name], flag)
    close(row[both], all(flags))

matrix = rows(out / 'stage6_3_agreement/confusion_matrix.csv')
tp, fn, fp, tn = [int(r['pixels']) for r in matrix]
for row in matrix:
    close(row['area_km2'], int(row['pixels'])*.0004)
metrics = json.loads((out / 'stage6_3_agreement/agreement_metrics.json').read_text())
values = dict(precision=tp/(tp+fp),recall=tp/(tp+fn),f1=2*tp/(2*tp+fp+fn),
              iou=tp/(tp+fp+fn),overall_agreement=(tp+tn)/(tp+fn+fp+tn))
for key, value in values.items():
    close(metrics['metrics'][key], value)
close(metrics['domain_km2'], (tp+fn+fp+tn)*.0004)
alignment = json.loads((out / 'stage6_2_alignment/alignment_audit.json').read_text())
assert alignment['areas']['shared_valid']['pixels'] == tp+fn+fp+tn

for path in sorted((out / 'stage7-mndwi').glob('*.csv')):
    data = rows(path)
    control = next(r for r in data if r['scenario'] == 'control')
    cloud = 'cloud' in path.name
    prefix = 'matched_' if cloud else ''
    area = prefix+'flood_area_km2'
    pixels = prefix+'flood_pixels'
    change = 'net_change_vs_matched_control_km2' if cloud else 'net_change_vs_control_km2'
    percent = 'net_change_vs_matched_control_pct' if cloud else 'net_change_vs_control_percent'
    added = 'added_vs_matched_control_km2' if cloud else 'added_vs_control_km2'
    removed = 'removed_vs_matched_control_km2' if cloud else 'removed_vs_control_km2'
    domain = 'matched_valid_pixels' if cloud else 'valid_pixels'
    assert len({r[domain] for r in data}) == 1
    for row in data:
        close(row[area], float(row[pixels])*.0004)
        delta = float(row[area])-float(control[area])
        close(row[change], delta)
        close(row[percent], 100*delta/float(control[area]))
        close(row[added], delta+float(row[removed]))
    close(control['control_native_flood_pixels' if cloud else pixels],22130093)
    close(control['control_native_valid_pixels' if cloud else domain],61051122)

cells = rows(out / 'stage6_4_disagreement/disagreement_cells_10km.csv')
close(sum(float(r['sentinel2_only_km2']) for r in cells), fp*.0004)
close(sum(float(r['unosat_only_km2']) for r in cells), fn*.0004)
print('PASS — recovery, agreement, five sensitivity tests and spatial cell totals.')
