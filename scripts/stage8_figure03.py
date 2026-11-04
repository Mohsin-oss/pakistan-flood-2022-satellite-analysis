"""Plot the two verified June recovery comparisons on their own domains."""
from pathlib import Path
import os
import csv
import math
import statistics

ROOT = Path(__file__).resolve().parents[1]
os.environ['MPLCONFIGDIR'] = str(ROOT / 'work' / 'matplotlib-cache')
import os
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parents[1] / 'work/matplotlib-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

downloads = ROOT / 'outputs/stage5_historical'
output = ROOT / 'outputs' / 'stage8_figures'
output.mkdir(parents=True, exist_ok=True)
specifications = [
    ('stage5_june_recovery_matched.csv', 'A  ·  Early–mid June',
     ['june_02_05_km2', 'june_17_20_km2'], ['2–5 June', '17–20 June'],
     ['early_june_qualifies', 'mid_june_qualifies']),
    ('stage5_late_june_recovery_matched.csv', 'B  ·  Mid–late June',
     ['june_17_20_km2', 'june_22_25_km2'], ['17–20 June', '22–25 June'],
     ['june_17_20_qualifies', 'june_22_25_qualifies']),
]
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11, 'svg.fonttype': 'none'})
fig, axes = plt.subplots(1, 2, figsize=(11, 7.4), sharey=True)
fig.subplots_adjust(left=.09, right=.97, bottom=.29, top=.72, wspace=.12)
above, within, shade = '#b94d0b', '#176b55', '#e8f1ee'
for ax, (filename, title, fields, dates, flags) in zip(axes, specifications):
    with (downloads / filename).open(newline='') as stream:
        row = next(csv.DictReader(stream))
    april = [float(row[k]) for k in row if k.startswith('april_')]
    mean = statistics.mean(april)
    sd = statistics.stdev(april)
    lower, upper = max(0, mean - 2*sd), mean + 2*sd
    assert math.isclose(mean, float(row['preflood_mean_km2']))
    assert math.isclose(sd, float(row['preflood_sample_sd_km2']))
    assert math.isclose(upper, float(row['recovery_upper_km2']))
    assert math.isclose(lower, float(row['recovery_lower_km2']))
    ax.axhspan(lower, upper, facecolor=shade, zorder=0)
    ax.axhline(upper, color='#587569', linestyle='--', linewidth=1.3)
    ax.axhline(mean, color='#899790', linestyle=':', linewidth=1)
    ax.text(.5, upper - 6, f'Upper limit {upper:.2f} km²', ha='center', color='#365c4d', fontsize=10)
    ax.text(.5, mean + 3, f'April mean {mean:.2f} km²', ha='center', color='#53665d', fontsize=10)
    for x, field, flag in zip([0, 1], fields, flags):
        value = float(row[field])
        passed = lower <= value <= upper
        assert int(row[flag]) == int(passed)
        color, marker = (within, 'o') if passed else (above, '^')
        ax.scatter(x, value, s=100, marker=marker, color=color, zorder=4)
        ax.annotate(f'{value:.2f}', (x, value), xytext=(0, -23 if passed else 13),
                    textcoords='offset points', ha='center', color=color, weight='bold', fontsize=12)
        ax.text(x, 8, 'Within envelope' if passed else 'Above envelope',
                ha='center', color=color, fontsize=10)
    ax.set_xlim(-.4, 1.4)
    ax.set_ylim(0, 120)
    ax.set_xticks([0, 1], dates)
    ax.set_yticks(range(0, 121, 20))
    ax.set_xlabel('Observation window · 2023', labelpad=10)
    ax.set_title(f"{title}\nMatched domain {float(row['matched_domain_km2']):,.2f} km²",
                 fontsize=12, loc='left', pad=15, linespacing=1.6)
    ax.grid(axis='y', color='#cbd5d0', linewidth=.5, alpha=.6)
    ax.set_axisbelow(True)
    for side in ['top', 'right']:
        ax.spines[side].set_visible(False)
    ax.spines['left'].set_color('#a7afb5')
    ax.spines['bottom'].set_color('#a7afb5')
axes[0].set_ylabel('Classified area (km²)', labelpad=10)
fig.text(.065, .945, 'Figure 3. June recovery checkpoints', fontsize=20, weight='bold', color='#18344a')
fig.text(.065, .897, 'Each pair uses its own shared valid footprint and six April 2022 background observations.', fontsize=11)
fig.legend(handles=[Patch(facecolor=shade, edgecolor='#b0c8bc', label='Pre-flood envelope'),
                    Line2D([], [], marker='^', color=above, linestyle='none', label='Above envelope'),
                    Line2D([], [], marker='o', color=within, linestyle='none', label='Within envelope')],
           loc='upper left', bbox_to_anchor=(.06, .855), ncol=3, frameon=False, fontsize=10)
fig.text(.065, .17, 'Envelope = April mean ± 2 sample standard deviations, with the lower limit clipped to zero.', fontsize=10)
fig.text(.065, .135, 'The two values for 17–20 June reflect different comparison footprints.', fontsize=10)
fig.text(.065, .087, '22–25 June qualified. Two consecutive qualifying checkpoints were unconfirmed through 25 June.', fontsize=10)
fig.text(.065, .052, 'The criterion assesses return of the optical classification metric to its pre-flood range.', fontsize=10)
fig.savefig(output / 'figure03_june_recovery.png', dpi=240)
fig.savefig(output / 'figure03_june_recovery.svg')
plt.close(fig)
print('Both recovery envelopes and all four qualification flags verified.')
