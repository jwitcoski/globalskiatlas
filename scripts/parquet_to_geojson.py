#!/usr/bin/env python3
"""
Convert ski_areas_analyzed.parquet to GeoJSON for the web map.
Install: pip install pandas pyarrow
Usage:
  python parquet_to_geojson.py ski_areas_analyzed.parquet -o ski_areas.geojson
  python parquet_to_geojson.py https://.../ski_areas_analyzed.parquet -o ski_areas.geojson
"""
import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("pip install pandas pyarrow", file=sys.stderr)
    sys.exit(1)


def infer_lat_lon_columns(df):
    """Try common centroid/lat/lon column names."""
    candidates_lat = ["latitude", "lat", "centroid_lat", "centroid_y", "y"]
    candidates_lon = ["longitude", "lon", "lng", "long", "centroid_lon", "centroid_x", "x"]
    cols = set(df.columns)
    lat = next((c for c in candidates_lat if c in cols), None)
    lon = next((c for c in candidates_lon if c in cols), None)
    return lat, lon


def parquet_to_geojson(
    input_path: str,
    output_path: str,
    lat_col: str | None = None,
    lon_col: str | None = None,
    name_col: str | None = None,
    id_col: str | None = None,
) -> None:
    if input_path.startswith("http://") or input_path.startswith("https://"):
        df = pd.read_parquet(input_path)
    else:
        df = pd.read_parquet(Path(input_path))

    if lat_col is None or lon_col is None:
        lat_col, lon_col = infer_lat_lon_columns(df)
    if not lat_col or not lon_col:
        print("Columns:", list(df.columns), file=sys.stderr)
        raise SystemExit("Could not infer lat/lon columns. Pass --lat and --lon.")

    # Drop rows missing coordinates
    df = df.dropna(subset=[lat_col, lon_col])

    name_col = name_col or next(
        (c for c in ["name", "resort_name", "title", "area_name"] if c in df.columns), None
    )
    id_col = id_col or next(
        (c for c in ["id", "area_id", "resort_id", "skiresort_id"] if c in df.columns), None
    )

    features = []
    for _, row in df.iterrows():
        lat, lon = float(row[lat_col]), float(row[lon_col])
        props = {}
        if name_col and pd.notna(row.get(name_col)):
            props["name"] = str(row[name_col])
        if id_col and pd.notna(row.get(id_col)):
            props["id"] = str(row[id_col])
        for c in df.columns:
            if c in (lat_col, lon_col, name_col, id_col):
                continue
            v = row[c]
            if pd.notna(v):
                try:
                    props[c] = v.item() if hasattr(v, "item") else v
                except (ValueError, AttributeError):
                    props[c] = str(v)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": props,
        })

    fc = {"type": "FeatureCollection", "features": features}
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, indent=None)
    print(f"Wrote {len(features)} features to {output_path}", file=sys.stderr)


def main():
    p = argparse.ArgumentParser(description="Convert ski areas parquet to GeoJSON")
    p.add_argument("input", help="Path or URL to .parquet file")
    p.add_argument("-o", "--output", default="ski_areas.geojson", help="Output GeoJSON path")
    p.add_argument("--lat", help="Latitude column (default: auto-detect)")
    p.add_argument("--lon", help="Longitude column (default: auto-detect)")
    p.add_argument("--name", help="Name column for properties")
    p.add_argument("--id", help="ID column for properties")
    args = p.parse_args()
    parquet_to_geojson(
        args.input,
        args.output,
        lat_col=args.lat,
        lon_col=args.lon,
        name_col=args.name,
        id_col=args.id,
    )


if __name__ == "__main__":
    main()
