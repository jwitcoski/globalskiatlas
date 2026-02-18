# Exposing the ski areas GeoParquet on AWS so the website can read it

The map loads ski resort data **directly from your GeoParquet file** on S3 using [hyparquet](https://github.com/hyparam/hyparquet) in the browser (see [GeoParquet on the web](https://observablehq.com/@kylebarron/geoparquet-on-the-web)). No GeoJSON conversion or duplicate storage—just the .parquet file.

## 1. Allow the website to read the Parquet object (CORS + access)

### CORS on the bucket

So the browser can `fetch()` the object from your site’s origin, add a CORS configuration on the bucket.

**AWS Console:** S3 → bucket `globalskiatlas-backend-k8s-output` → Permissions → CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

Tighten `AllowedOrigins` to your real domain(s) in production, e.g. `["https://yoursite.com", "http://localhost:3010"]`.

### Object readable by the browser

- **Option A – Public read:** Bucket policy or object ACL so unauthenticated `GetObject` is allowed. The map then uses the object URL directly.
- **Option B – Private:** Use a backend that proxies the file or returns it with the right headers; the site would call that URL instead.

Example bucket policy (public read for `combined/` prefix only):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadCombined",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::globalskiatlas-backend-k8s-output/combined/*"
    }
  ]
}
```

If the bucket has “Block public access” enabled, you must change that for this policy to take effect, or use Option B.

## 2. URL used by the map

The map is configured to load:

```
https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet
```

If you use a different bucket or key, update the `GEOPARQUET_URL` constant in `mainmap.html`.

## Data format

- **GeoParquet** (with a `geometry` column): hyparquet parses it and the map uses those geometries.
- **Plain Parquet** with centroid columns (`latitude`/`longitude`, `lat`/`lon`, or `centroid_lat`/`centroid_lon`): the map builds Point features from those columns.

No server-side conversion or GeoJSON storage is required.

## Troubleshooting: "Failed to fetch"

If the map shows **Ski areas GeoParquet failed to load: TypeError: Failed to fetch**, the browser is blocking the request. Fix both:

1. **CORS** – Without it, the browser hides the S3 response. Add the CORS block above to the bucket and save.
2. **Public read** – If the object is private, the response is 403 and the browser still reports "Failed to fetch". Add the bucket policy above (and disable "Block public access" for this bucket if needed).

**Quick check:** Open the parquet URL in a new tab:
- If the file downloads or you see binary data, the object is public but CORS may still be missing (add CORS and reload the map).
- If you see "Access Denied" (or an XML error), the object is not public; add the bucket policy and adjust block public access.
