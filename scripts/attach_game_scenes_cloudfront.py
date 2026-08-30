#!/usr/bin/env python3
"""Point /game_scenes/* on the Global Ski Atlas CloudFront distro at the k8s-output S3 bucket.

Default distribution is E3BDMTLYF8G4VB (globalskiatlas.com). The website bucket stays the default origin.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

DIST = "E3BDMTLYF8G4VB"
ORIGIN_ID = "S3-game-scenes-k8s-output"
DOMAIN = "globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com"
PATH = "/game_scenes/*"
CACHE_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6"
CORS_S3_ORIGIN = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"


def aws_json(args: list[str]) -> dict:
    raw = subprocess.check_output(["aws", *args], text=True)
    return json.loads(raw)


def put_config(dist: str, etag: str, cfg: dict) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(cfg, f)
        tmp = f.name
    try:
        subprocess.check_call(
            [
                "aws",
                "cloudfront",
                "update-distribution",
                "--id",
                dist,
                "--if-match",
                etag,
                "--distribution-config",
                f"file://{tmp}",
            ]
        )
    finally:
        Path(tmp).unlink(missing_ok=True)


def revert_wrong_distro() -> None:
    """Undo an accidental origin on E38F9PVDPMHRQK (not the atlas site)."""
    wrong = "E38F9PVDPMHRQK"
    pack = aws_json(["cloudfront", "get-distribution-config", "--id", wrong])
    etag = pack["ETag"]
    cfg = pack["DistributionConfig"]
    origins = cfg["Origins"]
    items = [o for o in origins.get("Items", []) if o.get("Id") != ORIGIN_ID]
    if len(items) == len(origins.get("Items", [])):
        print(f"{wrong}: no {ORIGIN_ID} to remove")
        return
    origins["Items"] = items
    origins["Quantity"] = len(items)
    behaviors = cfg.get("CacheBehaviors") or {"Quantity": 0, "Items": []}
    b_items = [b for b in behaviors.get("Items") or [] if b.get("PathPattern") != PATH]
    behaviors["Items"] = b_items
    behaviors["Quantity"] = len(b_items)
    if not b_items:
        cfg["CacheBehaviors"] = {"Quantity": 0}
    else:
        cfg["CacheBehaviors"] = behaviors
    put_config(wrong, etag, cfg)
    print("reverted", wrong)


def attach(dist: str) -> None:
    pack = aws_json(["cloudfront", "get-distribution-config", "--id", dist])
    etag = pack["ETag"]
    cfg = pack["DistributionConfig"]
    origins = cfg["Origins"]
    items = origins.setdefault("Items", [])
    if not any(o.get("Id") == ORIGIN_ID for o in items):
        items.append(
            {
                "Id": ORIGIN_ID,
                "DomainName": DOMAIN,
                "OriginPath": "",
                "CustomHeaders": {"Quantity": 0},
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "https-only",
                    "OriginSslProtocols": {"Quantity": 1, "Items": ["TLSv1.2"]},
                    "OriginReadTimeout": 60,
                    "OriginKeepaliveTimeout": 5,
                },
                "ConnectionAttempts": 3,
                "ConnectionTimeout": 10,
                "OriginShield": {"Enabled": False},
            }
        )
        origins["Quantity"] = len(items)
        print(f"added origin {ORIGIN_ID}")
    else:
        print(f"origin {ORIGIN_ID} already present")

    behaviors = cfg.setdefault("CacheBehaviors", {"Quantity": 0, "Items": []})
    b_items = behaviors.setdefault("Items", [])
    if not any(b.get("PathPattern") == PATH for b in b_items):
        b_items.insert(
            0,
            {
                "PathPattern": PATH,
                "TargetOriginId": ORIGIN_ID,
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {
                    "Quantity": 3,
                    "Items": ["HEAD", "GET", "OPTIONS"],
                    "CachedMethods": {"Quantity": 2, "Items": ["HEAD", "GET"]},
                },
                "SmoothStreaming": False,
                "Compress": True,
                "LambdaFunctionAssociations": {"Quantity": 0},
                "FunctionAssociations": {"Quantity": 0},
                "FieldLevelEncryptionId": "",
                "CachePolicyId": CACHE_OPTIMIZED,
                "OriginRequestPolicyId": CORS_S3_ORIGIN,
                "GrpcConfig": {"Enabled": False},
            },
        )
        behaviors["Quantity"] = len(b_items)
        print(f"added cache behavior {PATH}")
    else:
        print(f"cache behavior {PATH} already present")

    put_config(dist, etag, cfg)
    print("updated", dist)


def main() -> int:
    if "--revert-wrong" in sys.argv:
        revert_wrong_distro()
        return 0
    attach(DIST)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as e:
        print("aws failed:", e, file=sys.stderr)
        raise SystemExit(e.returncode or 1)
