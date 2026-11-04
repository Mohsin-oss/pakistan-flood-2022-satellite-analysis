from pathlib import Path
import json
import struct
import numpy as np
from pyproj import Transformer
import geopandas as gpd
import shapely
from shapely.geometry import box

root = Path(__file__).resolve().parents[1]
source = root / "FL20220808PAK_SHP"
output = root / "outputs" / "stage6_1_unosat3342"
output = output / "tiled"
output.mkdir(parents=True, exist_ok=True)
crs = "EPSG:32642"

def read_layer(kind):
    path = source / f"S1_20220827_{kind}_Sindh_Balochistan.shp"
    return gpd.read_file(path).to_crs(crs)

def polygon_parts(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry]
    if geometry.geom_type in ("MultiPolygon", "GeometryCollection"):
        return [part for child in geometry.geoms for part in polygon_parts(child)]
    return []

aoi = gpd.GeoSeries([box(67.2, 26.4, 68.6, 28.1)], crs="EPSG:4326").to_crs(crs).iloc[0]
boundary = read_layer("AnalysisExtent").union_all()
assert boundary.is_valid
footprint = aoi.intersection(boundary)
bounds = box(*footprint.bounds)
def load_candidate_parts():
    # This archive stores each clockwise shell immediately before its holes.
    path = next(source.glob("S1_20220827_FloodExtent*.shp"))
    transform = Transformer.from_crs(4326, crs, always_xy=True)
    xmin, ymin, xmax, ymax = 67.2, 26.4, 68.6, 28.1
    expected = [(98678, 1909.725340971369), (65620, 8151.829257967982)]
    with path.open("rb") as stream:
        stream.seek(100)
        for count, expected_area in expected:
            header = stream.read(8)
            record = stream.read(struct.unpack(">2i", header)[1] * 2)
            assert struct.unpack_from("<i", record)[0] == 5
            rings, vertices = struct.unpack_from("<2i", record, 36)
            offsets = np.r_[np.frombuffer(record, "<i4", rings, 44), vertices]
            xy = np.frombuffer(record, "<f8", vertices * 2, 44 + 4 * rings).reshape(-1, 2)
            x, y = transform.transform(xy[:, 0], xy[:, 1])
            projected = np.column_stack((x, y))
            shell_count = 0
            signed_area = 0
            parts = []
            shell = None
            holes = []
            for a, b in zip(offsets[:-1], offsets[1:]):
                ring = xy[a:b]
                relative = ring - ring[0]
                clockwise = (relative[:-1, 0] * relative[1:, 1] - relative[:-1, 1] * relative[1:, 0]).sum() < 0
                points = projected[a:b]
                relative_m = points - points[0]
                signed_area += (relative_m[:-1, 0] * relative_m[1:, 1] - relative_m[:-1, 1] * relative_m[1:, 0]).sum() / 2
                lo, hi = ring.min(axis=0), ring.max(axis=0)
                if clockwise:
                    if shell is not None:
                        parts.append(shapely.Polygon(shell, holes))
                    shell_count += 1
                    shell_lo, shell_hi = lo, hi
                    selected = lo[0] <= xmax and hi[0] >= xmin and lo[1] <= ymax and hi[1] >= ymin
                    shell = points if selected else None
                    holes = []
                else:
                    assert (shell_lo <= lo).all() and (shell_hi >= hi).all()
                    if shell is not None:
                        holes.append(points)
            if shell is not None:
                parts.append(shapely.Polygon(shell, holes))
            assert shell_count == count and abs(-signed_area / 1e6 - expected_area) < 1e-6
            yield parts
        assert not stream.read(1)

from concurrent.futures import ThreadPoolExecutor
from math import floor, ceil

parts = np.asarray([part for record in load_candidate_parts() for part in record], dtype=object)
tree = shapely.STRtree(parts)
xmin, ymin, xmax, ymax = footprint.bounds
step = 10000
tiles = [
    (x, y, x + step, y + step)
    for x in range(floor(xmin / step) * step, ceil(xmax / step) * step, step)
    for y in range(floor(ymin / step) * step, ceil(ymax / step) * step, step)
    if box(x, y, x + step, y + step).intersects(footprint)
]

def process(tile):
    frame = box(*tile)
    area = frame.intersection(footprint)
    selected = parts[tree.query(frame)]
    pieces = shapely.clip_by_rect(selected, *tile)
    raw = shapely.area(pieces).sum()
    valid = shapely.is_valid(pieces)
    pieces[~valid] = shapely.make_valid(
        pieces[~valid], method="structure", keep_collapsed=False
    )
    repaired = shapely.union_all(pieces)
    assert repaired.is_valid
    flood = shapely.union_all(polygon_parts(repaired.intersection(area)))
    assert flood.is_valid
    return raw, repaired.area, flood, int((~valid).sum())

print("Loaded source. Tiles:",len(tiles),flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:
    rows = []
    for row in pool.map(process, tiles):
        rows.append(row)
        if len(rows) % 40 == 0:
            print("Tiles checked:", len(rows), flush=True)
floods = [row[2] for row in rows if not row[2].is_empty]
assert floods and all(g.is_valid for g in floods)
path = output / "unosat3342_repaired_clipped.gpkg"
if path.exists():
    path.unlink()
gpd.GeoDataFrame(
    {"product_id": [3342] * len(floods), "water_class": ["Flood Water"] * len(floods)},
    geometry=floods, crs=crs,
).to_file(path, layer="flood_water", driver="GPKG")
gpd.GeoDataFrame({"product_id": [3342]}, geometry=[footprint], crs=crs).to_file(
    path, layer="comparison_footprint", driver="GPKG", mode="a"
)
saved = gpd.read_file(path, layer="flood_water")
assert len(saved) == len(floods) and saved.is_valid.all()
assert saved.crs.to_epsg() == 32642
raw = sum(r[0] for r in rows) / 1e6
repaired = sum(r[1] for r in rows) / 1e6
final = sum(g.area for g in floods) / 1e6
assert abs(saved.area.sum() / 1e6 - final) < 1e-8
report = {
    "crs": crs,
    "method": "Clip source rings to non-overlapping 10 km tiles, repair invalid pieces with GEOS MakeValid structure, dissolve inside each tile, and intersect with the study and analysis footprint",
    "area_note": "Repair delta is nominal raw signed polygon area versus repaired dissolved area over the same processing tiles, before exact footprint clipping.",
    "tiles_checked": len(tiles),
    "nonempty_tiles": len(floods),
    "invalid_tile_pieces_repaired": sum(r[3] for r in rows),
    "comparison_footprint_km2": footprint.area / 1e6,
    "nominal_raw_tiled_area_km2": raw,
    "repaired_dissolved_tiled_area_km2": repaired,
    "repair_and_dissolve_delta_km2": repaired - raw,
    "repair_and_dissolve_delta_percent": (repaired - raw) / raw * 100,
    "final_clipped_flood_area_km2": final
}
(output / "area_audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2), flush=True)
