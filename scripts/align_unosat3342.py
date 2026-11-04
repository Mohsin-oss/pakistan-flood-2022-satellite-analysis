from pathlib import Path
import json
import geopandas as gpd
import numpy as np
import rasterio
import shapely
from shapely.geometry import box
from rasterio.features import rasterize

root = Path(__file__).resolve().parents[1]
source = root / "geotiff/stage6_2_s2_aug2022_flood_valid_20m.tif"
reference = root / "outputs/stage6_1_unosat3342/tiled/unosat3342_repaired_clipped.gpkg"
out = root / "outputs/stage6_2_alignment"

with rasterio.open(source) as src:
    transform = src.transform
    assert src.crs.to_epsg() == 32642
    assert (transform.a, transform.b, transform.d, transform.e) == (20, 0, 0, -20)
    assert transform.c % 20 == 0 and transform.f % 20 == 0
    assert src.count == 2 and src.dtypes == ("uint8", "uint8")
    assert src.nodatavals == (255, 255)
    flood, valid = src.read()
    assert set(np.unique(flood)) == {0, 1, 255}
    assert set(np.unique(valid)) <= {0, 1, 255}
    assert not ((valid == 1) & (flood == 255)).any()
    assert not ((flood == 1) & (valid != 1)).any()
    mask_cross_tab = {
        f"flood_{f}_valid_{v}": int(np.count_nonzero((flood == f) & (valid == v)))
        for f in (0, 1, 255) for v in (0, 1, 255)
    }
    assert all(np.array_equal(src.read_masks(i) != 0, a != 255)
               for i, a in enumerate([flood, valid], 1))
    grid = {
        "crs": src.crs.to_string(),
        "transform": list(transform)[:6],
        "bounds": list(src.bounds),
        "width": src.width,
        "height": src.height,
        "source_band_descriptions": list(src.descriptions),
        "nodata": src.nodata,
    }
    profile = src.profile.copy()

def burn(layer):
    data = gpd.read_file(reference, layer=layer)
    assert not data.empty and data.crs.to_epsg() == 32642
    assert data.is_valid.all() and not data.is_empty.any()
    return rasterize(
        ((geom, 1) for geom in data.geometry),
        out_shape=valid.shape, transform=transform, fill=0,
        all_touched=False, dtype="uint8"
    ).astype(bool)

footprint = burn("comparison_footprint")
unosat = burn("flood_water")
outside_footprint = unosat & ~footprint
assert not outside_footprint.any()
# The mask export uses 0 across the raster extent, including outside the AOI.
# Burn the original lon/lat rectangle separately, densifying edges before projection.
rectangle = shapely.segmentize(box(67.20, 26.40, 68.60, 28.10), 0.001)
projected_aoi = gpd.GeoSeries([rectangle], crs=4326).to_crs(32642).iloc[0]
aoi = rasterize([(projected_aoi, 1)], out_shape=valid.shape,
                transform=transform, dtype="uint8").astype(bool)
observed = aoi & (valid == 1) & (flood != 255)
assessed = aoi & footprint
overlap = observed & assessed
assert overlap.any()

def measure(mask):
    pixels = int(np.count_nonzero(mask))
    return {"pixels": pixels, "km2": pixels * 400 / 1e6}

areas = {name: measure(mask) for name, mask in {
    "s2_aoi": aoi,
    "s2_valid": observed,
    "s2_valid_flag_outside_rasterized_aoi": (valid == 1) & ~aoi,
    "s2_flood_inside_valid_aoi": observed & (flood == 1),
    "unosat_footprint_outside_rasterized_aoi": footprint & ~aoi,
    "s2_invalid_inside_aoi": aoi & ~observed,
    "unosat_assessed_inside_s2_aoi": assessed,
    "shared_valid": overlap,
    "unosat_assessed_without_valid_s2": assessed & ~observed,
    "valid_s2_outside_unosat_assessment": observed & ~assessed,
    "unosat_flood_inside_assessed": unosat & assessed,
    "unosat_flood_inside_shared_valid": unosat & overlap,
}.items()}
pct = {
    "shared_valid_of_unosat_assessed": 100 * overlap.sum() / assessed.sum(),
    "shared_valid_of_s2_aoi": 100 * overlap.sum() / aoi.sum(),
    "shared_valid_of_s2_valid": 100 * overlap.sum() / observed.sum(),
    "s2_valid_of_s2_aoi": 100 * observed.sum() / aoi.sum(),
}

out.mkdir(parents=True, exist_ok=True)
path = out / "unosat3342_on_sentinel2_grid.tif"
profile.update(count=3, dtype="uint8", nodata=255, tiled=True,
               blockxsize=256, blockysize=256, compress="deflate")
bands = [
    ("unosat_flood", np.where(assessed, unosat, 255).astype("uint8")),
    ("unosat_assessed", np.where(aoi, assessed, 255).astype("uint8")),
    ("shared_valid", np.where(aoi, overlap, 255).astype("uint8")),
]
with rasterio.open(path, "w", **profile) as dst:
    for index, (name, array) in enumerate(bands, 1):
        dst.write(array, index)
        dst.set_band_description(index, name)

with rasterio.open(path) as dst:
    assert dst.crs.to_epsg() == 32642 and dst.transform == transform
    assert (dst.height, dst.width) == valid.shape and dst.nodata == 255
    for index, (_, expected) in enumerate(bands, 1):
        assert np.array_equal(dst.read(index), expected)

audit = {
    "grid": grid,
    "source_mask_cross_tab_pixels": mask_cross_tab,
    "rasterization": "Pixel center on the Sentinel-2 export grid",
    "shared_valid_definition": "Valid Sentinel-2 baseline and event observation inside UNOSAT assessed footprint",
    "area_basis": "20 x 20 m projected grid cells",
    "areas": areas,
    "percentages": pct,
}
(out / "alignment_audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps(audit, indent=2))
