# Canonical URL and redirects (SEO)

## Preferred canonical URL

The site’s canonical URL is **`https://globalskiatlas.com/`** (no `www`, no `index.html` in the path). All HTML pages already set:

- `<link rel="canonical" href="https://globalskiatlas.com/..." />`  
- `og:url` and other meta to the same URL.

So when users or Google hit `https://www.globalskiatlas.com/` or `https://globalskiatlas.com/index.html`, the page correctly says “my canonical is `https://globalskiatlas.com/`”. Google then treats the www and index.html URLs as **alternates** and does not index/serve them separately, which is what we want.

To avoid duplicate URLs entirely and consolidate signals, the **server should 301-redirect** those alternates to the canonical URL.

## Redirects to set up

1. **www → non-www**  
   `https://www.globalskiatlas.com/*` → `https://globalskiatlas.com/*` (301).

2. **Strip `index.html`**  
   `https://globalskiatlas.com/index.html` → `https://globalskiatlas.com/` (301).  
   Same for any path that ends with `/index.html` (e.g. `/foo/index.html` → `/foo/`).

## Using the CloudFront Function (S3 + CloudFront)

A CloudFront Function in this repo does both redirects in one place:

- **File:** `cloudfront-functions/redirect-to-canonical.js`
- **Behavior:** Viewer request
- **Effect:** 301 from `www.globalskiatlas.com` to `globalskiatlas.com`, and from `…/index.html` to the path without `index.html`.

### Steps in AWS

1. **Create the function**
   - CloudFront → Functions → Create function.
   - Name: e.g. `redirect-to-canonical`.
   - Paste the contents of `cloudfront-functions/redirect-to-canonical.js`.
   - Publish the function.

2. **Associate with the distribution**
   - CloudFront → Distributions → your distribution (e.g. id `E38F9PVDPMHRQK`).
   - Behaviors → select the default behavior → Edit.
   - Under “Viewer request”, choose “CloudFront Functions”, then select `redirect-to-canonical`.
   - Save.

3. **Test**
   - `curl -I https://www.globalskiatlas.com/` → 301, `Location: https://globalskiatlas.com/`.
   - `curl -I https://globalskiatlas.com/index.html` → 301, `Location: https://globalskiatlas.com/`.

After redirects are in place, only the canonical URL is served; over time Google will drop the alternate URLs from the index and keep a single canonical.
