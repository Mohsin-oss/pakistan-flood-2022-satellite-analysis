"""Plot verified one-at-a-time sensitivity tests on a common percentage axis."""
from pathlib import Path
import os
import csv
import math

ROOT = Path(__file__).resolve().parents[1]
os.environ['MPLCONFIGDIR'] = str(ROOT / 'work' / 'matplotlib-cache')
import os
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parents[1] / 'work/matplotlib-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.ticker import MultipleLocator

source = ROOT / 'outputs' / 'stage7-mndwi'
output = ROOT / 'outputs' / 'stage8_figures'
output.mkdir(parents=True, exist_ok=True)
tests = [
    ('stage7_1_event_mndwi_sensitivity.csv', 'Event MNDWI', 'event_mndwi_threshold', ['0.08995', '0.10995', '0.12995']),
    ('stage7_2_change_mndwi_sensitivity.csv', 'MNDWI change', 'change_mndwi_threshold', ['0.40004', '0.42004', '0.44004']),
    ('stage7_3_slope_sensitivity.csv', 'Maximum slope', 'slope_limit_deg', ['3°', '5°', '7°']),
    ('stage7_4_patch_size_sensitivity.csv', 'Minimum patch size', 'min_patch_pixels', ['10 pixels', '25 pixels', '50 pixels']),
    ('stage7_5_cloud_cutoff_sensitivity.csv', 'Cloud Score+ cutoff', 'cloud_score_cutoff', ['0.55', '0.60', '0.65']),
]
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11, 'svg.fonttype': 'none'})
fig = plt.figure(figsize=(11, 8.3), facecolor='white')
ax = fig.add_axes([.25, .27, .68, .53])
blue, orange = '#2166ac', '#b94d0b'
ylabels = []
for i, (filename, name, parameter, labels) in enumerate(tests):
    with (source / filename).open(newline='') as stream:
        rows = sorted(csv.DictReader(stream), key=lambda r: float(r[parameter]))
    cloud = i == 4
    area_key = 'matched_flood_area_km2' if cloud else 'flood_area_km2'
    pct_key = 'net_change_vs_matched_control_pct' if cloud else 'net_change_vs_control_percent'
    domain_key = 'matched_valid_pixels' if cloud else 'valid_pixels'
    assert rows[1]['scenario'] == 'control'
    assert len(set(r[domain_key] for r in rows)) == 1
    control = float(rows[1][area_key])
    assert math.isclose(control, 8847.348 if cloud else 8852.0372)
    values = []
    for row in rows:
        value = (float(row[area_key]) / control - 1) * 100
        assert math.isclose(value, float(row[pct_key]), abs_tol=1e-10)
        values.append(value)
    y = 4 - i
    ax.hlines(y, min(values), max(values), color='#9aa8b1', linewidth=2, zorder=2)
    ax.scatter(0, y, s=24, color='#213749', zorder=5)
    for index, color, marker, dy in [(0, blue, 'o', 18), (2, orange, 's', -23)]:
        value = values[index]
        ax.scatter(value, y, s=75, color=color, marker=marker, zorder=4)
        ax.annotate(f'{value:+.3f}%  ·  {labels[index]}', (value, y),
                    xytext=(0, dy), textcoords='offset points', ha='center', va='center',
                    fontsize=10, color=color)
    ylabels.append(f'{name}\nControl {labels[1]}')

ax.axvline(0, color='#5b6770', linewidth=1, linestyle='--', zorder=1)
ax.set_yticks([4, 3, 2, 1, 0], ylabels)
ax.set_ylim(-.6, 4.6)
ax.set_xlim(-13, 3.6)
ax.xaxis.set_major_locator(MultipleLocator(2))
ax.grid(axis='x', color='#e5e8eb', linewidth=.7)
ax.set_axisbelow(True)
ax.tick_params(axis='y', length=0, pad=12)
ax.set_xlabel('Change in mapped flood area relative to each test’s control (%)', labelpad=12)
for side in ['top', 'right', 'left']:
    ax.spines[side].set_visible(False)
ax.spines['bottom'].set_color('#a7afb5')
fig.text(.06, .95, 'Figure 2. Sensitivity of mapped flood area', fontsize=19, weight='bold', color='#18344a')
fig.text(.06, .912, 'Sentinel-2 event composite · 29 and 31 August 2022 · One parameter varied at a time', fontsize=11)
fig.legend(handles=[Line2D([], [], marker='o', color=blue, linestyle='none', label='Lower numerical setting'),
                    Line2D([], [], marker='s', color=orange, linestyle='none', label='Higher numerical setting'),
                    Line2D([], [], marker='o', color='#213749', linestyle='none', markersize=4, label='Control')],
           loc='upper left', bbox_to_anchor=(.055, .88), ncol=3, frameon=False, fontsize=10)
fig.text(.06, .15, 'Tests 1–4   Control flood area 8,852.04 km² on 24,420.45 km² of valid observations.', fontsize=10)
fig.text(.06, .117, 'Cloud test   Control flood area 8,847.35 km² on a 24,239.81 km² common valid footprint.', fontsize=10)
fig.text(.06, .076, 'Lines connect the tested outcomes. These ranges describe sensitivity to the selected settings.', fontsize=10)
fig.text(.06, .047, 'The parameter ranges differ, so their effects depend on the chosen perturbations.', fontsize=10)
fig.savefig(output / 'figure02_sensitivity_all_tests.png', dpi=240)
fig.savefig(output / 'figure02_sensitivity_all_tests.svg')
plt.close(fig)
print('All five tests verified and rendered.')
