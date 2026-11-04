from pathlib import Path
import csv
import json
import numpy as np
import rasterio
from rasterio.enums import Resampling
from pyproj import Transformer
from scipy.ndimage import label
import os
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parents[1] / 'work/matplotlib-cache')
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import Rectangle, Patch
from matplotlib.ticker import FuncFormatter, MultipleLocator

root = Path(__file__).resolve().parents[1]
out = root / "outputs/stage6_4_disagreement"
out.mkdir(parents=True, exist_ok=True)
source = root / "geotiff/stage6_2_s2_aug2022_flood_valid_20m.tif"
reference = root / "outputs/stage6_2_alignment/unosat3342_on_sentinel2_grid.tif"
step = 10000
to_geo = Transformer.from_crs(32642, 4326, always_xy=True)
with rasterio.open(source) as s2, rasterio.open(reference) as ref:
    assert (s2.transform, s2.shape, s2.crs) == (ref.transform, ref.shape, ref.crs)
    bounds = ref.bounds
    x0 = int(bounds.left // step * step)
    y0 = int(bounds.bottom // step * step)
    nx = int(np.ceil((bounds.right - x0) / step))
    ny = int(np.ceil((bounds.top - y0) / step))
    aggregate = np.zeros((3, ny, nx), dtype=np.int64)
    profile = ref.profile.copy()
    profile.update(count=1, nodata=255, compress="deflate")
    raster_path = out / "stage6_4_disagreement_20m.tif"
    with rasterio.open(raster_path, "w", **profile) as dst:
        dst.set_band_description(1, "0 agreement, 1 Sentinel-2 only, 2 UNOSAT only")
        for _, window in ref.block_windows(3):
            unosat, _, mask = ref.read(window=window)
            sentinel = s2.read(1, window=window)
            valid = mask == 1
            assert np.all(unosat[valid] <= 1) and np.all(sentinel[valid] <= 1)
            s2_only = valid & (sentinel == 1) & (unosat == 0)
            un_only = valid & (sentinel == 0) & (unosat == 1)
            result = np.full(valid.shape, 255, dtype="uint8")
            result[valid] = 0
            result[s2_only] = 1
            result[un_only] = 2
            dst.write(result, 1, window=window)
            col = window.col_off + np.arange(result.shape[1]) + .5
            row = window.row_off + np.arange(result.shape[0]) + .5
            ix = ((ref.transform.c + col * 20 - x0) // step).astype(int)
            iy = ((ref.transform.f - row * 20 - y0) // step).astype(int)
            cell = iy[:, None] * nx + ix
            for i, selected in enumerate((valid, s2_only, un_only)):
                aggregate[i] += np.bincount(cell[selected], minlength=nx*ny).reshape(ny,nx)

with (root / "outputs/stage6_3_agreement/confusion_matrix.csv").open() as stream:
    matrix = list(csv.DictReader(stream))
assert aggregate[0].sum() == sum(int(r["pixels"]) for r in matrix)
assert aggregate[1].sum() == int(matrix[2]["pixels"])
assert aggregate[2].sum() == int(matrix[1]["pixels"])

# A descriptive concentration rule, applied equally in both directions.
threshold = 10
km2 = aggregate * .0004
cluster_summaries = []
with (out / "disagreement_cells_10km.csv").open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(["utm_easting_min_m", "utm_northing_min_m", "center_lon", "center_lat",
                     "shared_valid_km2", "sentinel2_only_km2", "unosat_only_km2"])
    for y, x in zip(*np.nonzero(aggregate[0])):
        lon, lat = to_geo.transform(x0 + (x+.5)*step, y0 + (y+.5)*step)
        writer.writerow([x0+x*step,y0+y*step,round(lon,5),round(lat,5),
                         *np.round(km2[:,y,x],4)])

fig, axes = plt.subplots(1, 2, figsize=(11, 8.6), layout="constrained")
with rasterio.open(raster_path) as raster:
    # Full-resolution categories are in the GeoTIFF. The map display is sampled.
    view = raster.read(1, out_shape=(2600, round(2600*raster.width/raster.height)),
                       resampling=Resampling.nearest)
for i, (ax, color, name) in enumerate(zip(axes, ["#b64619","#215e9e"],
                                        ["Sentinel-2 only","UNOSAT only"]), 1):
    display = np.zeros_like(view)
    display[view == 255] = 2
    display[view == i] = 1
    ax.imshow(display, extent=[bounds.left,bounds.right,bounds.bottom,bounds.top],
              cmap=ListedColormap(["#e5e8eb",color,"#ffffff"]), vmin=0, vmax=2,
              interpolation="nearest")
    hot = km2[i] >= threshold
    labels, number = label(hot)
    clusters = []
    for n in range(1,number+1):
        ys,xs = np.where(labels==n)
        weights = km2[i,ys,xs]
        east = x0 + (np.average(xs,weights=weights)+.5)*step
        north = y0 + (np.average(ys,weights=weights)+.5)*step
        lon,lat = to_geo.transform(east,north)
        clusters.append(dict(cells=len(xs),area_km2=round(float(weights.sum()),2),
                             lon=round(lon,4),lat=round(lat,4),east=east,north=north))
    clusters.sort(key=lambda c: c["area_km2"],reverse=True)
    for y,x in zip(*np.where(hot)):
        ax.add_patch(Rectangle((x0+x*step,y0+y*step),step,step,
                               linewidth=.65,edgecolor="#263747",facecolor="none"))
    for rank, cluster in enumerate(clusters[:3],1):
        ax.text(cluster["east"],cluster["north"],str(rank),ha="center",va="center",
                color="#142436",fontsize=10,fontweight="bold",
                bbox=dict(boxstyle="circle,pad=.24",fc="white",ec="#263747",lw=.75))
    cluster_summaries.append({"direction":name, "threshold_km2":threshold,
                              "cluster_count":number, "top_clusters":clusters[:3]})
    ax.set_title(f"{name}  |  {km2[i].sum():,.2f} km²",loc="left",fontsize=13,pad=10)
    ax.set_xlabel("UTM easting (km)")
    if i == 1:
        ax.set_ylabel("UTM northing (km)")
    ax.xaxis.set_major_locator(MultipleLocator(30000))
    ax.yaxis.set_major_locator(MultipleLocator(30000))
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{x/1000:,.0f}"))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{x/1000:,.0f}"))
    ax.tick_params(labelsize=8)
    ax.legend(handles=[Patch(facecolor=color,label="Disagreement shown"),
                       Patch(facecolor="#e5e8eb",label="Other shared-valid pixels"),
                       Patch(facecolor="white",edgecolor="#b5b8bb",label="Outside shared-valid area"),
                       Patch(facecolor="none",edgecolor="#263747",label="≥10 km² in a 10 km cell")],
              loc="lower left",fontsize=8,framealpha=.95)
fig.suptitle("Pakistan 2022 flood map disagreement\n"
             "Sentinel-2, 29 and 31 Aug  |  UNOSAT Sentinel-1, 27 Aug",
             fontsize=16,fontweight="bold")
fig.savefig(out / "stage6_4_disagreement_map.png",dpi=210)
plt.close(fig)
(out / "cluster_summary.json").write_text(json.dumps(cluster_summaries,indent=2)+"\n")
print(json.dumps(cluster_summaries,indent=2))
