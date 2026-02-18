# Deploy pipeline (Git → GitHub → AWS S3/CloudFront)

This project uses the same pipeline as your original `globalskiatlas` repo: push to `main` triggers a GitHub Action that builds Tailwind, syncs to S3, and invalidates CloudFront.

## What’s already in this repo

- **`.github/workflows/deploy-to-s3.yml`** – workflow that runs on push to `main`, builds Tailwind, syncs to `s3://globalskiatlas.com`, and invalidates distribution `E38F9PVDPMHRQK`.
- **`.gitignore`** – ignores `node_modules/`, Tailwind build outputs, and common dev/secret files.

## Option A: This folder is a new GitHub repo (e.g. `GlobalSkiAtlas_2`)

1. **Initialize Git and connect to GitHub**
   ```powershell
   cd "C:\Users\jwitc\Documents\GitHub\GlobalSkiAtlas_2"
   git init
   git branch -M main
   git add .
   git commit -m "Initial commit – GlobalSkiAtlas_2 with deploy pipeline"
   git remote add origin https://github.com/YOUR_USERNAME/GlobalSkiAtlas_2.git
   git push -u origin main
   ```

2. **Add AWS secrets to this repo**
   - GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Add:
     - `AWS_ACCESS_KEY_ID` (same value as in `globalskiatlas` repo)
     - `AWS_SECRET_ACCESS_KEY` (same value as in `globalskiatlas` repo)

3. **Deploy**
   - Every push to `main` will build and deploy to the same S3 bucket and CloudFront distribution as before.

## Option B: You want this code in the existing `globalskiatlas` repo

1. **Point this folder at the old repo and push**
   ```powershell
   cd "C:\Users\jwitc\Documents\GitHub\GlobalSkiAtlas_2"
   git init
   git branch -M main
   git add .
   git commit -m "Replace with GlobalSkiAtlas_2"
   git remote add origin https://github.com/jwitcoski/globalskiatlas.git
   git push -u origin main --force
   ```
   (`--force` overwrites the old `main` with this project; the old pipeline and AWS secrets already exist on that repo.)

2. **Deploy**
   - Same as before: push to `main` runs the workflow and deploys to S3/CloudFront.

## Changing bucket or CloudFront

Edit `.github/workflows/deploy-to-s3.yml`:

- **S3 bucket:** replace `s3://globalskiatlas.com` in the “Deploy to S3” step.
- **CloudFront:** replace `E38F9PVDPMHRQK` in the “Invalidate CloudFront cache” step.

## Summary

| Item        | Value / location |
|------------|-------------------|
| S3 bucket  | `globalskiatlas.com` |
| CloudFront | `E38F9PVDPMHRQK` |
| Trigger    | Push to `main` |
| Build      | `npm ci` + `npm run build:tailwind` |
