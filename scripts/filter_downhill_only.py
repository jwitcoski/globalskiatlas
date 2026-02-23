#!/usr/bin/env python3
"""
Filter ski_areas_analyzed.parquet to keep only downhill ski resorts.
Removes rows where resort_type (or 'Resort Type') == 'not a downhill ski resort'.

Install: pip install pandas pyarrow
Usage:
  python filter_downhill_only.py path/to/ski_areas_analyzed.parquet
  python filter_downhill_only.py path/to/ski_areas_analyzed.parquet -o path/to/output.parquet
  python filter_downhill_only.py path/to/ski_areas_analyzed.parquet --in-place
"""
import argparse
import sys
from pathlib import Path
from typing import Optional

try:
    import pandas as pd
except ImportError:
    print("pip install pandas pyarrow", file=sys.stderr)
    sys.exit(1)

RESORT_TYPE_COLS = ["resort_type", "Resort Type"]
NOT_DOWNHILL = "not a downhill ski resort"


def filter_downhill_only(input_path: Path, output_path: Optional[Path] = None, in_place: bool = False) -> None:
    df = pd.read_parquet(input_path)

    resort_type_col = None
    for col in RESORT_TYPE_COLS:
        if col in df.columns:
            resort_type_col = col
            break

    if resort_type_col is None:
        print("Columns:", list(df.columns), file=sys.stderr)
        print("No resort_type column found. Skipping filter.", file=sys.stderr)
        return

    before = len(df)
    mask = df[resort_type_col].astype(str).str.strip().str.lower() != NOT_DOWNHILL.lower()
    df_filtered = df[mask]
    removed = before - len(df_filtered)

    if output_path is None:
        output_path = input_path if in_place else input_path.with_name(
            input_path.stem + "_downhill_only" + input_path.suffix
        )

    df_filtered.to_parquet(output_path, index=False)
    print(f"Removed {removed} non-downhill rows. {len(df_filtered)} rows -> {output_path}", file=sys.stderr)


def main():
    p = argparse.ArgumentParser(description="Filter parquet to downhill ski resorts only")
    p.add_argument("input", help="Path to ski_areas_analyzed.parquet")
    p.add_argument("-o", "--output", help="Output path (default: input_downhill_only.parquet)")
    p.add_argument("--in-place", action="store_true", help="Overwrite input file")
    args = p.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output) if args.output else None
    filter_downhill_only(input_path, output_path=output_path, in_place=args.in_place)


if __name__ == "__main__":
    main()
