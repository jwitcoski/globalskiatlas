# Wiki API — Lambda + API Gateway

The wiki (browse, resort pages, comments, revisions) is served by the Express server locally and by **Lambda + API Gateway** in production. The frontend calls `/api/wiki/*` so that CloudFront can route only that path to the API.

## Deploy (production)

1. **Build and deploy the stack**

   ```bash
   sam build
   sam deploy --guided
   ```

   On first run, `--guided` will prompt for stack name, region, and parameter overrides. You can pass DynamoDB prefix and Cognito IDs:

   ```bash
   sam deploy --parameter-overrides \
     DynamoDBTablePrefix=atlas \
     CognitoUserPoolId=us-east-1_xxx \
     CognitoClientId=xxx
   ```

2. **Note the API URL** from the stack output `WikiApiUrl` (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`).

## CloudFront behavior (production site)

So that `https://globalskiatlas.com/api/wiki/index` (and other `/api/wiki/*` calls) hit API Gateway instead of S3:

1. Open **CloudFront** → your distribution for the site.
2. **Origins** → Create origin:
   - **Origin domain**: `{api-id}.execute-api.{region}.amazonaws.com` (from the `WikiApiUrl` output; use the hostname only, no path).
   - **Protocol**: HTTPS only.
   - **Name**: e.g. `WikiApi`.
3. **Behaviors** → Create behavior:
   - **Path pattern**: `api/wiki*`
   - **Origin**: the Wiki API origin you just created.
   - **Cache policy**: CachingDisabled (or a short TTL if you prefer).
   - **Origin request policy**: Either leave default or use one that does **not** forward the viewer’s Host header (e.g. **CachingDisabled** or a policy that only forwards needed headers). Sending `Host: yourdomain.com` to API Gateway can break routing; CloudFront should use the origin’s hostname.
   - Put this behavior **above** the default `*` (S3) so it takes precedence for `/api/wiki/*`.

After saving, requests to `https://globalskiatlas.com/api/wiki/index` will go to API Gateway → Lambda → DynamoDB, and the wiki will work on the live site.

### Troubleshooting: "Direct API works, CloudFront doesn't"

If `https://{api-id}.execute-api.us-east-1.amazonaws.com/api/wiki/index` returns JSON but `https://globalskiatlas.com/api/wiki/index` fails or returns XML/HTML:

1. **Test the exact URL in the browser**  
   Open `https://globalskiatlas.com/api/wiki/index`.  
   - If you see JSON → routing is correct; the problem may be CORS or how the page calls the API.  
   - If you see XML, an S3 error page, or "Access Denied" → CloudFront is not using the API Gateway behavior for this path.

2. **Behavior order**  
   In **Behaviors**, the row for `api/wiki*` must be **above** the default `*` behavior. CloudFront uses the first matching pattern; if `*` is first, all requests go to S3.

3. **Path pattern**  
   Pattern must match the path: use `api/wiki*` (no leading slash in the CloudFront UI). It will match `/api/wiki/index`, `/api/wiki/123`, etc.

4. **Origin**  
   The `api/wiki*` behavior must use the **Wiki API** origin (the API Gateway hostname), not the S3 bucket.

5. **Host header**  
   Use **CachingDisabled** or an origin request policy that does **not** forward the viewer `Host` header. If `Host: globalskiatlas.com` is sent to API Gateway, it can misroute or reject. Let CloudFront use the origin hostname.

6. **After changes**  
   Invalidate or wait for cache: try `https://globalskiatlas.com/api/wiki/index` in an incognito window or after a short wait.

### Invalidate cache (clear stale API responses)

If the API works when you open the URL directly but the wiki page still gets XML/errors, CloudFront may be serving a cached old response. Invalidate both the API path and the wiki page so the updated script and API responses are used:

**Invalidate these paths:**

- `/api/wiki/*` — so API responses are not stale (and not cached by Referer).
- `/wiki/browse.html` — so the browser gets the latest page (with `cache: 'no-store'` on the fetch).

**Cache policy:** For the `api/wiki*` behavior, use **CachingDisabled**. If you use a custom cache policy, avoid caching by `Referer` or other request headers so that a request from the wiki page gets the same API response as a direct request.

**AWS Console**

1. Open **CloudFront** in the AWS Console.
2. Click your distribution (the one for globalskiatlas.com).
3. Open the **Invalidations** tab.
4. Click **Create invalidation**.
5. Under **Object paths**, enter one path per line:
   - `/api/wiki/*`
   - `/wiki/browse.html`
6. Click **Create invalidation**.

Wait a minute or two, then hard refresh the wiki page (Ctrl+Shift+R) or try in incognito.

**AWS CLI**

Replace `DISTRIBUTION_ID` with your CloudFront distribution ID (find it in the distribution list; it looks like `E1ABC2DEF3GHI`):

```bash
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/api/wiki/*" "/wiki/browse.html"
```

## Local development

The Express server serves the same routes under `/api/wiki/*`, so no config change is needed. Run `npm start` and open `http://localhost:3010/wiki/browse.html`; it will call `/api/wiki/index` on the same host.

## Lambda env vars

- `DYNAMODB_TABLE_PREFIX`: table prefix (e.g. `atlas` → `atlas-WikiPages`, etc.).
- `AWS_REGION`: region for DynamoDB (and Cognito).
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`: optional; when set, POST/wiki and comments/revisions require a valid Cognito JWT.

## Auth config (production static site)

The wiki auth widget requests `/auth/config`. Locally the Express server serves it from env; in production (S3) a static file is used. The repo includes `auth/config` with `{"configured":false,...}` so the live site returns 200 instead of 403. The widget then shows “Sign in (Cognito not configured).” To enable sign-in on the live site, replace the contents of `auth/config` with your Cognito values (e.g. from a build step that injects secrets) and redeploy.
