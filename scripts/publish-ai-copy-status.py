#!/usr/bin/env python3
"""Copy the homeserver AI writing status file to the public site bucket.

The region writer rewrites /home/lola/ski/output/resort_copy_status.json
about once a minute and does not upload it. CloudFront serves the website
bucket, so this is what makes GET /ai-copy/status.json work. The bytes are
uploaded unchanged. Deploys must not delete that key.

This is separate from scripts/publish-resort-status.py, which publishes
the OpenStreetMap pipeline file at resort-jobs/status.json.
"""
import boto3
from pathlib import Path

STATUS = Path("/home/lola/ski/output/resort_copy_status.json")


def main():
    if not STATUS.is_file():
        raise SystemExit("missing %s" % STATUS)
    boto3.client("s3", region_name="us-east-1").put_object(
        Bucket="globalskiatlas.com",
        Key="ai-copy/status.json",
        Body=STATUS.read_bytes(),
        ContentType="application/json",
        CacheControl="no-store",
    )


if __name__ == "__main__":
    main()
