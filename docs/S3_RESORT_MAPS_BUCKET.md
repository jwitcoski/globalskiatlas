# S3 bucket for final resort maps

The wiki **Resort Map** tab ([wiki/resort.html](wiki/resort.html)) shows a static image per resort. Those images live in a **dedicated S3 bucket** so they are separate from pipeline/parquet output.

## 1. Bucket and URL

- **Bucket name**: `globalskiatlas-resort-maps`
- **Region**: `us-east-1` (Northern Virginia), same as the rest of the project.
- **Object keys** (per wiki `pageId`, e.g. `eldora-colorado`):
  - `{pageId}-landscape.png` — wide layout (default on desktop side-by-side map)
  - `{pageId}-portrait.png` — tall layout (mobile / narrow column)
  - Optional legacy: `{pageId}.png` (single map for both orientations)
- **Base URL**:  
  `https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/`  
  Example: `https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/eldora-colorado-landscape.png`

The **Resort Map** tab shows **both** images when they exist (stacked: landscape, then portrait). Missing keys hide that figure; if neither loads, landscape tries legacy `{pageId}.png`, then the placeholder. See [wiki/js/script.js](wiki/js/script.js) (`setResortStaticMaps`).

## 2. CORS

So the browser can load images from your domain, add CORS on the bucket.

**AWS Console:** S3 → bucket → Permissions → CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://globalskiatlas.com", "http://localhost:3010"],
    "ExposeHeaders": []
  }
]
```

Add any other origins (e.g. staging) as needed.

## 3. Public read (bucket policy)

Allow unauthenticated `GetObject` for the map objects.

**AWS Console:** S3 → bucket → Permissions → Bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadResortMaps",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::globalskiatlas-resort-maps/*"
    }
  ]
}
```

Replace `globalskiatlas-resort-maps` in the policy only if you use a different bucket name. Region is `us-east-1` (Northern Virginia).

## 4. Update the wiki to use this bucket

In [wiki/js/script.js](wiki/js/script.js), set:

```javascript
var RESORT_STATIC_MAP_BASE = 'https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/';
```

Optionally make this configurable via a small config or build-time env so dev/staging can point to a different bucket or path.

## 5. Uploading maps

- **Keys**: `{pageId}-landscape.png` and/or `{pageId}-portrait.png` (match wiki `pageId`, e.g. `eldora-colorado`, `loveland-basin-ski-area-colorado`).
- **Content type**: `image/png`.
- Upload via AWS Console, CLI (`aws s3 cp`), or a pipeline. One orientation is enough; the UI tries the other, then legacy `{pageId}.png`, then the placeholder.

Example (Colorado test set):

```bash
aws s3 cp eldora-colorado-landscape.png s3://globalskiatlas-resort-maps/eldora-colorado-landscape.png --content-type image/png
aws s3 cp eldora-colorado-portrait.png  s3://globalskiatlas-resort-maps/eldora-colorado-portrait.png  --content-type image/png
```

## 6. Troubleshooting

- **Broken image / placeholder always shows**: Check (1) object exists at `{base}<pageId>-landscape.png` or `-portrait.png`, (2) S3 key matches wiki `pageId` exactly (open resort URL `?page=...`), (3) bucket policy allows `GetObject`, (4) CORS if needed.
- **403 Access Denied**: Add or fix the bucket policy and ensure block public access settings allow public read for this bucket.
