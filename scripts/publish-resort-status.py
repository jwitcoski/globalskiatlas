#!/usr/bin/env python3
"""Copy the homeserver pipeline status file to the public site bucket.

The nightly sweep writes /home/lola/globalskiatlas/output/resort-jobs/status.json
and does not upload it. CloudFront serves the website bucket, so this is what
makes GET /resort-jobs/status.json work. Deploys must not delete that key.

Job files store an OpenStreetMap id. This fills in the resort name from the
local ski-area catalog, then from the OpenStreetMap API for ids not in it yet.
"""
import json
import subprocess
import urllib.request

import boto3
from pathlib import Path

STATUS = Path("/home/lola/globalskiatlas/output/resort-jobs/status.json")
CACHE = Path("/home/lola/homeserver/ski/resort-names.json")
CATALOG_PY = r"""
import json, sys
import pandas as pd
want = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else set()
df = pd.read_parquet("/data/combined/ski_areas.parquet", columns=["osm_way_id", "osm_id", "name"])
out = {}
names = df["name"].astype(str)
for col in ("osm_way_id", "osm_id"):
    for wid, name in zip(df[col].astype(str), names):
        if wid in want and name and name.lower() != "nan":
            out.setdefault(wid, name)
json.dump(out, sys.stdout)
"""


def resort_id(row):
    wid = str(row.get("winter_sports_id") or "").strip()
    if wid:
        return wid
    job = str(row.get("jobId") or "")
    if job.startswith("sweep-") and job[6:].isdigit():
        return job[6:]
    parts = str(row.get("message") or "").split()
    if len(parts) == 2 and parts[0] in ("update", "add", "delete") and parts[1].isdigit():
        return parts[1]
    return ""


def load_cache():
    if not CACHE.is_file():
        return {}
    try:
        data = json.loads(CACHE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def catalog_names(ids):
    try:
        proc = subprocess.run(
            ["docker", "exec", "-i", "state-updates", "python", "-", ",".join(ids)],
            input=CATALOG_PY.encode(),
            capture_output=True,
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return {}
    if proc.returncode != 0:
        return {}
    try:
        data = json.loads(proc.stdout.decode() or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def osm_name(wid):
    for kind in ("way", "relation"):
        url = "https://www.openstreetmap.org/api/0.6/%s/%s.json" % (kind, wid)
        req = urllib.request.Request(url, headers={"User-Agent": "globalskiatlas-status/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read().decode())
        except Exception as exc:
            if getattr(exc, "code", None) == 404:
                continue
            return None
        for el in body.get("elements") or []:
            name = str((el.get("tags") or {}).get("name") or "").strip()
            if name:
                return name
    return ""


def annotate(status, names):
    for key in ("running", "recent"):
        for row in status.get(key) or []:
            if not isinstance(row, dict):
                continue
            wid = resort_id(row)
            if wid and not row.get("winter_sports_id"):
                row["winter_sports_id"] = wid
            name = names.get(wid)
            if name:
                row["name"] = name


def main():
    if not STATUS.is_file():
        raise SystemExit("missing %s" % STATUS)
    status = json.loads(STATUS.read_text(encoding="utf-8"))
    names = load_cache()
    needed = []
    for key in ("running", "recent"):
        for row in status.get(key) or []:
            if not isinstance(row, dict):
                continue
            wid = resort_id(row)
            if wid and wid not in names and wid not in needed:
                needed.append(wid)
    if needed:
        found = catalog_names(needed)
        for wid, name in found.items():
            if name:
                names[wid] = name
        for wid in needed:
            if wid in names:
                continue
            looked = osm_name(wid)
            if looked is None:
                continue
            names[wid] = looked
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(names, indent=2), encoding="utf-8")
    annotate(status, names)
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket="globalskiatlas.com",
        Key="resort-jobs/status.json",
        Body=json.dumps(status).encode(),
        ContentType="application/json",
        CacheControl="public, max-age=30",
    )


if __name__ == "__main__":
    main()
