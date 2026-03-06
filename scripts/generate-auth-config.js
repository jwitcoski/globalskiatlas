#!/usr/bin/env node
/**
 * Generate auth/config for the wiki from environment variables.
 * Used in CI (e.g. GitHub Actions) so Cognito config is injected at deploy time
 * without committing secrets. Also usable locally: set COGNITO_* in .env and run
 *   node scripts/generate-auth-config.js
 *
 * Env: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_REGION, COGNITO_DOMAIN
 * COGNITO_DOMAIN = full URL or domain prefix (e.g. xxx for https://xxx.auth.region.amazoncognito.com).
 */
const fs = require('fs');
const path = require('path');

const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
const clientId = process.env.COGNITO_CLIENT_ID || '';
const region = process.env.COGNITO_REGION || 'us-east-1';
let domain = (process.env.COGNITO_DOMAIN || '').trim();

const hasRequired = !!(userPoolId && clientId);
if (hasRequired && domain) {
  if (!domain.includes('://')) {
    domain = `https://${domain}.auth.${region}.amazoncognito.com`;
  }
}

const config = {
  configured: !!(hasRequired && domain),
  region,
  userPoolId: userPoolId || '',
  clientId: clientId || '',
  domain: domain || '',
};

const outPath = path.resolve(__dirname, '..', 'auth', 'config');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(config, null, 0) + '\n', 'utf8');
console.log(config.configured ? 'Wrote auth/config (Cognito configured).' : 'Wrote auth/config (Cognito not configured).');
