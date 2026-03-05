# S3 bucket for final resort maps

The wiki **Resort Map** tab ([wiki/resort.html](wiki/resort.html)) shows a static image per resort. Those images live in a **dedicated S3 bucket** so they are separate from pipeline/parquet output.

## 1. Bucket and URL

- **Bucket name**: `globalskiatlas-resort-maps`
- **Region**: `us-east-1` (Northern Virginia), same as the rest of the project.
- **Object key**: One PNG per wiki page: `{pageId}.png`  
  Examples: `abenaki-ski-area-maine.png`, `country-united-states.png`.
- **Base URL**:  
  `https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/`  
  Full image URL: `{baseURL}{encodeURIComponent(pageId)}.png`

The wiki script builds the URL in [wiki/js/script.js](wiki/js/script.js) via `RESORT_STATIC_MAP_BASE + encodeURIComponent(pageId) + '.png'`. If the object is missing, the `<img>` `onerror` falls back to `/wiki/assets/resort-map-placeholder.png`.

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

- **Key**: `{pageId}.png` (e.g. from wiki ingest `pageId`: `abenaki-ski-area-maine`).
- **Content type**: `image/png`.
- Upload via AWS Console, CLI (`aws s3 cp`), or a pipeline that generates the images and writes to this bucket. Missing objects are handled by the placeholder image in the UI.

## 6. Troubleshooting

- **Broken image / placeholder always shows**: Check (1) object exists at `https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/<pageId>.png`, (2) bucket policy allows `GetObject`, (3) CORS allows your origin if you ever load the URL via `fetch` (for `<img>` same-origin or CORS may still be needed depending on browser).
- **403 Access Denied**: Add or fix the bucket policy and ensure block public access settings allow public read for this bucket.
