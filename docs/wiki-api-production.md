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

## Local development

The Express server serves the same routes under `/api/wiki/*`, so no config change is needed. Run `npm start` and open `http://localhost:3010/wiki/browse.html`; it will call `/api/wiki/index` on the same host.

## Lambda env vars

- `DYNAMODB_TABLE_PREFIX`: table prefix (e.g. `atlas` → `atlas-WikiPages`, etc.).
- `AWS_REGION`: region for DynamoDB (and Cognito).
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`: optional; when set, POST/wiki and comments/revisions require a valid Cognito JWT.
