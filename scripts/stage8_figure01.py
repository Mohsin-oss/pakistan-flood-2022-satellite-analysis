"""Render the verified Stage 6 confusion matrix as the first Stage 8 figure."""
from pathlib import Path
import os
import csv
import json

ROOT = Path(__file__).resolve().parents[1]
os.environ['MPLCONFIGDIR'] = str(ROOT / 'work' / 'matplotlib-cache')
import os
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parents[1] / 'work/matplotlib-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

source = ROOT / 'outputs' / 'stage6_3_agreement'
output = ROOT / 'outputs' / 'stage8_figures'
output.mkdir(parents=True, exist_ok=True)
with (source / 'confusion_matrix.csv').open(newline='') as stream:
    rows = list(csv.DictReader(stream))
metrics = json.loads((source / 'agreement_metrics.json').read_text())
pixels = np.array([int(row['pixels']) for row in rows]).reshape(2, 2)
areas = pixels * 0.0004
assert pixels.sum() == metrics['domain_pixels']
assert np.allclose(areas.ravel(), [float(row['area_km2']) for row in rows])
tp, fn, fp, tn = pixels.ravel()
assert np.isclose(2 * tp / (2 * tp + fp + fn), metrics['metrics']['f1'])
assert np.isclose(tp / (tp + fp + fn), metrics['metrics']['iou'])

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11,
                     'svg.fonttype': 'none', 'axes.titleweight': 'normal'})
fig = plt.figure(figsize=(9.5, 8.2), facecolor='white')
fig.text(.07, .95, 'Figure 1. Flood-map agreement', fontsize=20, weight='bold', color='#18344a')
fig.text(.07, .912, 'Sentinel-2 · 29 and 31 August 2022    |    UNOSAT Sentinel-1 · 27 August 2022', fontsize=10.5)
fig.text(.07, .875, f"Shared valid area  {areas.sum():,.2f} km²     •     Grid  20 m", fontsize=12)

ax = fig.add_axes([.27, .25, .60, .51])
im = ax.imshow(areas, cmap='Blues', vmin=0, vmax=areas.max(), aspect='auto')
ax.set_xticks([0, 1], ['Flood mapped', 'No flood mapped'])
ax.set_yticks([0, 1], ['Flood detected', 'No flood detected'])
ax.xaxis.tick_top()
ax.xaxis.set_label_position('top')
ax.set_xlabel('Sentinel-2 classification', labelpad=15, fontsize=12, weight='bold')
ax.set_ylabel('UNOSAT reference', labelpad=18, fontsize=12, weight='bold')
ax.tick_params(axis='both', length=0, pad=10)
for spine in ax.spines.values():
    spine.set_visible(False)
ax.axvline(.5, color='white', linewidth=3)
ax.axhline(.5, color='white', linewidth=3)
labels = [['Both detect flood', 'UNOSAT only'], ['Sentinel-2 only', 'Both indicate no flood']]
for (y, x), value in np.ndenumerate(areas):
    color = 'white' if value > .55 * areas.max() else '#18344a'
    ax.text(x, y - .18, labels[y][x], ha='center', va='center', fontsize=11, color=color)
    ax.text(x, y, f'{value:,.2f} km²', ha='center', va='center', fontsize=18, weight='bold', color=color)
    ax.text(x, y + .18, f'{100 * value / areas.sum():.2f}% of shared area',
            ha='center', va='center', fontsize=10, color=color)

fig.text(.07, .175, f"Flood F1  {metrics['metrics']['f1']:.3f}     |     Flood IoU  {100*metrics['metrics']['iou']:.2f}%"
         f"     |     Overall agreement  {100*metrics['metrics']['overall_agreement']:.2f}%", fontsize=12, weight='bold')
fig.text(.07, .12, 'Percentages use the full shared valid area. Darker shading represents greater area.', fontsize=9.5)
fig.text(.07, .09, 'Agreement is relative to a preliminary satellite reference. The 2–4 day acquisition gap', fontsize=9.5)
fig.text(.07, .068, 'and sensor differences limit attribution of disagreements.', fontsize=9.5)
fig.savefig(output / 'figure01_flood_map_agreement.png', dpi=240)
fig.savefig(output / 'figure01_flood_map_agreement.svg')
plt.close(fig)
print(output / 'figure01_flood_map_agreement.png')
